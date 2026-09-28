import type { Request, Response } from "express";
import { recordActivity } from "../services/activity.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { loadSnapshot, repoSummary } from "../services/snapshotCache.service.js";
import { findReadme } from "../services/github.service.js";
import { analyzeRepo } from "../services/analyzer.service.js";
import { generateReadme } from "../services/readmeGenerator.service.js";
import { fetchSourceSample } from "../services/sourceSample.service.js";
import { AI_MODEL, aiEnabled, draftMessages, refineMessages, streamCompletion } from "../services/aiReadme.service.js";
import { assertQuota, consumeQuota } from "../utils/quota.js";

const MAX_INSTRUCTION_CHARS = 500;
const MAX_CURRENT_CHARS = 40_000;

/** GET /api/ai/status */
export const aiStatus = asyncHandler(async (_req: Request, res: Response) => {
  return res.json(new ApiResponse(200, "AI status", { enabled: aiEnabled(), model: AI_MODEL }));
});

/**
 * POST /api/ai/readme  { repo }                        AI-written README grounded in the repo
 *                      { repo, current, instruction }  revise an existing draft
 * Responds with server-sent events: meta → delta* → done | error.
 * Counts toward the daily repo-draft quota.
 */
export const aiReadme = asyncHandler(async (req: Request, res: Response) => {
  const { repo, current, instruction } = req.body ?? {};
  const refining = instruction !== undefined;
  if (refining) {
    if (typeof instruction !== "string" || !instruction.trim()) throw new ApiError(400, "Tell the AI what to change.");
    if (instruction.length > MAX_INSTRUCTION_CHARS) throw new ApiError(400, `Keep instructions under ${MAX_INSTRUCTION_CHARS} characters.`);
    if (typeof current !== "string" || !current.trim()) throw new ApiError(400, "There's no draft to revise.");
    if (current.length > MAX_CURRENT_CHARS) throw new ApiError(413, "That draft is too long to revise.");
  }
  if (!aiEnabled()) throw new ApiError(503, "AI drafts aren't set up on this server yet (missing GROQ_API_KEY).");
  await assertQuota(req, "generate");

  // Stop work (and token spend) as soon as the browser goes away, even mid-setup.
  const abort = new AbortController();
  res.on("close", () => abort.abort());

  // Everything that can fail with a normal HTTP error happens before the stream opens.
  const snapshot = await loadSnapshot(repo);
  const profile = analyzeRepo(snapshot);
  const messages = refining
    ? refineMessages({ profile, current, instruction: instruction.trim() })
    : draftMessages({
        profile,
        skeleton: generateReadme(profile),
        sources: await fetchSourceSample(snapshot),
        existingReadme: findReadme(snapshot)?.content ?? null,
      });
  if (abort.signal.aborted) return;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // don't let proxies buffer the stream
  });
  const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  send("meta", { repo: repoSummary(snapshot), model: AI_MODEL, mode: refining ? "refine" : "draft", stack: profile.stack });
  try {
    const result = await streamCompletion(messages, (text) => send("delta", { text }), abort.signal);
    // The SDK can end the stream quietly on abort, so check the signal, not just the result.
    if (abort.signal.aborted || result.finishReason === "aborted") return res.end();
    const quota = await consumeQuota(req, "generate");
    recordActivity(req, refining ? "AI_REVISE" : "AI_DRAFT", snapshot.meta.fullName, { model: AI_MODEL });
    console.log(`[ai] ${refining ? "refine" : "draft"} ${snapshot.meta.fullName} model=${AI_MODEL} usage=${JSON.stringify(result.usage)}`);
    send("done", { finishReason: result.finishReason, truncated: result.finishReason === "length", usage: result.usage, quota });
  } catch (err) {
    send("error", { message: err instanceof ApiError ? err.message : "The AI request failed." });
    if (!(err instanceof ApiError) || err.statusCode >= 500) console.error("[ai]", err);
  }
  res.end();
});
