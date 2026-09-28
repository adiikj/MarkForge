"use client";

import { ChangeEvent, ClipboardEvent, DragEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Braces,
  Check,
  ClipboardPaste,
  Code2,
  Copy,
  Download,
  Eye,
  FileText,
  FileType2,
  Printer,
  Send,
  Table2,
} from "lucide-react";
import Preview from "../readmegen/Preview";
import { docxToMarkdown, htmlToMarkdown, markdownToHtml, printAsPdf } from "../../lib/convert";
import { fromJson, importTable, parseMarkdownTable, toCsv, toMarkdownTable } from "../../lib/table";
import { sendHandoff } from "../../lib/handoff";

type Direction = "to" | "from";
type ToSource = "rich" | "html" | "docx" | "csv" | "json";
type FromTarget = "html" | "pdf" | "csv";

const TO_SOURCES: { id: ToSource; label: string; hint: string; icon: typeof FileText }[] = [
  { id: "rich", label: "Rich text", hint: "Paste from Notion, Google Docs, Word or a web page", icon: ClipboardPaste },
  { id: "html", label: "HTML", hint: "Paste HTML source", icon: Code2 },
  { id: "docx", label: "Word (.docx)", hint: "Drop a .docx file", icon: FileType2 },
  { id: "csv", label: "CSV / TSV", hint: "Becomes a Markdown table", icon: Table2 },
  { id: "json", label: "JSON", hint: "An array of objects becomes a table", icon: Braces },
];

const FROM_TARGETS: { id: FromTarget; label: string; icon: typeof FileText }[] = [
  { id: "html", label: "HTML", icon: Code2 },
  { id: "pdf", label: "PDF", icon: Printer },
  { id: "csv", label: "CSV (tables)", icon: Table2 },
];

const SAMPLE_MD = `# Project notes

Some **bold** text, a [link](https://github.com), and \`inline code\`.

| Name | Role |
| --- | --- |
| Ada | Engineer |
| Linus | Maintainer |

\`\`\`js
console.log("hello");
\`\`\`
`;

