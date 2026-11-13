import { Router } from "express";
import { liberacaoController } from "../controllers/liberacaoController";

export const liberacaoRoutes = Router();
liberacaoRoutes.get("/", liberacaoController.listar);
liberacaoRoutes.post("/", liberacaoController.criar);
