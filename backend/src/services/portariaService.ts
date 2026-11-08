import { prisma } from "../database/prisma";
import { ErroAplicacao } from "./alunoService";

export const portariaService = {
  async consultar(matricula: string) {
    if (!/^\d{4,12}$/.test(matricula)) throw new ErroAplicacao("Informe uma matrícula de 4 a 12 números.", 400);
    const aluno = await prisma.aluno.findUnique({
      where: { matricula },
      select: { nome: true, matricula: true, ativo: true, contratos: { select: { plano: true, situacao: true, dataInicio: true, dataFim: true }, orderBy: { dataFim: "desc" } } },
    });
    if (!aluno) return { acesso: "NEGADO", motivo: "Matrícula não encontrada.", aluno: null, contrato: null };
    const dadosAluno = { nome: aluno.nome, matricula: aluno.matricula, ativo: aluno.ativo };
    if (!aluno.ativo) return { acesso: "NEGADO", motivo: "Cadastro do aluno inativo.", aluno: dadosAluno, contrato: null };
    const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const contrato = aluno.contratos.find(c => ["Vigente", "Ativo"].includes(c.situacao) && c.dataInicio.toISOString().slice(0, 10) <= hoje && c.dataFim.toISOString().slice(0, 10) >= hoje);
    if (!contrato) return { acesso: "NEGADO", motivo: "Aluno sem contrato vigente.", aluno: dadosAluno, contrato: null };
    return { acesso: "LIBERADO", motivo: "Cadastro ativo e contrato vigente.", aluno: dadosAluno, contrato: { plano: contrato.plano, dataFim: contrato.dataFim } };
  },
};
