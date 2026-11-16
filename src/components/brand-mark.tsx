import { AudioLines } from "lucide-react";

/** Working name: Dilo ("say it"). */
export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <p className={`flex items-center gap-2 font-extrabold tracking-tight ${compact ? "text-lg" : "text-2xl"}`}>
      <span className={`flex items-center justify-center rounded-xl bg-primary text-on-primary ${compact ? "size-8" : "size-10"}`}>
        <AudioLines aria-hidden="true" className={compact ? "size-4" : "size-5"} />
      </span>
      Dilo
      <span className="sr-only">: spoken English practice for work</span>
    </p>
  );
}
