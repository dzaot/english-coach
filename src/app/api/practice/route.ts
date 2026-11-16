import { handle, readJson } from "@/server/http";
import { startPractice } from "@/server/practice-service";
import { resolveAi } from "@/server/publik/gate";

export async function POST(request: Request) {
  return handle(
    request,
    async ({ ctx, sid }) => {
      const body = await readJson(request);
      return startPractice(ctx, await resolveAi(ctx, sid), sid, body);
    },
    { usesAi: true },
  );
}

/** AI calls (transcription, feedback) can take longer than a serverless default. */
export const maxDuration = 60;
