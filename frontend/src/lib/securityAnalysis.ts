
import { assessStrength } from "./strength";
import type { EntryInfo } from "./vaultService";

export interface SecurityFinding {
  domain: string;
  username: string;
  weak: boolean;
  reused: boolean;
  strengthLabel: string;
  strengthScore: number;
}

export interface SecurityReport {
  total: number;
  strong: number;
  weak: number;
  reused: number;
  score: number;
  findings: SecurityFinding[];
}

export async function analyzeVault(
  entries: EntryInfo[],
  getPassword: (domain: string) => Promise<string | null>
): Promise<SecurityReport> {
  // This temporary map exists only while analysis runs.
  const passwordGroups = new Map<string, string[]>();
  const findings: SecurityFinding[] = [];

  try {
    for (const entry of entries) {
      const password = await getPassword(entry.domain);

      if (password === null) {
        throw new Error(
          `Could not read the password for ${entry.domain}.`
        );
      }

      const strength = assessStrength(password);

      findings.push({
        domain: entry.domain,
        username: entry.username,
        weak: strength.score <= 1,
        reused: false,
        strengthLabel: strength.label,
        strengthScore: strength.score,
      });

      const group = passwordGroups.get(password);

      if (group) {
        group.push(entry.domain);
      } else {
        passwordGroups.set(password, [entry.domain]);
      }
    }

    const reusedDomains = new Set<string>();

    for (const domains of passwordGroups.values()) {
      if (domains.length > 1) {
        domains.forEach((domain) => reusedDomains.add(domain));
      }
    }

    for (const finding of findings) {
      finding.reused = reusedDomains.has(finding.domain);
    }

    const total = findings.length;
    const weak = findings.filter((f) => f.weak).length;
    const reused = findings.filter((f) => f.reused).length;
    const strong = findings.filter(
      (f) => f.strengthScore >= 3
    ).length;

    // Deduct points for accounts with weak or reused passwords.
    // Each affected account is counted once.
    const riskyAccounts = findings.filter(
      (f) => f.weak || f.reused
    ).length;

    const score =
      total === 0
        ? 0
        : Math.round(100 * (1 - riskyAccounts / total));

    return {
      total,
      strong,
      weak,
      reused,
      score,
      findings,
    };
  } finally {
    // Release temporary references to plaintext passwords.
    passwordGroups.clear();
  }
}
