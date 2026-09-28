import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import cookieparser from "cookie-parser";
import { ApiError } from "./utils/ApiError.js";

const app = express();

// Behind a proxy (Render, Railway, Vercel…) req.ip is the proxy unless this is set.
// Set TRUST_PROXY to the number of proxy hops, e.g. 1.
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

// Comma-separated list, e.g. "https://markforge.vercel.app,http://localhost:3000"
const allowedOrigins = (process.env.CORS_ORIGIN ?? "https://markforge.vercel.app,http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
};

app.use(cors(corsOptions));

// Pasted READMEs for the health check can be well over the old 16kb limit.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieparser());
app.options("*", cors(corsOptions));

import githubRoutes from "./routes/githubRepo.routes.js";
app.use("/api/github", githubRoutes);

import readmeRoutes from "./routes/readme.routes.js";
app.use("/api/readme", readmeRoutes);

import toolsRoutes from "./routes/tools.routes.js";
app.use("/api/tools", toolsRoutes);

// import userRouter from './routes/user.routes.js';
// app.use('/user', userRouter);

// JSON errors for everything thrown through asyncHandler.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = err instanceof ApiError ? err.statusCode : 500;
  const message = err instanceof ApiError ? err.message : "Something went wrong.";
  if (status >= 500) console.error(err);
  res.status(status).json({ success: false, message, errors: err instanceof ApiError ? err.errors : [] });
});

export { app };
