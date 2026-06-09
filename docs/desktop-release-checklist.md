# Desktop Release Checklist

This checklist covers the Windows x64 internal beta package:
`pulse-revoke-server_0.1.0-beta.1_windows_amd64.zip`.

## Windows prerequisites

- Rust stable MSVC or GNU Windows x64 toolchain is installed.
- `cargo` and `rustc` are available on `PATH`.
- Matching native build tools are installed for the selected Rust toolchain.
- Node.js and npm match the web app support target.

## Required build environment

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is recommended for WalletConnect
  pairing.
- `NEXT_PUBLIC_PULSECHAIN_RPC_URL` is optional. If unset, the PulseChain
  default RPC from source is used.
- `NEXT_PUBLIC_*` explorer API keys are public in a static desktop build. Use
  only keys intended for public client-side use.
- Do not commit local `.env` files or release secrets.

## Build sequence

PowerShell:

```powershell
git diff --check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run build:desktop
cargo build --manifest-path src-tauri\Cargo.toml --release --bin pulse-revoke-server
```

## Packaging sequence

1. Copy the built `pulse-revoke-server.exe` to a staging directory.
2. Create
   `public\downloads\pulse-revoke-server_0.1.0-beta.1_windows_amd64.zip`.
3. Confirm the zip contains exactly one file:
   `pulse-revoke-server.exe`.
4. Compute SHA-256 for the zip and the staged EXE.
5. Publish
   `public\downloads\pulse-revoke-server_0.1.0-beta.1_checksums.txt`.
6. Publish
   `public\downloads\pulse-revoke-server_0.1.0-beta.1_instructions.txt`.

## Runtime verification

Run the EXE from a temp folder and verify:

- `/app/` returns `200`
- `/app/wallet-lifeboat` returns `404`
- `/security/check-link` returns `404`
- `/api/lifeboat/sweeper` returns `404`
- the server is bound to `127.0.0.1`
- bundled static assets load
- gas context uses the desktop public-RPC fallback instead of `/api/gas`
- account-code/delegation checks use the desktop public-RPC fallback instead
  of `/api/lifeboat/eip7702`
- Ethereum approval discovery shows the desktop web-only limitation instead of
  a raw `/api/ethereum/approvals` failure

Stop the test process before packaging handoff.

## Preview verification

- Push the branch.
- Capture the Vercel preview URL if available.
- Verify the launcher renders the Windows beta download, checksum, and
  instructions links.
- Download the preview zip and confirm its SHA-256 matches the preview checksum
  file.
- Do not claim production is live until `main` is merged and
  `https://pulserevoke.com` is verified.

## Security notes

- Pulse Revoke is non-custodial and must never ask for seed phrases or private
  keys.
- Users approve every revoke transaction in their own wallet.
- Address-only scans stay read-only.
- Revoke actions remain gated by wallet match, chain match, live row
  verification, preflight, and gas checks.
- Wallet Lifeboat remains frozen.
- Link Checker remains removed.
- Do not add custody, server-side signing, relayers, rescue wallets, rescue
  contracts, gas funding, private bundles, or automatic asset transfers.
