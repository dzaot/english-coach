import { AppError } from "@/server/errors";
import { EventStream, handle, type IdParams } from "@/server/http";
import { takeTurn } from "@/server/practice-service";
import { resolveAi } from "@/server/publik/gate";

/**
 * One spoken (multipart "audio") or typed (multipart "text") answer, streamed as JSON lines:
 * heard (your words), check (marks), reply (the partner's words), voice (their audio), then done.
 */
export async function POST(request: Request, { params }: IdParams) {
  return handle(
    request,
    async ({ ctx, sid }) => {
      const ai = await resolveAi(ctx, sid);
      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        throw new AppError("invalid_input");
      }
      const audio = form.get("audio");
      const text = form.get("text");
      const id = (await params).id;
      const answer = { audio: audio instanceof Blob ? audio : null, text: typeof text === "string" ? text : null };
      if (!answer.audio && answer.text === null) throw new AppError("invalid_input");
      return new EventStream(async (send) => ({ ...(await takeTurn(ctx, ai, sid, id, answer, { onEvent: send, voice: true })) }));
    },
    { usesAi: true },
  );
}

/** AI calls (transcription, feedback) can take longer than a serverless default. */
export const maxDuration = 60;
