import { handle, readJson, type IdParams } from "@/server/http";
import { markPhrase } from "@/server/practice-service";

export async function PATCH(request: Request, { params }: IdParams) {
  return handle(request, async ({ ctx, sid }) => ({ phrase: markPhrase(ctx, sid, (await params).id, await readJson(request)) }));
}
