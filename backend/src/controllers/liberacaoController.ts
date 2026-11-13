import { RequestHandler } from "express";
import { liberacaoService } from "../services/liberacaoService";

export const liberacaoController = {
  listar: (async (_req, res, next) => { try { res.json(await liberacaoService.listar()); } catch (erro) { next(erro); } }) as RequestHandler,
  criar: (async (req, res, next) => { try { res.status(201).json(await liberacaoService.criar(req.body)); } catch (erro) { next(erro); } }) as RequestHandler,
};
