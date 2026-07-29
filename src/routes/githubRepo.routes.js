import express from "express";
import { getRepoData } from "../controllers/githubRepo.controller.js";

const router = express.Router();

router.get("/repos/:username/:repo/files", getRepoData);

export default router;