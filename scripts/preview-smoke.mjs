#!/usr/bin/env node

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";

const DEFAULT_OWNER = "0x1111111111111111111111111111111111111111";
const TOKEN_CHAIR_SAMPLE_TOKEN = "0x95B303987A60C71504D99Aa1b13B4DA07b0790ab";
const API_ENDPOINTS = ["ethereum", "arbitrum", "optimism"];
const PAGE_MARKERS = [
  "Review active approvals",
  "Address scan",
  "PulseChain",
  "BNB Smart Chain",
  "Base",
  "Ethereum Mainnet",
  "Arbitrum One",
  "Optimism",
];
const TOKEN_CHAIR_PAGE_MARKERS = [
  "Token Chair Sniffer",
  "No wallet connection",
  "Read-only",
  "Consumer Summary",
  "Completion",
  "Evidence Checklist",
  "Sniff Token",
];
const TOKEN_CHAIR_BAD_REQUEST_CASES = [
  {
    label: "invalid token",
    path: "/api/token-chair-sniffer/market?token=not-an-address",
    error: "Provide a valid EVM token address",
  },
  {
    label: "zero address",
    path: "/api/token-chair-sniffer/market?chainId=pulsechain&token=0x0000000000000000000000000000000000000000",
    error: "zero and burn addresses cannot be scanned",
  },
  {
    label: "unsupported range",
    path: `/api/token-chair-sniffer/market?token=${TOKEN_CHAIR_SAMPLE_TOKEN}&page=2`,
    error: "Unsupported query param: page",
  },
  {
    label: "unsupported callback",
    path: `/api/token-chair-sniffer/market?token=${TOKEN_CHAIR_SAMPLE_TOKEN}&callback=alert`,
    error: "Unsupported query param: callback",
  },
  {
    label: "conflicting aliases",
    path: `/api/token-chair-sniffer/market?token=${TOKEN_CHAIR_SAMPLE_TOKEN}&address=0xA1077a294dDE1B09bB078844df40758a5D0f9a27`,
    error: "Provide either ?token=0x... or ?address=0x...",
  },
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

function vercelCurl(path, deploymentUrl) {
  return new Promise((resolve, reject) => {
    const vercelArgs = ["vercel", "curl", path, "--deployment", deploymentUrl];
    const args =
      process.platform === "win32"
        ? [
            "/d",
            "/s",
            "/c",
            `"${quoteCmdArgs([join(dirname(process.execPath), "npx.cmd"), ...vercelArgs])}"`,
          ]
        : vercelArgs;
    const command = process.platform === "win32" ? "cmd.exe" : "npx";
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsVerbatimArguments: process.platform === "win32",
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Timed out fetching ${path}`));
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
            `vercel curl failed for ${path} with code ${code}: ${stderr.trim()}`,
          ),
        );
        return;
      }
      resolve(stdout);
    });
  });
}

function quoteCmdArgs(args) {
  return args.map((arg) => `"${arg.replaceAll('"', '""')}"`).join(" ");
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

function pathWithSearch(pathname, params) {
  const url = new URL(pathname, "https://preview.local");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}`;
}

function expectTokenChairBadRequest(label, body, expectedError) {
  if (body?.ok !== false || body.status !== "bad-request") {
    throw new Error(
      `Token Chair ${label} guardrail returned status=${body?.status} ok=${body?.ok}.`,
    );
  }
  const errors = Array.isArray(body.errors) ? body.errors.join(" ") : "";
  if (!errors.includes(expectedError)) {
    throw new Error(
      `Token Chair ${label} guardrail missing expected error: ${expectedError}`,
    );
  }
}

function expectTokenChairSuccess(body) {
  if (body?.ok !== true || body.status !== "success") {
    throw new Error(`Token Chair sample returned status=${body?.status}.`);
  }
  if (body.tokenAddress !== TOKEN_CHAIR_SAMPLE_TOKEN) {
    throw new Error("Token Chair sample returned the wrong token address.");
  }
  if (body.market?.tokenSymbol !== "PLSX") {
    throw new Error("Token Chair sample did not return PLSX market data.");
  }
  if (!body.verdict?.label) {
    throw new Error("Token Chair sample did not return a verdict label.");
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
  const deploymentUrl = baseUrl.origin;
  const owner = parseOwner(ownerArg);

  console.log(`Preview smoke: ${deploymentUrl}`);
  const page = await vercelCurl("/app?debug=1", deploymentUrl);
  for (const marker of PAGE_MARKERS) {
    expectMarker(page, marker);
    console.log(`page: ${marker} ok`);
  }

  const tokenChairPage = await vercelCurl(
    "/app/token-chair-sniffer",
    deploymentUrl,
  );
  for (const marker of TOKEN_CHAIR_PAGE_MARKERS) {
    expectMarker(tokenChairPage, marker);
    console.log(`token-chair page: ${marker} ok`);
  }
  if (tokenChairPage.includes("Connect Wallet")) {
    throw new Error("Token Chair page rendered wallet connect copy.");
  }

  for (const endpoint of API_ENDPOINTS) {
    const apiPath = pathWithSearch(`/api/${endpoint}/approvals`, { owner });
    const body = firstJsonObject(await vercelCurl(apiPath, deploymentUrl));
    expectConfiguredApi(endpoint, body);
    console.log(
      `api: ${endpoint} ok status=${body.status} rpc=${body.diagnostics.rpcConfigured} explorer=${body.diagnostics.explorerConfigured}`,
    );
  }

  for (const guardrail of TOKEN_CHAIR_BAD_REQUEST_CASES) {
    const body = firstJsonObject(await vercelCurl(guardrail.path, deploymentUrl));
    expectTokenChairBadRequest(guardrail.label, body, guardrail.error);
    console.log(`token-chair api: ${guardrail.label} guardrail ok`);
  }

  const sample = firstJsonObject(
    await vercelCurl(
      `/api/token-chair-sniffer/market?token=${TOKEN_CHAIR_SAMPLE_TOKEN}`,
      deploymentUrl,
    ),
  );
  expectTokenChairSuccess(sample);
  console.log(
    `token-chair api: sample ok status=${sample.status} verdict=${sample.verdict.label}`,
  );

  console.log("Preview smoke passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
