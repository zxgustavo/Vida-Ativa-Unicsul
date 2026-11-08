import { RequestHandler } from "express";
import { alunoService } from "../services/alunoService";

export const alunoController = {
  criar: (async (req, res, next) => {
    try {
      const aluno = await alunoService.criar(req.body);
      res.status(201).json(aluno);
    } catch (erro) {
      next(erro);
    }
  }) as RequestHandler,

  listarTodos: (async (_req, res, next) => {
    try {
      res.json(await alunoService.listarTodos());
    } catch (erro) {
      next(erro);
    }
  }) as RequestHandler,

  buscarPorId: (async (req, res, next) => {
    try {
      res.json(await alunoService.buscarPorId(req.params.id));
    } catch (erro) {
      next(erro);
    }
  }) as RequestHandler<{ id: string }>,

  atualizar: (async (req, res, next) => {
    try {
      res.json(await alunoService.atualizar(req.params.id, req.body));
    } catch (erro) {
      next(erro);
    }
  }) as RequestHandler<{ id: string }>,

  desativar: (async (req, res, next) => {
    try {
      res.json(await alunoService.desativar(req.params.id));
    } catch (erro) {
      next(erro);
    }
  }) as RequestHandler<{ id: string }>,
};
