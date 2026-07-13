/**
 * Fast client-side static heuristics — runs before/alongside AI analysis.
 * Pure (no I/O) so unit tests call the shipped implementation directly.
 */

import type { Finding, Severity } from "./types";

export type LocalFinding = Finding & {
  source: "local";
  ruleId: string;
};

function lineOf(content: string, index: number): number {
  if (index <= 0) return 1;
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) {
    if (content.charCodeAt(i) === 10) line++;
  }
  return line;
}

function finding(
  partial: Omit<LocalFinding, "source"> & { source?: "local" }
): LocalFinding {
  return { source: "local", ...partial };
}

/**
 * Scan source for common defects / smells.
 * Language-aware where useful; safe for unknown languages.
 */
export function localScan(
  content: string,
  language: string,
  path = "file"
): LocalFinding[] {
  if (!content.trim()) return [];
  const lang = (language || "").toLowerCase();
  const findings: LocalFinding[] = [];
  const lines = content.split("\n");

  // TODO / FIXME / HACK
  lines.forEach((line, i) => {
    const m = line.match(/\b(TODO|FIXME|HACK|XXX)\b/i);
    if (m) {
      findings.push(
        finding({
          title: `${m[1].toUpperCase()} marker`,
          detail: line.trim().slice(0, 160),
          severity: m[1].toUpperCase() === "FIXME" ? "medium" : "low",
          line: i + 1,
          category: "maintainability",
          ruleId: "local/todo",
          suggestion: "Resolve or track this marker before shipping.",
        })
      );
    }
  });

  // Empty catch blocks
  const emptyCatch =
    /catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;
  let em: RegExpExecArray | null;
  while ((em = emptyCatch.exec(content)) !== null) {
    findings.push(
      finding({
        title: "Empty catch block",
        detail: "Errors are swallowed with no logging or rethrow.",
        severity: "high",
        line: lineOf(content, em.index),
        category: "correctness",
        ruleId: "local/empty-catch",
        suggestion: "Log the error, rethrow, or handle the failure mode.",
      })
    );
  }

  // eval / Function constructor
  const evalRe = /\beval\s*\(|new\s+Function\s*\(/g;
  while ((em = evalRe.exec(content)) !== null) {
    findings.push(
      finding({
        title: "Dynamic code execution",
        detail: em[0].includes("eval") ? "Use of eval()" : "new Function()",
        severity: "critical",
        line: lineOf(content, em.index),
        category: "security",
        ruleId: "local/eval",
        suggestion: "Avoid eval/Function; use safer parsers or maps.",
      })
    );
  }

  // document.write / innerHTML assignment
  const xssRe = /document\.write\s*\(|\.innerHTML\s*=/g;
  while ((em = xssRe.exec(content)) !== null) {
    findings.push(
      finding({
        title: "Possible XSS sink",
        detail: em[0].includes("write")
          ? "document.write can inject HTML"
          : "innerHTML assignment may inject untrusted HTML",
        severity: "high",
        line: lineOf(content, em.index),
        category: "security",
        ruleId: "local/xss-sink",
        suggestion: "Prefer textContent or a sanitizer for untrusted input.",
      })
    );
  }

  // SQL string concatenation / template into query-ish strings
  const sqlRe =
    /(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)[^;'\n]{0,80}(?:\+|`\$\{)/gi;
  while ((em = sqlRe.exec(content)) !== null) {
    findings.push(
      finding({
        title: "Possible SQL injection surface",
        detail: "Query text appears built via concatenation or template.",
        severity: "critical",
        line: lineOf(content, em.index),
        category: "security",
        ruleId: "local/sql-concat",
        suggestion: "Use parameterized queries / bound parameters.",
      })
    );
  }

  // Hardcoded secrets-ish
  const secretRe =
    /(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}['"]/gi;
  while ((em = secretRe.exec(content)) !== null) {
    findings.push(
      finding({
        title: "Possible hardcoded secret",
        detail: "Literal credential-like value in source.",
        severity: "critical",
        line: lineOf(content, em.index),
        category: "security",
        ruleId: "local/secret",
        suggestion: "Move secrets to environment variables or a vault.",
      })
    );
  }

  // == null / != null is ok; bare == for non-null
  if (lang.includes("javascript") || lang.includes("typescript") || lang === "jsx" || lang === "tsx") {
    lines.forEach((line, i) => {
      if (/[^=!]==[^=]/.test(line) && !/===\s*|!==\s*/.test(line)) {
        // skip == null / == undefined patterns which are idiomatic
        if (/==\s*null|!=\s*null|==\s*undefined|!=\s*undefined/.test(line)) return;
        findings.push(
          finding({
            title: "Loose equality",
            detail: line.trim().slice(0, 120),
            severity: "low",
            line: i + 1,
            category: "quality",
            ruleId: "local/eqeq",
            suggestion: "Prefer === / !== unless null-check idiom is intentional.",
          })
        );
      }
    });
  }

  // Python: bare except
  if (lang === "python") {
    lines.forEach((line, i) => {
      if (/^\s*except\s*:\s*$/.test(line) || /^\s*except\s+Exception\s*:\s*$/.test(line)) {
        findings.push(
          finding({
            title: "Broad exception handler",
            detail: line.trim(),
            severity: "medium",
            line: i + 1,
            category: "correctness",
            ruleId: "local/bare-except",
            suggestion: "Catch specific exceptions when possible.",
          })
        );
      }
    });
    // Division by len without guard nearby (heuristic)
    lines.forEach((line, i) => {
      if (/\/\s*len\s*\(/.test(line)) {
        findings.push(
          finding({
            title: "Division by len(...)",
            detail: "May raise ZeroDivisionError on empty sequences.",
            severity: "medium",
            line: i + 1,
            category: "correctness",
            ruleId: "local/div-len",
            suggestion: "Guard empty collections before dividing by length.",
          })
        );
      }
    });
  }

  // Very long lines
  lines.forEach((line, i) => {
    if (line.length > 140 && !/^\s*(\/\/|#|\*|\/\*|\s*$)/.test(line)) {
      findings.push(
        finding({
          title: "Very long line",
          detail: `${line.length} characters`,
          severity: "info",
          line: i + 1,
          category: "style",
          ruleId: "local/long-line",
          suggestion: "Break long expressions for readability.",
        })
      );
    }
  });

  // Cap volume so UI stays calm
  const severityRank: Record<Severity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  };
  findings.sort(
    (a, b) =>
      severityRank[a.severity] - severityRank[b.severity] ||
      (a.line ?? 0) - (b.line ?? 0)
  );

  // Deduplicate by ruleId+line
  const seen = new Set<string>();
  const unique: LocalFinding[] = [];
  for (const f of findings) {
    const k = `${f.ruleId}:${f.line}:${f.title}`;
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(f);
    if (unique.length >= 40) break;
  }

  // Attach path context in detail for multi-file later
  void path;
  return unique;
}

export function localScanFiles(
  files: Array<{ path: string; content: string; language: string }>,
  selectedPath?: string | null
): LocalFinding[] {
  const targets =
    selectedPath != null
      ? files.filter((f) => f.path === selectedPath)
      : files.slice(0, 20);
  const out: LocalFinding[] = [];
  for (const f of targets) {
    for (const finding of localScan(f.content, f.language, f.path)) {
      out.push({
        ...finding,
        detail: targets.length > 1 ? `${f.path}: ${finding.detail}` : finding.detail,
      });
    }
  }
  return out.slice(0, 50);
}
