import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
const repo = path.resolve(process.cwd(), "..");
const files = [
  ...new Set(
    execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
      { cwd: repo },
    )
      .toString()
      .split("\0")
      .filter(Boolean),
  ),
];
const patterns = [
  /sb_secret_[A-Za-z0-9_-]{16,}/,
  /(?:ghp_|github_pat_|gho_|ghu_|ghs_|ghr_|sbp_)[A-Za-z0-9_]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /postgres(?:ql)?:\/\/[^\s"'`]+:[^\s"'`]+@/,
  /eyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/,
];
const findings = [];
function scan(file, label) {
  const text = readFileSync(file, "utf8");
  if (patterns.some((pattern) => pattern.test(text))) findings.push(label);
}
for (const file of files) {
  if (
    /(^|\/)\.env(?:\.|$)/.test(file) &&
    !/\.env\.(example|template)$/.test(file)
  )
    findings.push(file);
  scan(path.join(repo, file), file);
}
let bundles = 0;
function scanBundle(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) scanBundle(file);
    else if (/\.(js|json|map)$/.test(entry.name)) {
      scan(file, path.relative(repo, file));
      bundles++;
    }
  }
}
scanBundle(path.join(process.cwd(), ".next/static"));
try {
  execFileSync("git", ["check-ignore", "--quiet", "app/.env.local"], {
    cwd: repo,
  });
} catch {
  findings.push("app/.env.local is not ignored");
}
if (findings.length) {
  console.error("Potential secrets detected; values withheld:", [
    ...new Set(findings),
  ]);
  process.exitCode = 1;
} else
  console.log(
    `No high-confidence secrets detected in ${files.length} repository files and ${bundles} browser bundle files; .env.local ignored. This pattern scan is not a proof of absence.`,
  );
