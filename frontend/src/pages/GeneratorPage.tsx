
import { useState } from "react";
import {
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  AlertCircle,
} from "lucide-react";

import {
  generatePassword,
  DEFAULT_OPTIONS,
} from "../lib/passwordGenerator";

import type { GeneratorOptions } from "../lib/passwordGenerator";
import StrengthMeter from "../components/StrengthMeter";

const CHARACTER_TYPES = [
  {
    key: "uppercase",
    label: "Uppercase Letters",
    example: "A–Z",
  },
  {
    key: "lowercase",
    label: "Lowercase Letters",
    example: "a–z",
  },
  {
    key: "numbers",
    label: "Numbers",
    example: "0–9",
  },
  {
    key: "symbols",
    label: "Symbols",
    example: "!@#$%",
  },
] as const;

export default function GeneratorPage() {
  const [options, setOptions] =
    useState<GeneratorOptions>(DEFAULT_OPTIONS);

  const [password, setPassword] = useState(() =>
    generatePassword(DEFAULT_OPTIONS)
  );

  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  function updateOptions(next: GeneratorOptions) {
    try {
      const generated = generatePassword(next);

      setOptions(next);
      setPassword(generated);
      setCopied(false);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate password."
      );
    }
  }

  function toggleType(
    key: keyof Omit<GeneratorOptions, "length">
  ) {
    const next = {
      ...options,
      [key]: !options[key],
    };

    updateOptions(next);
  }

  function regenerate() {
    try {
      setPassword(generatePassword(options));
      setCopied(false);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate password."
      );
    }
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setError("");
    } catch {
      setError("Clipboard access is unavailable.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Heading */}
      <div>
        <p className="mb-2 text-sm font-medium text-emerald-400">
          Security Tools
        </p>

        <h1 className="text-3xl font-bold tracking-tight">
          Password Generator
        </h1>

        <p className="mt-2 text-slate-400">
          Create strong, unpredictable passwords using
          cryptographically secure randomness.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Generated password */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                <KeyRound size={22} />
              </div>

              <div>
                <h2 className="text-lg font-semibold">
                  Generated Password
                </h2>

                <p className="text-sm text-slate-400">
                  Your password is generated locally.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-all font-mono text-lg tracking-wide text-emerald-400">
                    {visible
                      ? password
                      : "•".repeat(password.length)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setVisible(!visible)}
                  aria-label={
                    visible ? "Hide password" : "Show password"
                  }
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  {visible
                    ? <EyeOff size={19} />
                    : <Eye size={19} />}
                </button>
              </div>
            </div>

            <div className="mt-5">
              <StrengthMeter password={password} />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={regenerate}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 py-3 font-semibold hover:bg-slate-800"
              >
                <RefreshCw size={18} />
                Regenerate
              </button>

              <button
                type="button"
                onClick={copyPassword}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400"
              >
                {copied
                  ? <Check size={18} />
                  : <Copy size={18} />}
                {copied ? "Copied!" : "Copy Password"}
              </button>
            </div>
          </section>

          {/* Generator settings */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-lg font-semibold">
              Customize Password
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Choose the length and character types.
            </p>

            <div className="mt-7">
              <div className="mb-4 flex items-center justify-between">
                <label
                  htmlFor="password-length"
                  className="font-medium"
                >
                  Password Length
                </label>

                <span className="rounded-lg bg-emerald-500/10 px-3 py-1 font-mono font-semibold text-emerald-400">
                  {options.length}
                </span>
              </div>

              <input
                id="password-length"
                type="range"
                min={8}
                max={64}
                value={options.length}
                onChange={(e) =>
                  updateOptions({
                    ...options,
                    length: Number(e.target.value),
                  })
                }
                className="w-full accent-emerald-500"
              />

              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>8 characters</span>
                <span>64 characters</span>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <h3 className="font-medium">
                Character Types
              </h3>

              {CHARACTER_TYPES.map((type) => (
                <label
                  key={type.key}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4 hover:border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={options[type.key]}
                      onChange={() => toggleType(type.key)}
                      className="h-4 w-4 accent-emerald-500"
                    />

                    <span className="text-sm font-medium">
                      {type.label}
                    </span>
                  </div>

                  <span className="font-mono text-xs text-slate-500">
                    {type.example}
                  </span>
                </label>
              ))}
            </div>

            <p className="mt-4 text-xs text-slate-500">
              At least one character type must remain selected.
              Changing a setting generates a new password.
            </p>
          </section>

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
            >
              <AlertCircle size={18} />
              {error}
            </div>
          )}
        </div>

        {/* Information sidebar */}
        <aside className="space-y-5">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
            <div className="mb-4 inline-flex rounded-xl bg-emerald-500/15 p-3 text-emerald-400">
              <ShieldCheck size={25} />
            </div>

            <h2 className="text-lg font-semibold">
              Secure Generation
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              SecureVault uses the browser's Web Crypto API
              to generate unpredictable passwords.
            </p>

            <div className="mt-5 space-y-3 border-t border-slate-800 pt-5 text-sm">
              <div className="flex items-center gap-2 text-slate-300">
                <Check size={16} className="text-emerald-400" />
                Cryptographic randomness
              </div>

              <div className="flex items-center gap-2 text-slate-300">
                <Check size={16} className="text-emerald-400" />
                Unbiased random selection
              </div>

              <div className="flex items-center gap-2 text-slate-300">
                <Check size={16} className="text-emerald-400" />
                Generated in your browser
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="font-semibold">
              Password Tips
            </h2>

            <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-slate-400">
              <li>Use a unique password for every account.</li>
              <li>Choose longer passwords whenever possible.</li>
              <li>Avoid sharing passwords through messages.</li>
              <li>Save passwords in your encrypted vault.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
