import { handle, type IdParams } from "@/server/http";
import { getHelp } from "@/server/practice-service";
import { resolveAi } from "@/server/publik/gate";

/** "Help me": translation of the counterpart's last line plus a suggested answer. */
export async function POST(request: Request, { params }: IdParams) {
  return handle(request, async ({ ctx, sid }) => getHelp(ctx, await resolveAi(ctx, sid), sid, (await params).id), { usesAi: true });
}

/** AI calls (transcription, feedback) can take longer than a serverless default. */
export const maxDuration = 60;
