import { prisma } from "../database/prisma";
import { ErroAplicacao } from "./alunoService";
import { randomUUID } from "node:crypto";

const bloqueio = () => new ErroAplicacao("Acesso bloqueado: Aguarde 3 minutos entre validações", 429);

export const portariaService = {
  async consultar(matricula: string) {
    if (!/^\d{4,12}$/.test(matricula)) throw new ErroAplicacao("Informe uma matrícula de 4 a 12 números.", 400);
    const recentes = await prisma.$queryRaw<Array<{ encontrado: number }>>`
      SELECT 1 AS encontrado FROM "LogAcesso"
      WHERE "matricula" = ${matricula} AND julianday("dataHora") >= julianday('now', '-3 minutes')
      LIMIT 1`;
    if (recentes.length) throw bloqueio();
    const aluno = await prisma.aluno.findUnique({
      where: { matricula },
      select: { id: true, nome: true, matricula: true, ativo: true, contratos: { select: { plano: true, situacao: true, dataInicio: true, dataFim: true }, orderBy: { dataFim: "desc" } } },
    });
    const dadosAluno = aluno ? { nome: aluno.nome, matricula: aluno.matricula, ativo: aluno.ativo } : null;
    const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const contrato = aluno?.ativo && aluno.contratos.find(c => ["Vigente", "Ativo"].includes(c.situacao) && c.dataInicio.toISOString().slice(0, 10) <= hoje && c.dataFim.toISOString().slice(0, 10) >= hoje);
    const resultado = !aluno ? { acesso: "NEGADO", motivo: "Matrícula não encontrada.", aluno: null, contrato: null }
      : !aluno.ativo ? { acesso: "NEGADO", motivo: "Cadastro do aluno inativo.", aluno: dadosAluno, contrato: null }
      : !contrato ? { acesso: "NEGADO", motivo: "Aluno sem contrato vigente.", aluno: dadosAluno, contrato: null }
      : { acesso: "LIBERADO", motivo: "Cadastro ativo e contrato vigente.", aluno: dadosAluno, contrato: { plano: contrato.plano, dataFim: contrato.dataFim } };
    // A condição é repetida na inserção atômica para impedir leituras simultâneas de passarem juntas.
    const inseridos = await prisma.$executeRaw`
      INSERT INTO "LogAcesso" ("id", "matricula", "alunoId", "status", "motivo", "dataHora")
      SELECT ${randomUUID()}, ${matricula}, ${aluno?.id ?? null}, ${resultado.acesso === "LIBERADO" ? "Liberado" : "Negado"}, ${resultado.motivo}, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE NOT EXISTS (SELECT 1 FROM "LogAcesso" WHERE "matricula" = ${matricula} AND julianday("dataHora") >= julianday('now', '-3 minutes'))`;
    if (!inseridos) throw bloqueio();
    return resultado;
  },
  async listarLogs() {
    return prisma.logAcesso.findMany({ take: 10, orderBy: [{ dataHora: "desc" }, { id: "desc" }], select: { id: true, matricula: true, status: true, motivo: true, dataHora: true, aluno: { select: { nome: true } } } });
  },
};
