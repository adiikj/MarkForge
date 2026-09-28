// Conversions for the Converters page. Heavy libraries load on demand.

import { marked } from "marked";

/** Remove wrappers that Google Docs, Word and Notion add to copied HTML. */
const cleanHtml = (html: string): string =>
  html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(style|script|meta|link|title)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(meta|link)[^>]*\/?>/gi, "")
    // Google Docs wraps everything in <b style="font-weight:normal" id="docs-internal-guid-…">.
    .replace(/<b\b[^>]*id="docs-internal-guid[^"]*"[^>]*>([\s\S]*)<\/b>/i, "$1")
    .replace(/<span\b[^>]*font-weight:\s*(700|bold)[^>]*>([\s\S]*?)<\/span>/gi, "<strong>$2</strong>")
    .replace(/<span\b[^>]*font-style:\s*italic[^>]*>([\s\S]*?)<\/span>/gi, "<em>$1</em>");

export const htmlToMarkdown = async (html: string): Promise<string> => {
  const [{ default: TurndownService }, { gfm }] = await Promise.all([import("turndown"), import("turndown-plugin-gfm")]);
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "_",
    hr: "---",
  });
  td.use(gfm);
  // "- item" instead of Turndown's default "-   item"; nested content indents to match the marker.
  td.addRule("listItem", {
    filter: "li",
    replacement: (content, node, options) => {
      const parent = node.parentNode as HTMLElement | null;
      let prefix = `${options.bulletListMarker} `;
      if (parent?.nodeName === "OL") {
        const start = Number(parent.getAttribute("start") ?? 1);
        prefix = `${start + Array.prototype.indexOf.call(parent.children, node)}. `;
      }
      const body = content
        .replace(/^\n+/, "")
        .replace(/\n+$/, "\n")
        .replace(/\n/gm, `\n${" ".repeat(prefix.length)}`);
      return prefix + body + (node.nextSibling && !/\n$/.test(body) ? "\n" : "");
    },
  });
  // Keep a language on fenced code when the source marks it (class="language-js").
  td.addRule("fencedWithLang", {
    filter: (node) => node.nodeName === "PRE" && node.firstChild?.nodeName === "CODE",
    replacement: (_content, node) => {
      const code = node.firstChild as HTMLElement;
      const lang = (code.getAttribute("class") ?? "").match(/language-(\S+)/)?.[1] ?? "";
      return `\n\n\`\`\`${lang}\n${code.textContent?.replace(/\n$/, "") ?? ""}\n\`\`\`\n\n`;
    },
  });
  return td
    .turndown(cleanHtml(html))
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .concat("\n");
};

export const markdownToHtml = (md: string): string => marked.parse(md, { gfm: true, async: false }) as string;

export const docxToMarkdown = async (file: File): Promise<{ markdown: string; warnings: string[] }> => {
  const mammoth = await import("mammoth");
  const { value, messages } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  return { markdown: await htmlToMarkdown(value), warnings: messages.map((m) => m.message) };
};

const PRINT_CSS = `
  body { font: 15px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; color: #111; max-width: 760px; margin: 40px auto; padding: 0 24px; }
  h1, h2 { border-bottom: 1px solid #ddd; padding-bottom: .3em; }
  code { font: 85% ui-monospace, SFMono-Regular, Menlo, monospace; background: #f3f3f3; padding: .15em .35em; border-radius: 4px; }
  pre { background: #f6f6f6; padding: 14px; border-radius: 6px; overflow: auto; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; } th, td { border: 1px solid #ccc; padding: 6px 12px; }
  blockquote { color: #555; border-left: 4px solid #ddd; margin: 0; padding: 0 1em; }
  img { max-width: 100%; }
  @page { margin: 18mm; }
`;

/** A standalone HTML document for "Save as PDF" via the browser's print dialog. */
export const printableHtml = (md: string, title = "Document"): string =>
  `<!doctype html><html><head><meta charset="utf-8"><title>${title.replace(/</g, "&lt;")}</title><style>${PRINT_CSS}</style></head><body>${markdownToHtml(md)}</body></html>`;

export const printAsPdf = (md: string, title?: string): boolean => {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open();
  w.document.write(printableHtml(md, title));
  w.document.close();
  // Some browsers don't fire load for document.write, so also try after a beat; print only once.
  let printed = false;
  const print = () => {
    if (printed || w.closed) return;
    printed = true;
    w.focus();
    w.print();
  };
  w.addEventListener("load", print);
  setTimeout(print, 400);
  return true;
};
