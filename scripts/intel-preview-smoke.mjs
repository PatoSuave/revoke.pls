#!/usr/bin/env node

import { spawn } from "node:child_process";

const ROUTE_CHECKS = [
  {
    path: "/intel",
    label: "hub",
    markers: [
      "PulseChain intelligence, organized for careful review.",
      "Suite hub",
      "Wallet report",
      "Graph workbench",
      "Wallet Intelligence",
      "Constellation Network Maps",
    ],
  },
  {
    path: "/intel/wallet",
    label: "wallet",
    markers: [
      "Inspect a wallet before deeper research.",
      "Wallet report",
      "Graph workbench",
      "Read-only view",
      "no wallet connection",
      "Demo report status",
      "Local sample report ready for review.",
    ],
  },
  {
    path: "/intel/visualizer",
    label: "visualizer",
    markers: [
      "PulseChain Visualizer",
      "Graph workbench",
      "PulseChain visualizer demo graph",
      "Trace canvas",
      "Local sample graph. Live reads are not connected on this screen.",
      "Volume timeline",
      "https://pulserevoke.com/intel/visualizer",
    ],
  },
];

function usage() {
  console.error("Usage: npm run smoke:intel -- <preview-or-local-url>");
}

function parseTarget(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("URL must be http or https.");
    }
    return {
      baseUrl: new URL(url.origin),
      inheritedParams: url.searchParams,
    };
  } catch (error) {
    throw new Error(
      `Invalid URL: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function buildUrl(path, target) {
  const url = new URL(path, target.baseUrl);
  for (const [key, value] of target.inheritedParams.entries()) {
    if (!url.searchParams.has(key)) {
      url.searchParams.set(key, value);
    }
  }
  return url;
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

async function fetchPage(url) {
  const { response, text } = await fetchWithCookies(url);
  if (
    response.status === 401 &&
    url.hostname.endsWith(".vercel.app") &&
    !url.searchParams.has("_vercel_share")
  ) {
    return vercelCurl(url.toString());
  }
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`${url.pathname} returned HTTP ${response.status}.`);
  }
  return text;
}

async function fetchWithCookies(url) {
  let currentUrl = url;
  const cookies = new Map();

  for (let redirectCount = 0; redirectCount < 6; redirectCount += 1) {
    const headers = {
      "user-agent": "pulse-revoke-intel-smoke/1.0",
    };
    if (cookies.size > 0) {
      headers.cookie = [...cookies.entries()]
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");
    }

    const response = await fetch(currentUrl, {
      headers,
      redirect: "manual",
    });

    captureCookies(response, cookies);

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error(`${currentUrl.pathname} redirected without location.`);
      }
      currentUrl = new URL(location, currentUrl);
      continue;
    }

    return {
      response,
      text: await response.text(),
    };
  }

  throw new Error(`${url.pathname} redirected too many times.`);
}

function captureCookies(response, cookies) {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) return;

  for (const part of setCookie.split(/,(?=\s*[^;,=]+=[^;,]+)/)) {
    const [pair] = part.trim().split(";");
    const separator = pair.indexOf("=");
    if (separator <= 0) continue;
    cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

function expectMarker(route, output, marker) {
  if (!output.includes(marker)) {
    throw new Error(`${route.label} page is missing expected marker: ${marker}`);
  }
}

async function main() {
  const [, , targetArg] = process.argv;
  if (!targetArg) {
    usage();
    process.exitCode = 2;
    return;
  }

  const target = parseTarget(targetArg);
  console.log(`Intelligence Suite smoke: ${target.baseUrl.origin}`);

  for (const route of ROUTE_CHECKS) {
    const url = buildUrl(route.path, target);
    const page = await fetchPage(url);
    for (const marker of route.markers) {
      expectMarker(route, page, marker);
      console.log(`page:${route.label}: ${marker} ok`);
    }
  }

  console.log("Intelligence Suite smoke passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
