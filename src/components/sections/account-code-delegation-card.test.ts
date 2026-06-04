import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("account-code delegation scanner card source", () => {
  const source = readFileSync(
    join(
      process.cwd(),
      "src",
      "components",
      "sections",
      "account-code-delegation-card.tsx",
    ),
    "utf8",
  );

  it("uses the existing read-only Lifeboat diagnostic hook", () => {
    expect(source).toContain("useLifeboatEip7702Scan");
    expect(source).not.toMatch(/writeContract|sendTransaction|signTransaction/);
  });

  it("keeps incomplete checks separate from no-delegation copy", () => {
    expect(source).toContain("Account-code check incomplete");
    expect(source).toContain("No delegation detected");
    expect(source).toContain("cannot rule out account-code or delegation risk");
  });

  it("avoids protected-status claims in main scanner copy", () => {
    expect(source.toLowerCase()).not.toMatch(
      /\b(safe|trusted|guaranteed|all clear)\b/,
    );
  });
});
