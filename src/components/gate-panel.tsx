"use client";

import { useState } from "react";
import { ExternalLink, KeyRound, RotateCcw } from "lucide-react";
import type { Waiting } from "@/lib/hooks/use-gate";
import type { GateState } from "@/lib/types";
import { BrandMark } from "./brand-mark";
import { Button, Card, ErrorBanner } from "./ui";
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
  "inline-flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-6 text-lg font-semibold transition duration-200";

export function GatePanel({ gate, error, waiting, timedOut, busy, onRetry, onWait, onConnect, onOwnKey }: Props) {
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [key, setKey] = useState("");
  const { t } = useI18n();
  const { screen, links } = gate;
  const note = waiting ? notes(t)[waiting].waiting : timedOut ? notes(t)[timedOut].timeout : null;

  return (
    <div className="animate-rise flex flex-1 flex-col justify-center gap-6 py-6">
      <div className="flex items-center justify-between gap-2">
        <BrandMark />
        <LanguageMenu />
      </div>
      {/* What Dilo is and what it costs, before asking anyone to sign in. */}
      <header className="space-y-2">
        <p className="font-display text-[1.75rem] font-extrabold leading-[1.1] tracking-tight">
          {t.home.titleStart} <span className="text-primary-ink">{t.home.titleEnd}</span>
        </p>
        <p className="text-muted">{t.home.subtitle}</p>
        <p className="text-sm font-semibold">{t.home.price}</p>
      </header>
      <Card className="space-y-4">
        <h1 lang="en" className="text-2xl font-extrabold">{screen.title}</h1>
        <p lang="en" className="text-muted">{screen.body}</p>
        <p>{t.gate.help[screen.id]}</p>
        {note ? (
          <p role="status" className="rounded-2xl bg-surface-2 p-3 text-sm">
            {note}
          </p>
        ) : null}
        {error ? <ErrorBanner message={error} /> : null}

        <div className="grid gap-2">
          {screen.buttons.map((b) => {
            if (b.action === "sign_in" && links.signIn) {
              return (
                <a key={b.action} href={links.signIn} target="_blank" rel="noopener noreferrer" onClick={() => onWait("sign_in")} className={`${linkButton} bg-primary text-on-primary hover:brightness-110`}>
                  {b.label} <ExternalLink aria-hidden="true" className="size-5" />
                </a>
              );
            }
            if (b.action === "get_plan" && links.getPlan) {
              return (
                <a key={b.action} href={links.getPlan} target="_blank" rel="noopener noreferrer" onClick={() => onWait("get_plan")} className={`${linkButton} bg-primary text-on-primary hover:brightness-110`}>
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
            className="space-y-2 border-t border-border pt-4"
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
              className="min-h-11 w-full rounded-2xl border border-border bg-surface px-3 text-base text-ink"
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
