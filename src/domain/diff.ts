/**
 * Letter-by-letter difference between what someone said and a better version.
 * Words are aligned first, so whole words are kept, removed or added; a replaced word is then compared
 * letter by letter ("work" to "worked" keeps w-o-r-k and adds e-d).
 */

export type DiffOp = "same" | "del" | "add";

export interface DiffPart {
  readonly op: DiffOp;
  readonly text: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'");
const bare = (s: string) => norm(s).replace(/[^a-z0-9']/g, "");

/** Longest-common-subsequence alignment of two sequences, as same/del/add steps. */
function align<T>(a: readonly T[], b: readonly T[], eq: (x: T, y: T) => boolean): { op: DiffOp; a?: T; b?: T }[] {
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = eq(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: { op: DiffOp; a?: T; b?: T }[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && eq(a[i], b[j])) {
      out.push({ op: "same", a: a[i], b: b[j] });
      i++;
      j++;
    } else if (j >= b.length || (i < a.length && dp[i + 1][j] >= dp[i][j + 1])) {
      out.push({ op: "del", a: a[i] });
      i++;
    } else {
      out.push({ op: "add", b: b[j] });
      j++;
    }
  }
  return out;
}

/** Joins neighbours with the same op so "w","o","r","k" renders as one "work". */
function merge(parts: readonly DiffPart[]): DiffPart[] {
  return parts.reduce<DiffPart[]>((acc, p) => {
    const last = acc[acc.length - 1];
    if (last && last.op === p.op) return [...acc.slice(0, -1), { op: p.op, text: last.text + p.text }];
    return p.text ? [...acc, p] : acc;
  }, []);
}

/** Letter diff of two single words. Case-insensitive; the output keeps each side's own spelling. */
export function diffLetters(said: string, better: string): DiffPart[] {
  const steps = align([...said], [...better], (x, y) => norm(x) === norm(y));
  return merge(steps.map((s) => ({ op: s.op, text: s.op === "add" ? s.b! : s.a! })));
}

/** Two words are "the same word said a bit wrong" when they share at least half their letters. */
function similar(a: string, b: string): boolean {
  const x = bare(a);
  const y = bare(b);
  if (!x || !y) return false;
  const same = diffLetters(x, y)
    .filter((p) => p.op === "same")
    .reduce((n, p) => n + p.text.length, 0);
  return same * 2 >= Math.max(x.length, y.length);
}

/**
 * Diff of two phrases. Unchanged words are "same"; a removed word next to a similar added word is
 * compared letter by letter; anything else is a whole-word "del" or "add". Spaces are kept as "same".
 */
export function diffPhrase(said: string, better: string): DiffPart[] {
  const a = said.split(/\s+/).filter(Boolean);
  const b = better.split(/\s+/).filter(Boolean);
  const steps = align(a, b, (x, y) => bare(x) === bare(y) && bare(x) !== "");
  const words: DiffPart[][] = [];
  for (let k = 0; k < steps.length; k++) {
    const s = steps[k];
    const next = steps[k + 1];
    if (s.op === "del" && next?.op === "add" && similar(s.a!, next.b!)) {
      words.push(diffLetters(s.a!, next.b!));
      k++;
    } else if (s.op === "same") {
      // Same word, maybe a different ending mark ("work," vs "work"): show the better spelling.
      words.push(s.a === s.b ? [{ op: "same", text: s.b! }] : diffLetters(s.a!, s.b!));
    } else {
      words.push([{ op: s.op, text: (s.op === "add" ? s.b : s.a)! }]);
    }
  }
  return merge(words.flatMap((w, k) => (k === 0 ? w : [{ op: "same" as const, text: " " }, ...w])));
}
