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

/** The publik gate. Titles and buttons keep publik's exact English words; the help text is in Spanish. */
const HELP_ES: Record<Screen["screen"]["id"], string> = {
  sign_in: "Inicia sesión gratis con tu cuenta de publik (Google o GitHub). Se abre en otra pestaña. Vuelve aquí cuando termines: esta página sigue sola.",
  unreachable: "No pudimos conectar con publik. Revisa tu conexión e inténtalo de nuevo.",
  choose: "La práctica usa IA para escucharte y responderte. Usa tu plan de publik o tu propia clave de OpenAI.",
};

const NOTES: Record<Waiting, { waiting: [string, string]; timeout: [string, string] }> = {
  sign_in: {
    waiting: ["Waiting for you to sign in in your browser.", "Esperando que inicies sesión en la otra pestaña…"],
    timeout: ["No sign-in after 10 minutes. Click Sign in with publik to try again.", "Pasaron 10 minutos sin inicio de sesión. Vuelve a intentarlo."],
  },
  get_plan: {
    waiting: ["Waiting for your plan. Finish in your browser.", "Esperando tu plan. Termina en la otra pestaña…"],
    timeout: ["No plan after 10 minutes. Click Get a plan to try again.", "Pasaron 10 minutos sin plan. Vuelve a intentarlo."],
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
        <p lang="en" className="text-muted">{screen.body}</p>
        <p>{HELP_ES[screen.id]}</p>
        {note ? (
          <p role="status" className="rounded-2xl bg-surface-2 p-3 text-sm">
            <span lang="en" className="block font-semibold">{note[0]}</span>
            {note[1]}
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
              Tu clave de OpenAI (empieza con sk-)
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
            <p className="text-sm text-muted">La guardamos cifrada en el servidor y solo la usamos para tus prácticas.</p>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy || key.trim().length === 0} className="flex-1">
                Guardar clave
              </Button>
              <Button variant="ghost" onClick={() => setShowKeyForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : null}
      </Card>
    </div>
  );
}
