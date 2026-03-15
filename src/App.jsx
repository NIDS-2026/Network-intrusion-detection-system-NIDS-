import { Route, Routes, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Dashboard from "./pages/Dashboard";
import Detection from "./pages/Detection";
import Logs from "./pages/Logs";
import Alerts from "./pages/Alerts";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { HistoryProvider } from "./hooks/HistoryContext";

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

function App() {
  return (
    <HistoryProvider>
      <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto scrollbar-thin">
            <AnimatePresence mode="wait">
              <Routes>
                <Route
                  path="/"
                  element={
                    <motion.div
                      key="dashboard"
                      variants={pageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ duration: 0.18 }}
                    >
                      <Dashboard />
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
                      <Detection />
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
                      <Logs />
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
                      <Alerts />
                    </motion.div>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </HistoryProvider>
  );
}

export default App;

