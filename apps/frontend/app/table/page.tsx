import type { Metadata } from "next";
import Header from "../components/landingPage/Header";
import Footer from "../components/landingPage/Footer";
import TableEditor from "../components/table/TableEditor";

export const metadata: Metadata = {
  title: "Table Editor · MarkForge",
  description: "Edit Markdown tables in a spreadsheet grid. Paste from Excel, Sheets or CSV and export aligned GFM tables.",
};

export default function TablePage() {
  return (
    <div className="font-sans">
      <Header />
      <TableEditor />
      <Footer />
    </div>
  );
}
