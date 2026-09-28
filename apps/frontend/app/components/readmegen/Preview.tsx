"use client";

import { FC, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

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
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
};

export default memo(Preview);
