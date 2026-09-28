import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import cookieparser from "cookie-parser";
import { ApiError } from "./utils/ApiError.js";
import { attachUser } from "./middlewares/auth.middleware.js";

const app = express();

// The Next.js app proxies /api to this server, so req.ip would be the proxy's address.
// By default trust forwarding headers only from private-network proxies (e.g. Next on the same host).
// In production set TRUST_PROXY to your hop count or proxy addresses (see .env.example).
const trustProxy = process.env.TRUST_PROXY ?? "loopback, linklocal, uniquelocal";
app.set("trust proxy", /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);

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
app.use(attachUser);

import githubRoutes from "./routes/githubRepo.routes.js";
app.use("/api/github", githubRoutes);

import readmeRoutes from "./routes/readme.routes.js";
app.use("/api/readme", readmeRoutes);

import toolsRoutes from "./routes/tools.routes.js";
app.use("/api/tools", toolsRoutes);

import aiRoutes from "./routes/ai.routes.js";
app.use("/api/ai", aiRoutes);

import authRoutes from "./routes/auth.routes.js";
app.use("/api/auth", authRoutes);

import accountRoutes from "./routes/account.routes.js";
app.use("/api/account", accountRoutes);

import dashboardRoutes from "./routes/dashboard.routes.js";
app.use("/api", dashboardRoutes);


// JSON errors for everything thrown through asyncHandler.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = err instanceof ApiError ? err.statusCode : 500;
  const message = err instanceof ApiError ? err.message : "Something went wrong.";
  if (status >= 500) console.error(err);
  res.status(status).json({ success: false, message, errors: err instanceof ApiError ? err.errors : [] });
});

export { app };
