import { Prisma } from "@prisma/client";
import { prisma } from "../database/prisma";

export const contratoRepository = {
  listar: () => prisma.contrato.findMany({ include: { aluno: true }, orderBy: { atualizadoEm: "desc" } }),
  buscar: (id: string) => prisma.contrato.findUnique({ where: { id }, include: { aluno: true } }),
  criar: (data: Prisma.ContratoUncheckedCreateInput) => prisma.contrato.create({ data, include: { aluno: true } }),
  atualizar: (id: string, data: Prisma.ContratoUncheckedUpdateInput) => prisma.contrato.update({ where: { id }, data, include: { aluno: true } }),
};
