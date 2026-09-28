import type { Metadata } from "next";
import Header from "../components/landingPage/Header";
import Footer from "../components/landingPage/Footer";
import Pricing from "../components/pricing/Pricing";

export const metadata: Metadata = {
  title: "Pricing · MarkForge",
  description: "MarkForge is free to start. Pro lifts the daily repo README limit and adds the full Markdown toolkit.",
};

export default function PricingPage() {
  return (
    <div className="font-sans">
      <Header />
      <Pricing />
      <Footer />
    </div>
  );
}
