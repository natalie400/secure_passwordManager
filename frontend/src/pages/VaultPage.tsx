
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  KeyRound,
  Globe,
  User,
  Eye,
  EyeOff,
  Copy,
  Check,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import { useVault } from "../context/VaultContext";
import type { EntryInfo } from "../lib/vaultService";
import PasswordDialog from "../components/PasswordDialog";

export default function VaultPage() {
  const {
    entries,
    saveEntry,
    removeEntry,
    revealPassword,
  } = useVault();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EntryInfo | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<EntryInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [loadingDomain, setLoadingDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return entries.filter(
      (entry) =>
        entry.domain.toLowerCase().includes(query) ||
        entry.username.toLowerCase().includes(query)
    );
  }, [entries, search]);

  // Clear revealed passwords after 20 seconds.
  useEffect(() => {
    if (Object.keys(revealed).length === 0) return;

    const timeout = window.setTimeout(() => {
      setRevealed({});
    }, 20000);

    return () => window.clearTimeout(timeout);
  }, [revealed]);

  // Clear the copy indicator after 2 seconds.
  useEffect(() => {
    if (!copiedDomain) return;

    const timeout = window.setTimeout(() => {
      setCopiedDomain(null);
    }, 2000);

    return () => window.clearTimeout(timeout);
  }, [copiedDomain]);

  function openAddDialog() {
    setEditingEntry(null);
    setDialogOpen(true);
    setError("");
    setMessage("");
  }

  function openEditDialog(entry: EntryInfo) {
    setEditingEntry(entry);
    setDialogOpen(true);
    setRevealed({});
    setError("");
    setMessage("");
  }

  async function handleSave(
    domain: string,
    username: string,
    password: string
  ) {
    if (!editingEntry && entries.some((e) => e.domain === domain)) {
      throw new Error(
        "This website already exists. Use Edit to update it."
      );
    }

    await saveEntry(domain, username, password);

    setRevealed({});
    setMessage(
      editingEntry
        ? "Password updated successfully."
        : "Password added successfully."
    );
    setError("");
  }

  async function handleReveal(domain: string) {
    if (revealed[domain] !== undefined) {
      setRevealed((current) => {
        const next = { ...current };
        delete next[domain];
        return next;
      });
      return;
    }

    setLoadingDomain(domain);
    setError("");

    try {
      const password = await revealPassword(domain);

      if (password === null) {
        throw new Error("Password not found.");
      }

      setRevealed((current) => ({
        ...current,
        [domain]: password,
      }));
    } catch {
      setError("Unable to reveal this password.");
    } finally {
      setLoadingDomain(null);
    }
  }

  async function handleCopy(domain: string) {
    setLoadingDomain(domain);
    setError("");

    try {
      const password = await revealPassword(domain);

      if (password === null) {
        throw new Error("Password not found.");
      }

      await navigator.clipboard.writeText(password);
      setCopiedDomain(domain);
      setMessage("Password copied to clipboard.");
    } catch {
      setError(
        "Unable to copy password. Clipboard access may be blocked."
      );
    } finally {
      setLoadingDomain(null);
    }
  }

  async function handleDelete() {
    if (!deletingEntry || busy) return;

    const domain = deletingEntry.domain;
    setBusy(true);
    setError("");

    try {
      const removed = await removeEntry(domain);

      if (!removed) {
        throw new Error("Entry not found.");
      }

      setRevealed({});
      setDeletingEntry(null);
      setMessage("Password deleted successfully.");
    } catch {
      setError("Unable to delete this password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 text-sm font-medium text-emerald-400">
            Password Management
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Password Vault
          </h1>

          <p className="mt-2 text-slate-400">
            View and manage your encrypted credentials.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddDialog}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400"
        >
          <Plus size={19} />
          Add Password
        </button>
      </div>

      {/* Search and summary */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              All Passwords
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {filteredEntries.length} of {entries.length} saved entries
            </p>
          </div>

          <div className="relative w-full sm:max-w-sm">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search websites or usernames..."
              aria-label="Search saved passwords"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-sm outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
        >
          <span className="flex items-center gap-2">
            <Check size={17} />
            {message}
          </span>

          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setMessage("")}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        >
          <span>{error}</span>

          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Vault entries */}
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-16 text-center">
            <div className="mb-5 rounded-2xl bg-slate-800 p-5 text-emerald-400">
              <KeyRound size={32} />
            </div>

            <h3 className="text-lg font-semibold">
              {entries.length === 0
                ? "Your vault is empty"
                : "No matching passwords"}
            </h3>

            <p className="mt-2 max-w-sm text-sm text-slate-400">
              {entries.length === 0
                ? "Add your first account to begin managing your passwords."
                : "Try searching for a different website or username."}
            </p>

            {entries.length === 0 && (
              <button
                type="button"
                onClick={openAddDialog}
                className="mt-6 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
              >
                Add Your First Password
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filteredEntries.map((entry) => {
              const isRevealed =
                revealed[entry.domain] !== undefined;

              const isLoading =
                loadingDomain === entry.domain;

              return (
                <div
                  key={entry.domain}
                  className="flex flex-col gap-4 p-5 transition hover:bg-slate-800/30 xl:flex-row xl:items-center"
                >
                  {/* Website */}
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="rounded-xl bg-slate-800 p-3 text-emerald-400">
                      <Globe size={21} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {entry.domain}
                      </p>

                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-400">
                        <User size={13} />
                        <span className="truncate">
                          {entry.username || "No username"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="flex min-w-0 items-center gap-3 xl:w-56">
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-xs text-slate-500">
                        Password
                      </p>

                      <p
                        className="truncate font-mono text-sm text-slate-300"
                        title={isRevealed ? "Password revealed" : "Password hidden"}
                      >
                        {isRevealed
                          ? revealed[entry.domain]
                          : "••••••••••••"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleReveal(entry.domain)}
                      disabled={isLoading}
                      aria-label={
                        isRevealed
                          ? `Hide password for ${entry.domain}`
                          : `Reveal password for ${entry.domain}`
                      }
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-50"
                    >
                      {isRevealed
                        ? <EyeOff size={18} />
                        : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 xl:justify-end">
                    <ActionButton
                      label={`Copy password for ${entry.domain}`}
                      onClick={() => handleCopy(entry.domain)}
                      disabled={isLoading}
                    >
                      {copiedDomain === entry.domain
                        ? <Check size={18} className="text-emerald-400" />
                        : <Copy size={18} />}
                    </ActionButton>

                    <ActionButton
                      label={`Edit ${entry.domain}`}
                      onClick={() => openEditDialog(entry)}
                    >
                      <Pencil size={18} />
                    </ActionButton>

                    <ActionButton
                      label={`Delete ${entry.domain}`}
                      onClick={() => {
                        setDeletingEntry(entry);
                        setError("");
                        setMessage("");
                      }}
                      danger
                    >
                      <Trash2 size={18} />
                    </ActionButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add/Edit dialog */}
      {dialogOpen && (
        <PasswordDialog
          entry={editingEntry ?? undefined}
          onClose={() => {
            setDialogOpen(false);
            setEditingEntry(null);
          }}
          onSave={handleSave}
          onLoadPassword={revealPassword}
        />
      )}

      {/* Delete confirmation */}
      {deletingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="mb-4 inline-flex rounded-xl bg-red-500/10 p-3 text-red-400">
              <Trash2 size={24} />
            </div>

            <h2
              id="delete-title"
              className="text-xl font-bold"
            >
              Delete Password?
            </h2>

            <p className="mt-3 break-words text-sm leading-6 text-slate-400">
              Are you sure you want to permanently delete the
              saved credentials for{" "}
              <strong className="text-white">
                {deletingEntry.domain}
              </strong>
              ?
            </p>

            <p className="mt-2 text-xs text-red-300">
              This action cannot be undone.
            </p>

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => setDeletingEntry(null)}
                className="flex-1 rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={handleDelete}
                className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50"
              >
                {busy ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
}

function ActionButton({
  label,
  onClick,
  children,
  disabled = false,
  danger = false,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`rounded-lg border border-slate-700 p-2.5 transition disabled:opacity-50 ${
        danger
          ? "text-slate-400 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
          : "text-slate-400 hover:bg-slate-700 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
