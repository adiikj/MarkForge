import express from "express";
import {
  createDocument,
  deleteDocument,
  getDocument,
  listActivity,
  listDocuments,
  listRepos,
  overview,
  recheckRepo,
  trackRepo,
  untrackRepo,
  updateDocument,
} from "../controllers/dashboard.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();
// Scoped to this router's paths so unknown /api/* URLs still 404 instead of asking to log in.
router.use(["/dashboard", "/documents", "/repos", "/activity"], requireAuth);

router.get("/dashboard/overview", overview);

router.get("/documents", listDocuments);
router.post("/documents", createDocument);
router.get("/documents/:id", getDocument);
router.patch("/documents/:id", updateDocument);
router.delete("/documents/:id", deleteDocument);

router.get("/repos", listRepos);
router.post("/repos", trackRepo);
router.post("/repos/:id/check", recheckRepo);
router.delete("/repos/:id", untrackRepo);

router.get("/activity", listActivity);

export default router;
