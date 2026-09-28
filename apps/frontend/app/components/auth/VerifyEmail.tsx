"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import AuthShell from "./AuthShell";
import { authApi } from "../../lib/account";
import { useAuth } from "../../lib/auth";

const VerifyEmail = () => {
  const token = useSearchParams().get("token") ?? "";
  const { user, setUser } = useAuth();
  const [state, setState] = useState<"working" | "done" | "error">(token ? "working" : "error");
  const [message, setMessage] = useState(token ? "" : "This page needs the link from your verification email.");
  const started = useRef(false);

  useEffect(() => {
    // Tokens are single-use; guard against React strict-mode double effects.
    if (!token || started.current) return;
    started.current = true;
    authApi
      .verifyEmail(token)
      .then(({ user: verified }) => {
        setState("done");
        if (user && user.id === verified.id) setUser(verified);
      })
      .catch((err) => {
        setState("error");
        setMessage(err.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <AuthShell title={state === "done" ? "Email verified" : state === "working" ? "Verifying…" : "Couldn't verify"}>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
        {state === "working" && <Loader2 className="mx-auto h-8 w-8 animate-spin text-neutral-400" />}
        {state === "done" && (
          <>
            <CheckCircle2 className="mx-auto h-8 w-8 text-white" />
            <p className="mt-4 text-sm text-neutral-300">Thanks for confirming your email. You&apos;re all set.</p>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle className="mx-auto h-8 w-8 text-neutral-400" />
            <p className="mt-4 text-sm text-neutral-300">{message}</p>
            {user && !user.emailVerified && <p className="mt-2 text-xs text-neutral-500">You can send a new link from your dashboard.</p>}
          </>
        )}
        {state !== "working" && (
          <Link
            href={user ? "/dashboard" : "/login"}
            className="mt-6 inline-block rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-neutral-200"
          >
            {user ? "Go to dashboard" : "Log in"}
          </Link>
        )}
      </div>
    </AuthShell>
  );
};

export default VerifyEmail;
