import { Suspense } from "react";
import type { Metadata } from "next";
import ForgotPasswordForm from "../components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset password · MarkForge" };

export default function Page() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
