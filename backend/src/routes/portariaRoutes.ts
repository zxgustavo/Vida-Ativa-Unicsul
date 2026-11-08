import { Router, RequestHandler } from "express";
import { portariaService } from "../services/portariaService";

export const portariaRoutes = Router();
portariaRoutes.get("/logs", async (_req, res, next) => {
  try { res.set("Cache-Control", "no-store").json(await portariaService.listarLogs()); } catch (erro) { next(erro); }
});
portariaRoutes.get("/acesso/:matricula", (async (req, res, next) => {
  try { res.set("Cache-Control", "no-store").json(await portariaService.consultar(req.params.matricula)); } catch (erro) { next(erro); }
}) as RequestHandler<{ matricula: string }>);
