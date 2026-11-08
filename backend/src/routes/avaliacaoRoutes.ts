import { Router } from "express";
import { avaliacaoController } from "../controllers/avaliacaoController";

export const avaliacaoRoutes = Router();
avaliacaoRoutes.get("/", avaliacaoController.listar);
avaliacaoRoutes.get("/:id", avaliacaoController.buscar);
avaliacaoRoutes.post("/", avaliacaoController.criar);
avaliacaoRoutes.put("/:id", avaliacaoController.atualizar);
avaliacaoRoutes.delete("/:id", avaliacaoController.excluir);
