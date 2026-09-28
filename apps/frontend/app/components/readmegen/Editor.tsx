"use client";

import { forwardRef, KeyboardEvent } from "react";

interface EditorProps {
  content: string;
  onChange: (text: string) => void;
  onCursor?: (line: number, col: number) => void;
}

const INDENT = "  ";

const Editor = forwardRef<HTMLTextAreaElement, EditorProps>(({ content, onChange, onCursor }, ref) => {
  const reportCursor = (el: HTMLTextAreaElement) => {
    if (!onCursor) return;
    const before = el.value.slice(0, el.selectionStart);
    const line = before.split("\n").length;
    onCursor(line, el.selectionStart - before.lastIndexOf("\n"));
  };

  // Tab indents instead of leaving the field; Shift+Tab outdents the current line.
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart: start, selectionEnd: end, value } = el;
    if (e.shiftKey) {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      if (value.startsWith(INDENT, lineStart)) {
        onChange(value.slice(0, lineStart) + value.slice(lineStart + INDENT.length));
        requestAnimationFrame(() => el.setSelectionRange(start - INDENT.length, end - INDENT.length));
      }
      return;
    }
    onChange(value.slice(0, start) + INDENT + value.slice(end));
    requestAnimationFrame(() => el.setSelectionRange(start + INDENT.length, start + INDENT.length));
  };

  return (
    <textarea
      ref={ref}
      value={content}
      onChange={(e) => {
        onChange(e.target.value);
        reportCursor(e.target);
      }}
      onKeyDown={onKeyDown}
      onSelect={(e) => reportCursor(e.currentTarget)}
      spellCheck={false}
      aria-label="Markdown editor"
      placeholder="# Start writing, pick a template, or forge from a repo…"
      className="h-full w-full resize-none bg-transparent p-5 font-mono text-[13px] leading-6 text-neutral-200 caret-white outline-none placeholder:text-neutral-600 selection:bg-white/20 selection:text-white"
    />
  );
});

Editor.displayName = "Editor";

export default Editor;
