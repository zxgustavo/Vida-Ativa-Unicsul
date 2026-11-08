import { Prisma } from "@prisma/client";
import { prisma } from "../database/prisma";

export const avaliacaoRepository = {
  listar: () => prisma.avaliacaoFisica.findMany({ include: { aluno: true }, orderBy: [{ dataAvaliacao: "desc" }, { criadoEm: "desc" }] }),
  buscar: (id: string) => prisma.avaliacaoFisica.findUnique({ where: { id }, include: { aluno: true } }),
  criar: (data: Prisma.AvaliacaoFisicaUncheckedCreateInput) => prisma.avaliacaoFisica.create({ data, include: { aluno: true } }),
  atualizar: (id: string, data: Prisma.AvaliacaoFisicaUncheckedUpdateInput) => prisma.avaliacaoFisica.update({ where: { id }, data, include: { aluno: true } }),
  excluir: (id: string) => prisma.avaliacaoFisica.delete({ where: { id }, include: { aluno: true } }),
};
