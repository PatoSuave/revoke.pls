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

  it("rejects browser-visible explorer keys for shared-key Etherscan chains", () => {
    const result = runGuard({
      NEXT_PUBLIC_MONAD_EXPLORER_API_KEY: "public-monad-key-123",
      NEXT_PUBLIC_KATANA_EXPLORER_API_KEY: "public-katana-key-123",
      NEXT_PUBLIC_SEI_EXPLORER_API_KEY: "public-sei-key-123",
      NEXT_PUBLIC_PLASMA_EXPLORER_API_KEY: "public-plasma-key-123",
      NEXT_PUBLIC_ABSTRACT_EXPLORER_API_KEY: "public-abstract-key-123",
      NEXT_PUBLIC_FRAXTAL_EXPLORER_API_KEY: "public-fraxtal-key-123",
      NEXT_PUBLIC_TAIKO_EXPLORER_API_KEY: "public-taiko-key-123",
      NEXT_PUBLIC_OPBNB_EXPLORER_API_KEY: "public-opbnb-key-123",
      NEXT_PUBLIC_MOONBEAM_EXPLORER_API_KEY: "public-moonbeam-key-123",
      NEXT_PUBLIC_APECHAIN_EXPLORER_API_KEY: "public-apechain-key-123",
      NEXT_PUBLIC_XDC_EXPLORER_API_KEY: "public-xdc-key-123",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("NEXT_PUBLIC_MONAD_EXPLORER_API_KEY");
    expect(result.stderr).toContain("NEXT_PUBLIC_KATANA_EXPLORER_API_KEY");
    expect(result.stderr).toContain("NEXT_PUBLIC_SEI_EXPLORER_API_KEY");
    expect(result.stderr).toContain("NEXT_PUBLIC_PLASMA_EXPLORER_API_KEY");
    expect(result.stderr).toContain("NEXT_PUBLIC_ABSTRACT_EXPLORER_API_KEY");
    expect(result.stderr).toContain("NEXT_PUBLIC_FRAXTAL_EXPLORER_API_KEY");
    expect(result.stderr).toContain("NEXT_PUBLIC_TAIKO_EXPLORER_API_KEY");
    expect(result.stderr).toContain("NEXT_PUBLIC_OPBNB_EXPLORER_API_KEY");
    expect(result.stderr).toContain("NEXT_PUBLIC_MOONBEAM_EXPLORER_API_KEY");
    expect(result.stderr).toContain("NEXT_PUBLIC_APECHAIN_EXPLORER_API_KEY");
    expect(result.stderr).toContain("NEXT_PUBLIC_XDC_EXPLORER_API_KEY");
  });
});
