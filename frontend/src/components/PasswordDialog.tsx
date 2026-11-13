
import { useState } from "react";
import type { FormEvent } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  X,
  WandSparkles,
} from "lucide-react";
import type { EntryInfo } from "../lib/vaultService";
import { MAX_FIELD_LENGTH } from "../lib/vaultService";
import StrengthMeter from "./StrengthMeter";
import {
  generatePassword,
  DEFAULT_OPTIONS,
} from "../lib/passwordGenerator";
interface Props {
  entry?: EntryInfo;
  onClose: () => void;
  onSave: (
    domain: string,
    username: string,
    password: string
  ) => Promise<void>;
  onLoadPassword: (domain: string) => Promise<string | null>;
}

export default function PasswordDialog({
  entry,
  onClose,
  onSave,
  onLoadPassword,
}: Props) {
  const editing = Boolean(entry);

  const [domain, setDomain] = useState(entry?.domain ?? "");
  const [username, setUsername] = useState(entry?.username ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  async function loadExistingPassword() {
    if (!entry || loaded || busy) return;

    setBusy(true);
    setError("");

    try {
      const value = await onLoadPassword(entry.domain);

      if (value === null) {
        throw new Error("Password not found.");
      }

      setPassword(value);
      setLoaded(true);
    } catch {
      setError("Could not load the existing password.");
    } finally {
      setBusy(false);
    }
  }
    function handleGeneratePassword() {
  try {
    const generated = generatePassword(DEFAULT_OPTIONS);

    setPassword(generated);
    setShowPassword(true);
    setError("");
  } catch {
    setError("Could not generate a password.");
  }
}
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const website = domain.trim();

    if (!website) {
      setError("Please enter a website.");
      return;
    }

    if (!password) {
      setError(
        editing
          ? "Load the existing password or enter a replacement."
          : "Please enter a password."
      );
      return;
    }

    setBusy(true);

    try {
      await onSave(website, username, password);
      setPassword("");
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save this password."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-dialog-title"
        className="my-auto w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <KeyRound size={23} />
            </div>

            <div>
              <h2
                id="password-dialog-title"
                className="text-xl font-bold"
              >
                {editing ? "Edit Password" : "Add New Password"}
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {editing
                  ? "Update your saved credentials."
                  : "Save a new account to your vault."}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="vault-domain"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Website / Domain
            </label>

            <input
              id="vault-domain"
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              maxLength={MAX_FIELD_LENGTH}
              required
              readOnly={editing}
              autoFocus={!editing}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-emerald-500 read-only:opacity-60"
            />

            {editing && (
              <p className="mt-2 text-xs text-slate-500">
                Website names cannot be changed while editing.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="vault-username"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Username / Email
            </label>

            <input
              id="vault-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="name@example.com"
              maxLength={MAX_FIELD_LENGTH}
              autoComplete="off"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label
              htmlFor="vault-password"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="vault-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  editing
                    ? "Enter replacement password"
                    : "Enter account password"
                }
                maxLength={MAX_FIELD_LENGTH}
                autoComplete="new-password"
                spellCheck={false}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pr-12 text-sm outline-none focus:border-emerald-500"
              />

              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>

            {editing && !loaded && (
              <button
                type="button"
                onClick={loadExistingPassword}
                disabled={busy}
                className="mt-2 text-sm text-emerald-400 hover:underline disabled:opacity-50"
              >
                Load existing password
              </button>
            )}
          </div>
            <button
  type="button"
  onClick={handleGeneratePassword}
  disabled={busy}
  className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
>
  <WandSparkles size={18} />
  Generate Strong Password
</button>
          {password && <StrengthMeter password={password} />}

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          <div className="flex gap-3 border-t border-slate-800 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              {busy
                ? "Saving..."
                : editing
                  ? "Save Changes"
                  : "Add Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
