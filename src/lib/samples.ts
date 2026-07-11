import type { CodeFile } from "./types";

export type SampleMeta = {
  tag: string;
  blurb: string;
  accent: "rose" | "amber" | "violet";
  recommendedTasks: string[];
};

export const SAMPLE_META: Record<string, SampleMeta> = {
  "sample-js-off-by-one": {
    tag: "Off-by-one bug",
    blurb: "Inclusive range sum that drops the last integer.",
    accent: "rose",
    recommendedTasks: ["explain", "fix_bugs", "generate_tests", "architecture"],
  },
  "sample-py-empty-list": {
    tag: "Edge case",
    blurb: "Average that crashes on an empty list.",
    accent: "amber",
    recommendedTasks: ["explain", "fix_bugs", "generate_tests", "security_audit"],
  },
  "sample-ts-refactor": {
    tag: "Refactor + tests",
    blurb: "Correct utility that could be cleaner and needs tests.",
    accent: "violet",
    recommendedTasks: [
      "explain",
      "generate_tests",
      "suggest_improvements",
      "architecture",
    ],
  },
  "sample-sec-injection": {
    tag: "Security risk",
    blurb: "SQL built via string concat — classic injection surface.",
    accent: "rose",
    recommendedTasks: ["security_audit", "fix_bugs", "explain"],
  },
};

export const SAMPLE_SNIPPETS: CodeFile[] = [
  {
    id: "sample-js-off-by-one",
    name: "sumRange.js",
    path: "samples/sumRange.js",
    language: "javascript",
    size: 0,
    content: `/**
 * Sum integers from start to end (inclusive).
 * BUG: off-by-one — the loop condition uses < instead of <=,
 * so the final value of end is never included.
 */
function sumRange(start, end) {
  let total = 0;
  for (let i = start; i < end; i++) {
    total += i;
  }
  return total;
}

// Example: sumRange(1, 5) currently returns 10 (1+2+3+4)
// Expected: 15 (1+2+3+4+5)
console.log(sumRange(1, 5));

module.exports = { sumRange };
`,
  },
  {
    id: "sample-py-empty-list",
    name: "average.py",
    path: "samples/average.py",
    language: "python",
    size: 0,
    content: `"""
Compute the arithmetic mean of a list of numbers.

BUG: does not handle an empty list — division by zero.
"""

def average(numbers: list[float]) -> float:
    total = 0.0
    for n in numbers:
        total += n
    return total / len(numbers)


if __name__ == "__main__":
    print(average([10, 20, 30]))
    # average([]) raises ZeroDivisionError
`,
  },
  {
    id: "sample-ts-refactor",
    name: "formatUser.ts",
    path: "samples/formatUser.ts",
    language: "typescript",
    size: 0,
    content: `/**
 * Small TypeScript utility — correct, but could be refactored
 * and is missing unit tests.
 */
export type User = {
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
};

export function formatUserLabel(user: User): string {
  const name = user.firstName + " " + user.lastName;
  let status = "";
  if (user.isActive === true) {
    status = "active";
  } else {
    status = "inactive";
  }
  return name + " <" + user.email + "> (" + status + ")";
}

export function filterActiveUsers(users: User[]): User[] {
  const result: User[] = [];
  for (let i = 0; i < users.length; i++) {
    if (users[i].isActive === true) {
      result.push(users[i]);
    }
  }
  return result;
}
`,
  },
  {
    id: "sample-sec-injection",
    name: "userLookup.js",
    path: "samples/userLookup.js",
    language: "javascript",
    size: 0,
    content: `/**
 * Look up a user by name from a SQLite-like API.
 * BUG / SECURITY: query is built with string concatenation — SQL injection.
 */
const db = require("./db");

function findUserByName(name) {
  // Never do this with user input
  const sql = "SELECT * FROM users WHERE name = '" + name + "'";
  return db.query(sql);
}

function deleteUser(id) {
  // Also unsafe if id is not validated as an integer
  return db.query("DELETE FROM users WHERE id = " + id);
}

module.exports = { findUserByName, deleteUser };
`,
  },
];

// Populate sizes from content
for (const s of SAMPLE_SNIPPETS) {
  s.size = new TextEncoder().encode(s.content).length;
}
