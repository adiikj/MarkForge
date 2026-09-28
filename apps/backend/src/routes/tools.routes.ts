import express from "express";
import { changelog, changelogRefs, docsPack, repoDiagram, repoProfile } from "../controllers/tools.controller.js";

const router = express.Router();

router.post("/repo-profile", repoProfile);
router.post("/docs-pack", docsPack);
router.post("/changelog/refs", changelogRefs);
router.post("/changelog", changelog);
router.post("/diagram", repoDiagram);

export default router;
