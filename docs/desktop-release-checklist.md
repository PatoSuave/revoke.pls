# Desktop Release Checklist

This checklist prepares Pulse Revoke for a future local desktop executable. It
does not mean a desktop release exists today.

## Windows prerequisites

- Install Rust stable MSVC toolchain.
- Confirm `cargo` and `rustc` are available on `PATH`.
- Install Microsoft C++ Build Tools with "Desktop development with C++".
- Confirm Microsoft Edge WebView2 Runtime is installed.
- If building MSI packages, confirm the Windows VBSCRIPT optional feature is
  enabled. This matters because `src-tauri/tauri.conf.json` currently uses
  `"targets": "all"`, which may include MSI output on Windows.
- Confirm Node.js and npm match the web app support target.

## Required build environment

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is required for practical desktop
  wallet pairing. Browser-extension injected wallets usually do not run inside
  the Tauri WebView.
- `NEXT_PUBLIC_PULSECHAIN_RPC_URL` is optional. If unset, the PulseChain
  default RPC from `src/lib/chains.ts` is used.
- `NEXT_PUBLIC_BSC_RPC_URL` is optional. If unset, the BSC public fallback RPC
  from `src/lib/chains.ts` is used.
- `NEXT_PUBLIC_PULSECHAIN_EXPLORER_API` is optional. If unset, the PulseScan
  API default is used.
- `NEXT_PUBLIC_BSC_EXPLORER_API_URL` is an optional BSC historical logs API
  override. It defaults to Etherscan API V2 at
  `https://api.etherscan.io/v2/api`; the old BscScan V1 endpoint is deprecated
  for this logs flow.
- `NEXT_PUBLIC_BSC_EXPLORER_CHAIN_ID` should be unset or set to `56`.
- `NEXT_PUBLIC_BSC_EXPLORER_API_KEY` is required for BSC discovery. It should
  be an Etherscan API V2 key with BNB Smart Chain access.
- `NEXT_PUBLIC_BSCSCAN_API_KEY` remains a deprecated fallback key name for older
  deploys.

Do not commit local `.env` files or release secrets.

## Icon requirements

- `src-tauri/icons` currently contains only `.gitkeep`.
- Add real generated icon assets before any desktop release:
  - `32x32.png`
  - `128x128.png`
  - `128x128@2x.png`
  - `icon.ico`
  - `icon.icns`
- Keep icon generation reproducible from a source image committed or archived
  with the release process.

## Build verification sequence

Run these before packaging:

```powershell
npm run lint
npm run typecheck
npm run build
npm run build:desktop
```

Only after Rust, Cargo, native Windows prerequisites, icons, and release
policy are ready, run:

```powershell
npm run tauri -- build
```

Do not run a production Tauri build for release from a machine with missing
prerequisites or incomplete release metadata.

## Release artifact policy

- Do not publish desktop download links until real artifacts exist.
- Do not replace the placeholder IPFS CID until a real build is pinned.
- Publish SHA-256 checksums with every public desktop artifact.
- Decide the signing policy before public distribution. Code signing is not
  currently configured.
- Verify EXE/MSI artifacts on a clean Windows machine before announcing them.
- Update `src/lib/release.ts` only with real URLs, checksums, and CID values.

## Security notes

- Pulse Revoke is non-custodial and must never ask for seed phrases or private
  keys.
- Users approve every revoke transaction in their own wallet.
- The scanner should stay read-only until the user clicks a revoke action.
- Keep Tauri permissions minimal. Do not add shell or filesystem permissions
  unless a reviewed feature explicitly requires them.
- Preserve scanner logic, wallet logic, revoke transaction logic, chain IDs,
  ABIs, registries, and approval discovery logic during packaging work.