const Converter = () => {
  const router = useRouter();
  const [direction, setDirection] = useState<Direction>("to");
  const [source, setSource] = useState<ToSource>("rich");
  const [target, setTarget] = useState<FromTarget>("html");
  const [input, setInput] = useState("");
  const [richHtml, setRichHtml] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mdInput, setMdInput] = useState(SAMPLE_MD);
  const [output, setOutput] = useState("");
  const [outView, setOutView] = useState<"code" | "preview">("code");
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Markdown → X converts live.
  useEffect(() => {
    if (direction !== "from") return;
    setError(null);
    if (target === "html") setOutput(markdownToHtml(mdInput));
    else if (target === "csv") {
      const t = parseMarkdownTable(mdInput);
      setOutput(t ? toCsv(t) : "");
      if (!t) setError("No Markdown table found in the input.");
    } else setOutput("");
  }, [direction, target, mdInput]);

  // X → Markdown converts live for text sources.
  useEffect(() => {
    if (direction !== "to" || source === "docx" || source === "rich") return;
    setError(null);
    if (!input.trim()) return setOutput("");
    let cancelled = false;
    (async () => {
      try {
        let md = "";
        if (source === "html") md = await htmlToMarkdown(input);
        if (source === "csv") {
          const t = importTable(input);
          md = t ? toMarkdownTable(t) : "";
          if (!t) throw new Error("Couldn't find rows in that text.");
        }
        if (source === "json") {
          const t = fromJson(JSON.parse(input));
          if (!t) throw new Error("Expected an array of objects (or an object containing one).");
          md = toMarkdownTable(t);
        }
        if (!cancelled) setOutput(md);
      } catch (err) {
        if (!cancelled) {
          setOutput("");
          setError(err instanceof SyntaxError ? `Invalid JSON: ${err.message}` : (err as Error).message);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [direction, source, input]);

  const reset = () => {
    setInput("");
    setRichHtml(null);
    setFileName(null);
    setOutput("");
    setError(null);
    setWarnings([]);
  };

  const onRichPaste = async (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    setError(null);
    setRichHtml(html || null);
    // Plain-text pastes are usually already Markdown-ish; keep them as-is.
    setOutput(html ? await htmlToMarkdown(html) : text);
  };

  const loadDocx = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.docx$/i.test(file.name)) return setError("Please choose a .docx file (older .doc isn't supported).");
    setBusy(true);
    setError(null);
    setFileName(file.name);
    try {
      const { markdown, warnings: w } = await docxToMarkdown(file);
      setOutput(markdown);
      setWarnings(w.slice(0, 5));
    } catch (err) {
      setError(`Couldn't read that document: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const download = () => {
    const [name, type] =
      direction === "to" ? ["converted.md", "text/markdown"] : target === "csv" ? ["table.csv", "text/csv"] : ["document.html", "text/html"];
    const content = direction === "from" && target === "html" ? `<!doctype html>\n<meta charset="utf-8">\n${output}` : output;
    const url = URL.createObjectURL(new Blob([content], { type }));
    Object.assign(document.createElement("a"), { href: url, download: name }).click();
    URL.revokeObjectURL(url);
  };

  const outputIsMarkdown = direction === "to";
  const canPreview = outputIsMarkdown || target === "html";

  const tabCls = (on: boolean) =>
    `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${
      on ? "bg-white text-black" : "border border-white/10 text-neutral-400 hover:border-white/25 hover:text-white"
    }`;

  return (
    <section className="relative overflow-hidden bg-[#050505] text-white">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[480px] [mask-image:radial-gradient(ellipse_70%_100%_at_50%_0%,black_30%,transparent_100%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-white/[0.06] blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-5 pb-24 pt-10 md:px-8 md:pt-14">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">Converters</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Anything in, Markdown out</h1>
          <p className="mt-3 text-neutral-400">
            Paste from Notion, Google Docs or Word, or drop in HTML, CSV or JSON. Or turn Markdown into HTML, PDF or CSV. Everything
            runs in your browser; nothing is uploaded.
          </p>
        </div>

        {/* Direction */}
        <div className="mt-8 inline-flex rounded-xl border border-white/10 p-1">
          {([
            ["to", "To Markdown"],
            ["from", "From Markdown"],
          ] as const).map(([d, label]) => (
            <button
              key={d}
              onClick={() => {
                setDirection(d);
                reset();
              }}
              className={`rounded-lg px-4 py-1.5 text-sm ${direction === d ? "bg-white text-black" : "text-neutral-400 hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {direction === "to"
            ? TO_SOURCES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setSource(id);
                    reset();
                  }}
                  className={tabCls(source === id)}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))
            : FROM_TARGETS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setTarget(id)} className={tabCls(target === id)}>
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
        </div>

        <div className="mt-4 grid overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] lg:grid-cols-2">
          {/* Input */}
          <div className="flex min-h-[460px] flex-col border-b border-white/10 lg:border-b-0 lg:border-r">
            <div className="border-b border-white/10 px-4 py-2 text-xs text-neutral-500">
              {direction === "to" ? TO_SOURCES.find((s) => s.id === source)!.hint : "Markdown"}
            </div>

            {direction === "from" ? (
              <textarea
                value={mdInput}
                onChange={(e) => setMdInput(e.target.value)}
                spellCheck={false}
                aria-label="Markdown input"
                className="flex-1 resize-none bg-transparent p-4 font-mono text-[13px] leading-6 text-neutral-200 outline-none"
              />
            ) : source === "rich" ? (
              <div
                tabIndex={0}
                onPaste={onRichPaste}
                className="m-4 flex flex-1 cursor-text flex-col items-center justify-center rounded-xl border border-dashed border-white/15 p-6 text-center outline-none focus:border-white/40 focus:bg-white/[0.02]"
              >
                <ClipboardPaste className="h-6 w-6 text-neutral-500" />
                <p className="mt-3 text-sm text-neutral-300">
                  {output ? "Pasted. Paste again to replace." : "Click here, then paste (⌘V / Ctrl V)"}
                </p>
                <p className="mt-1 max-w-xs text-xs text-neutral-600">
                  Formatting, links, lists, tables and code carry over. {richHtml === null && output ? "(Pasted as plain text.)" : ""}
                </p>
              </div>
            ) : source === "docx" ? (
              <label
                onDragOver={(e: DragEvent) => e.preventDefault()}
                onDrop={(e: DragEvent) => {
                  e.preventDefault();
                  loadDocx(e.dataTransfer.files[0]);
                }}
                className="m-4 flex flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 p-6 text-center hover:border-white/30"
              >
                <FileType2 className="h-6 w-6 text-neutral-500" />
                <p className="mt-3 text-sm text-neutral-300">{busy ? "Converting…" : fileName ?? "Drop a .docx here, or click to choose"}</p>
                <p className="mt-1 text-xs text-neutral-600">Headings, lists, tables, links and bold/italic are kept.</p>
                <input
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => loadDocx(e.target.files?.[0])}
                  className="sr-only"
                />
              </label>
            ) : (
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                spellCheck={false}
                aria-label="Input"
                placeholder={
                  source === "html"
                    ? "<h1>Title</h1>\n<p>Some <strong>HTML</strong>…</p>"
                    : source === "csv"
                      ? "name,role\nAda,Engineer\nLinus,Maintainer"
                      : '[{ "name": "Ada", "role": "Engineer" }]'
                }
                className="flex-1 resize-none bg-transparent p-4 font-mono text-[13px] leading-6 text-neutral-200 outline-none placeholder:text-neutral-700"
              />
            )}
          </div>

          {/* Output */}
          <div className="flex min-h-[460px] flex-col bg-[#070707]">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 px-3 py-1.5">
              <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                <ArrowRight className="h-3.5 w-3.5" />
                {outputIsMarkdown ? "Markdown" : FROM_TARGETS.find((t) => t.id === target)!.label}
              </span>
              {canPreview && direction === "to" && (
                <div className="ml-2 flex rounded-lg border border-white/10 p-0.5">
                  {(["code", "preview"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setOutView(v)}
                      className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] ${outView === v ? "bg-white/15 text-white" : "text-neutral-500 hover:text-white"}`}
                    >
                      {v === "preview" ? <Eye className="h-3 w-3" /> : <Code2 className="h-3 w-3" />}
                      {v === "preview" ? "Preview" : "Source"}
                    </button>
                  ))}
                </div>
              )}
              <div className="ml-auto flex items-center gap-1.5">
                {direction === "to" && (
                  <button
                    onClick={() => {
                      sendHandoff({ markdown: output, label: fileName?.replace(/\.docx$/i, ".md") ?? "Converted.md" });
                      router.push("/generate");
                    }}
                    disabled={!output}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-neutral-300 hover:border-white/25 disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" /> Studio
                  </button>
                )}
                {target !== "pdf" || direction === "to" ? (
                  <>
                    <button
                      onClick={download}
                      disabled={!output}
                      className="rounded-lg border border-white/10 p-1.5 text-neutral-300 hover:border-white/25 disabled:opacity-40"
                      aria-label="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={copy}
                      disabled={!output}
                      className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-black hover:bg-neutral-200 disabled:opacity-40"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              {error && (
                <div className="m-4 flex items-start gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-neutral-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                </div>
              )}
              {warnings.length > 0 && (
                <ul className="mx-4 mt-3 space-y-1 text-[11px] text-neutral-600">
                  {warnings.map((w) => (
                    <li key={w}>Note: {w}</li>
                  ))}
                </ul>
              )}

              {direction === "from" && target === "pdf" ? (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                  <Printer className="h-6 w-6 text-neutral-500" />
                  <p className="mt-3 max-w-sm text-sm text-neutral-400">
                    Opens a clean, print-ready page. Choose <strong className="text-neutral-200">Save as PDF</strong> in the print
                    dialog.
                  </p>
                  <button
                    onClick={() => !printAsPdf(mdInput, "Document") && setError("Your browser blocked the print window. Allow pop-ups and try again.")}
                    disabled={!mdInput.trim()}
                    className="mt-5 flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-40"
                  >
                    <Printer className="h-4 w-4" /> Open print view
                  </button>
                </div>
              ) : !output ? (
                !error && <p className="p-5 text-sm text-neutral-600">Output appears here.</p>
              ) : direction === "to" && outView === "preview" ? (
                <div className="p-6">
                  <Preview content={output} />
                </div>
              ) : (
                <pre className="whitespace-pre-wrap break-words p-5 font-mono text-[12.5px] leading-6 text-neutral-300">{output}</pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Converter;
