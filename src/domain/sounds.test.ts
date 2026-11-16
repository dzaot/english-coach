import { describe, expect, it } from "vitest";
import { FOCUS_WORDS, MAX_TIPS_PER_WORD, guideText, guideWord, respell, soundTipsFor, syllabify } from "./sounds";

const dict: Record<string, string> = {
  authority: "AH0 TH AO1 R AH0 T IY0",
  speak: "S P IY1 K",
  water: "W AO1 T ER0",
  very: "V EH1 R IY0",
  worked: "W ER1 K T",
  wanted: "W AO1 N T AH0 D",
  ship: "SH IH1 P",
  the: "DH AH0",
  is: "IH1 Z",
  i: "AY1",
  a: "AH0",
  team: "T IY1 M",
  experience: "IH0 K S P IH1 R IY0 AH0 N S",
};
const lookup = (w: string) => dict[w] ?? null;

describe("syllabify", () => {
  it("splits on vowels, giving a single middle consonant to the next syllable", () => {
    expect(syllabify("W AO1 T ER0".split(" "))).toEqual([
      { phones: ["W", "AO1"], stress: 1 },
      { phones: ["T", "ER0"], stress: 0 },
    ]);
  });

  it("keeps clusters at the edges and splits middle clusters", () => {
    const s = syllabify("IH0 K S P IH1 R IY0 AH0 N S".split(" "));
    expect(s.map((x) => x.phones.join(" "))).toEqual(["IH0 K", "S P IH1", "R IY0", "AH0 N S"]);
    expect(s.map((x) => x.stress)).toEqual([0, 1, 0, 0]);
  });
});

describe("respell", () => {
  it("writes a General American respelling with the stressed syllable in capitals", () => {
    expect(respell("AH0 TH AO1 R AH0 T IY0")).toBe("uh-THAW-ruh-dee");
  });

  it("turns a t between vowels before a weak syllable into a soft d (flap t)", () => {
    expect(respell("W AO1 T ER0")).toBe("WAW-der");
  });

  it("keeps a t before a stressed vowel", () => {
    expect(respell("T IY1 M")).toBe("TEEM");
  });

  it("handles one-syllable words", () => {
    expect(respell("S P IY1 K")).toBe("SPEEK");
  });

  it("writes the short i as i, so ship and sheep look different", () => {
    expect(respell("SH IH1 P")).toBe("SHIP");
    expect(respell("SH IY1 P")).toBe("SHEEP");
  });
});

describe("soundTipsFor", () => {
  const ids = (word: string) => soundTipsFor(word, dict[word].split(" ")).map((t) => t.id);

  it("flags the 'e' Spanish speakers add before s + consonant", () => {
    expect(ids("speak")).toContain("s_cluster");
  });

  it("flags th, v and the short i", () => {
    expect(ids("authority")).toContain("th");
    expect(ids("very")).toContain("v");
    expect(ids("ship")).toContain("short_i");
  });

  it("flags -ed that sounds like t, but not the -ed that is its own syllable", () => {
    expect(ids("worked")).toContain("ed_ending");
    expect(ids("wanted")).not.toContain("ed_ending");
  });

  it("flags the soft t in water", () => {
    expect(ids("water")).toContain("flap_t");
  });

  it("flags the buzzing s in 'is'", () => {
    expect(ids("is")).toContain("z_sound");
  });

  it("keeps at most a few tips per word, most important first", () => {
    const tips = soundTipsFor("experience", dict.experience.split(" "));
    expect(tips.length).toBeLessThanOrEqual(MAX_TIPS_PER_WORD);
    expect(tips[0].id).toBe("short_i");
  });

  it("gives every tip Spanish and English coaching", () => {
    for (const t of soundTipsFor("authority", dict.authority.split(" "))) {
      expect(t.tipEs.length).toBeGreaterThan(10);
      expect(t.tipEn.length).toBeGreaterThan(10);
      expect(t.tipEs).not.toMatch(/—/);
    }
  });
});

describe("guideWord", () => {
  it("describes a known word", () => {
    const g = guideWord("Authority,", lookup);
    expect(g).toMatchObject({ text: "Authority,", key: "authority", respelling: "uh-THAW-ruh-dee", syllables: 4, stressed: 1 });
    expect(g.tips.map((t) => t.id)).toContain("th");
  });

  it("returns an empty guide for an unknown word", () => {
    expect(guideWord("Zorbly", lookup)).toMatchObject({ key: "zorbly", respelling: null, tips: [], syllables: 0, stressed: null });
  });

  it("uses the first pronunciation when the dictionary lists several", () => {
    expect(guideWord("read", () => "R IY1 D").respelling).toBe("REED");
  });
});

describe("guideText", () => {
  it("guides each word of a sentence in order", () => {
    const g = guideText("I speak with the team.", lookup);
    expect(g.map((w) => w.text)).toEqual(["I", "speak", "with", "the", "team."]);
    expect(g[1].tips[0].id).toBe("s_cluster");
  });

  it("picks a few focus words, most important sounds first and each with a different sound", () => {
    const g = guideText("I speak with the team about the very important experience", (w) => ({ ...dict, with: "W IH1 DH", about: "AH0 B AW1 T", important: "IH2 M P AO1 R T AH0 N T" })[w] ?? null);
    const focus = g.filter((w) => w.focus).map((w) => w.text);
    expect(focus).toHaveLength(FOCUS_WORDS);
    expect(focus).toEqual(["speak", "with", "very"]);
  });

  it("returns nothing for an empty sentence", () => {
    expect(guideText("   ", lookup)).toEqual([]);
  });
});
