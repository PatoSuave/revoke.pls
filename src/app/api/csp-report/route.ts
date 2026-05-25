import { NextResponse } from "next/server";

import { approvalApiNoStoreHeaders } from "@/lib/approval-api-cache";

export const runtime = "nodejs";

export async function POST() {
  return new NextResponse(null, {
    status: 204,
    headers: approvalApiNoStoreHeaders(),
  });
}
