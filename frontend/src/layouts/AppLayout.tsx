import { useState } from "react";
import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Menu,
  X,
  LogOut,
  ChevronRight,
  WandSparkles,
} from "lucide-react";

import { useVault } from "../context/VaultContext";

interface Props {
  children: ReactNode;
}

export default function AppLayout({ children }: Props) {
  const { entries, lock, logout, user } = useVault();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigation = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Password Vault",
      path: "/vault",
      icon: KeyRound,
    },
    {
      name: "Password Generator",
      path: "/generator",
      icon: WandSparkles,
    },
    {
      name: "Security Center",
      path: "/security",
      icon: ShieldAlert,
    },
  ];

  function handleLock() {
    lock();
    setMobileOpen(false);
    navigate("/unlock", { replace: true });
  }

  async function handleLogout() {
    setMobileOpen(false);
    await logout();
    navigate("/auth", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col
          border-r border-slate-800 bg-slate-900
          transition-transform duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-800 px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500 p-2 text-slate-950">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">SecureVault</h1>
              <p className="text-xs text-slate-400">
                Password Manager
              </p>
            </div>
          </div>

          <button
            type="button"
            className="lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 pt-8">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Workspace
          </p>

          <nav className="space-y-2">
            {navigation.map(({ name, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition
                  ${
                    isActive
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`
                }
              >
                <Icon size={19} />
                <span>{name}</span>
                <ChevronRight size={15} className="ml-auto opacity-50" />
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-auto space-y-2 p-4">
          <div className="mb-2 rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <ShieldCheck size={18} />
              <span className="text-sm font-semibold">
                Vault Unlocked
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {entries.length} saved password
              {entries.length === 1 ? "" : "s"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLock}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400 hover:bg-amber-500/10 hover:text-amber-400"
          >
            <Lock size={19} />
            Lock Vault
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={19} />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 hover:bg-slate-800 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={23} />
            </button>

            <div>
              <p className="text-xs text-slate-500">
                {user?.email ?? "SecureVault Workspace"}
              </p>
              <h2 className="font-semibold">My Vault</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400">
            <Lock size={14} />
            <span className="hidden sm:inline">Encrypted Vault</span>
            <span className="sm:hidden">Encrypted</span>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-5 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}