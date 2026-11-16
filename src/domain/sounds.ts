/**
 * Sound coach: how a word sounds in General American English and which sounds are hard for Spanish speakers.
 * Works on ARPAbet pronunciations (CMU Pronouncing Dictionary). It predicts likely trouble spots from the
 * words themselves; it does not listen to the learner. Rules and tips: see BRAND.md and STATUS.md sources.
 */

export type SoundId =
  | "s_cluster" | "th" | "v" | "short_i" | "ed_ending" | "final_cluster" | "ae" | "z_sound" | "flap_t"
  | "sh" | "j" | "h" | "ng" | "schwa" | "stress" | "dark_l" | "r";

export interface SoundTip {
  readonly id: SoundId;
  /** Short English label shown on the chip. */
  readonly label: string;
  readonly example: string;
  readonly tipEs: string;
  readonly tipEn: string;
}

export interface Syllable {
  readonly phones: readonly string[];
  /** 1 primary, 2 secondary, 0 unstressed. */
  readonly stress: number;
}

export interface WordGuide {
  /** The word as written in the sentence. */
  readonly text: string;
  readonly key: string;
  /** Respelling like "uh-THAW-ruh-dee"; null when the word is not in the dictionary. */
  readonly respelling: string | null;
  readonly syllables: number;
  /** Index of the stressed syllable. */
  readonly stressed: number | null;
  readonly tips: readonly SoundTip[];
}

export type Lookup = (word: string) => string | null;

export const MAX_TIPS_PER_WORD = 2;

const VOWELS = new Set(["AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW"]);
const base = (phone: string) => phone.replace(/\d/g, "");
const isVowel = (phone: string) => VOWELS.has(base(phone));
const stressOf = (phone: string) => Number(phone.match(/\d/)?.[0] ?? 0);

const SPELL: Record<string, string> = {
  AA: "ah", AE: "a", AH: "uh", AO: "aw", AW: "ow", AY: "y", EH: "eh", ER: "er", EY: "ay", IH: "ih", IY: "ee",
  OW: "oh", OY: "oy", UH: "u", UW: "oo", B: "b", CH: "ch", D: "d", DH: "th", F: "f", G: "g", HH: "h", JH: "j",
  K: "k", L: "l", M: "m", N: "n", NG: "ng", P: "p", R: "r", S: "s", SH: "sh", T: "t", TH: "th", V: "v", W: "w",
  Y: "y", Z: "z", ZH: "zh",
};

/** Splits phones into syllables: one vowel each; a single middle consonant starts the next syllable. */
export function syllabify(phones: readonly string[]): Syllable[] {
  const vowelAt = phones.flatMap((p, i) => (isVowel(p) ? [i] : []));
  if (vowelAt.length === 0) return phones.length ? [{ phones: [...phones], stress: 0 }] : [];
  const starts = vowelAt.map((v, k) => {
    if (k === 0) return 0;
    const between = v - vowelAt[k - 1] - 1;
    return between <= 1 ? v - between : vowelAt[k - 1] + 2;
  });
  return vowelAt.map((v, k) => ({
    phones: phones.slice(starts[k], k + 1 < starts.length ? starts[k + 1] : phones.length),
    stress: stressOf(phones[v]),
  }));
}

/** A t between vowels (or after r) that starts a weak syllable sounds like a soft d in American English. */
function flapIndexes(phones: readonly string[]): Set<number> {
  const out = new Set<number>();
  phones.forEach((p, i) => {
    if (p !== "T" || i === 0 || i + 1 >= phones.length) return;
    const prev = phones[i - 1];
    const next = phones[i + 1];
    if ((isVowel(prev) || prev === "R") && isVowel(next) && stressOf(next) === 0) out.add(i);
  });
  return out;
}

/** "AH0 TH AO1 R AH0 T IY0" -> "uh-THAW-ruh-dee". */
export function respell(pronunciation: string): string {
  const phones = pronunciation.trim().split(/\s+/);
  const flaps = flapIndexes(phones);
  let index = 0;
  return syllabify(phones)
    .map((syl) => {
      const text = syl.phones.map((p) => (flaps.has(index++) ? "d" : (SPELL[base(p)] ?? base(p).toLowerCase()))).join("");
      return syl.stress === 1 ? text.toUpperCase() : text;
    })
    .join("-");
}

