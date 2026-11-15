import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import type { ReactNode } from "react";
import { VaultProvider, useVault } from "./context/VaultContext";

import Welcome from "./pages/Welcome";
import AuthPage from "./pages/AuthPage";
import Setup from "./pages/Setup";
import Unlock from "./pages/Unlock";
import Dashboard from "./pages/Dashboard";
import SecurityPage from "./pages/SecurityPage";
import VaultPage from "./pages/VaultPage";
import GeneratorPage from "./pages/GeneratorPage";
import AppLayout from "./layouts/AppLayout";

function SessionLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
      Loading session...
    </div>
  );
}

/** Ensures the user is logged into their backend account before accessing Setup or Unlock. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, authLoading } = useVault();

  if (authLoading) return <SessionLoader />;
  if (!user) return <Navigate to="/auth" replace />;

  return <>{children}</>;
}

/** Ensures the user is logged in AND has decrypted their vault in memory. */
function RequireUnlocked({ children }: { children: ReactNode }) {
  const { user, authLoading, hasVault, unlocked } = useVault();

  if (authLoading) return <SessionLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!hasVault) return <Navigate to="/setup" replace />;
  if (!unlocked) return <Navigate to="/unlock" replace />;

  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  return (
    <VaultProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/auth" element={<AuthPage />} />

          <Route
            path="/setup"
            element={
              <RequireAuth>
                <Setup />
              </RequireAuth>
            }
          />

          <Route
            path="/unlock"
            element={
              <RequireAuth>
                <Unlock />
              </RequireAuth>
            }
          />

          <Route
            path="/dashboard"
            element={
              <RequireUnlocked>
                <Dashboard />
              </RequireUnlocked>
            }
          />

          <Route
            path="/security"
            element={
              <RequireUnlocked>
                <SecurityPage />
              </RequireUnlocked>
            }
          />

          <Route
            path="/vault"
            element={
              <RequireUnlocked>
                <VaultPage />
              </RequireUnlocked>
            }
          />

          <Route
            path="/generator"
            element={
              <RequireUnlocked>
                <GeneratorPage />
              </RequireUnlocked>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </VaultProvider>
  );
}