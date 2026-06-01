#!/usr/bin/env node

const DEFAULT_BASE_URL = "https://pulserevoke.com";
const DEFAULT_OWNER = "0x0000000000000000000000000000000000000000";
const REQUEST_TIMEOUT_MS = 15_000;
const ASSET_TIMEOUT_MS = 20_000;

const REQUIRED_HEADERS = [
  {
    name: "content-security-policy",
    validate: (value) =>
      value.includes("default-src 'self'") &&
      value.includes("frame-ancestors 'none'"),
    expected: "default-src 'self' and frame-ancestors 'none'",
  },
  {
    name: "content-security-policy-report-only",
    validate: (value) => value.includes("/api/csp-report"),
    expected: "report-only policy reports to /api/csp-report",
  },
  {
    name: "strict-transport-security",
    validate: (value) => /^max-age=\d+/i.test(value),
    expected: "max-age is set",
  },
  {
    name: "x-frame-options",
    validate: (value) => value.toUpperCase() === "DENY",
    expected: "DENY",
  },
  {
    name: "x-content-type-options",
    validate: (value) => value.toLowerCase() === "nosniff",
    expected: "nosniff",
  },
  {
    name: "referrer-policy",
    validate: (value) => value === "strict-origin-when-cross-origin",
    expected: "strict-origin-when-cross-origin",
  },
  {
    name: "permissions-policy",
    validate: (value) =>
      value.includes("camera=()") && value.includes("microphone=()"),
    expected: "camera and microphone disabled",
  },
];

const PAGE_PATHS = ["/", "/app", "/security"];

const API_PROBES = [
  {
    label: "ethereum invalid owner",
    path: "/api/ethereum/approvals?owner=not-an-address",
    status: 400,
    noStore: true,
  },
  {
    label: "ethereum block-range tamper",
    path: `/api/ethereum/approvals?owner=${DEFAULT_OWNER}&fromBlock=1`,
    status: 400,
    noStore: true,
  },
  {
    label: "arbitrum invalid owner",
    path: "/api/arbitrum/approvals?owner=not-an-address",
    status: 400,
    noStore: true,
  },
  {
    label: "arbitrum block-range tamper",
    path: `/api/arbitrum/approvals?owner=${DEFAULT_OWNER}&fromBlock=1`,
    status: 400,
    noStore: true,
  },
  {
    label: "optimism invalid owner",
    path: "/api/optimism/approvals?owner=not-an-address",
    status: 400,
    noStore: true,
  },
  {
    label: "optimism block-range tamper",
    path: `/api/optimism/approvals?owner=${DEFAULT_OWNER}&fromBlock=1`,
    status: 400,
    noStore: true,
  },
  {
    label: "hyperevm invalid owner",
    path: "/api/hyperevm/approvals?owner=not-an-address",
    status: 400,
    noStore: true,
  },
  {
    label: "hyperevm block-range tamper",
    path: `/api/hyperevm/approvals?owner=${DEFAULT_OWNER}&fromBlock=1`,
    status: 400,
    noStore: true,
  },
  {
    label: "shared discovery invalid owner",
    path: "/api/discovery/approvals?chainId=56&scope=erc20&owner=not-an-address",
    status: 400,
    noStore: true,
  },
  {
    label: "shared discovery block-range tamper",
    path: `/api/discovery/approvals?chainId=56&scope=erc20&owner=${DEFAULT_OWNER}&fromBlock=1`,
    status: 400,
    noStore: true,
  },
  {
    label: "token logos invalid address",
    path: "/api/token-logos?chainId=369&addresses=not-an-address",
    status: 400,
    noStore: true,
  },
  {
    label: "token logos unsupported chain",
    path: `/api/token-logos?chainId=999999&addresses=${DEFAULT_OWNER}`,
    status: 400,
    noStore: true,
  },
  {
    label: "token logos empty request",
    path: "/api/token-logos?chainId=369",
    status: 200,
  },
  {
    label: "gas unsupported chain",
    path: "/api/gas?chainId=123",
    status: 400,
    noStore: true,
  },
  {
    label: "gas supported chain",
    path: "/api/gas?chainId=369",
    status: 200,
    noStore: true,
  },
  {
    label: "csp report get rejected",
    path: "/api/csp-report",
    status: 405,
    allowEmptyBody: true,
  },
  {
    label: "csp report post accepted",
    path: "/api/csp-report",
    status: 204,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      "csp-report": {
        "document-uri": "https://pulserevoke.com/app?wallet=redacted",
        "blocked-uri": "https://example.invalid/pixel?secret=redacted",
        "effective-directive": "script-src",
        "source-file": "https://pulserevoke.com/_next/static/chunk.js",
        "line-number": 1,
      },
    }),
    noStore: true,
    allowEmptyBody: true,
  },
];

