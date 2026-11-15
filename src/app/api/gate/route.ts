import { handle, readJson } from "@/server/http";
import { applyGateAction, getGateState } from "@/server/publik/gate";

/** Sign in with publik: where this browser session stands, and the answers on the plan screen. */
export async function GET(request: Request) {
  return handle(request, ({ ctx, sid }) => getGateState(ctx, sid));
}

export async function POST(request: Request) {
  return handle(request, async ({ ctx, sid }) => applyGateAction(ctx, sid, await readJson(request)));
}
