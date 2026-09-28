"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "./AuthShell";
import { FormAlert, PasswordField, SubmitButton } from "./fields";
import { useAuthForm } from "./useAuthForm";
import { authApi } from "../../lib/account";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../lib/toast";

const ResetPasswordForm = () => {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const toast = useToast();
  const { setUser } = useAuth();
  const { loading, error, setError, fieldErrors, run } = useAuthForm();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError("Those passwords don't match.");
    run(async () => {
      const { user } = await authApi.resetPassword(token, password);
      setUser(user);
      toast("Password updated. You're signed in, and other devices were signed out.");
      router.replace("/dashboard");
    });
  };

  if (!token) {
    return (
      <AuthShell title="Link missing" subtitle="This page needs the link from your reset email.">
        <Link href="/forgot-password" className="text-sm text-white underline-offset-4 hover:underline">
          Request a new reset link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="You'll be signed in, and signed out everywhere else."
      footer={
        <Link href="/login" className="text-white underline-offset-4 hover:underline">
          Back to log in
        </Link>
      }
    >
      {error && (
        <FormAlert>
          {error}{" "}
          {/expired|invalid|used/i.test(error) && (
            <Link href="/forgot-password" className="underline underline-offset-2">
              Get a new link
            </Link>
          )}
        </FormAlert>
      )}
      <form onSubmit={submit} className="space-y-4" noValidate>
        <PasswordField
          label="New password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          showStrength
          autoFocus
          required
        />
        <PasswordField label="Confirm password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        <SubmitButton loading={loading}>Update password</SubmitButton>
      </form>
    </AuthShell>
  );
};

export default ResetPasswordForm;
