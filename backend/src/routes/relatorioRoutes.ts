import { Router } from "express";
import { relatorioController } from "../controllers/relatorioController";

export const relatorioRoutes = Router();
relatorioRoutes.get("/dashboard", relatorioController.dashboard);
