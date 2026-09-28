"use client";

import { useState } from "react";
import { ApiRequestError } from "../../lib/api";

/** Tracks submit state plus a form-level error and per-field errors from the API. */
export const useAuthForm = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      await fn();
    } catch (err) {
      const e = err as ApiRequestError;
      const field = (e.details as { field?: string } | undefined)?.field;
      if (field) setFieldErrors({ [field]: (e.details as { message?: string }).message ?? e.message });
      else setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const clearField = (name: string) => setFieldErrors(({ [name]: _removed, ...rest }) => rest);
  return { loading, error, setError, fieldErrors, run, clearField };
};

/** Only follow same-site relative paths after auth (mirrors the server's open-redirect guard). */
export const safeNext = (next: string | null) => (next && /^\/(?!\/)/.test(next) ? next : "/dashboard");
