/** Practice partners the person can pick. Photos are AI-generated portraits of fictional people. */

export const AVATAR_IDS = ["sarah", "james", "priya", "daniel"] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];

export interface Avatar {
  readonly id: AvatarId;
  readonly name: string;
  /** Voice for publik's /audio/speech (OpenAI voice names). */
  readonly voice: string;
  readonly image: string;
  readonly alt: string;
  readonly vibe: string;
}

export const AVATARS: readonly Avatar[] = [
  { id: "sarah", name: "Sarah", voice: "nova", image: "/avatars/sarah.webp", alt: "Sarah, a woman with light brown hair in a navy blazer", vibe: "Warm and encouraging" },
  { id: "james", name: "James", voice: "onyx", image: "/avatars/james.webp", alt: "James, a man with a short beard in a light blue shirt", vibe: "Calm and direct" },
  { id: "priya", name: "Priya", voice: "shimmer", image: "/avatars/priya.webp", alt: "Priya, a woman with long dark hair and glasses", vibe: "Sharp and curious" },
  { id: "daniel", name: "Daniel", voice: "echo", image: "/avatars/daniel.webp", alt: "Daniel, a man with dark wavy hair in a grey sweater", vibe: "Relaxed and friendly" },
];

export function isAvatarId(value: unknown): value is AvatarId {
  return typeof value === "string" && (AVATAR_IDS as readonly string[]).includes(value);
}

export function getAvatar(id: AvatarId): Avatar {
  const found = AVATARS.find((a) => a.id === id);
  if (!found) throw new Error(`Unknown avatar: ${String(id)}`);
  return found;
}
