export function isWalletLifeboatEnabled(): boolean {
  return process.env.NEXT_PUBLIC_WALLET_LIFEBOAT_ENABLED === "true";
}
