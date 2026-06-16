# Trezor Official Store Source Packet

## Status

Curated outbound resource context only.

This source packet does not make any listed hostname endorsed, guaranteed,
current, or free of risk. It documents the reviewed official Trezor store link
used in the public resources section.

## Source

- Source label: `Trezor official store`
- Official store page: `https://trezor.io/store`
- Logo source: `https://trezor.io/` site header SVG
- Captured: `2026-06-16`
- Registry file: `src/lib/pulsechain-resources.ts`

## Extraction Summary

- Official merchant hostname displayed: `trezor.io`
- Local logo asset: `public/protocol-logos/trezor.svg`
- Import mode: explicit curated outbound link
- Runtime matching: none
- Official-domain registry promotion: none

## Safety Rules

- The Trezor resource action must use `https://trezor.io/store`.
- The Trezor card must use a local logo asset, not a remote hotlink.
- No referral, affiliate, discount, or redirect URL is included.
- This packet does not change wallet signing, custody, recovery, or revoke
  behavior.

## Review Checklist

- Confirm the action uses `https://trezor.io/store`.
- Confirm resource copy says listed links are not financial advice or a safety
  guarantee.
- Confirm no server-side signing, relayer, custody, recovery, or hardware-wallet
  dependency is introduced.
