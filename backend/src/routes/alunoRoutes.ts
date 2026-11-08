import { Router } from "express";
import { alunoController } from "../controllers/alunoController";

export const alunoRoutes = Router();

alunoRoutes.post("/", alunoController.criar);
alunoRoutes.get("/", alunoController.listarTodos);
alunoRoutes.get("/:id", alunoController.buscarPorId);
alunoRoutes.put("/:id", alunoController.atualizar);
alunoRoutes.delete("/:id", alunoController.desativar);
