import { handle } from "@/server/http";
import { pronounceGuide } from "@/server/pronounce";

/** POST { text }: how each word sounds and which sounds to watch. */
export async function POST(request: Request) {
  return handle(request, async () => pronounceGuide(await request.json().catch(() => null)));
}
