import { assessStrength } from "../lib/strength";

const COLORS = ["bg-red-500", "bg-orange-500", "bg-yellow-400", "bg-emerald-500", "bg-emerald-400"];

export default function StrengthMeter({ password }: { password: string }) {
  const s = assessStrength(password);
  return (
    <div aria-live="polite">
      <div className="flex gap-1" role="img" aria-label={`Password strength: ${s.label}`}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${password && i < Math.max(1, s.score) ? COLORS[s.score] : "bg-slate-700"}`} />
        ))}
      </div>
      <p className="mt-1 text-sm text-slate-300">{password ? s.label : "Strength appears as you type"}</p>
      {password && s.tips.length > 0 && (
        <ul className="mt-1 list-disc pl-5 text-xs text-slate-400">
          {s.tips.map((t) => <li key={t}>{t}</li>)}
        </ul>
      )}
    </div>
  );
}