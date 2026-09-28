import { Suspense } from "react";
import type { Metadata } from "next";
import Header from "../components/landingPage/Header";
import Footer from "../components/landingPage/Footer";
import HealthChecker from "../components/health/HealthChecker";

export const metadata: Metadata = {
  title: "README Health Score · MarkForge",
  description: "Score any GitHub README out of 100 and fix missing sections, broken links and accessibility gaps in one click.",
};

export default function HealthPage() {
  return (
    <div className="font-sans">
      <Header />
      <Suspense>
        <HealthChecker />
      </Suspense>
      <Footer />
    </div>
  );
}
