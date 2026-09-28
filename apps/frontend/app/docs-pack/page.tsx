import { Suspense } from "react";
import type { Metadata } from "next";
import Header from "../components/landingPage/Header";
import Footer from "../components/landingPage/Footer";
import DocsPack from "../components/docsPack/DocsPack";

export const metadata: Metadata = {
  title: "Repo Docs Pack · MarkForge",
  description: "Generate CONTRIBUTING, Code of Conduct, SECURITY, issue and PR templates and a CHANGELOG for any GitHub repo.",
};

export default function DocsPackPage() {
  return (
    <div className="font-sans">
      <Header />
      <Suspense>
        <DocsPack />
      </Suspense>
      <Footer />
    </div>
  );
}
