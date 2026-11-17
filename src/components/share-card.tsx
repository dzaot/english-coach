"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { SHARE_URL, shareDilo } from "@/lib/share";
import { QuoteSticker } from "./brand/stickers";
import { Button } from "./ui";

/** "Know someone who freezes in English?" Shares Dilo's publik page. */
export function ShareCard() {
  const { t } = useI18n();
  const [note, setNote] = useState("");
  const share = async () => {
    const outcome = await shareDilo(t.share.text);
    // If nothing worked, show the link itself so it can be copied by hand.
    setNote(outcome === "copied" ? t.share.copied : outcome === "failed" ? SHARE_URL : "");
  };
  return (
    <section aria-labelledby="share-title" className="panel flex flex-col gap-4 rounded-card p-5">
      <div className="flex items-center gap-4">
        <QuoteSticker size={48} className="-rotate-6" />
        <h2 id="share-title" className="display text-lg leading-tight">
          {t.share.title}
        </h2>
      </div>
      <Button variant="secondary" onClick={() => void share()} className="w-full">
        <Share2 aria-hidden="true" className="size-4" /> {t.share.button}
      </Button>
      <p role="status" className="min-h-6 break-all text-center text-sm font-semibold text-accent-ink">
        {note}
      </p>
    </section>
  );
}
