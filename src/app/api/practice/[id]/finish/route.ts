import { handle, readJson, type IdParams } from "@/server/http";
import { finishPractice } from "@/server/practice-service";
import { resolveAi } from "@/server/publik/gate";

export async function POST(request: Request, { params }: IdParams) {
  return handle(
    request,
    async ({ ctx, sid }) => {
      const ai = await resolveAi(ctx, sid);
      const body = (await readJson(request)) as { tzOffset?: unknown; powerPhraseId?: unknown } | null;
      return finishPractice(ctx, ai, sid, (await params).id, { tzOffset: body?.tzOffset, powerPhraseId: body?.powerPhraseId });
    },
    { usesAi: true },
  );
}

/** AI calls (transcription, feedback) can take longer than a serverless default. */
export const maxDuration = 60;
