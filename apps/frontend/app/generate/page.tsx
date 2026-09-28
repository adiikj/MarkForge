import { Suspense } from "react";
import type { Metadata } from "next";
import Main from "../components/readmegen/Main";
import Header from "../components/landingPage/Header";
import Footer from "../components/landingPage/Footer";

export const metadata: Metadata = {
  title: "README Studio · MarkForge",
  description: "Draft a README from any GitHub repo, or start from a template. Live GitHub-style preview.",
};

export default function GeneratePage() {
  return (
    <div className="font-sans">
      <Header />
      {/* Main reads ?repo= via useSearchParams, which needs a Suspense boundary. */}
      <Suspense>
        <Main />
      </Suspense>
      <Footer />
    </div>
  );
}
