#!/usr/bin/env node

import { spawn } from "node:child_process";

const DEFAULT_OWNER = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const DEFAULT_SPENDER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

const PAGE_MARKERS = [
  "Wallet Lifeboat | Pulse Revoke",
  "Check a risky wallet before adding gas.",
  "Guided report",
  "Priority findings",
  "Recommended next steps",
  "Exposure",
  "Active compromise signals",
  "Account and delegation risk",
  "HEX and staking",
  "Save or share this report",
  "Visible assets at risk",
  "Possible gas-sweeper activity",
  "Pending transaction activity",
  "Approval-to-drain timeline",
  "Spender contract risk",
  "Permit2 exposure",
  "EIP-7702 delegation",
  "Smart wallet / Safe configuration",
  "ERC-4337 / session-key signals",
  "ERC-6909 multi-token approvals",
  "Good Accounting Assist",
  "Token/NFT dust traps",
];

function lifeboatChecks(owner) {
  return [
    {
      name: "sweeper",
      path: "/api/lifeboat/sweeper",
      params: { chainId: "1", owner },
      allowedStatuses: ["complete", "partial", "unsupported"],
    },
    {
      name: "pending-nonce",
      path: "/api/lifeboat/pending-nonce",
      params: { chainId: "1", owner },
      allowedStatuses: ["complete", "unsupported"],
    },
    {
      name: "timeline",
      path: "/api/lifeboat/timeline",
      params: { chainId: "1", owner },
      allowedStatuses: ["complete", "partial", "unsupported"],
    },
    {
      name: "address-poisoning",
      path: "/api/lifeboat/address-poisoning",
      params: { chainId: "1", owner },
      allowedStatuses: ["complete", "partial", "unsupported"],
    },
    {
      name: "spender-risk",
      path: "/api/lifeboat/spender-risk",
      params: { chainId: "1", spender: DEFAULT_SPENDER },
      allowedStatuses: ["complete", "partial", "unsupported"],
    },
    {
      name: "eip7702",
      path: "/api/lifeboat/eip7702",
      params: { chainId: "1", owner },
      allowedStatuses: ["complete", "unsupported"],
    },
    {
      name: "smart-wallet",
      path: "/api/lifeboat/smart-wallet",
      params: { chainId: "1", owner },
      allowedStatuses: ["complete", "unsupported"],
    },
    {
      name: "erc4337",
      path: "/api/lifeboat/erc4337",
      params: { chainId: "1", owner },
      allowedStatuses: ["complete", "unsupported"],
    },
    {
      name: "erc6909",
      path: "/api/lifeboat/erc6909",
      params: { chainId: "1", owner },
      allowedStatuses: ["complete", "unsupported"],
    },
    {
      name: "dust-trap",
      path: "/api/lifeboat/dust-trap",
      params: { chainId: "1", owner },
      allowedStatuses: ["complete", "partial", "unsupported"],
    },
    {
      name: "hex-stake",
      path: "/api/lifeboat/hex-stake",
      params: { chainId: "369", owner },
      allowedStatuses: ["complete", "unsupported"],
    },
  ];
}

function usage() {
  console.error(
    "Usage: npm run smoke:lifeboat -- <preview-url> [owner-address]",
  );
}

function parseBaseUrl(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Preview URL must be http or https.");
    }
    return new URL(url.origin);
  } catch (error) {
    throw new Error(
      `Invalid preview URL: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function parseOwner(value) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error("Owner address must be a valid 0x-prefixed EVM address.");
  }
  return value;
}

function vercelCurl(url) {
  return new Promise((resolve, reject) => {
    const windows = process.platform === "win32";
    const args = windows ? [] : ["vercel", "curl", url];
    const command = windows
      ? `npx.cmd vercel curl "${url.replaceAll('"', '""')}"`
      : "npx";
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: windows,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Timed out fetching ${url}`));
    }, 60_000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(
          new Error(
            `vercel curl failed for ${url} with code ${code}: ${stderr.trim()}`,
          ),
        );
        return;
      }
      resolve(stdout);
    });
  });
}

function firstJsonObject(output) {
  const line = output
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("{"));
  if (!line) {
    throw new Error("Expected a JSON response but none was found.");
  }
  return JSON.parse(line);
}

function expectMarker(output, marker) {
  if (!output.includes(marker)) {
    throw new Error(`Wallet Lifeboat page is missing expected marker: ${marker}`);
  }
}

function checkLifeboatBody(check, body) {
  if (body?.status === "bad-request") {
    throw new Error(`${check.name} returned bad-request.`);
  }
  if (body?.status === "config-missing") {
    throw new Error(`${check.name} returned config-missing.`);
  }
  if (body?.status === "upstream-failure") {
    throw new Error(
      `${check.name} returned upstream-failure: ${(body.errors ?? []).join(" ")}`,
    );
  }
  if (!check.allowedStatuses.includes(body?.status)) {
    throw new Error(`${check.name} returned unexpected status=${body?.status}.`);
  }
  if (!Array.isArray(body?.warnings) || !Array.isArray(body?.errors)) {
    throw new Error(`${check.name} response is missing warnings/errors arrays.`);
  }
}

async function main() {
  const [, , previewArg, ownerArg = DEFAULT_OWNER] = process.argv;
  if (!previewArg) {
    usage();
    process.exitCode = 2;
    return;
  }

  const baseUrl = parseBaseUrl(previewArg);
  const owner = parseOwner(ownerArg);

  console.log(`Wallet Lifeboat preview smoke: ${baseUrl.origin}`);
  const pageUrl = new URL("/app/wallet-lifeboat", baseUrl);
  const page = await vercelCurl(pageUrl.toString());
  for (const marker of PAGE_MARKERS) {
    expectMarker(page, marker);
    console.log(`page: ${marker} ok`);
  }

  for (const check of lifeboatChecks(owner)) {
    const url = new URL(check.path, baseUrl);
    for (const [key, value] of Object.entries(check.params)) {
      url.searchParams.set(key, value);
    }
    const body = firstJsonObject(await vercelCurl(url.toString()));
    checkLifeboatBody(check, body);
    console.log(
      `api: ${check.name} ok status=${body.status} risk=${body.riskLevel}`,
    );
  }

  console.log("Wallet Lifeboat preview smoke passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
