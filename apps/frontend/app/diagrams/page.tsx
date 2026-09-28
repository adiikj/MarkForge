import { Suspense } from "react";
import type { Metadata } from "next";
import Header from "../components/landingPage/Header";
import Footer from "../components/landingPage/Footer";
import DiagramEditor from "../components/diagrams/DiagramEditor";

export const metadata: Metadata = {
  title: "Mermaid Diagrams · MarkForge",
  description: "Live Mermaid editor with templates, plus architecture and folder diagrams generated from any GitHub repo.",
};

export default function DiagramsPage() {
  return (
    <div className="font-sans">
      <Header />
      <Suspense>
        <DiagramEditor />
      </Suspense>
      <Footer />
    </div>
  );
}
