export const HARDWARE_WALLET_SECTION_TITLE = "Hardware wallet users";

export const HARDWARE_WALLET_SIGNING_LIMIT_COPY =
  "Pulse Revoke does not manage hardware-wallet signing directly.";

export const HARDWARE_WALLET_PROVIDER_COPY =
  "Hardware wallets may work through the wallet provider you already use. Pulse Revoke prepares standard revoke transactions, but your wallet provider and device handle signing.";

export const HARDWARE_WALLET_REVIEW_COPY =
  "Use your preferred wallet provider, such as Rabby or MetaMask, with your hardware wallet. Before confirming, verify the chain, token or NFT collection, spender or operator address, and function on your wallet or device.";

export const HARDWARE_WALLET_CANCEL_COPY =
  "Cancel if your wallet or device shows a transfer, swap, bridge, new approval, unknown function, unexpected spender, or unreasonable fee.";

export const HARDWARE_WALLET_EXPECTED_REVOKE_FUNCTIONS = [
  "approve(spender, 0)",
  "setApprovalForAll(operator, false)",
  "approve(0x0, tokenId)",
] as const;

export const HARDWARE_WALLET_CONFIRMATION_COPY =
  "Hardware wallet user? Verify the chain, asset, spender, and function on your device before confirming. Pulse Revoke does not manage hardware-wallet signing directly.";

export const HARDWARE_WALLET_EXPECTED_REVOKE_CALLS = [
  {
    label: "ERC-20 revoke",
    call: "approve(spender, 0)",
  },
  {
    label: "NFT operator revoke",
    call: "setApprovalForAll(operator, false)",
  },
  {
    label: "NFT per-token revoke",
    call: "approve(0x0, tokenId)",
  },
] as const;

export const HARDWARE_WALLET_COMPATIBILITY_ROWS = [
  {
    setup: "MetaMask with hardware wallet",
    handling: "User managed",
    review: "Verify on device",
  },
  {
    setup: "Rabby with hardware wallet",
    handling: "User managed",
    review: "Verify on device",
  },
  {
    setup: "Direct device or QR flow",
    handling: "Not part of Pulse Revoke",
    review: "Use your wallet provider instead",
  },
  {
    setup: "Direct hardware wallet connection",
    handling: "Not part of Pulse Revoke",
    review: "No app-managed signing session",
  },
] as const;
