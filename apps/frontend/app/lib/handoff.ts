// Moves a draft between /health and /generate without putting Markdown in the URL.

const KEY = "markforge:handoff";

export interface Handoff {
  markdown: string;
  /** e.g. "owner/repo", shown as the document name. */
  label?: string;
  repo?: string;
}

export const sendHandoff = (h: Handoff) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(h));
  } catch {
    /* storage unavailable: the target page just opens empty */
  }
};

export const takeHandoff = (): Handoff | null => {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as Handoff;
  } catch {
    return null;
  }
};