const SECRET_PATTERNS = [
  {
    name: "private key block",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PRIVATE )?KEY-----/i,
  },
  {
    name: "jwt-shaped token",
    pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/,
  },
  {
    name: "key-bearing URL",
    pattern:
      /https?:\/\/[^\s"'`<>),]+(?:api[_-]?key|apikey|key=|token=|secret=|access[_-]?token|client[_-]?secret)[^\s"'`<>),]*/i,
  },
  {
    name: "secret assignment",
    pattern:
      /\b(?:PRIVATE_KEY|MNEMONIC|SEED_PHRASE|SECRET_ACCESS_KEY|AWS_SECRET|VERCEL_TOKEN|ETHERSCAN_API_KEY|POLYGONSCAN_API_KEY|BSCSCAN_API_KEY|BASESCAN_API_KEY|ARBISCAN_API_KEY|OPTIMISTIC_ETHERSCAN_API_KEY|HYPERSCAN_API_KEY)\b\s*[:=]\s*["'][^"'\r\n]{8,}["']/i,
  },
  {
    name: "rpc url assignment",
    pattern:
      /\b[A-Z0-9_]*RPC_URL\b\s*[:=]\s*["']https?:\/\/[^"'\r\n]+["']/i,
  },
];

const KNOWN_UPPERCASE_TEST_STRINGS = new Set([
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
  "0123456789ABCDEFGHIJKLMNOPQRSTUV",
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
]);

function usage() {
  console.error(
    "Usage: npm run security:live -- [https://pulserevoke.com] [--vercel-share=<token>]",
  );
}

