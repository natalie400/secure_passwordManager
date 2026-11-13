
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Copy,
  RefreshCw,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  LockKeyhole,
} from "lucide-react";

import { useVault } from "../context/VaultContext";
import { analyzeVault } from "../lib/securityAnalysis";
import type { SecurityReport } from "../lib/securityAnalysis";

export default function SecurityPage() {
  const { entries, revealPassword } = useVault();

  const [report, setReport] = useState<SecurityReport | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const scanId = useRef(0);

  // Invalidate old results if the vault changes or the page unmounts.
  useEffect(() => {
    setReport(null);
    setError("");

    return () => {
      scanId.current += 1;
    };
  }, [entries]);

  async function runScan() {
    const id = ++scanId.current;

    setScanning(true);
    setReport(null);
    setError("");

    try {
      const result = await analyzeVault(
        entries,
        revealPassword
      );

      if (scanId.current === id) {
        setReport(result);
      }
    } catch {
      if (scanId.current === id) {
        setError(
          "Security analysis failed. Please unlock your vault and try again."
        );
      }
    } finally {
      if (scanId.current === id) {
        setScanning(false);
      }
    }
  }

  const riskCount = report
    ? report.findings.filter((f) => f.weak || f.reused).length
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 text-sm font-medium text-emerald-400">
            Security Center
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Password Security
          </h1>

          <p className="mt-2 text-slate-400">
            Analyze saved credentials and identify potential risks.
          </p>
        </div>

        <button
          type="button"
          onClick={runScan}
          disabled={scanning}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          <RefreshCw
            size={18}
            className={scanning ? "animate-spin" : ""}
          />
          {scanning ? "Analyzing..." : "Run Security Scan"}
        </button>
      </div>

      {/* Privacy information */}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <LockKeyhole
          size={20}
          className="mt-0.5 shrink-0 text-emerald-400"
        />

        <p className="text-sm leading-6 text-slate-300">
          Your passwords are analyzed locally in your browser.
          Only the findings are displayed. No passwords are sent
          to an external security service.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {!report ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 px-6 py-16 text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-400">
            <ShieldCheck size={34} />
          </div>

          <h2 className="text-xl font-semibold">
            {scanning
              ? "Analyzing your vault..."
              : "Ready for a Security Check"}
          </h2>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">
            {scanning
              ? "Checking password strength and detecting reused credentials."
              : `Your vault contains ${entries.length} saved account${entries.length === 1 ? "" : "s"}. Run a scan to review their security.`}
          </p>

          {!scanning && (
            <button
              type="button"
              onClick={runScan}
              className="mt-6 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Start Analysis
            </button>
          )}
        </section>
      ) : (
        <>
          {/* Score overview */}
          <div className="grid gap-5 lg:grid-cols-3">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 lg:col-span-1">
              <h2 className="font-semibold">
                Overall Security Score
              </h2>

              <div className="mt-7 flex justify-center">
                <div className="relative grid h-44 w-44 place-items-center rounded-full border-[12px] border-emerald-500/20">
                  <div className="text-center">
                    <p className="text-5xl font-bold text-emerald-400">
                      {report.total === 0
                        ? "—"
                        : report.score}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {report.total === 0 ? "No entries" : "out of 100"}
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-6 text-center text-sm text-slate-400">
                {report.total === 0
                  ? "Add passwords to calculate a score."
                  : riskCount === 0
                    ? "No issues detected by these checks."
                    : `${riskCount} account${riskCount === 1 ? "" : "s"} need attention.`}
              </p>
            </section>

            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
              <Metric
                title="Total Accounts"
                value={report.total}
                icon={<KeyRound size={22} />}
                description="Passwords analyzed"
              />

              <Metric
                title="Strong Passwords"
                value={report.strong}
                icon={<CheckCircle2 size={22} />}
                description="Strength score of 3 or 4"
              />

              <Metric
                title="Weak Passwords"
                value={report.weak}
                icon={<ShieldAlert size={22} />}
                description="Strength score of 0 or 1"
              />

              <Metric
                title="Reused Passwords"
                value={report.reused}
                icon={<Copy size={22} />}
                description="Accounts sharing a password"
              />
            </div>
          </div>

          {/* Findings */}
          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
            <div className="border-b border-slate-800 p-6">
              <h2 className="text-lg font-semibold">
                Security Findings
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Review the accounts that need attention.
              </p>
            </div>

            {riskCount === 0 ? (
              <div className="px-6 py-12 text-center">
                <CheckCircle2
                  size={32}
                  className="mx-auto mb-4 text-emerald-400"
                />

                <p className="font-semibold">
                  No weak or reused passwords detected
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  This does not rule out breached or otherwise unsafe passwords.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {report.findings
                  .filter((f) => f.weak || f.reused)
                  .map((finding) => (
                    <div
                      key={finding.domain}
                      className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {finding.domain}
                        </p>

                        <p className="mt-1 truncate text-sm text-slate-400">
                          {finding.username || "No username"}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {finding.weak && (
                            <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300">
                              Weak password
                            </span>
                          )}

                          {finding.reused && (
                            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                              Reused password
                            </span>
                          )}
                        </div>
                      </div>

                      <Link
                        to="/vault"
                        className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300"
                      >
                        Open Vault
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  ))}
              </div>
            )}
          </section>

          {/* Recommendations */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-lg font-semibold">
              Security Recommendations
            </h2>

            <div className="mt-5 space-y-4">
              {report.weak > 0 && (
                <Recommendation
                  title="Replace weak passwords"
                  description="Use longer, randomly generated passwords for affected accounts."
                />
              )}

              {report.reused > 0 && (
                <Recommendation
                  title="Stop reusing passwords"
                  description="Give each account a unique password to reduce the impact of account compromise."
                />
              )}

              {report.weak === 0 && report.reused === 0 && (
                <Recommendation
                  title="Maintain good password habits"
                  description="Keep using unique passwords and enable multifactor authentication where available."
                />
              )}

              <Recommendation
                title="Keep your master password private"
                description="Use a strong, unique master password and avoid sharing it."
              />
            </div>
          </section>
        </>
      )}

      <p className="text-xs text-slate-500">
        This is a local heuristic analysis. It does not check
        known breaches, phishing exposure, password age, or
        whether an account has multifactor authentication enabled.
      </p>
    </div>
  );
}

function Metric({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{title}</p>
        <span className="text-emerald-400">{icon}</span>
      </div>

      <p className="mt-5 text-3xl font-bold">{value}</p>
      <p className="mt-2 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

function Recommendation({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <AlertTriangle
        size={18}
        className="mt-1 shrink-0 text-amber-400"
      />

      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}
