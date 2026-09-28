"use client";

import { FC, InputHTMLAttributes, ReactNode, useId, useState } from "react";
import { AlertCircle, Eye, EyeOff, Github, Loader2 } from "lucide-react";

export const inputCls =
  "w-full rounded-xl border bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-neutral-600 focus:bg-white/[0.05] disabled:opacity-60";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  hint?: ReactNode;
  aside?: ReactNode;
}

export const Field: FC<FieldProps> = ({ label, error, hint, aside, className, ...input }) => {
  const id = useId();
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-sm text-neutral-300">
          {label}
        </label>
        {aside}
      </div>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-err` : undefined}
        {...input}
        className={`${inputCls} ${error ? "border-white/60" : "border-white/10 focus:border-white/30"}`}
      />
      {error ? (
        <p id={`${id}-err`} className="mt-1.5 flex items-center gap-1.5 text-xs text-neutral-200">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-neutral-500">{hint}</p>
      )}
    </div>
  );
};

/** 0–4, based on length and character variety. A guide, not a policy. */
export const passwordStrength = (pw: string) => {
  if (!pw) return 0;
  let s = pw.length >= 8 ? 1 : 0;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  else if (pw.length >= 16) s++;
  return Math.min(s, 4);
};
const STRENGTH = ["Too short", "Weak", "Okay", "Good", "Strong"];

export const PasswordField: FC<FieldProps & { showStrength?: boolean }> = ({ showStrength, ...props }) => {
  const [visible, setVisible] = useState(false);
  const value = String(props.value ?? "");
  const score = passwordStrength(value);
  return (
    <div className={props.className}>
      <div className="relative">
        <Field {...props} className={undefined} type={visible ? "text" : "password"} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-2.5 top-[34px] rounded-md p-1 text-neutral-500 hover:text-white"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {showStrength && value && (
        <div className="mt-2 flex items-center gap-2" aria-live="polite">
          <div className="flex flex-1 gap-1">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={`h-1 flex-1 rounded-full ${i <= score ? "bg-white" : "bg-white/10"}`} />
            ))}
          </div>
          <span className="w-16 text-right text-[11px] text-neutral-400">{STRENGTH[score]}</span>
        </div>
      )}
    </div>
  );
};

export const SubmitButton: FC<{ loading?: boolean; children: ReactNode; disabled?: boolean }> = ({ loading, children, disabled }) => (
  <button
    type="submit"
    disabled={loading || disabled}
    className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
    {children}
  </button>
);

export const GithubButton: FC<{ href: string; label?: string }> = ({ href, label = "Continue with GitHub" }) => (
  // A full navigation (not fetch): the OAuth flow is a chain of redirects.
  <a
    href={href}
    className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/15 bg-white/[0.03] py-2.5 text-sm font-medium text-white transition-colors hover:border-white/30 hover:bg-white/[0.06]"
  >
    <Github className="h-4 w-4" /> {label}
  </a>
);

export const Divider: FC<{ label?: string }> = ({ label = "or" }) => (
  <div className="my-6 flex items-center gap-3 text-xs text-neutral-600">
    <span className="h-px flex-1 bg-white/10" /> {label} <span className="h-px flex-1 bg-white/10" />
  </div>
);

export const FormAlert: FC<{ children: ReactNode; tone?: "error" | "info" }> = ({ children, tone = "error" }) => (
  <div
    role={tone === "error" ? "alert" : "status"}
    className={`mb-5 flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm ${
      tone === "error" ? "border-white/25 bg-white/[0.06] text-neutral-100" : "border-white/10 bg-white/[0.03] text-neutral-300"
    }`}
  >
    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
    <span>{children}</span>
  </div>
);
