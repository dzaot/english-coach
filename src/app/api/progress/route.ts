import { handle } from "@/server/http";
import { getProgress } from "@/server/practice-service";

/** Streak, finished sessions and phrases to review. `?tz=` is the browser's getTimezoneOffset(). */
export async function GET(request: Request) {
  return handle(request, async ({ ctx, sid }) => {
    const raw = new URL(request.url).searchParams.get("tz");
    return getProgress(ctx, sid, raw === null || raw === "" ? Number.NaN : Number(raw));
  });
}
