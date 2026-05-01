export type Erc20ResultState =
  | "active"
  | "verification-incomplete"
  | "clear"
  | "no-history";

export function getErc20ResultState(input: {
  activeApprovals: number;
  failedAllowanceReads: number;
  discoveredPairs: number;
}): Erc20ResultState {
  if (input.activeApprovals > 0) return "active";
  if (input.failedAllowanceReads > 0) return "verification-incomplete";
  if (input.discoveredPairs > 0) return "clear";
  return "no-history";
}
