import { handle, type IdParams } from "@/server/http";
import { getPractice } from "@/server/practice-service";

export async function GET(request: Request, { params }: IdParams) {
  return handle(request, async ({ ctx, sid }) => ({ practice: await getPractice(ctx, sid, (await params).id) }));
}
