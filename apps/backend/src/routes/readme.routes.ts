import express from "express";
import { checkHealth, generateFromRepo, quotaStatus } from "../controllers/readme.controller.js";

const router = express.Router();

router.post("/generate", generateFromRepo);
router.post("/health", checkHealth);
router.get("/quota", quotaStatus);

export default router;
