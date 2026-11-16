import { handle, readJson, type IdParams } from "@/server/http";
import { speakTurn } from "@/server/practice-service";
import { resolveAi } from "@/server/publik/gate";

/** The counterpart's voice for one turn ({ turnIndex }), fetched after its text is shown. */
export async function POST(request: Request, { params }: IdParams) {
  return handle(
    request,
    async ({ ctx, sid }) => speakTurn(ctx, await resolveAi(ctx, sid), sid, (await params).id, await readJson(request)),
    { usesAi: true },
  );
}

/** AI calls (transcription, feedback) can take longer than a serverless default. */
export const maxDuration = 60;
