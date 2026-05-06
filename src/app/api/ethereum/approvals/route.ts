import { NextResponse } from "next/server";

import {
  ETHEREUM_MAINNET_CHAIN_ID,
  normalizeEthereumOwner,
  scanEthereumApprovals,
} from "@/lib/ethereum-approval-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const unsupportedRangeParam = ["page", "offset", "fromBlock", "toBlock"].find(
    (name) => url.searchParams.has(name),
  );
  if (unsupportedRangeParam) {
    return NextResponse.json(
      {
        ok: false,
        status: "bad-request",
        errors: [
          `Unsupported query param: ${unsupportedRangeParam}. Ethereum approval discovery uses server-bounded windows only.`,
        ],
      },
      { status: 400 },
    );
  }

  const requestedChainId =
    url.searchParams.get("chainId") ?? url.searchParams.get("chainid");
  if (
    requestedChainId !== null &&
    requestedChainId !== ETHEREUM_MAINNET_CHAIN_ID.toString()
  ) {
    return NextResponse.json(
      {
        ok: false,
        status: "bad-request",
        errors: ["Ethereum approvals API only supports chainId=1."],
      },
      { status: 400 },
    );
  }

  const owner = normalizeEthereumOwner(
    url.searchParams.get("owner") ?? url.searchParams.get("address"),
  );

  if (!owner) {
    return NextResponse.json(
      {
        ok: false,
        status: "bad-request",
        errors: ["Provide a valid Ethereum owner address in ?owner=0x..."],
      },
      { status: 400 },
    );
  }

  const result = await scanEthereumApprovals(owner);
  const httpStatus =
    result.status === "config-missing"
      ? 503
      : result.status === "upstream-failure"
        ? 502
        : 200;

  return NextResponse.json(result, { status: httpStatus });
}
