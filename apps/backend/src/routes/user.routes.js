import express from "express";
import { getRepoData } from "../controllers/githubController.js";

const router = express.Router();

router.get("/repos/:username/:repo", getRepoData);

export default router;