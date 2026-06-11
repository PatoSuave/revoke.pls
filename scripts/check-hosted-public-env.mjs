#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PUBLIC_SECRET_NAME_PATTERN =
  /^NEXT_PUBLIC_.*(?:API[_-]?KEY|PRIVATE[_-]?KEY|SECRET|TOKEN|MNEMONIC|SEED)/i;

const DENIED_PUBLIC_EXPLORER_KEYS = new Set([
  "NEXT_PUBLIC_BSC_EXPLORER_API_KEY",
  "NEXT_PUBLIC_BSCSCAN_API_KEY",
  "NEXT_PUBLIC_BASE_EXPLORER_API_KEY",
  "NEXT_PUBLIC_POLYGON_EXPLORER_API_KEY",
  "NEXT_PUBLIC_AVALANCHE_EXPLORER_API_KEY",
  "NEXT_PUBLIC_MANTLE_EXPLORER_API_KEY",
  "NEXT_PUBLIC_ETHERSCAN_API_KEY",
  "NEXT_PUBLIC_ARBISCAN_API_KEY",
  "NEXT_PUBLIC_OPTIMISM_EXPLORER_API_KEY",
  "NEXT_PUBLIC_OPTIMISTIC_ETHERSCAN_API_KEY",
  "NEXT_PUBLIC_HYPEREVM_EXPLORER_API_KEY",
  "NEXT_PUBLIC_HYPEREVM_ETHERSCAN_API_KEY",
]);

const ALLOWED_PUBLIC_KEYISH_NAMES = new Set([
  "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID",
]);

const PLACEHOLDER_VALUES = new Set([
  "PASTE_YOUR_BSCSCAN_KEY_HERE",
  "PASTE_YOUR_POLYGONSCAN_KEY_HERE",
  "PASTE_YOUR_AVALANCHE_EXPLORER_KEY_HERE",
  "PASTE_YOUR_MANTLE_EXPLORER_KEY_HERE",
  "PASTE_YOUR_ETHERSCAN_V2_KEY_HERE",
  "YOUR_ETHERSCAN_V2_KEY",
  "your_bscscan_key",
  "your_polygonscan_key",
  "your_avalanche_explorer_key",
  "your_mantle_explorer_key",
]);

function usage() {
  console.error(
    [
      "Usage: npm run security:env -- [--env-file=.env.local] [--allow-desktop-public-keys]",
      "",
      "Hosted web builds should keep explorer/API keys in server-only variables.",
      "Use --allow-desktop-public-keys only for desktop/static builds without API routes.",
    ].join("\n"),
  );
}

function parseArgs(argv) {
  const options = {
    envFiles: [],
    allowDesktopPublicKeys: false,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--allow-desktop-public-keys") {
      options.allowDesktopPublicKeys = true;
    } else if (arg.startsWith("--env-file=")) {
      options.envFiles.push(arg.slice("--env-file=".length));
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function parseEnvFile(filePath) {
  const resolved = resolve(process.cwd(), filePath);
  if (!existsSync(resolved)) {
    throw new Error(`Env file does not exist: ${filePath}`);
  }

  const entries = {};
  const text = readFileSync(resolved, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const normalized = trimmed.startsWith("export ")
      ? trimmed.slice("export ".length).trim()
      : trimmed;
    const equalsIndex = normalized.indexOf("=");
    if (equalsIndex <= 0) continue;

    const name = normalized.slice(0, equalsIndex).trim();
    let value = normalized.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    entries[name] = value;
  }
  return entries;
}

function isMeaningfullySet(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && !PLACEHOLDER_VALUES.has(trimmed);
}

function isDeniedPublicName(name) {
  if (ALLOWED_PUBLIC_KEYISH_NAMES.has(name)) return false;
  return DENIED_PUBLIC_EXPLORER_KEYS.has(name) || PUBLIC_SECRET_NAME_PATTERN.test(name);
}

function collectSources(options) {
  const sources = [{ label: "process.env", env: process.env }];
  for (const filePath of options.envFiles) {
    sources.push({ label: filePath, env: parseEnvFile(filePath) });
  }
  return sources;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  if (options.allowDesktopPublicKeys) {
    console.log(
      "Hosted public env guard skipped for desktop/static public-key fallback mode.",
    );
    return;
  }

  const findings = [];
  for (const source of collectSources(options)) {
    for (const [name, value] of Object.entries(source.env)) {
      if (isDeniedPublicName(name) && isMeaningfullySet(value)) {
        findings.push({ source: source.label, name });
      }
    }
  }

  if (findings.length > 0) {
    console.error(
      "Hosted web public env guard failed. Move these values to server-only variables or unset them:",
    );
    for (const finding of findings) {
      console.error(`- ${finding.source}: ${finding.name}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Hosted web public env guard passed.");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
