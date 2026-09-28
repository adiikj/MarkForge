"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, Github, Laptop, Loader2, MailWarning, Smartphone } from "lucide-react";
import { Avatar, btn, ConfirmDialog, PageHeader, relativeTime, Skeleton } from "./ui";
import { Field, PasswordField } from "../auth/fields";
import { accountApi, authApi, type SessionInfo } from "../../lib/account";
import { ApiRequestError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../lib/toast";

const Section = ({ title, description, children }: { title: string; description?: string; children: ReactNode }) => (
  <section className="grid gap-6 border-t border-white/[0.07] py-8 first:border-t-0 first:pt-2 md:grid-cols-[240px_minmax(0,1fr)]">
    <div>
      <h2 className="font-medium">{title}</h2>
      {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
    </div>
    <div className="min-w-0">{children}</div>
  </section>
);

const describeDevice = (ua: string | null) => {
  if (!ua) return { name: "Unknown device", mobile: false };
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : ua.split(/[/ ]/)[0];
  const os = /Windows/.test(ua) ? "Windows" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /Linux/.test(ua) ? "Linux" : null;
  return { name: os ? `${browser} on ${os}` : browser, mobile: /Mobi|Android|iPhone/.test(ua) };
};

const Settings = () => {
  const { user, setUser, logout } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  // Profile
  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [profileErr, setProfileErr] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  // Password
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [savingPw, setSavingPw] = useState(false);
  // Sessions
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [githubEnabled, setGithubEnabled] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadSessions = () => accountApi.sessions().then((r) => setSessions(r.sessions)).catch(() => setSessions([]));

  useEffect(() => {
    loadSessions();
    authApi.providers().then((p) => setGithubEnabled(p.github)).catch(() => {});
    // Results of the GitHub link flow come back as query params.
    if (params.get("linked") === "github") toast("GitHub connected.");
    if (params.get("error") === "github_in_use") toast("That GitHub account is already linked to another MarkForge account.", "error");
    if (params.get("linked") || params.get("error")) router.replace("/dashboard/settings", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileErr({});
    try {
      const res = await accountApi.update({ name: name.trim() || null, username: username.trim().toLowerCase() });
      setUser(res.user);
      toast("Profile saved.");
    } catch (err) {
      const e = err as ApiRequestError;
      const field = (e.details as { field?: string } | undefined)?.field;
      setProfileErr({ [field ?? "form"]: (e.details as { message?: string } | undefined)?.message ?? e.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwErr(null);
    if (pw.next !== pw.confirm) return setPwErr("The new passwords don't match.");
    setSavingPw(true);
    try {
      const res = await accountApi.changePassword({ currentPassword: user.hasPassword ? pw.current : undefined, newPassword: pw.next });
      setUser(res.user);
      setPw({ current: "", next: "", confirm: "" });
      toast(user.hasPassword ? "Password changed. Other devices were signed out." : "Password set. You can now log in with it.");
      loadSessions();
    } catch (err) {
      setPwErr((err as Error).message);
    } finally {
      setSavingPw(false);
    }
  };

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      toast(success);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const profileDirty = (name.trim() || null) !== user.name || username.trim().toLowerCase() !== user.username;

  return (
    <div>
      <PageHeader title="Settings" description="Manage your profile, sign-in methods and devices." />

      <div className="mt-6">
        <Section title="Profile" description="How you appear in MarkForge.">
          <form onSubmit={saveProfile} className="max-w-md space-y-4">
            <div className="flex items-center gap-4">
              <Avatar user={user} size={56} />
              <p className="text-xs text-neutral-500">{user.github ? "Your avatar comes from GitHub." : "Connect GitHub to use your GitHub avatar."}</p>
            </div>
            <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
            <Field
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              maxLength={30}
              error={profileErr.username}
              hint="Lowercase letters, numbers, - and _"
            />
            <div>
              <p className="mb-1.5 text-sm text-neutral-300">Email</p>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-sm">
                <span className="truncate text-neutral-300">{user.email}</span>
                {user.emailVerified ? (
                  <span className="ml-auto flex items-center gap-1 text-xs text-neutral-400">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => run(authApi.resendVerification, `Verification link sent to ${user.email}.`)}
                    className="ml-auto flex items-center gap-1 text-xs text-white underline underline-offset-4"
                  >
                    <MailWarning className="h-3.5 w-3.5" /> Unverified, resend link
                  </button>
                )}
              </div>
            </div>
            {profileErr.form && <p className="text-sm text-neutral-200">{profileErr.form}</p>}
            <button type="submit" disabled={!profileDirty || savingProfile} className={btn.primary}>
              {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />} Save profile
            </button>
          </form>
        </Section>

        <Section
          title="Password"
          description={user.hasPassword ? "Changing it signs out your other devices." : "You sign in with GitHub. Add a password to also log in with email."}
        >
          <form onSubmit={savePassword} className="max-w-md space-y-4">
            {user.hasPassword && (
              <PasswordField label="Current password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
            )}
            <PasswordField label="New password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} showStrength required />
            <PasswordField label="Confirm new password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required />
            {pwErr && <p className="text-sm text-neutral-200">{pwErr}</p>}
            <button type="submit" disabled={savingPw || !pw.next} className={btn.primary}>
              {savingPw && <Loader2 className="h-4 w-4 animate-spin" />} {user.hasPassword ? "Change password" : "Set password"}
            </button>
          </form>
        </Section>

        <Section title="Connected accounts" description="Sign in with one click.">
          <div className="flex max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-[#0a0a0a] p-4">
            <Github className="h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">GitHub</p>
              <p className="truncate text-xs text-neutral-500">{user.github ? `Connected as @${user.github.login}` : "Not connected"}</p>
            </div>
            {user.github ? (
              <button
                disabled={busy || !user.hasPassword}
                title={user.hasPassword ? undefined : "Set a password first so you can still sign in"}
                onClick={() =>
                  run(async () => {
                    const res = await accountApi.unlinkGithub();
                    setUser(res.user);
                  }, "GitHub disconnected.")
                }
                className={btn.secondary}
              >
                Disconnect
              </button>
            ) : githubEnabled ? (
              <a href={authApi.githubUrl("/dashboard/settings")} className={btn.secondary}>
                Connect
              </a>
            ) : (
              <span className="text-xs text-neutral-600">Not available</span>
            )}
          </div>
          {user.github && !user.hasPassword && <p className="mt-2 text-xs text-neutral-500">Set a password above before disconnecting GitHub.</p>}
        </Section>

        <Section title="Sessions" description="Devices currently signed in to your account.">
          {!sessions ? (
            <Skeleton className="h-32 max-w-xl" />
          ) : (
            <div className="max-w-xl space-y-3">
              <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]">
                {sessions.map((s) => {
                  const d = describeDevice(s.userAgent);
                  const Icon = d.mobile ? Smartphone : Laptop;
                  return (
                    <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                      <Icon className="h-4 w-4 shrink-0 text-neutral-500" />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm">
                          {d.name}
                          {s.current && <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-black">This device</span>}
                        </p>
                        <p className="truncate text-xs text-neutral-600">
                          {s.ip ?? "Unknown IP"} · active {relativeTime(s.lastUsedAt)} · signed in {relativeTime(s.createdAt)}
                        </p>
                      </div>
                      {!s.current && (
                        <button
                          onClick={() => run(async () => { await accountApi.revokeSession(s.id); await loadSessions(); }, "Signed out that device.")}
                          disabled={busy}
                          className={btn.ghost}
                        >
                          Sign out
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              {sessions.length > 1 && (
                <button onClick={() => run(async () => { await accountApi.revokeOthers(); await loadSessions(); }, "Signed out all other devices.")} disabled={busy} className={btn.secondary}>
                  Sign out all other devices
                </button>
              )}
            </div>
          )}
        </Section>

        <Section title="Plan">
          <div className="flex max-w-md items-center justify-between gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-4">
            <div>
              <p className="font-medium">{user.plan === "FREE" ? "Free" : user.plan === "PRO" ? "Pro" : "Team"}</p>
              <p className="text-xs text-neutral-500">
                {user.plan === "FREE"
                  ? "5 repo drafts/day · 25 documents · 10 tracked repos"
                  : user.plan === "PRO"
                    ? "Unlimited repo drafts · 1,000 documents · 200 tracked repos"
                    : "Unlimited repo drafts · 5,000 documents · 1,000 tracked repos"}
              </p>
            </div>
            {user.plan === "FREE" && (
              <Link href="/pricing" className={btn.secondary}>
                See plans
              </Link>
            )}
          </div>
        </Section>

        <Section title="Danger zone" description="Permanently delete your account and everything in it.">
          <button onClick={() => setDeleteOpen(true)} className={btn.danger}>
            Delete account
          </button>
        </Section>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete your account?"
        confirmLabel="Delete forever"
        danger
        busy={busy}
        requireText={user.username}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={async () => {
          setBusy(true);
          try {
            await accountApi.deleteAccount(user.username);
            await logout().catch(() => {});
            toast("Your account has been deleted.");
            router.replace("/");
          } catch (err) {
            toast((err as Error).message, "error");
            setBusy(false);
          }
        }}
      >
        This deletes your documents, tracked repos, activity and sessions. It can&apos;t be undone.
      </ConfirmDialog>
    </div>
  );
};

export default Settings;
