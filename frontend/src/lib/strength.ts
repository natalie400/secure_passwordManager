export interface Strength {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Too weak" | "Weak" | "Fair" | "Strong" | "Excellent";
  tips: string[];
}

const COMMON = ["password", "123456", "qwerty", "letmein", "welcome", "admin", "iloveyou", "abc123"];

/** Simple, local strength estimate (length + variety). Not a substitute for a real entropy estimator. */
export function assessStrength(pw: string): Strength {
  const tips: string[] = [];
  if (!pw) return { score: 0, label: "Too weak", tips: ["Enter a password"] };

  const lower = /[a-z]/.test(pw), upper = /[A-Z]/.test(pw), digit = /\d/.test(pw), symbol = /[^A-Za-z0-9]/.test(pw);
  const variety = [lower, upper, digit, symbol].filter(Boolean).length;
  const common = COMMON.some((c) => pw.toLowerCase().includes(c));

  let points = 0;
  if (pw.length >= 8) points++;
  if (pw.length >= 12) points++;
  if (pw.length >= 16) points++;
  if (variety >= 3) points++;
  if (pw.length >= 20 && variety >= 2) points++; // long passphrases are fine

  if (pw.length < 12) tips.push("Use at least 12 characters");
  if (variety < 3) tips.push("Mix upper/lower case, numbers and symbols, or use a long passphrase");
  if (common) { tips.push("Avoid common words like 'password' or '123456'"); points = Math.min(points, 1); }
  if (/^(.)\1+$/.test(pw)) points = 0;

  const score = Math.max(0, Math.min(4, points - (points > 0 ? 1 : 0))) as 0 | 1 | 2 | 3 | 4;
  const labels = ["Too weak", "Weak", "Fair", "Strong", "Excellent"] as const;
  return { score, label: labels[score], tips };
}