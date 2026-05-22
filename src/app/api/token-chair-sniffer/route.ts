import { GET as marketGET } from "./market/route";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return marketGET(request);
}
