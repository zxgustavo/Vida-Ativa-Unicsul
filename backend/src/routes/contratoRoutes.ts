import { Router } from "express";
import { contratoController } from "../controllers/contratoController";

export const contratoRoutes = Router();
contratoRoutes.get("/", contratoController.listar);
contratoRoutes.get("/:id", contratoController.buscar);
contratoRoutes.post("/", contratoController.criar);
contratoRoutes.put("/:id", contratoController.atualizar);
contratoRoutes.delete("/:id", contratoController.cancelar);
