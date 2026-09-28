"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "./AuthShell";
import { Divider, Field, FormAlert, GithubButton, PasswordField, SubmitButton } from "./fields";
import { safeNext, useAuthForm } from "./useAuthForm";
import { authApi } from "../../lib/account";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../lib/toast";

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;

const SignupForm = () => {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const toast = useToast();
  const { user, loading: authLoading, setUser } = useAuth();
  const { loading, error, fieldErrors, run, clearField } = useAuthForm();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [github, setGithub] = useState(false);

  useEffect(() => {
    authApi.providers().then((p) => setGithub(p.github)).catch(() => {});
  }, []);
  useEffect(() => {
    if (!authLoading && user) router.replace(next);
  }, [authLoading, user, next, router]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = key === "username" ? e.target.value.toLowerCase() : e.target.value;
    setForm((f) => {
      const nextForm = { ...f, [key]: value };
      // Suggest a username from the email until the user edits it themselves.
      if (key === "email" && !usernameTouched) {
        nextForm.username = value.split("@")[0].toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30);
      }
      return nextForm;
    });
    if (key === "username") setUsernameTouched(true);
    clearField(key);
  };

  const usernameHint =
    form.username && (form.username.length < 3 || !USERNAME_RE.test(form.username))
      ? "3–30 characters: lowercase letters, numbers, - and _"
      : form.username
        ? "Looks good. You can change it later in Settings."
        : "Lowercase letters, numbers, - and _";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      const { user } = await authApi.signup({ ...form, name: form.name.trim() || undefined });
      setUser(user);
      toast(`Welcome, ${user.name ?? user.username}! Check your inbox to verify your email.`);
      router.replace(next);
    });
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free forever. More daily drafts than browsing signed out, plus saved docs and repo tracking."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-white underline-offset-4 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      {error && <FormAlert>{error}</FormAlert>}
      {github && (
        <>
          <GithubButton href={authApi.githubUrl(next)} label="Sign up with GitHub" />
          <Divider label="or with email" />
        </>
      )}
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Name (optional)" name="name" autoComplete="name" value={form.name} onChange={set("name")} maxLength={80} />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={set("email")}
          error={fieldErrors.email}
          required
        />
        <Field
          label="Username"
          name="username"
          autoComplete="username"
          value={form.username}
          onChange={set("username")}
          error={fieldErrors.username}
          hint={usernameHint}
          maxLength={30}
          required
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          value={form.password}
          onChange={set("password")}
          error={fieldErrors.password}
          hint="At least 8 characters. A short phrase works well."
          showStrength
          required
        />
        <SubmitButton loading={loading}>Create account</SubmitButton>
        <p className="text-center text-xs text-neutral-600">
          By signing up you agree to use MarkForge responsibly. We never post to your repos.
        </p>
      </form>
    </AuthShell>
  );
};

export default SignupForm;
