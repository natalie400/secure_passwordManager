import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function Logo() {
  return (
    <Link to="/" className="inline-flex items-center gap-2 text-xl font-bold tracking-tight">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500 text-slate-950">
        <ShieldCheck size={20} aria-hidden="true" />
      </span>
      SecureVault
    </Link>
  );
}