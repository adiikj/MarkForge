import type { Metadata } from "next";
import Header from "../components/landingPage/Header";
import Footer from "../components/landingPage/Footer";
import Converter from "../components/convert/Converter";

export const metadata: Metadata = {
  title: "Converters · MarkForge",
  description: "Convert Notion, Google Docs, Word, HTML, CSV and JSON to Markdown, or Markdown to HTML, PDF and CSV. Runs in your browser.",
};

export default function ConvertPage() {
  return (
    <div className="font-sans">
      <Header />
      <Converter />
      <Footer />
    </div>
  );
}
