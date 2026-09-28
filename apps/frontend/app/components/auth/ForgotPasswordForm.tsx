"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import AuthShell from "./AuthShell";
import { Field, FormAlert, SubmitButton } from "./fields";
import { useAuthForm } from "./useAuthForm";
import { authApi } from "../../lib/account";

const ForgotPasswordForm = () => {
  const { loading, error, fieldErrors, run } = useAuthForm();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      await authApi.forgotPassword(email);
      setSent(true);
    });
  };

  return (
    <AuthShell
      title={sent ? "Check your email" : "Reset your password"}
      subtitle={sent ? undefined : "Enter your account's email and we'll send you a reset link."}
      footer={
        <Link href="/login" className="text-white underline-offset-4 hover:underline">
          Back to log in
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <MailCheck className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-4 text-sm text-neutral-300">
            If an account exists for <span className="text-white">{email}</span>, a link to reset your password is on its way. It
            expires in an hour.
          </p>
          <button onClick={() => setSent(false)} className="mt-4 text-xs text-neutral-500 hover:text-white">
            Use a different email
          </button>
        </div>
      ) : (
        <>
          {error && <FormAlert>{error}</FormAlert>}
          <form onSubmit={submit} className="space-y-4" noValidate>
            <Field
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              autoFocus
              required
            />
            <SubmitButton loading={loading}>Send reset link</SubmitButton>
          </form>
        </>
      )}
    </AuthShell>
  );
};

export default ForgotPasswordForm;
