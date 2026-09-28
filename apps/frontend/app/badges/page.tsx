import { Suspense } from "react";
import type { Metadata } from "next";
import Header from "../components/landingPage/Header";
import Footer from "../components/landingPage/Footer";
import BadgeBuilder from "../components/badges/BadgeBuilder";

export const metadata: Metadata = {
  title: "Badge Builder · MarkForge",
  description: "Detect the shields.io badges that fit your GitHub repo (CI, registry, license, stack) or build your own.",
};

export default function BadgesPage() {
  return (
    <div className="font-sans">
      <Header />
      <Suspense>
        <BadgeBuilder />
      </Suspense>
      <Footer />
    </div>
  );
}
