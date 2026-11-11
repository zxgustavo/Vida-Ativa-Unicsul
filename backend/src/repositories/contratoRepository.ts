import { Prisma } from "@prisma/client";
import { prisma } from "../database/prisma";

function repositorio(tx: Prisma.TransactionClient) { return {
  buscar: (id: string) => tx.contrato.findUnique({ where: { id }, include: { aluno: true } }),
  criar: (data: Prisma.ContratoUncheckedCreateInput) => tx.contrato.create({ data, include: { aluno: true } }),
  atualizar: (id: string, data: Prisma.ContratoUncheckedUpdateInput) => tx.contrato.update({ where: { id }, data, include: { aluno: true } }),
  pagamentoPorChave: (chave: string) => tx.pagamento.findUnique({ where: { chave } }),
  registrarPagamento: (data: Prisma.PagamentoUncheckedCreateInput) => tx.pagamento.create({ data }),
}; }

export const contratoRepository = {
  listar: () => prisma.contrato.findMany({ include: { aluno: true }, orderBy: { atualizadoEm: "desc" } }),
  buscar: (id: string) => prisma.contrato.findUnique({ where: { id }, include: { aluno: true } }),
  criar: (data: Prisma.ContratoUncheckedCreateInput) => prisma.contrato.create({ data, include: { aluno: true } }),
  atualizar: (id: string, data: Prisma.ContratoUncheckedUpdateInput) => prisma.contrato.update({ where: { id }, data, include: { aluno: true } }),
  transacao: <T>(acao: (repo: ReturnType<typeof repositorio>) => Promise<T>) => prisma.$transaction(tx => acao(repositorio(tx))),
};
