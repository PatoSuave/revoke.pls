#!/usr/bin/env node

import { spawn } from "node:child_process";

const DEFAULT_OWNER = "0x1111111111111111111111111111111111111111";
const API_ENDPOINTS = ["ethereum", "arbitrum", "optimism", "hyperevm"];
const PAGE_MARKERS = [
  "Review active approvals",
  "Address scan",
  "PulseChain",
  "BNB Smart Chain",
  "Base",
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
    const args =
      process.platform === "win32"
        ? ["/d", "/c", "npx.cmd", "vercel", "curl", url]
        : ["vercel", "curl", url];
    const command = process.platform === "win32" ? "cmd.exe" : "npx";
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

  console.log("Preview smoke passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
