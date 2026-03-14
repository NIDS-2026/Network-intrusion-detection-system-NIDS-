"""
capture.py
──────────
Real-time NIDS traffic analyser — powered by Scapy.

Two modes:
  PCAP replay  (no root / Npcap needed):
      python capture.py --pcap traffic.pcap

  Live sniff   (requires Npcap on Windows, sudo on Linux):
      python capture.py --iface "Wi-Fi"

For each completed network flow the script computes all 41 NSL-KDD
features, POSTs them to the NIDS /predict endpoint, and prints a
colour-coded alert to the console.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from collections import defaultdict, deque
from datetime import datetime
from typing import Any

try:
    import requests
except ImportError:
    print("[ERROR] pip install requests"); sys.exit(1)

try:
    from scapy.all import IP, ICMP, TCP, UDP, conf as _scapy_conf, rdpcap, sniff
    _scapy_conf.verb = 0          # suppress Scapy banners
except ImportError:
    print("[ERROR] pip install scapy"); sys.exit(1)


# ══════════════════════════════════════════════════════════════════════
# Port → NSL-KDD service mapping
# ══════════════════════════════════════════════════════════════════════
_PORT_SVC: dict[int, str] = {
    20: "ftp_data", 21: "ftp",   22: "ssh",   23: "telnet",
    25: "smtp",     53: "domain",80: "http",   110: "pop_3",
    111: "sunrpc",  119: "nntp", 139: "netbios_ssn",
    143: "imap4",   179: "bgp",  194: "IRC",   389: "ldap",
    443: "http_443",445: "netbios_ssn", 515: "printer",
    587: "smtp",    636: "ldap", 993: "imap4", 995: "pop_3",
    3306: "sql_net",5432: "sql_net",8080: "http",8443: "http_443",
}


def _port_to_service(port: int) -> str:
    return _PORT_SVC.get(port, "other")


# ══════════════════════════════════════════════════════════════════════
# Flow — tracks one bidirectional TCP/UDP/ICMP connection
# ══════════════════════════════════════════════════════════════════════
class Flow:
    __slots__ = (
        "src_ip", "src_port", "dst_ip", "dst_port", "proto",
        "start_ts", "last_ts", "src_bytes", "dst_bytes",
        "saw_syn", "saw_syn_ack", "saw_rst", "saw_fin",
        "established", "orig_rst",
    )

    def __init__(self, src_ip, src_port, dst_ip, dst_port, proto, ts):
        self.src_ip    = src_ip;  self.src_port  = src_port
        self.dst_ip    = dst_ip;  self.dst_port  = dst_port
        self.proto     = proto
        self.start_ts  = ts;      self.last_ts   = ts
        self.src_bytes = 0;       self.dst_bytes = 0
        self.saw_syn   = False;   self.saw_syn_ack = False
        self.saw_rst   = False;   self.saw_fin   = False
        self.established = False; self.orig_rst  = False

    # ── Packet ingestion ────────────────────────────────────────────
    def update(self, pkt, is_fwd: bool) -> None:
        self.last_ts = float(pkt.time)
        if is_fwd:
            self.src_bytes += len(pkt)
        else:
            self.dst_bytes += len(pkt)
        if TCP not in pkt:
            return
        f = pkt[TCP].flags
        syn = bool(f & 0x02); ack = bool(f & 0x10)
        rst = bool(f & 0x04); fin = bool(f & 0x01)
        if syn and not ack:        self.saw_syn = True
        if syn and ack:            self.saw_syn_ack = True; self.established = True
        if ack and not syn:        self.established = True
        if rst:
            self.saw_rst = True
            if is_fwd:             self.orig_rst = True
        if fin:                    self.saw_fin = True

    # ── Derived NSL-KDD fields ──────────────────────────────────────
    @property
    def duration(self) -> int:
        return max(0, min(60, int(self.last_ts - self.start_ts)))

    @property
    def protocol_type(self) -> str:
        return {6: "tcp", 17: "udp", 1: "icmp"}.get(self.proto, "tcp")

    @property
    def service(self) -> str:
        return _port_to_service(self.dst_port)

    @property
    def flag(self) -> str:
        if self.protocol_type != "tcp":
            return "SF"
        if self.established and self.saw_rst:
            return "RSTO" if self.orig_rst else "RSTR"
        if self.established:
            return "SF"
        if self.saw_syn_ack:
            return "S1"
        if self.saw_syn and self.saw_rst:
            return "REJ"
        if self.saw_syn:
            return "S0"
        return "OTH"

    @property
    def land(self) -> int:
        return 1 if (self.src_ip == self.dst_ip and
                     self.src_port == self.dst_port) else 0


# ══════════════════════════════════════════════════════════════════════
# WindowTracker — sliding statistics for traffic features
# ══════════════════════════════════════════════════════════════════════
class WindowTracker:
    """
    Maintains two windows:
      _recent_2s   : last 2 seconds  → count, serror_rate, diff_srv_rate …
      _host_hist   : last 100 flows per dst_host → dst_host_* features
    """
    def __init__(self) -> None:
        self._recent: deque[tuple] = deque()
        self._host:   dict[str, deque] = defaultdict(lambda: deque(maxlen=100))

    @staticmethod
    def _serr(flag: str) -> bool: return flag in {"S0","S1","S2","S3","SH"}
    @staticmethod
    def _rerr(flag: str) -> bool: return flag == "REJ"

    def register(self, flow: Flow) -> None:
        entry = (flow.last_ts, flow.dst_ip, flow.service, flow.flag)
        self._recent.append(entry)
        self._host[flow.dst_ip].append((flow.service, flow.flag))

    def compute(self, flow: Flow) -> dict[str, Any]:
        now  = flow.last_ts
        dst  = flow.dst_ip
        svc  = flow.service
        cut  = now - 2.0

        # 2-second window for this dst_host
        win      = [(t, d, s, f) for t, d, s, f in self._recent
                    if t >= cut and d == dst]
        cnt      = max(1, len(win))
        same_w   = [x for x in win if x[2] == svc]
        srv_cnt  = max(1, len(same_w))
        serr_w   = sum(1 for x in win if self._serr(x[3]))
        rerr_w   = sum(1 for x in win if self._rerr(x[3]))
        same_cnt = sum(1 for x in win if x[2] == svc)
        diff_cnt = cnt - same_cnt
        srv_serr = sum(1 for x in same_w if self._serr(x[3]))
        srv_rerr = sum(1 for x in same_w if self._rerr(x[3]))
        srv_diff = sum(1 for x in same_w if x[1] != dst)

        # 100-connection host history
        hist     = list(self._host[dst])
        hcnt     = max(1, len(hist))
        h_same   = sum(1 for s, _ in hist if s == svc)
        h_diff   = hcnt - h_same
        h_serr   = sum(1 for _, f in hist if self._serr(f))
        h_rerr   = sum(1 for _, f in hist if self._rerr(f))
        h_same_i = max(1, h_same)

        return dict(
            count               = cnt,
            srv_count           = srv_cnt,
            serror_rate         = round(serr_w / cnt,      4),
            srv_serror_rate     = round(srv_serr / srv_cnt, 4),
            rerror_rate         = round(rerr_w / cnt,      4),
            srv_rerror_rate     = round(srv_rerr / srv_cnt, 4),
            same_srv_rate       = round(same_cnt / cnt,    4),
            diff_srv_rate       = round(diff_cnt / cnt,    4),
            srv_diff_host_rate  = round(srv_diff / srv_cnt, 4),
            dst_host_count               = hcnt,
            dst_host_srv_count           = max(1, h_same),
            dst_host_same_srv_rate       = round(h_same / hcnt,   4),
            dst_host_diff_srv_rate       = round(h_diff / hcnt,   4),
            dst_host_same_src_port_rate  = 0.0,
            dst_host_srv_diff_host_rate  = 0.0,
            dst_host_serror_rate         = round(h_serr / hcnt,   4),
            dst_host_srv_serror_rate     = round(h_serr / h_same_i, 4),
            dst_host_rerror_rate         = round(h_rerr / hcnt,   4),
            dst_host_srv_rerror_rate     = round(h_rerr / h_same_i, 4),
        )


# ══════════════════════════════════════════════════════════════════════
# FlowTracker — lifetime management of active flows
# ══════════════════════════════════════════════════════════════════════
class FlowTracker:
    TIMEOUT = 60.0   # seconds of inactivity before forceful flush

    def __init__(self, on_complete, window: WindowTracker) -> None:
        self._flows:  dict[tuple, Flow] = {}
        self._cb      = on_complete
        self._window  = window

    def process(self, pkt) -> None:
        if IP not in pkt:
            return
        ip    = pkt[IP]
        proto = ip.proto
        ts    = float(pkt.time)
        sp = dp = 0
        if TCP  in pkt: sp, dp = pkt[TCP].sport,  pkt[TCP].dport
        elif UDP  in pkt: sp, dp = pkt[UDP].sport,  pkt[UDP].dport

        fwd = (ip.src, sp, ip.dst, dp, proto)
        rev = (ip.dst, dp, ip.src, sp, proto)

        if fwd in self._flows:
            self._flows[fwd].update(pkt, True)
        elif rev in self._flows:
            self._flows[rev].update(pkt, False)
        else:
            f = Flow(ip.src, sp, ip.dst, dp, proto, ts)
            f.update(pkt, True)
            self._flows[fwd] = f

        # Eagerly close on TCP RST / FIN
        if TCP in pkt:
            flags   = pkt[TCP].flags
            key     = fwd if fwd in self._flows else rev
            if key in self._flows and (flags & 0x04 or flags & 0x01):
                self._complete(key)

        # Timeout old flows
        stale = [k for k, v in self._flows.items() if ts - v.last_ts > self.TIMEOUT]
        for k in stale:
            self._complete(k)

    def _complete(self, key: tuple) -> None:
        flow = self._flows.pop(key, None)
        if flow:
            win = self._window.compute(flow)
            self._window.register(flow)
            self._cb(flow, win)

    def flush_all(self) -> None:
        for k in list(self._flows):
            self._complete(k)


# ══════════════════════════════════════════════════════════════════════
# Feature builder
# ══════════════════════════════════════════════════════════════════════
def build_features(flow: Flow, win: dict) -> dict:
    return {
        "duration":          flow.duration,
        "protocol_type":     flow.protocol_type,
        "service":           flow.service,
        "flag":              flow.flag,
        "src_bytes":         min(flow.src_bytes, 100_000),
        "dst_bytes":         min(flow.dst_bytes, 100_000),
        "land":              flow.land,
        "wrong_fragments":   0,
        "urgent":            0,
        "hot":               0,
        "num_failed_logins": 0,
        "logged_in":         1 if flow.established else 0,
        "num_compromised":   0,
        "root_shell":        0,
        "su_attempted":      0,
        "num_root":          0,
        "num_file_creations":0,
        "num_shells":        0,
        "num_access_files":  0,
        "num_outbound_cmds": 0,
        "is_host_login":     0,
        "is_guest_login":    0,
        **win,
    }


# ══════════════════════════════════════════════════════════════════════
# Console output
# ══════════════════════════════════════════════════════════════════════
_ICONS = {"normal":"🟢","dos":"🔴","probe":"🟠","r2l":"🟡","u2r":"🟣"}
_ATTACK_CLASSES = {"dos","probe","r2l","u2r"}

def _print(flow: Flow, result: dict, ms: float) -> None:
    ts    = datetime.now().strftime("%H:%M:%S")
    pred  = result["prediction"]
    conf  = result["confidence"]
    thr   = result["threat_level"]
    icon  = _ICONS.get(pred, "⚪")
    alert = "  ← ALERT" if pred in _ATTACK_CLASSES else ""
    print(
        f"[{ts}]  {flow.src_ip}:{flow.src_port} → {flow.dst_ip}:{flow.dst_port}"
        f"  |  {icon} {pred:<8}  conf={conf:.2f}  threat={thr:<8}"
        f"  {ms:.0f}ms{alert}"
    )
    if pred in _ATTACK_CLASSES:
        print(f"         ↳ {result['recommendation']}")


# ══════════════════════════════════════════════════════════════════════
# Main capture class
# ══════════════════════════════════════════════════════════════════════
class NIDSCapture:
    def __init__(self, url: str, api_key: str) -> None:
        self.predict_url = url.rstrip("/") + "/predict"
        self.session     = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "X-API-Key":    api_key,
        })
        self._window  = WindowTracker()
        self._tracker = FlowTracker(self._on_complete, self._window)
        self.total    = 0
        self.attacks  = 0

    def _on_complete(self, flow: Flow, win: dict) -> None:
        features = build_features(flow, win)
        t0 = time.perf_counter()
        try:
            r = self.session.post(self.predict_url,
                                  data=json.dumps(features), timeout=10)
            ms = (time.perf_counter() - t0) * 1000
            if r.status_code == 200:
                result = r.json()
                self.total += 1
                if result.get("is_attack"):
                    self.attacks += 1
                _print(flow, result, ms)
            else:
                print(f"[WARN] API {r.status_code}: {r.text[:80]}")
        except requests.RequestException as exc:
            print(f"[ERR] API call failed: {exc}")

    def run_pcap(self, path: str) -> None:
        print(f"\n[PCAP]  Replaying: {path}")
        pkts = rdpcap(path)
        print(f"[PCAP]  {len(pkts):,} packets loaded — processing …\n")
        for pkt in pkts:
            self._tracker.process(pkt)
        self._tracker.flush_all()
        self._summary()

    def run_live(self, iface: str) -> None:
        print(f"\n[LIVE]  Sniffing on: {iface}")
        print("[LIVE]  Press Ctrl+C to stop.\n")
        try:
            sniff(iface=iface, prn=self._tracker.process, store=False)
        except KeyboardInterrupt:
            print("\n[LIVE]  Stopped by user.")
        finally:
            self._tracker.flush_all()
            self._summary()

    def _summary(self) -> None:
        rate = f"{self.attacks / self.total * 100:.1f}%" if self.total else "0%"
        print(f"\n{'─'*62}")
        print(f"  Flows analysed : {self.total:>6}")
        print(f"  Attacks found  : {self.attacks:>6}  ({rate})")
        print(f"{'─'*62}\n")


# ══════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════
def main() -> None:
    p = argparse.ArgumentParser(
        description="NIDS Real-Time Traffic Analyser",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples
  PCAP replay (no root needed):
    python capture.py --pcap traffic.pcap

  Live sniff (requires Npcap on Windows / sudo on Linux):
    python capture.py --iface "Wi-Fi"

  Custom API endpoint:
    python capture.py --pcap t.pcap --url http://myserver:8000 --key mysecret
""",
    )
    mode = p.add_mutually_exclusive_group(required=True)
    mode.add_argument("--pcap",  metavar="FILE",  help=".pcap file for offline replay")
    mode.add_argument("--iface", metavar="IFACE", help="Network interface for live sniff")
    p.add_argument("--url", default="http://localhost:8000", help="NIDS API base URL")
    p.add_argument("--key", default="nids-dev-key-2025",    help="Value for X-API-Key header")
    args = p.parse_args()

    cap = NIDSCapture(url=args.url, api_key=args.key)
    if args.pcap:
        cap.run_pcap(args.pcap)
    else:
        cap.run_live(args.iface)


if __name__ == "__main__":
    main()
