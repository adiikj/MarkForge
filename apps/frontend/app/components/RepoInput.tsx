"use client";

import { FC, FormEvent, useState } from "react";
import { ArrowRight, Github, Loader2 } from "lucide-react";

interface RepoInputProps {
  onSubmit: (repo: string) => void;
  loading?: boolean;
  buttonLabel: string;
  initialValue?: string;
  autoFocus?: boolean;
}

const RepoInput: FC<RepoInputProps> = ({ onSubmit, loading, buttonLabel, initialValue = "", autoFocus }) => {
  const [value, setValue] = useState(initialValue);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim() && !loading) onSubmit(value.trim());
  };

  return (
    <form
      onSubmit={submit}
      className="group flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 pl-4 transition-colors focus-within:border-white/30 focus-within:bg-white/[0.05]"
    >
      <Github className="h-4 w-4 shrink-0 text-neutral-500" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="github.com/owner/repo"
        aria-label="GitHub repository"
        autoFocus={autoFocus}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        className="min-w-0 flex-1 bg-transparent py-2 font-mono text-sm text-white outline-none placeholder:text-neutral-600"
      />
      <button
        type="submit"
        disabled={loading || !value.trim()}
        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition-all hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        <span className="hidden sm:inline">{buttonLabel}</span>
      </button>
    </form>
  );
};

export default RepoInput;
