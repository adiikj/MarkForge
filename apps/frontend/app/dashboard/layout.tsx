import type { Metadata } from "next";
import DashboardShell from "../components/dashboard/DashboardShell";

export const metadata: Metadata = { title: "Dashboard · MarkForge" };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
