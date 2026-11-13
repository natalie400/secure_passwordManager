
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import SecurityPage from "./pages/SecurityPage";
import type { ReactNode } from "react";
import GeneratorPage from "./pages/GeneratorPage";
import { VaultProvider, useVault } from "./context/VaultContext";

import Welcome from "./pages/Welcome";
import Setup from "./pages/Setup";
import Unlock from "./pages/Unlock";
import Dashboard from "./pages/Dashboard";
import VaultPage from "./pages/VaultPage";
import AppLayout from "./layouts/AppLayout";

function RequireUnlocked({
  children,
}: {
  children: ReactNode;
}) {
  const { unlocked } = useVault();

  if (!unlocked) {
    return <Navigate to="/unlock" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  return (
    <VaultProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome />} />

          <Route path="/setup" element={<Setup />} />

          <Route path="/unlock" element={<Unlock />} />

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
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </BrowserRouter>
    </VaultProvider>
  );
}
