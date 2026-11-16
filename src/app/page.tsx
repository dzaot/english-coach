import { CoachApp } from "@/components/coach-app";
import { I18nProvider } from "@/i18n/provider";

export default function Page() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-8 pt-4 sm:max-w-lg">
      <I18nProvider>
        <CoachApp />
      </I18nProvider>
    </main>
  );
}
