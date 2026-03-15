import { Route, Routes, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Dashboard from "./pages/Dashboard";
import Detection from "./pages/Detection";
import Logs from "./pages/Logs";
import Alerts from "./pages/Alerts";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Landing from "./pages/Landing";
import { HistoryProvider } from "./hooks/HistoryContext";

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

function DashboardLayout({ children }) {
  return (
    <div
      className="min-h-screen flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100"
      style={{ position: "relative" }}
    >
      <div
        style={{
          position: "fixed",
          top: 0, left: 0,
          width: "100vw", height: "100vh",
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0.15,
        }}
        dangerouslySetInnerHTML={{
          __html: `<spline-viewer url="https://prod.spline.design/E7a-To0xYvUf8IP9/scene.splinecode" style="width:100%;height:100%;display:block;"></spline-viewer>`,
        }}
      />
      <div style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2, 4, 8, 0.80)",
        zIndex: 1,
        pointerEvents: "none",
      }} />
      <div style={{
        position: "relative",
        zIndex: 2,
        display: "flex",
        width: "100%"
      }}>
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto scrollbar-thin">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <HistoryProvider>
      <AnimatePresence mode="wait">
        <Routes>
          <Route
            path="/"
            element={
              <motion.div
                key="landing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Landing />
              </motion.div>
            }
          />
          <Route
            path="/dashboard"
            element={
              <motion.div
                key="dashboard"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.18 }}
              >
                <DashboardLayout><Dashboard /></DashboardLayout>
              </motion.div>
            }
          />
          <Route
            path="/detection"
            element={
              <motion.div
                key="detection"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.18 }}
              >
                <DashboardLayout><Detection /></DashboardLayout>
              </motion.div>
            }
          />
          <Route
            path="/logs"
            element={
              <motion.div
                key="logs"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.18 }}
              >
                <DashboardLayout><Logs /></DashboardLayout>
              </motion.div>
            }
          />
          <Route
            path="/alerts"
            element={
              <motion.div
                key="alerts"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.18 }}
              >
                <DashboardLayout><Alerts /></DashboardLayout>
              </motion.div>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </HistoryProvider>
  );
}

export default App;