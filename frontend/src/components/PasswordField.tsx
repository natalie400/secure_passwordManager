import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  autoFocus?: boolean;
  describedBy?: string;
}

export default function PasswordField({ label, value, onChange, autoComplete, autoFocus, describedBy }: Props) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-300">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-describedby={describedBy}
          spellCheck={false}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 pr-11 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-100"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}