import { Link } from "react-router-dom";
import { Lock, KeyRound, ShieldCheck, Server } from "lucide-react";
import Logo from "../components/Logo";
import { hasStoredVault } from "../lib/vaultService";

const FEATURES = [
  { icon: Lock, title: "Encrypted on your device", text: "Every password is sealed with AES-GCM in your browser before it is saved." },
  { icon: KeyRound, title: "One master password", text: "PBKDF2 turns it into keys. The master password itself is never stored." },
  { icon: ShieldCheck, title: "Tamper detection", text: "Swapped or modified records are rejected, and the checksum catches rollbacks." },
  { icon: Server, title: "Zero-knowledge by design", text: "Domains and password lengths are hidden even inside the encrypted file." },
];

export default function Welcome() {
  const existing = hasStoredVault();
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
      <header className="flex items-center justify-between">
        <Logo />
        <Link to="/unlock" className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:text-white">Sign in / Unlock</Link>
      </header>

      <main className="flex flex-1 flex-col justify-center py-12">
        <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
          Your passwords, locked with a key only you hold.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-300">
          SecureVault is a password manager built on the Web Crypto API. Everything is encrypted
          locally, so the vault file is useless without your master password.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/setup" className="rounded-lg bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400">Get started</Link>
          <Link to="/unlock" className="rounded-lg border border-slate-600 px-5 py-3 font-semibold hover:bg-slate-800">
            {existing ? "Unlock your vault" : "Sign in / Unlock"}
          </Link>
        </div>

        <ul className="mt-14 grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <Icon className="text-emerald-400" size={22} aria-hidden="true" />
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-slate-400">{text}</p>
            </li>
          ))}
        </ul>
      </main>

      <footer className="pt-6 text-xs text-slate-500">
        Secure Vault
      </footer>
    </div>
  );
}