import { RequestHandler } from "express";
import { contratoService } from "../services/contratoService";

export const contratoController = {
  listar: (async (_req, res, next) => { try { res.json(await contratoService.listar()); } catch (erro) { next(erro); } }) as RequestHandler,
  buscar: (async (req, res, next) => { try { res.json(await contratoService.buscar(req.params.id)); } catch (erro) { next(erro); } }) as RequestHandler<{ id: string }>,
  criar: (async (req, res, next) => { try { res.status(201).json(await contratoService.criar(req.body)); } catch (erro) { next(erro); } }) as RequestHandler,
  atualizar: (async (req, res, next) => { try { res.json(await contratoService.atualizar(req.params.id, req.body)); } catch (erro) { next(erro); } }) as RequestHandler<{ id: string }>,
  cancelar: (async (req, res, next) => { try { res.json(await contratoService.cancelar(req.params.id)); } catch (erro) { next(erro); } }) as RequestHandler<{ id: string }>,
};
