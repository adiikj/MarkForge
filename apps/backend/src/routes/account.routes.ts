import express from "express";
import {
  changePassword,
  deleteAccount,
  deleteSession,
  listSessions,
  revokeOtherSessions,
  unlinkGithub,
  updateProfile,
} from "../controllers/account.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { rateLimit } from "../utils/rateLimit.js";

const router = express.Router();
router.use(requireAuth);

router.patch("/", updateProfile);
router.post("/password", rateLimit({ name: "password-change", windowMs: 15 * 60 * 1000, max: 10 }), changePassword);
router.get("/sessions", listSessions);
router.post("/sessions/revoke-others", revokeOtherSessions);
router.delete("/sessions/:id", deleteSession);
router.delete("/github", unlinkGithub);
router.delete("/", deleteAccount);

export default router;
