import { RequestHandler } from "express";
import { relatorioService } from "../services/relatorioService";

export const relatorioController = {
  dashboard: (async (req, res, next) => {
    res.set("Cache-Control", "no-store");
    try { res.json(await relatorioService.dashboard(req.query)); } catch (erro) { next(erro); }
  }) as RequestHandler,
};
