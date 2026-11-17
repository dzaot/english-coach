"use client";

import { useState } from "react";
import { ExternalLink, KeyRound, RotateCcw } from "lucide-react";
import type { Waiting } from "@/lib/hooks/use-gate";
import type { GateState } from "@/lib/types";
import { BrandMark } from "./brand-mark";
import { Button, Card, ErrorBanner, FIELD } from "./ui";
import type { Messages } from "@/i18n/messages";
import { useI18n } from "@/i18n/provider";
import { LanguageMenu } from "./language-menu";

type Screen = Extract<GateState, { state: "screen" }>;

interface Props {
  gate: Screen;
  error: string | null;
  waiting: Waiting | null;
  timedOut: Waiting | null;
  busy: boolean;
  onRetry: () => void;
  onWait: (what: Waiting) => void;
  onConnect: () => void;
  onOwnKey: (key: string) => Promise<boolean>;
}

/**
 * The publik gate. Titles and buttons keep publik's exact English words (publik's rule); the helper line
 * and the waiting notes below them are in the person's language.
 */
function notes(t: Messages): Record<Waiting, { waiting: string; timeout: string }> {
  return {
    sign_in: { waiting: t.gate.waitingSignIn, timeout: t.gate.timeoutSignIn },
    get_plan: { waiting: t.gate.waitingPlan, timeout: t.gate.timeoutPlan },
  };
}

const linkButton =
  "inline-flex min-h-16 w-full cursor-pointer items-center justify-center gap-2.5 rounded-full bg-primary px-7 text-lg font-bold text-on-primary transition duration-200 hover:bg-[#ff6e3a] active:scale-[0.98]";

export function GatePanel({ gate, error, waiting, timedOut, busy, onRetry, onWait, onConnect, onOwnKey }: Props) {
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [key, setKey] = useState("");
  const { t } = useI18n();
  const { screen, links } = gate;
  const note = waiting ? notes(t)[waiting].waiting : timedOut ? notes(t)[timedOut].timeout : null;

  return (
    <div className="animate-rise flex flex-1 flex-col gap-7">
      {/* What Dilo is and what it costs, on the orange stage, before asking anyone to sign in. */}
      <div className="stage stage-orange">
        <div className="flex items-center justify-between gap-2">
          <BrandMark compact tone="stage" />
          <LanguageMenu tone="stage" />
        </div>
        <header>
          <p className="display mt-8 text-balance text-[2.5rem] font-black sm:text-6xl">
            {t.home.titleStart} <span className="text-stage-pop">{t.home.titleEnd}</span>
          </p>
          <p className="mt-5 max-w-[32ch] font-medium">{t.home.subtitle}</p>
          <p className="mt-5 rounded-tile bg-night px-4 py-3 text-sm font-semibold text-ink">{t.home.price}</p>
        </header>
      </div>
      <Card className="space-y-4">
        <h1 lang="en" className="display text-xl leading-tight">{screen.title}</h1>
        <p lang="en" className="text-muted">{screen.body}</p>
        <p>{t.gate.help[screen.id]}</p>
        {note ? (
          <p role="status" className="flex items-start gap-2.5 rounded-tile bg-well p-3.5 text-sm">
            <span aria-hidden="true" className="animate-breathe mt-1.5 size-2 shrink-0 rounded-full bg-sun" />
            {note}
          </p>
        ) : null}
        {error ? <ErrorBanner message={error} /> : null}

        <div className="grid gap-3">
          {screen.buttons.map((b) => {
            if (b.action === "sign_in" && links.signIn) {
              return (
                <a key={b.action} href={links.signIn} target="_blank" rel="noopener noreferrer" onClick={() => onWait("sign_in")} className={linkButton}>
                  {b.label} <ExternalLink aria-hidden="true" className="size-5" />
                </a>
              );
            }
            if (b.action === "get_plan" && links.getPlan) {
              return (
                <a key={b.action} href={links.getPlan} target="_blank" rel="noopener noreferrer" onClick={() => onWait("get_plan")} className={linkButton}>
                  {b.label} <ExternalLink aria-hidden="true" className="size-5" />
                </a>
              );
            }
            if (b.action === "retry") {
              return (
                <Button key={b.action} size="lg" onClick={onRetry} disabled={busy}>
                  <RotateCcw aria-hidden="true" className="size-5" /> {b.label}
                </Button>
              );
            }
            if (b.action === "connect") {
              return (
                <Button key={b.action} size="lg" onClick={onConnect} disabled={busy}>
                  {b.label}
                </Button>
              );
            }
            if (b.action === "own_key") {
              return (
                <Button key={b.action} variant="secondary" onClick={() => setShowKeyForm(true)} disabled={busy}>
                  <KeyRound aria-hidden="true" className="size-4" /> {b.label}
                </Button>
              );
            }
            return null;
          })}
        </div>

        {showKeyForm ? (
          <form
            className="divider-dashed space-y-2 pt-5"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await onOwnKey(key)) setKey("");
            }}
          >
            <label htmlFor="own-key" className="block font-semibold">
              {t.gate.ownKeyLabel}
            </label>
            <input
              id="own-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className={`${FIELD} min-h-12 py-2`}
            />
            <p className="text-sm text-muted">{t.gate.ownKeyNote}</p>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy || key.trim().length === 0} className="flex-1">
                {t.gate.saveKey}
              </Button>
              <Button variant="ghost" onClick={() => setShowKeyForm(false)}>
                {t.gate.cancel}
              </Button>
            </div>
          </form>
        ) : null}
      </Card>
    </div>
  );
}
