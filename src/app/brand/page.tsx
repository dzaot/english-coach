import type { Metadata } from "next";
import { BrandBoard } from "@/components/brand/brand-board";

export const metadata: Metadata = { title: "Dilo · Brand board" };

export default function BrandPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-lg px-4 pt-4 sm:px-6 lg:max-w-5xl">
      <BrandBoard />
    </main>
  );
}
