import { Suspense } from "react";
import type { Metadata } from "next";
import LoginForm from "../components/auth/LoginForm";

export const metadata: Metadata = { title: "Log in · MarkForge" };

export default function Page() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
