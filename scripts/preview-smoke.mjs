#!/usr/bin/env node

import { spawn } from "node:child_process";

const DEFAULT_OWNER = "0x1111111111111111111111111111111111111111";
const API_ENDPOINTS = ["ethereum", "arbitrum", "optimism", "hyperevm"];
const GENERIC_DISCOVERY_CHAIN_IDS = [59144, 81457, 80094];
const TOKEN_LOGO_CHECKS = [
  {
    chainId: 59144,
    address: "0xe5D7C2a44FfDDf6b295A15c148167daaAf5CF34f",
  },
  {
    chainId: 81457,
    address: "0x4300000000000000000000000000000000000004",
  },
  {
    chainId: 80094,
    address: "0x6969696969696969696969696969696969696969",
  },
];
const PAGE_MARKERS = [
  "Review approvals before you revoke",
  "Address scan",
  "PulseChain",
  "BNB Smart Chain",
  "Base",
  "Linea",
  "Blast",
  "Berachain",
  "Ethereum Mainnet",
  "Arbitrum One",
  "Optimism",
  "HyperEVM",
];

function usage() {
  console.error(
    "Usage: npm run smoke:preview -- <preview-url> [owner-address]",
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
    const command = process.platform === "win32" ? "powershell.exe" : "npx";
    const args =
      process.platform === "win32"
        ? [
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            `npx vercel curl ${quotePowerShellArg(url)}`,
          ]
        : ["vercel", "curl", url];
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
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

function quotePowerShellArg(value) {
  return `'${value.replace(/'/g, "''")}'`;
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
    throw new Error(`Preview page is missing expected marker: ${marker}`);
  }
}

function expectConfiguredApi(endpoint, body) {
  if (body?.ok !== true) {
    throw new Error(`${endpoint} API did not return ok=true.`);
  }
  if (["config-missing", "bad-request", "upstream-failure"].includes(body.status)) {
    throw new Error(`${endpoint} API returned status=${body.status}.`);
  }
  if (body.diagnostics?.rpcConfigured !== true) {
    throw new Error(`${endpoint} API diagnostics show RPC is not configured.`);
  }
  if (body.diagnostics?.explorerConfigured !== true) {
    throw new Error(
      `${endpoint} API diagnostics show explorer/API is not configured.`,
    );
  }
  if (Array.isArray(body.missingConfig) && body.missingConfig.length > 0) {
    throw new Error(
      `${endpoint} API reports missing config: ${body.missingConfig.join(", ")}`,
    );
  }
}

function expectGenericDiscoveryApi(chainId, body) {
  if (body?.ok !== true) {
    throw new Error(`chainId=${chainId} generic API did not return ok=true.`);
  }
  if (["config-missing", "bad-request", "upstream-failure"].includes(body.status)) {
    throw new Error(`chainId=${chainId} generic API returned status=${body.status}.`);
  }
  if (body.chainId !== chainId) {
    throw new Error(
      `chainId=${chainId} generic API returned chainId=${body.chainId}.`,
    );
  }
  if (Array.isArray(body.missingConfig) && body.missingConfig.length > 0) {
    throw new Error(
      `chainId=${chainId} generic API reports missing config: ${body.missingConfig.join(", ")}`,
    );
  }
}

function expectTokenLogoApi({ chainId, address }, body) {
  if (body?.ok !== true) {
    throw new Error(`chainId=${chainId} token-logo API did not return ok=true.`);
  }
  if (body.status !== "complete") {
    throw new Error(`chainId=${chainId} token-logo API returned status=${body.status}.`);
  }
  if (body.chainId !== chainId) {
    throw new Error(
      `chainId=${chainId} token-logo API returned chainId=${body.chainId}.`,
    );
  }
  if (body.requested !== 1) {
    throw new Error(
      `chainId=${chainId} token-logo API requested=${body.requested}, expected 1.`,
    );
  }
  if (!body.logos || typeof body.logos !== "object") {
    throw new Error(`chainId=${chainId} token-logo API did not return a logo map.`);
  }
  if (!address.startsWith("0x")) {
    throw new Error("Token logo smoke fixture address is malformed.");
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
  const appUrl = new URL("/app?debug=1", baseUrl);

  console.log(`Preview smoke: ${baseUrl.origin}`);
  const page = await vercelCurl(appUrl.toString());
  for (const marker of PAGE_MARKERS) {
    expectMarker(page, marker);
    console.log(`page: ${marker} ok`);
  }

  for (const endpoint of API_ENDPOINTS) {
    const apiUrl = new URL(`/api/${endpoint}/approvals`, baseUrl);
    apiUrl.searchParams.set("owner", owner);
    const body = firstJsonObject(await vercelCurl(apiUrl.toString()));
    expectConfiguredApi(endpoint, body);
    console.log(
      `api: ${endpoint} ok status=${body.status} rpc=${body.diagnostics.rpcConfigured} explorer=${body.diagnostics.explorerConfigured}`,
    );
  }

  for (const chainId of GENERIC_DISCOVERY_CHAIN_IDS) {
    const apiUrl = new URL("/api/discovery/approvals", baseUrl);
    apiUrl.searchParams.set("chainId", chainId.toString());
    apiUrl.searchParams.set("scope", "erc20");
    apiUrl.searchParams.set("owner", owner);
    const body = firstJsonObject(await vercelCurl(apiUrl.toString()));
    expectGenericDiscoveryApi(chainId, body);
    console.log(`api: generic chainId=${chainId} ok status=${body.status}`);
  }

  for (const check of TOKEN_LOGO_CHECKS) {
    const logoUrl = new URL("/api/token-logos", baseUrl);
    logoUrl.searchParams.set("chainId", check.chainId.toString());
    logoUrl.searchParams.set("addresses", check.address);
    const body = firstJsonObject(await vercelCurl(logoUrl.toString()));
    expectTokenLogoApi(check, body);
    console.log(
      `api: token logos chainId=${check.chainId} ok status=${body.status}`,
    );
  }

  console.log("Preview smoke passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
