// Lazy Mermaid renderer shared by the Diagrams page and the Markdown preview.
// Mermaid is ~1MB, so it's only loaded once a diagram is actually on screen.

type MermaidApi = typeof import("mermaid").default;

let loader: Promise<MermaidApi> | null = null;
let queue: Promise<unknown> = Promise.resolve();
let seq = 0;

const load = () =>
  (loader ??= import("mermaid").then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "base",
      fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui",
      themeVariables: {
        darkMode: true,
        background: "#0a0a0a",
        primaryColor: "#171717",
        primaryTextColor: "#f5f5f5",
        primaryBorderColor: "#525252",
        secondaryColor: "#1f1f1f",
        tertiaryColor: "#111111",
        lineColor: "#a3a3a3",
        textColor: "#e5e5e5",
        mainBkg: "#171717",
        clusterBkg: "#0f0f0f",
        clusterBorder: "#404040",
        edgeLabelBackground: "#0a0a0a",
        noteBkgColor: "#262626",
        noteTextColor: "#f5f5f5",
      },
    });
    return mermaid;
  }));

/** Render Mermaid source to SVG. Calls are serialized because Mermaid isn't re-entrant. */
export const renderMermaid = (code: string): Promise<string> => {
  const run = queue.then(async () => {
    const mermaid = await load();
    const { svg } = await mermaid.render(`mf-mermaid-${++seq}`, code);
    return svg;
  });
  queue = run.catch(() => undefined);
  return run;
};
