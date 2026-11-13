import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import PasswordField from "../components/PasswordField";
import StrengthMeter from "../components/StrengthMeter";
import { useVault } from "../context/VaultContext";
import { hasStoredVault, deleteStoredVault } from "../lib/vaultService";
import { assessStrength } from "../lib/strength";

export default function Setup() {
  const { createVault } = useVault();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [replaceOk, setReplaceOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const existing = hasStoredVault();
  const strength = assessStrength(pw);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (pw.length < 8) return setError("Use at least 8 characters.");
    if (strength.score < 2) return setError("That master password is too weak. Make it longer or add variety.");
    if (pw !== confirm) return setError("The passwords do not match.");
    if (existing && !replaceOk) return setError("Please confirm that you want to replace the existing vault.");
    setBusy(true);
    try {
      if (existing) deleteStoredVault();
      await createVault(pw);
      navigate("/dashboard");
    } catch {
      setError("Could not create the vault. Please try again.");
    } finally {
      setBusy(false);
      setPw("");
      setConfirm("");
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-6 py-8">
      <Logo />
      <h1 className="mt-10 text-2xl font-bold">Create your vault</h1>
      <p className="mt-1 text-sm text-slate-400">Choose a master password. It unlocks everything and <strong>cannot be recovered</strong> if you forget it.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <PasswordField label="Master password" value={pw} onChange={setPw} autoComplete="new-password" autoFocus describedBy="strength" />
        <div id="strength"><StrengthMeter password={pw} /></div>
        <PasswordField label="Confirm master password" value={confirm} onChange={setConfirm} autoComplete="new-password" />

        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400">
          Tip: a passphrase of four or more random words is strong and easier to remember than symbols.
          Your master password never leaves this browser tab and is not saved anywhere.
        </div>

        {existing && (
          <label className="flex items-start gap-2 text-sm text-amber-300">
            <input type="checkbox" checked={replaceOk} onChange={(e) => setReplaceOk(e.target.checked)} className="mt-1" />
            A vault already exists on this device. I understand creating a new one permanently replaces it.
          </label>
        )}

        {error && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

        <button disabled={busy} className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60">
          {busy ? "Creating encrypted vault…" : "Create vault"}
        </button>
      </form>
    </div>
  );
}