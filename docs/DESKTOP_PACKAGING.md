# Desktop Packaging Plan

## Recommendation: Tauri + Next.js static export

Ship the desktop app as a **Tauri shell** wrapping a **statically-exported
Next.js build**. This is the smallest path to a signed, distributable
binary on all three platforms with no changes to the existing web product or
scanner logic.

---

## Option comparison

| Criterion | Tauri | Electron | PWA |
|---|---|---|---|
| Binary size | ~15–30 MB | ~120–150 MB | no binary |
| Rendering engine | OS webview | bundled Chromium | browser tab |
| Windows | WebView2 (pre-installed Win10/11) | always works | Chrome/Edge |
| macOS | WKWebView (always available) | always works | Safari/Chrome |
| Linux | WebKit2GTK (must be installed) | always works | Chrome/Firefox |
| Wallet: injected ext | ✗ extensions don't work in webview | ✓ via `loadExtension()` | ✓ same as web |
| Wallet: WalletConnect | ✓ outbound WS works | ✓ | ✓ |
| Offline / local | ✓ no server needed | ✓ no server needed | ✗ (RPC still needed) |
| Language requirement | Rust (config only for MVP) | JS/Node.js | none |
| IPFS distribution fit | ✓ small binary | ✗ 150 MB limit | n/a |
| Maintenance burden | Low (wagmi handles most; Rust only for native extras) | Medium (Chromium release cadence) | None |

### Why not Electron

Electron is defensible if wallet extension injection is a hard requirement
(MetaMask browser extension running inside the app). For this app it is
not — WalletConnect covers the primary mobile + hardware wallet case on
PulseChain, and the target audience is comfortable with QR pairing. Electron's
150 MB binary also works against IPFS distribution credibility.

### Why not PWA

PWA is a useful zero-cost supplement (add a `manifest.json` and a service
worker) but does not meet the goal of a signed downloadable binary with an
entry in the launcher's downloads grid.

---

## Codebase suitability

The current `/app` build is nearly ideal for Tauri wrapping:

- **No server-side code.** No API routes exist. All blockchain reads go
  directly from wagmi/viem through HTTP RPC. `output: 'export'` can be
  enabled with one line.
- **No browser-API coupling in hooks.** The six hooks in `src/hooks/`
  use only `fetch()`, wagmi hooks, and React state. The only `document`
  usage is `document.addEventListener` in `connect-wallet-button.tsx`
  for menu dismiss — a non-issue in the Tauri webview.
- **Configurable RPC.** `NEXT_PUBLIC_PULSECHAIN_RPC_URL` and
  `NEXT_PUBLIC_PULSECHAIN_EXPLORER_API` are both env-variable-driven;
  baked into the desktop build at compile time.

---

## Wallet connectivity in the webview — main risk

This is the most important architectural difference from the web product.

| Connector | Web `/app` | Tauri webview |
|---|---|---|
| Injected (EIP-6963) — MetaMask, Rabby | ✓ extension injects `window.ethereum` | ✗ browser extensions don't run inside webviews |
| WalletConnect v2 QR | ✓ | ✓ outbound WebSocket works |
| Hardware via WalletConnect | ✓ | ✓ |

**Practical consequence for v1:** the desktop build should ship with
`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` baked in. WalletConnect covers the
dominant PulseChain user (MetaMask Mobile, Rabby Mobile, hardware wallets).
Pure MetaMask-desktop-only users are not served by the injected path in a
webview — they must scan a QR or use the web app instead.

**Future path for injected wallets:** Tauri supports custom protocol
handlers and initialization scripts. A preload bridge can expose
`window.ethereum` backed by a Tauri sidecar (e.g., a local wallet unlock
or hardware wallet passthrough). This is out of scope for v1.

---

## Structural changes required

| Change | Risk | Notes |
|---|---|---|
| Add `output: 'export'` to `next.config.ts` | Low | No SSR used; all pages are already static. ImageResponse icon routes (`icon.tsx`, `apple-icon.tsx`, `opengraph-image.tsx`) pre-render fine. `sitemap.ts` and `robots.ts` export to `sitemap.xml` / `robots.txt`. |
| Bake `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` at desktop build time | Low | Already optional; just must be present for desktop. |
| `src-tauri/` scaffold | Isolated | New directory, no coupling to web code. |
| macOS notarization + Windows signing | Medium | Standard for distribution; Apple notarization requires a paid developer account. |

No changes to scanner logic, telemetry, `/app` route, or `src/lib/release.ts`.

---

## Implementation steps (when ready)

```
# 1. Enable static export (one-liner in next.config.ts):
#    output: 'export'

# 2. Scaffold Tauri (adds src-tauri/ only):
npm install --save-dev @tauri-apps/cli@^2
npx tauri init
```

Key `tauri.conf.json` settings:
```json
{
  "build": {
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../out"
  },
  "app": {
    "windows": [{ "title": "Pulse Revoke", "width": 1200, "height": 800 }]
  }
}
```

After that, `npx tauri build` produces:
- Windows: `.msi` + `.exe` (NSIS)
- macOS: `.dmg` + `.app` (notarize with `tauri-action` on GitHub Actions)
- Linux: `.AppImage` + `.deb`

These map directly to the four `id` values already declared in
`currentRelease.artifacts` in `src/lib/release.ts`.

---

## GitHub Actions

Tauri's official `tauri-apps/tauri-action` covers all three platforms via a
matrix build on `ubuntu-latest`, `macos-latest`, `windows-latest`. It handles
code signing secrets, notarization tokens, and uploads artifacts. This is
the recommended CI path.

---

## Open questions before implementation

1. **WalletConnect project ID for desktop** — use the same Reown project as
   the web app, or register a separate one? Separate is cleaner (allows
   per-platform analytics and revocation).
2. **macOS Developer ID** — notarization requires an Apple Developer Program
   account ($99/year). Required for Gatekeeper pass without user override.
3. **Windows signing cert** — EV cert recommended to avoid SmartScreen
   warnings. Optional for initial release.
4. **Auto-update** — Tauri's `tauri-plugin-updater` can point at GitHub
   Releases for OTA updates. Opt-in; not required for v1.
5. **IPFS build** — the `out/` static bundle can be pinned directly to IPFS.
   The CID then replaces `LAUNCHER_PLACEHOLDER_CID` in `src/lib/release.ts`.
