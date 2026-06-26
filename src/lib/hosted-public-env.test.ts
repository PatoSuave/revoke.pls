import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SCRIPT_PATH = join(process.cwd(), "scripts", "check-hosted-public-env.mjs");

function runGuard(env: Record<string, string | undefined>) {
  return spawnSync(process.execPath, [SCRIPT_PATH], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      PATHEXT: process.env.PATHEXT,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      ...env,
      NODE_ENV: "test",
    },
  });
}

describe("hosted public env guard", () => {
  it("rejects browser-visible RPC URLs with embedded key parameters", () => {
    const result = runGuard({
      NEXT_PUBLIC_MAINNET_RPC_URL:
        "https://rpc.example.test/eth-mainnet?key=secret123456789",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("NEXT_PUBLIC_MAINNET_RPC_URL");
  });

  it("rejects browser-visible URLs with credentials", () => {
    const result = runGuard({
      NEXT_PUBLIC_BASE_RPC_URL: "https://user:pass@rpc.example.test",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("NEXT_PUBLIC_BASE_RPC_URL");
  });

  it("allows public RPC URLs without embedded credentials", () => {
    const result = runGuard({
      NEXT_PUBLIC_BASE_RPC_URL: "https://rpc.example.test/base",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Hosted web public env guard passed.");
  });
});