const TIPS: Record<SoundId, Omit<SoundTip, "id">> = {
  s_cluster: { label: "No “e” before s", example: "speak, school, study", tipEs: "Empieza directo con sss, sin una e antes: sss-peak, no espeak.", tipEn: "Start right on the s, with no e before it: sss-peak." },
  th: { label: "TH sound", example: "think, the, three", tipEs: "Saca un poco la punta de la lengua entre los dientes y sopla.", tipEn: "Put the tip of your tongue between your teeth and blow." },
  v: { label: "V, not B", example: "very, vote, review", tipEs: "Dientes de arriba sobre el labio de abajo, y que vibre: vvv.", tipEn: "Top teeth on your bottom lip and buzz: vvv." },
  short_i: { label: "Short i", example: "ship vs sheep, live vs leave", tipEs: "Esta i es corta y relajada, con la boca casi cerrada. No la estires.", tipEn: "Keep this i short and relaxed. Do not stretch it into ee." },
  ed_ending: { label: "-ed sounds like t or d", example: "worked, asked, planned", tipEs: "La -ed no suena como sílaba aparte: worked se dice workt.", tipEn: "The -ed is not its own syllable here: worked sounds like workt." },
  final_cluster: { label: "Finish the word", example: "best, months, asked", tipEs: "Termina la palabra: que se oigan las últimas consonantes.", tipEn: "Finish the word so the last consonants are heard." },
  ae: { label: "Open a", example: "cat, plan, manager", tipEs: "Abre mucho la boca, entre a y e, como si sonrieras.", tipEn: "Open your mouth wide, between a and e." },
  z_sound: { label: "Buzzing s", example: "is, was, because, plans", tipEs: "Esta s zumba como abeja: zzz. Toca tu garganta y siente la vibración.", tipEn: "This s buzzes like a bee: zzz." },
  flap_t: { label: "Soft t", example: "water, better, meeting", tipEs: "Entre vocales, la t suena como la r suave de pero: wa-der.", tipEn: "Between vowels the t is quick and soft, almost a d: wa-der." },
  sh: { label: "SH sound", example: "share, should, issue", tipEs: "Sin golpe, como cuando pides silencio: shhh.", tipEn: "No tap, like asking for quiet: shhh." },
  j: { label: "J sound", example: "job, manager, project", tipEs: "Como una ch con voz, no como una y: job, no yob.", tipEn: "Like ch with your voice on, not a y." },
  h: { label: "Soft h", example: "hello, help, how", tipEs: "La h es solo aire suave, sin raspar la garganta como la jota.", tipEn: "Just a soft breath, not a scratchy throat sound." },
  ng: { label: "NG ending", example: "working, meeting, thing", tipEs: "No pronuncies la g: termina con la lengua atrás, nnng.", tipEn: "Do not add a g. End with the back of your tongue: nnng." },
  schwa: { label: "Weak vowel", example: "about, problem, today", tipEs: "Las sílabas débiles se dicen cortas y relajadas, como uh.", tipEn: "Say the weak syllables short and relaxed, like uh." },
  stress: { label: "Stress", example: "deVELop, PHOtograph", tipEs: "Sube y alarga la sílaba en mayúsculas; las otras van rápidas.", tipEn: "Make the capital syllable longer and louder; rush the others." },
  dark_l: { label: "Dark l", example: "feel, call, people", tipEs: "Al final, la l es oscura: la lengua va atrás, casi como ou.", tipEn: "At the end, the l is dark: pull your tongue back." },
  r: { label: "American r", example: "right, work, very", tipEs: "La r no vibra: curva la lengua sin tocar el paladar.", tipEn: "Do not tap or roll it. Curl your tongue without touching the roof." },
};

const CLUSTER_AFTER_S = new Set(["P", "T", "K", "M", "N", "L", "W"]);

/** Most important first: these change meaning or mark the accent the most for Spanish speakers. */
const DETECTORS: ReadonlyArray<readonly [SoundId, (phones: readonly string[], word: string) => boolean]> = [
  ["s_cluster", (p) => p[0] === "S" && CLUSTER_AFTER_S.has(p[1] ?? "")],
  ["th", (p) => p.includes("TH") || p.includes("DH")],
  ["v", (p) => p.includes("V")],
  ["short_i", (p) => p.some((x) => x === "IH1" || x === "IH2")],
  ["ed_ending", (p, w) => w.endsWith("ed") && ["T", "D"].includes(p[p.length - 1]) && !isVowel(p[p.length - 2] ?? "AH0")],
  ["final_cluster", (p) => p.length >= 3 && !isVowel(p[p.length - 1]) && !isVowel(p[p.length - 2])],
  ["ae", (p) => p.some((x) => base(x) === "AE")],
  ["z_sound", (p, w) => p.includes("Z") && w.includes("s")],
  ["flap_t", (p) => flapIndexes(p).size > 0],
  ["sh", (p) => p.includes("SH")],
  ["j", (p) => p.includes("JH")],
  ["h", (p) => p.includes("HH")],
  ["ng", (p) => p.includes("NG")],
  ["schwa", (p) => p.includes("AH0") && syllabify(p).length >= 2],
  ["stress", (p) => syllabify(p).length >= 3],
  ["dark_l", (p) => p.some((x, i) => x === "L" && (i === p.length - 1 || !isVowel(p[i + 1])))],
  ["r", (p) => p.includes("R") || p.some((x) => base(x) === "ER")],
];

export function soundTipsFor(word: string, phones: readonly string[]): SoundTip[] {
  const key = word.toLowerCase();
  return DETECTORS.filter(([, detect]) => detect(phones, key))
    .slice(0, MAX_TIPS_PER_WORD)
    .map(([id]) => ({ id, ...TIPS[id] }));
}

const toKey = (text: string) => text.toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z']/g, "");

export function guideWord(text: string, lookup: Lookup): WordGuide {
  const key = toKey(text);
  const pronunciation = key ? lookup(key) : null;
  if (!pronunciation) return { text, key, respelling: null, syllables: 0, stressed: null, tips: [] };
  const phones = pronunciation.trim().split(/\s+/);
  const syllables = syllabify(phones);
  const stressed = syllables.findIndex((s) => s.stress === 1);
  return {
    text,
    key,
    respelling: respell(pronunciation),
    syllables: syllables.length,
    stressed: stressed === -1 ? null : stressed,
    tips: soundTipsFor(key, phones),
  };
}

export function guideText(sentence: string, lookup: Lookup): WordGuide[] {
  return sentence.split(/\s+/).filter(Boolean).map((w) => guideWord(w, lookup));
}
