import { RequestHandler } from "express";
import { avaliacaoService } from "../services/avaliacaoService";

export const avaliacaoController = {
  listar: (async (_req, res, next) => { try { res.json(await avaliacaoService.listar()); } catch (erro) { next(erro); } }) as RequestHandler,
  buscar: (async (req, res, next) => { try { res.json(await avaliacaoService.buscar(req.params.id)); } catch (erro) { next(erro); } }) as RequestHandler<{ id: string }>,
  criar: (async (req, res, next) => { try { res.status(201).json(await avaliacaoService.criar(req.body)); } catch (erro) { next(erro); } }) as RequestHandler,
  atualizar: (async (req, res, next) => { try { res.json(await avaliacaoService.atualizar(req.params.id, req.body)); } catch (erro) { next(erro); } }) as RequestHandler<{ id: string }>,
  excluir: (async (req, res, next) => { try { res.json(await avaliacaoService.excluir(req.params.id)); } catch (erro) { next(erro); } }) as RequestHandler<{ id: string }>,
};
