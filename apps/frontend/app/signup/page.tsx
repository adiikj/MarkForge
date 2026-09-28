import { Suspense } from "react";
import type { Metadata } from "next";
import SignupForm from "../components/auth/SignupForm";

export const metadata: Metadata = { title: "Sign up · MarkForge" };

export default function Page() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
