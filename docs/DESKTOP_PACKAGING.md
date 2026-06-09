# Desktop Packaging

## Current beta model

Pulse Revoke's Windows x64 internal beta is packaged like the official
PulseChain server projects: a zip contains one executable. The executable
embeds the static `out/` build, starts a loopback server on
`127.0.0.1:<dynamic-port>`, and opens the user's default browser to `/app/`.

This keeps browser wallet extensions available. The desktop beta is not a
WebView-only wallet surface.

## Official source pattern

The reference PulseChain server READMEs use the same simple distribution
shape:

- offer a pre-built binary package
- let advanced users build from source
- run a lightweight local web server

Source anchors:

- PulseChain GitLab group: <https://gitlab.com/pulsechaincom>
- PulseX server README:
  <https://gitlab.com/pulsechaincom/pulsex-server/-/raw/master/README.md>
- HEX server README:
  <https://gitlab.com/pulsechaincom/hex-server/-/raw/master/README.md>
- Bridge server README:
  <https://gitlab.com/pulsechaincom/pulsechain-bridge-server/-/raw/master/README.md>
- Explorer server README:
  <https://gitlab.com/pulsechaincom/pulsechain-explorer-server/-/raw/master/README.md>
- PulseChain mainnet README:
  <https://gitlab.com/pulsechaincom/pulsechain-mainnet/-/raw/master/README.md>

The mainnet README is also the source for the displayed PulseChain facts:
chain ID `369`, RPC `https://rpc.pulsechain.com`, explorer
`https://scan.pulsechain.com`, and native symbol `PLS`.

## Build flow

PowerShell:

```powershell
npm.cmd install
npm.cmd run build:desktop
cargo build --manifest-path src-tauri\Cargo.toml --release --bin pulse-revoke-server
```

`npm run build:desktop` sets `TAURI_BUILD=1`, which tells `next.config.ts` to
export the static app to `out/`. It also sets
`NEXT_PUBLIC_STATIC_EXPORT_BUILD=1` and
`NEXT_PUBLIC_DESKTOP_LOCAL_SERVER_BUILD=1` so the client knows hosted API routes
are unavailable while browser wallet extensions remain available in the user's
default browser. During the Rust build, `include_dir` embeds that `out/`
directory into the executable.

The raw Windows build output with the default MSVC toolchain is:

```text
src-tauri\target\release\pulse-revoke-server.exe
```

The GNU toolchain output is:

```text
src-tauri\target\x86_64-pc-windows-gnu\release\pulse-revoke-server.exe
```

Release packaging copies that executable to a staging directory without
renaming it.

The published beta package is:

```text
public\downloads\pulse-revoke-server_0.1.0-beta.1_windows_amd64.zip
```

The zip must contain exactly one file:

```text
pulse-revoke-server.exe
```

## Runtime behavior

The executable:

- binds only to `127.0.0.1` on a dynamic port
- prints the local launch URL
- opens `/app/` in the default browser
- serves only embedded static files
- reads gas context from public RPC endpoints in the browser
- reads account-code/delegation status from public RPC endpoints in the browser
- supports `GET` and `HEAD`
- redirects `/app` to `/app/`
- returns `404` for routes not present in the static bundle
- sends defensive static-server headers

The executable does not add API routes, custody, server-side signing, relayers,
wallet recovery, rescue contracts, gas funding, or automatic transfer flows.
Ethereum hosted approval discovery depends on the web app API and is labeled as
web-only in this desktop beta.

## Verification

Run the repo validation suite:

```powershell
git diff --check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run build:desktop
```

Run desktop artifact checks:

```powershell
cargo build --manifest-path src-tauri\Cargo.toml --release --bin pulse-revoke-server
```

Then verify:

- the zip contains exactly one `.exe`
- the zip and EXE SHA-256 hashes match the published checksum file
- the EXE runs from a temp folder
- local `/app/` returns `200`
- local `/app/wallet-lifeboat` returns `404`
- local `/security/check-link` returns `404`
- local API-like routes return `404`
- desktop gas code uses the static-export public RPC path
- desktop account-code/delegation code uses the static-export public RPC path
- desktop Ethereum discovery copy explains that hosted discovery is web-only

## Release guardrails

- Windows x64 is the only beta artifact for `0.1.0-beta.1`.
- The beta is unsigned; Windows may show a SmartScreen warning.
- Production should not show the beta until the branch is merged and the live
  site is verified.
- The release manifest may show branch-preview beta links, but the production
  live claim must only be made after `https://pulserevoke.com` is verified.
- Placeholder IPFS CIDs stay unchanged until a real pinned release exists.
