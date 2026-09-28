import Groq from "groq-sdk";
import { ApiError } from "../utils/ApiError.js";
import type { ProjectProfile } from "./analyzer.service.js";
import type { SourceFile } from "./sourceSample.service.js";

// Groq model ids change over time; check https://console.groq.com/docs/models.
export const AI_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const MAX_OUTPUT_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS) || 4096;
const MAX_EXISTING_README_CHARS = 6_000;

let client: Groq | null = null;

export const aiEnabled = () => Boolean(process.env.GROQ_API_KEY);

const getClient = (): Groq => {
  if (!process.env.GROQ_API_KEY) {
    throw new ApiError(503, "AI drafts aren't set up on this server yet (missing GROQ_API_KEY).");
  }
  return (client ??= new Groq({ apiKey: process.env.GROQ_API_KEY }));
};

const SYSTEM_PROMPT = `You are MarkForge's README writer. You write GitHub README.md files for software projects.

Output rules:
- Output only the README in GitHub-flavored Markdown. No preamble, no closing remarks, and do not wrap the whole answer in a code fence.
- Start with "# <project name>", then badges if provided, then a one- or two-sentence description of what the project does and who it's for.
- Keep every install, run, test and environment-variable detail from the VERIFIED FACTS and SKELETON exactly as given. Never invent commands, package names, env vars, URLs, versions, benchmarks or features.
- Use the SOURCE FILES to describe real features and to write a realistic usage example. If the code doesn't show something, leave it out rather than guessing.
- Replace every "<!-- TODO -->" placeholder in the skeleton with real content when the code supports it; otherwise drop that part.
- Write for a developer skimming the page: short paragraphs, specific bullet points, fenced code blocks with a language tag, and sentence-case headings.
- Keep the skeleton's section order unless there's a clear reason not to. Include a table of contents only if there are six or more sections.
- No marketing fluff ("blazing fast", "revolutionary", "seamless"), and at most one emoji per heading if the existing README already uses emoji; otherwise none.`;

const REFINE_PROMPT = `You are MarkForge's README editor. You receive a README and an instruction from its author.
Apply the instruction and return the complete revised README in GitHub-flavored Markdown.
- Output only the README. No preamble, and do not wrap it in a code fence.
- Change only what the instruction asks for; keep everything else, including commands, links and badges, exactly as it was.
- Never invent commands, env vars, URLs or features that aren't in the README or the VERIFIED FACTS.`;

const factsBlock = (p: ProjectProfile) =>
  JSON.stringify(
    {
      name: p.meta.name,
      repo: p.meta.fullName,
      description: p.meta.description,
      homepage: p.meta.homepage,
      topics: p.meta.topics,
      license: p.meta.license?.name ?? null,
      ecosystem: p.ecosystem,
      packageManager: p.packageManager,
      stack: p.stack,
      scripts: p.scripts,
      envVars: p.envVars.map((v) => ({ key: v.key, comment: v.comment })),
      cliCommands: p.bins,
      npmPackage: p.npmPackage,
      isMonorepo: p.isMonorepo,
      workspaces: p.workspaces,
      topLevelDirs: p.topLevelDirs,
      hasTests: p.hasTests,
      hasDocker: p.hasDocker,
    },
    null,
    2
  );

export interface DraftInput {
  profile: ProjectProfile;
  /** Deterministic README from readmeGenerator: the verified structure to build on. */
  skeleton: string;
  sources: SourceFile[];
  existingReadme: string | null;
}

export interface RefineInput {
  profile: ProjectProfile;
  current: string;
  instruction: string;
}

type Message = Groq.Chat.ChatCompletionMessageParam;

export const draftMessages = ({ profile, skeleton, sources, existingReadme }: DraftInput): Message[] => {
  const parts = [
    `VERIFIED FACTS (from the repository's manifests):\n${factsBlock(profile)}`,
    `SKELETON (verified structure and commands; fill in the TODOs):\n${skeleton}`,
  ];
  if (existingReadme) {
    const trimmed = existingReadme.length > MAX_EXISTING_README_CHARS;
    parts.push(
      `EXISTING README (for tone and any details worth keeping${trimmed ? "; truncated" : ""}):\n${existingReadme.slice(0, MAX_EXISTING_README_CHARS)}`
    );
  }
  if (sources.length) {
    parts.push(
      "SOURCE FILES:\n" +
        sources.map((f) => `--- ${f.path}${f.truncated ? " (truncated)" : ""} ---\n${f.content}`).join("\n\n")
    );
  }
  parts.push(`Write the complete README.md for ${profile.meta.fullName}.`);
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: parts.join("\n\n") },
  ];
};

export const refineMessages = ({ profile, current, instruction }: RefineInput): Message[] => [
  { role: "system", content: REFINE_PROMPT },
  {
    role: "user",
    content: `VERIFIED FACTS:\n${factsBlock(profile)}\n\nREADME:\n${current}\n\nINSTRUCTION:\n${instruction}`,
  },
];

export interface StreamResult {
  finishReason: string | null;
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
}

/** Streams README text; calls onText for each chunk. Rejects with ApiError on provider errors. */
export const streamCompletion = async (
  messages: Message[],
  onText: (text: string) => void,
  signal: AbortSignal
): Promise<StreamResult> => {
  const groq = getClient();
  let finishReason: string | null = null;
  let usage: StreamResult["usage"] = null;
  try {
    const stream = await groq.chat.completions.create(
      { model: AI_MODEL, messages, stream: true, temperature: 0.4, max_completion_tokens: MAX_OUTPUT_TOKENS },
      { signal }
    );
    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (choice?.delta?.content) onText(choice.delta.content);
      if (choice?.finish_reason) finishReason = choice.finish_reason;
      if (chunk.x_groq?.usage) usage = chunk.x_groq.usage;
    }
  } catch (err) {
    if (signal.aborted) return { finishReason: "aborted", usage };
    if (err instanceof Groq.RateLimitError) throw new ApiError(429, "The AI is busy right now (rate limited). Try again in a minute.");
    if (err instanceof Groq.AuthenticationError) throw new ApiError(503, "The server's Groq API key was rejected.");
    if (err instanceof Groq.APIError) throw new ApiError(502, `AI request failed: ${err.message}`);
    throw err;
  }
  return { finishReason: signal.aborted ? "aborted" : finishReason, usage };
};
