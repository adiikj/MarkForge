import { Suspense } from "react";
import type { Metadata } from "next";
import ResetPasswordForm from "../components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Choose a new password · MarkForge" };

export default function Page() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
