import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import PasswordField from "../components/PasswordField";
import { useVault } from "../context/VaultContext";
import { VaultError, hasStoredVault } from "../lib/vaultService";

export default function Unlock() {
  const { unlock } = useVault();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const existing = hasStoredVault();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await unlock(pw);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof VaultError ? err.message : "Could not unlock the vault.");
    } finally {
      setBusy(false);
      setPw("");
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-6 py-8">
      <Logo />
      <h1 className="mt-10 text-2xl font-bold">Unlock your vault</h1>

      {!existing ? (
        <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
          No vault was found on this device. <Link to="/setup" className="text-emerald-400 underline">Create one</Link>.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <PasswordField label="Master password" value={pw} onChange={setPw} autoComplete="current-password" autoFocus />
          {error && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
          <button disabled={busy || !pw} className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60">
            {busy ? "Unlocking…" : "Unlock"}
          </button>
        </form>
      )}
    </div>
  );
}