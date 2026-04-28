import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const child = spawn(process.execPath, [nextBin, "build"], {
  env: {
    ...process.env,
    TAURI_BUILD: "1",
    NEXT_PUBLIC_TAURI_BUILD: "1",
  },
  shell: false,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`next build terminated by ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 1);
});
