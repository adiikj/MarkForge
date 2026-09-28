"use client";

import { FC, useEffect, useState } from "react";
import { renderMermaid } from "../../lib/mermaid";

interface MermaidDiagramProps {
  code: string;
  /** Called with the latest SVG (or null on error), e.g. for export. */
  onRender?: (svg: string | null) => void;
  className?: string;
}

const MermaidDiagram: FC<MermaidDiagramProps> = ({ code, onRender, className }) => {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Debounce so typing doesn't re-render on every keystroke.
    const t = setTimeout(() => {
      renderMermaid(code.trim())
        .then((out) => {
          if (cancelled) return;
          setSvg(out);
          setError(null);
          onRender?.(out);
        })
        .catch((err: Error) => {
          if (cancelled) return;
          setError(err.message.split("\n").slice(0, 3).join("\n"));
          onRender?.(null);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (error) {
    return (
      <div className={`rounded-lg border border-white/15 bg-white/[0.03] p-4 ${className ?? ""}`}>
        <p className="text-xs font-medium text-neutral-300">Mermaid syntax error</p>
        <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] text-neutral-500">{error}</pre>
      </div>
    );
  }
  if (!svg) return <div className={`animate-pulse rounded-lg bg-white/[0.03] ${className ?? "h-40"}`} />;
  // Mermaid output is sanitized by securityLevel "strict".
  return <div className={`mermaid-svg flex justify-center overflow-auto ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: svg }} />;
};

export default MermaidDiagram;
