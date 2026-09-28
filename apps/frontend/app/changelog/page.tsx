import { Suspense } from "react";
import type { Metadata } from "next";
import Header from "../components/landingPage/Header";
import Footer from "../components/landingPage/Footer";
import ChangelogGenerator from "../components/changelog/ChangelogGenerator";

export const metadata: Metadata = {
  title: "Changelog Generator · MarkForge",
  description: "Turn the commits and PRs between two tags into a Keep a Changelog entry or GitHub release notes.",
};

export default function ChangelogPage() {
  return (
    <div className="font-sans">
      <Header />
      <Suspense>
        <ChangelogGenerator />
      </Suspense>
      <Footer />
    </div>
  );
}