function parseArgs(argv) {
  const options = {
    rawUrl: DEFAULT_BASE_URL,
    accessParams: new URLSearchParams(),
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg.startsWith("--vercel-share=")) {
      options.accessParams.set("_vercel_share", arg.slice("--vercel-share=".length));
    } else if (!arg.startsWith("-")) {
      options.rawUrl = arg;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function parseTarget(value, accessParams) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("URL must use http or https.");
    }
    for (const [key, paramValue] of url.searchParams) {
      if (key.startsWith("_vercel_")) {
        accessParams.set(key, paramValue);
      }
    }
    return {
      baseUrl: new URL(url.origin),
      accessParams,
    };
  } catch (error) {
    throw new Error(
      `Invalid live URL: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function withAccessParams(url, accessParams) {
  const nextUrl = new URL(url);
  for (const [key, value] of accessParams) {
    if (!nextUrl.searchParams.has(key)) {
      nextUrl.searchParams.set(key, value);
    }
  }
  return nextUrl;
}

function createCookieJar() {
  const cookies = new Map();
  return {
    header() {
      return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
    },
    store(response) {
      const setCookies =
        typeof response.headers.getSetCookie === "function"
          ? response.headers.getSetCookie()
          : [response.headers.get("set-cookie")].filter(Boolean);
      for (const setCookie of setCookies) {
        const [pair] = setCookie.split(";");
        const equalsIndex = pair.indexOf("=");
        if (equalsIndex > 0) {
          cookies.set(pair.slice(0, equalsIndex).trim(), pair.slice(equalsIndex + 1).trim());
        }
      }
    },
  };
}

const cookieJar = createCookieJar();

async function fetchText(url, init = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let currentUrl = url;
    let response;
    for (let redirectCount = 0; redirectCount < 6; redirectCount += 1) {
      const cookieHeader = cookieJar.header();
      response = await fetch(currentUrl, {
        cache: "no-store",
        redirect: "manual",
        ...init,
        headers: {
          ...(init.headers ?? {}),
          ...(cookieHeader ? { cookie: cookieHeader } : {}),
        },
        signal: controller.signal,
      });
      cookieJar.store(response);
      const location = response.headers.get("location");
      if (
        response.status >= 300 &&
        response.status < 400 &&
        location
      ) {
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }
      break;
    }

    if (!response) {
      throw new Error(`No response received for ${url}`);
    }
    const text = await response.text();
    return { response, text };
  } finally {
    clearTimeout(timeout);
  }
}

function fail(message, details = {}) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

function assertNoSecrets(label, text) {
  for (const { name, pattern } of SECRET_PATTERNS) {
    if (pattern.test(text)) {
      fail(`${label} contains ${name}.`);
    }
  }
}

function assertNoApiKeyShapedLiteral(label, text) {
  const pattern = /["']([A-Z0-9]{32,40})["']/g;
  let match;
  while ((match = pattern.exec(text))) {
    const value = match[1];
    if (
      /[A-Z]/.test(value) &&
      /\d/.test(value) &&
      !KNOWN_UPPERCASE_TEST_STRINGS.has(value)
    ) {
      fail(`${label} contains an API-key-shaped uppercase literal.`);
    }
  }
}

function assertNoStore(label, response) {
  const cacheControl = response.headers.get("cache-control") ?? "";
  if (!cacheControl.toLowerCase().includes("no-store")) {
    fail(`${label} should return Cache-Control: no-store.`);
  }
}

function jsonKeys(text) {
  if (!text.trim()) return [];
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? Object.keys(parsed)
      : [];
  } catch {
    return [];
  }
}

async function checkPages(target) {
  for (const path of PAGE_PATHS) {
    const url = withAccessParams(new URL(path, target.baseUrl), target.accessParams);
    const { response, text } = await fetchText(url.toString());
    if (response.status !== 200) {
      fail(`${path} returned ${response.status}; expected 200.`);
    }
    for (const header of REQUIRED_HEADERS) {
      const value = response.headers.get(header.name);
      if (!value) {
        fail(`${path} missing ${header.name}.`);
      }
      if (!header.validate(value)) {
        fail(`${path} has unexpected ${header.name}.`, {
          expected: header.expected,
        });
      }
    }
    assertNoSecrets(path, text);
    console.log(`page ${path}: headers ok`);
  }
}

async function checkApis(target) {
  for (const probe of API_PROBES) {
    const url = withAccessParams(
      new URL(probe.path, target.baseUrl),
      target.accessParams,
    );
    const { response, text } = await fetchText(url.toString(), {
      method: probe.method ?? "GET",
      headers: probe.headers,
      body: probe.body,
    });
    if (response.status !== probe.status) {
      fail(`${probe.label} returned ${response.status}; expected ${probe.status}.`);
    }
    if (probe.noStore) {
      assertNoStore(probe.label, response);
    }
    if (!probe.allowEmptyBody && !text.trim()) {
      fail(`${probe.label} returned an empty body.`);
    }
    assertNoSecrets(probe.label, text);
    console.log(
      `api ${probe.label}: ${response.status} ok keys=${jsonKeys(text).join(",") || "none"}`,
    );
  }
}

async function checkLiveAssets(target) {
  const assets = new Set();
  const assetPattern = /(?:src|href)="([^"\s]+\.(?:js|css))"/g;

  for (const path of PAGE_PATHS) {
    const pageUrl = withAccessParams(
      new URL(path, target.baseUrl),
      target.accessParams,
    );
    const { text } = await fetchText(pageUrl.toString());
    let match;
    while ((match = assetPattern.exec(text))) {
      const assetUrl = new URL(match[1], target.baseUrl);
      if (assetUrl.origin === target.baseUrl.origin) {
        assets.add(assetUrl.toString());
      }
    }
  }

  if (assets.size === 0) {
    fail("No live JS/CSS assets were discovered for scanning.");
  }

  for (const asset of assets) {
    const assetUrl = withAccessParams(asset, target.accessParams);
    const { response, text } = await fetchText(assetUrl.toString(), {}, ASSET_TIMEOUT_MS);
    if (response.status !== 200) {
      fail(`${new URL(asset).pathname} returned ${response.status}.`);
    }
    const label = new URL(asset).pathname;
    assertNoSecrets(label, text);
    assertNoApiKeyShapedLiteral(label, text);
  }

  console.log(`assets: scanned ${assets.size} live JS/CSS assets`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  const target = parseTarget(options.rawUrl, options.accessParams);
  console.log(`Live security smoke: ${target.baseUrl.origin}`);
  await checkPages(target);
  await checkApis(target);
  await checkLiveAssets(target);
  console.log("Live security smoke passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  if (error?.details) {
    console.error(JSON.stringify(error.details));
  }
  process.exitCode = 1;
});
