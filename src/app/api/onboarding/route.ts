import { OnboardingSchema } from "@/domain/onboarding";
import { AppError } from "@/server/errors";
import { handle, readJson } from "@/server/http";

/**
 * Saves the first-run answers (what the person needs English for, what gets in the way, their starting
 * confidence and their setup). One row per browser session; no name, no email.
 */
export async function POST(request: Request) {
  return handle(request, async ({ ctx, sid }) => {
    const body = OnboardingSchema.safeParse(await readJson(request));
    if (!body.success) throw new AppError("invalid_input");
    const now = ctx.now().toISOString();
    await ctx.store.getOrCreateUser(sid, now);
    const saved = await ctx.store.saveOnboarding(sid, body.data, now);
    return { saved: true, completed: saved.completed };
  });
}
