import { Prisma } from "@prisma/client";
import { prisma } from "../database/prisma";

export const liberacaoRepository = {
  listar: () => prisma.liberacao.findMany({ orderBy: [{ criadoEm: "desc" }, { id: "desc" }] }),
  criar: (data: Prisma.LiberacaoUncheckedCreateInput) => prisma.liberacao.create({ data }),
};
