import { OnboardingSchema } from "@/domain/onboarding";
import { AppError } from "@/server/errors";
import { handle, readJson } from "@/server/http";
import { requireSignedIn } from "@/server/publik/gate";

/**
 * Saves the first-run answers (what the person needs English for, what gets in the way, their starting
 * confidence and their setup). One row per browser session; no name, no email.
 * Only for someone past Sign in with publik, so the answers come from real people using the app.
 */
export async function POST(request: Request) {
  return handle(
    request,
    async ({ ctx, sid }) => {
      await requireSignedIn(ctx, sid);
      const body = OnboardingSchema.safeParse(await readJson(request));
      if (!body.success) throw new AppError("invalid_input");
      const now = ctx.now().toISOString();
      const saved = await ctx.store.saveOnboarding(sid, body.data, now);
      return { saved: true, completed: saved.completed };
    },
    { savesAnswers: true },
  );
}
