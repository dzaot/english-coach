import { handle, readJson } from "@/server/http";
import { startPractice } from "@/server/practice-service";
import { resolveAi } from "@/server/publik/gate";

export async function POST(request: Request) {
  return handle(
    request,
    async ({ ctx, sid }) => {
      const body = await readJson(request);
      return startPractice(ctx, resolveAi(ctx, sid), sid, body);
    },
    { usesAi: true },
  );
}
