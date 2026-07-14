import { handleTokenContractReportStreamPost } from "./handler";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  return handleTokenContractReportStreamPost(request);
}
