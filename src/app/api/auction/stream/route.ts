import { subscribe } from "@/lib/sse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return subscribe("auction");
}
