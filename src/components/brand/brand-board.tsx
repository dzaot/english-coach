import { BrandIcon } from "../brand-mark";
import { STICKERS } from "./stickers";
import { VoiceField } from "./voice-bars";

/** The brand on one page: logo, the three voices, type, stickers and the voice bars. Reference for the app and for social posts. */

const VOICES = [
  { name: "Orange", hex: "#FF5A1F", means: "You, saying it. The brand, the mic, the main action.", className: "bg-primary text-night" },
  { name: "Cobalt", hex: "#2B4BFF", means: "Your coworker. The call and what they say.", className: "bg-cobalt text-on-cobalt" },
  { name: "Lime", hex: "#C8F542", means: "You got it right. Scores, clear words, say it.", className: "bg-accent text-night" },
] as const;

const SUPPORT = [
  { name: "Ink", hex: "#14110F", className: "bg-night text-ink border border-border" },
  { name: "Cream", hex: "#FFF4E4", className: "bg-ink text-night" },
  { name: "Sun", hex: "#FFD23F", className: "bg-sun text-night" },
  { name: "Rose", hex: "#FF6B86", className: "bg-error text-night" },
] as const;

const TITLE = "display mb-5 text-2xl";

export function BrandBoard() {
  return (
    <div className="space-y-14 pb-10">
      <header className="stage stage-orange relative overflow-hidden">
        <p className="font-semibold">Brand board</p>
        <h1 className="display mt-10 text-[5.5rem] font-black sm:text-[9rem]">dilo</h1>
        <p className="display mt-4 max-w-[14ch] text-3xl sm:text-5xl">
          Say it out loud. <span className="text-white">Sound like you belong.</span>
        </p>
        <VoiceField className="mt-10 h-24" barClass="bg-night" />
      </header>

      <section aria-labelledby="logo-title">
        <h2 id="logo-title" className={TITLE}>
          Logo
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="panel flex aspect-square items-center justify-center rounded-card">
            <BrandIcon size={96} />
          </div>
          <div className="stage-orange flex aspect-square items-center justify-center rounded-card bg-stage">
            <BrandIcon size={96} tone="stage" />
          </div>
          <div className="stage-lime flex aspect-square items-center justify-center rounded-card bg-stage">
            <BrandIcon size={96} tone="stage" />
          </div>
          <div className="flex aspect-square items-center justify-center rounded-card bg-cobalt">
            <BrandIcon size={96} />
          </div>
        </div>
      </section>

      <section aria-labelledby="color-title">
        <h2 id="color-title" className={TITLE}>
          Three voices
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {VOICES.map((c) => (
            <div key={c.name} className={`flex min-h-52 flex-col justify-between rounded-card p-5 ${c.className}`}>
              <p className="display text-3xl">{c.name}</p>
              <div>
                <p className="font-semibold">{c.means}</p>
                <p className="tabular mt-2 font-semibold">{c.hex}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SUPPORT.map((c) => (
            <div key={c.name} className={`rounded-tile p-4 ${c.className}`}>
              <p className="kicker">{c.name}</p>
              <p className="tabular text-sm font-semibold">{c.hex}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="type-title">
        <h2 id="type-title" className={TITLE}>
          Type
        </h2>
        <div className="panel space-y-8 rounded-card p-6">
          <div>
            <p className="display text-[3.5rem] font-black sm:text-[6rem]">I agree.</p>
            <p className="mt-3 text-muted">Unbounded 800 and 900. Headlines, names and numbers. Sentence case, never uppercase.</p>
          </div>
          <div className="divider-dashed pt-8">
            <p className="display tabular text-[4.5rem] text-accent sm:text-[7rem]">72</p>
            <p className="mt-3 text-muted">Numbers are the loudest thing on a screen.</p>
          </div>
          <div className="divider-dashed pt-8">
            <p className="text-xl font-medium leading-relaxed">Practice your work English on a call with a native English speaker. Get feedback on every phrase.</p>
            <p className="mt-3 text-muted">Geist 400 to 700. Everything you read and tap.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="sticker-title">
        <h2 id="sticker-title" className={TITLE}>
          Stickers
        </h2>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {STICKERS.map(({ name, Component }, i) => (
            <li key={name} className="panel flex flex-col items-center gap-3 rounded-tile px-2 py-5 text-center">
              <Component size={64} className={i % 2 ? "rotate-6" : "-rotate-6"} />
              <span className="text-sm font-semibold text-muted">{name}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="bars-title">
        <h2 id="bars-title" className={TITLE}>
          Voice bars
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="stage-cobalt rounded-card bg-stage p-6 text-stage-ink">
            <VoiceField active className="h-32" barClass="bg-white" />
            <p className="mt-4 font-semibold">They move when your coworker talks.</p>
          </div>
          <div className="panel rounded-card p-6">
            <VoiceField className="h-32" barClass="bg-accent" />
            <p className="mt-4 font-semibold text-muted">And stand still, as the week of your streak.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
