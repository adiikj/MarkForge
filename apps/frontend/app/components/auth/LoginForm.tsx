"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "./AuthShell";
import { Divider, Field, FormAlert, GithubButton, PasswordField, SubmitButton } from "./fields";
import { safeNext, useAuthForm } from "./useAuthForm";
import { authApi } from "../../lib/account";
import { useAuth } from "../../lib/auth";

const OAUTH_ERRORS: Record<string, string> = {
  github_denied: "GitHub sign-in was cancelled.",
  github_state: "That GitHub sign-in link expired. Please try again.",
  github_failed: "We couldn't complete GitHub sign-in. Please try again.",
  github_no_email: "Your GitHub account has no verified email. Add one on GitHub, or sign up with email.",
  github_disabled: "GitHub sign-in isn't set up on this server yet.",
};

const LoginForm = () => {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { user, loading: authLoading, setUser } = useAuth();
  const { loading, error, fieldErrors, run, clearField } = useAuthForm();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [github, setGithub] = useState(false);

  useEffect(() => {
    authApi.providers().then((p) => setGithub(p.github)).catch(() => {});
  }, []);
  useEffect(() => {
    if (!authLoading && user) router.replace(next);
  }, [authLoading, user, next, router]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      const { user } = await authApi.login({ identifier, password });
      setUser(user);
      router.replace(next);
    });
  };

  const oauthError = OAUTH_ERRORS[params.get("error") ?? ""];

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to your drafts, tracked repos and history."
      footer={
        <>
          New to MarkForge?{" "}
          <Link href={`/signup${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-white underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {(oauthError || error) && <FormAlert>{oauthError ?? error}</FormAlert>}
      {github && (
        <>
          <GithubButton href={authApi.githubUrl(next)} />
          <Divider label="or with email" />
        </>
      )}
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field
          label="Email or username"
          name="identifier"
          autoComplete="username"
          value={identifier}
          onChange={(e) => {
            setIdentifier(e.target.value);
            clearField("identifier");
          }}
          error={fieldErrors.identifier}
          autoFocus
          required
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            clearField("password");
          }}
          error={fieldErrors.password}
          aside={
            <Link href="/forgot-password" className="text-xs text-neutral-400 hover:text-white">
              Forgot password?
            </Link>
          }
          required
        />
        <SubmitButton loading={loading}>Log in</SubmitButton>
      </form>
    </AuthShell>
  );
};

export default LoginForm;
