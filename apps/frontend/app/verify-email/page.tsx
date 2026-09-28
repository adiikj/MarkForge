import { Suspense } from "react";
import type { Metadata } from "next";
import VerifyEmail from "../components/auth/VerifyEmail";

export const metadata: Metadata = { title: "Verify email · MarkForge" };

export default function Page() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  );
}
