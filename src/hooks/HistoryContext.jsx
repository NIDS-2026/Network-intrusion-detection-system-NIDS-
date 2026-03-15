import { createContext, useContext, useMemo, useState } from "react";

const HistoryContext = createContext(null);

export function HistoryProvider({ children }) {
  const [entries, setEntries] = useState([]);

  const value = useMemo(
    () => ({
      entries,
      addEntry(entry) {
        setEntries((prev) => [
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            timestamp: new Date().toISOString(),
            ...entry,
          },
          ...prev,
        ]);
      },
      clear() {
        setEntries([]);
      },
    }),
    [entries]
  );

  return (
    <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
  );
}

export function useHistoryStore() {
  const ctx = useContext(HistoryContext);
  if (!ctx) {
    throw new Error("useHistoryStore must be used within HistoryProvider");
  }
  return ctx;
}

