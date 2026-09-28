import express from "express";
import {
  forgotPassword,
  githubCallback,
  githubStart,
  login,
  logout,
  me,
  providers,
  refresh,
  resendVerification,
  resetPassword,
  signup,
  verifyEmail,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { rateLimit } from "../utils/rateLimit.js";

const router = express.Router();

const credentialLimiter = rateLimit({ name: "credentials", windowMs: 15 * 60 * 1000, max: 20 });
const emailLimiter = rateLimit({ name: "email", windowMs: 60 * 60 * 1000, max: 6 });

router.get("/providers", providers);
router.post("/signup", credentialLimiter, signup);
router.post("/login", credentialLimiter, login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.get("/me", requireAuth, me);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", requireAuth, emailLimiter, resendVerification);
router.post("/forgot-password", emailLimiter, forgotPassword);
router.post("/reset-password", credentialLimiter, resetPassword);
router.get("/github", githubStart);
router.get("/github/callback", githubCallback);

export default router;
