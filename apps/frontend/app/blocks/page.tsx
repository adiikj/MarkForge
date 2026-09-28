import { Suspense } from "react";
import type { Metadata } from "next";
import Header from "../components/landingPage/Header";
import Footer from "../components/landingPage/Footer";
import BlocksGallery from "../components/blocks/BlocksGallery";

export const metadata: Metadata = {
  title: "Section Blocks · MarkForge",
  description: "Ready-made README sections (install, API tables, FAQ, screenshots, contributors) filled in from your repo.",
};

export default function BlocksPage() {
  return (
    <div className="font-sans">
      <Header />
      <Suspense>
        <BlocksGallery />
      </Suspense>
      <Footer />
    </div>
  );
}
