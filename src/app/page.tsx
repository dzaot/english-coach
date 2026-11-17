import { CoachApp } from "@/components/coach-app";
import { I18nProvider } from "@/i18n/provider";

export default function Page() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-10 pt-4 sm:px-6 lg:max-w-5xl">
      <I18nProvider>
        <CoachApp />
      </I18nProvider>
    </main>
  );
}
