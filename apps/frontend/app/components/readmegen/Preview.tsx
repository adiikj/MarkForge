"use client";

import { FC, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import MermaidDiagram from "../shared/MermaidDiagram";

interface PreviewProps {
  content: string;
}

// Styling lives in globals.css under .markdown-body and follows GitHub's dark theme,
// so what you see here is close to what GitHub renders.
const Preview: FC<PreviewProps> = ({ content }) => {
  return (
    <article className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
          // ```mermaid blocks render as diagrams, like on GitHub.
          pre: ({ node, children, ...props }) => {
            const code = node?.children[0];
            const lang = code && "properties" in code ? String(code.properties?.className ?? "") : "";
            if (code && "tagName" in code && code.tagName === "code" && lang.includes("language-mermaid")) {
              const text = code.children.map((c) => ("value" in c ? c.value : "")).join("");
              return <MermaidDiagram code={text} className="my-4" />;
            }
            return <pre {...props}>{children}</pre>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
};

export default memo(Preview);
