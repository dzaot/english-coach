import { z } from "zod";
import { AppError } from "@/server/errors";
import { handle, readJson } from "@/server/http";
import { recordTelemetry } from "@/server/publik/gate";

const BodySchema = z.object({ event: z.enum(["app_opened", "active_session"]) });

/** Usage counting: the page reports app_opened after the gate and active_session every 30 minutes. */
export async function POST(request: Request) {
  return handle(request, async ({ ctx, sid }) => {
    const body = BodySchema.safeParse(await readJson(request));
    if (!body.success) throw new AppError("invalid_input");
    return { result: await recordTelemetry(ctx, sid, body.data.event) };
  });
}
