import express from "express";
import { aiReadme, aiStatus } from "../controllers/ai.controller.js";

const router = express.Router();

router.get("/status", aiStatus);
router.post("/readme", aiReadme);

export default router;
