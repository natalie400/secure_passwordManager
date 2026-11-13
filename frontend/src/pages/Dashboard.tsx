
import { Link, useNavigate } from "react-router-dom";
import {
  KeyRound,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  Lock,
  Globe,
  User,
  ChevronRight,
} from "lucide-react";

import { useVault } from "../context/VaultContext";

export default function Dashboard() {
  const { entries, lock } = useVault();
  const navigate = useNavigate();

  const recentEntries = entries.slice(-5).reverse();

  function handleLock() {
    lock();
    navigate("/unlock", { replace: true });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 text-sm font-medium text-emerald-400">
            Your personal workspace
          </p>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Dashboard
          </h1>

          <p className="mt-2 text-slate-400">
            Manage your passwords from one encrypted vault.
          </p>
        </div>

        <Link
          to="/vault"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
        >
          <Plus size={19} />
          Manage Passwords
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <StatCard
          title="Saved Passwords"
          value={entries.length.toString()}
          description="Entries in your vault"
          icon={<KeyRound size={23} />}
        />

        <StatCard
          title="Vault Status"
          value="Unlocked"
          description="Available in this session"
          icon={<ShieldCheck size={23} />}
        />

        <StatCard
          title="Encryption"
          value="AES-GCM"
          description="Authenticated encryption"
          icon={<Lock size={23} />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 xl:col-span-2">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                Saved Passwords
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                A quick overview of your vault entries
              </p>
            </div>

            <Link
              to="/vault"
              className="flex items-center gap-1 text-sm font-medium text-emerald-400 hover:text-emerald-300"
            >
              View all
              <ArrowUpRight size={16} />
            </Link>
          </div>

          {recentEntries.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-700 px-5 py-12 text-center">
              <div className="mb-4 rounded-2xl bg-slate-800 p-4 text-emerald-400">
                <KeyRound size={28} />
              </div>

              <h3 className="font-semibold">
                Your vault is empty
              </h3>

              <p className="mt-2 max-w-xs text-sm text-slate-400">
                Add your first password to start organizing
                your accounts securely.
              </p>

              <Link
                to="/vault"
                className="mt-5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
              >
                Open Password Vault
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentEntries.map((entry) => (
                <div
                  key={entry.domain}
                  className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="rounded-xl bg-slate-800 p-3 text-emerald-400">
                    <Globe size={20} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {entry.domain}
                    </p>
                    <p className="mt-1 flex items-center gap-1 truncate text-sm text-slate-400">
                      <User size={13} />
                      {entry.username || "No username"}
                    </p>
                  </div>

                  <Link
                    to="/vault"
                    aria-label={`Manage ${entry.domain}`}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                  >
                    <ChevronRight size={19} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-5">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
            <div className="mb-4 inline-flex rounded-xl bg-emerald-500/15 p-3 text-emerald-400">
              <ShieldCheck size={24} />
            </div>

            <h2 className="text-lg font-semibold">
              Your Vault Is Encrypted
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Passwords are encrypted using your master-password-derived keys.
              The encrypted vault is stored locally on this device.
            </p>

            <div className="mt-5 border-t border-slate-800 pt-4">
              <p className="text-xs text-slate-500">
                Security note: This is a university project,
                not an independently audited password manager.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-lg font-semibold">
              Quick Actions
            </h2>

            <div className="mt-5 space-y-3">
              <Link
                to="/vault"
                className="flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-3 text-sm hover:bg-slate-700"
              >
                <KeyRound size={18} className="text-emerald-400" />
                Manage vault
                <ChevronRight size={16} className="ml-auto" />
              </Link>

              <button
                type="button"
                onClick={handleLock}
                className="flex w-full items-center gap-3 rounded-xl bg-slate-800 px-4 py-3 text-left text-sm hover:bg-slate-700"
              >
                <Lock size={18} className="text-emerald-400" />
                Lock vault
                <ChevronRight size={16} className="ml-auto" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}

function StatCard({
  title,
  value,
  description,
  icon,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-400">
          {title}
        </p>

        <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
          {icon}
        </div>
      </div>

      <h3 className="text-2xl font-bold">
        {value}
      </h3>

      <p className="mt-2 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}
