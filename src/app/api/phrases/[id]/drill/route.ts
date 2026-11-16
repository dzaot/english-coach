import { AppError } from "@/server/errors";
import { handle, type IdParams } from "@/server/http";
import { drillPhrase } from "@/server/practice-service";
import { resolveAi } from "@/server/publik/gate";

/** "Say it": multipart "audio" of the person saying a better phrase, plus "tzOffset". */
export async function POST(request: Request, { params }: IdParams) {
  return handle(
    request,
    async ({ ctx, sid }) => {
      const ai = resolveAi(ctx, sid);
      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        throw new AppError("invalid_input");
      }
      const audio = form.get("audio");
      return drillPhrase(ctx, ai, sid, (await params).id, {
        audio: audio instanceof Blob ? audio : null,
        tzOffset: Number(form.get("tzOffset")),
      });
    },
    { usesAi: true },
  );
}
