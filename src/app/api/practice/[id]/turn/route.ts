import { AppError } from "@/server/errors";
import { handle, type IdParams } from "@/server/http";
import { takeTurn } from "@/server/practice-service";
import { resolveAi } from "@/server/publik/gate";

/** One spoken (multipart "audio") or typed (multipart "text") answer. */
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
      return takeTurn(ctx, ai, sid, (await params).id, {
        audio: audio instanceof Blob ? audio : null,
        text: typeof text === "string" ? text : null,
      });
    },
    { usesAi: true },
  );
}

/** AI calls (transcription, feedback) can take longer than a serverless default. */
export const maxDuration = 60;
