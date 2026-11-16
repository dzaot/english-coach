"use client";

import { useState } from "react";
import { ExternalLink, KeyRound, RotateCcw } from "lucide-react";
import type { Waiting } from "@/lib/hooks/use-gate";
import type { GateState } from "@/lib/types";
import { BrandMark } from "./brand-mark";
import { Button, Card, ErrorBanner } from "./ui";

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

/** The publik gate. Titles and buttons keep publik's exact words; one helper line below. */
const HELP: Record<Screen["screen"]["id"], string> = {
  sign_in: "Sign in for free with your publik account (Google or GitHub). It opens in a new tab. Come back when you are done: this page continues on its own.",
  unreachable: "We could not reach publik. Check your connection and try again.",
  choose: "Practice uses AI to listen and answer you. Use your publik plan or your own OpenAI key.",
};

const NOTES: Record<Waiting, { waiting: string; timeout: string }> = {
  sign_in: {
    waiting: "Waiting for you to sign in in your browser.",
    timeout: "No sign-in after 10 minutes. Click Sign in with publik to try again.",
  },
  get_plan: {
    waiting: "Waiting for your plan. Finish in your browser.",
    timeout: "No plan after 10 minutes. Click Get a plan to try again.",
  },
};

const linkButton =
  "inline-flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-6 text-lg font-semibold transition duration-200";

export function GatePanel({ gate, error, waiting, timedOut, busy, onRetry, onWait, onConnect, onOwnKey }: Props) {
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [key, setKey] = useState("");
  const { screen, links } = gate;
  const note = waiting ? NOTES[waiting].waiting : timedOut ? NOTES[timedOut].timeout : null;

  return (
    <div className="animate-rise flex flex-1 flex-col justify-center gap-6 py-6">
      <BrandMark />
      <Card className="space-y-4">
        <h1 className="text-2xl font-extrabold">{screen.title}</h1>
        <p className="text-muted">{screen.body}</p>
        <p>{HELP[screen.id]}</p>
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
              Your OpenAI key (starts with sk-)
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
            <p className="text-sm text-muted">We store it encrypted on the server and only use it for your practices.</p>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy || key.trim().length === 0} className="flex-1">
                Save key
              </Button>
              <Button variant="ghost" onClick={() => setShowKeyForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </Card>
    </div>
  );
}
