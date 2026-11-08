import { Prisma } from "@prisma/client";
import { prisma } from "../database/prisma";

export const alunoRepository = {
  criar(dados: Prisma.AlunoCreateInput) {
    return prisma.aluno.create({ data: dados });
  },

  listarTodos() {
    return prisma.aluno.findMany({ orderBy: { criadoEm: "desc" } });
  },

  buscarPorId(id: string) {
    return prisma.aluno.findUnique({ where: { id } });
  },

  buscarPorCpf(cpf: string) {
    return prisma.aluno.findUnique({ where: { cpf } });
  },

  buscarPorMatricula(matricula: string) {
    return prisma.aluno.findUnique({ where: { matricula } });
  },

  atualizar(id: string, dados: Prisma.AlunoUpdateInput) {
    return prisma.aluno.update({ where: { id }, data: dados });
  },

  desativar(id: string) {
    return prisma.aluno.update({ where: { id }, data: { ativo: false } });
  },
};
