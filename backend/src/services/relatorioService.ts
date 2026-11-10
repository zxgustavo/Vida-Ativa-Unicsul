import { prisma } from "../database/prisma";
import { ErroAplicacao } from "./alunoService";

const situacoes = ["todos", "Vigente", "Vencido", "A iniciar", "Suspenso", "Cancelado", "Sem contrato"] as const;
type Situacao = typeof situacoes[number];
type Filtros = { dataInicio?: unknown; dataFim?: unknown; situacao?: unknown; busca?: unknown };

function data(valor: unknown, nome: string): string {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) throw new ErroAplicacao(`${nome} inválida.`, 400);
  const d = new Date(`${valor}T00:00:00.000Z`);
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== valor) throw new ErroAplicacao(`${nome} inválida.`, 400);
  return valor;
}

function normalizar(valor: string): string {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export const relatorioService = {
  async dashboard(filtros: Filtros) {
    const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const inicioMes = `${hoje.slice(0, 7)}-01`;
    const proximoMes = new Date(`${inicioMes}T00:00:00.000Z`);
    proximoMes.setUTCMonth(proximoMes.getUTCMonth() + 1);
    const inicio = data(filtros.dataInicio ?? inicioMes, "Data inicial");
    const fim = data(filtros.dataFim ?? hoje, "Data final");
    if (inicio > fim) throw new ErroAplicacao("A data final deve ser igual ou posterior à inicial.", 400);
    const situacao = filtros.situacao ?? "todos";
    if (typeof situacao !== "string" || !situacoes.includes(situacao as Situacao)) throw new ErroAplicacao("Situação de contrato inválida.", 400);
    if (filtros.busca !== undefined && (typeof filtros.busca !== "string" || filtros.busca.length > 200)) throw new ErroAplicacao("Busca inválida.", 400);
    const busca = normalizar((filtros.busca as string | undefined) ?? "");
    const digitos = /^[\d.\- /]+$/.test(busca) ? busca.replace(/\D/g, "") : "";
    const limiteFim = new Date(`${fim}T00:00:00.000Z`);limiteFim.setUTCDate(limiteFim.getUTCDate() + 1);
    const [alunos, contratos, avaliacoesMes, avaliacoesPeriodo] = await prisma.$transaction([
      prisma.aluno.findMany({ select: { id: true, nome: true, matricula: true, cpf: true, ativo: true, criadoEm: true }, orderBy: { nome: "asc" } }),
      prisma.contrato.findMany({ select: { id: true, alunoId: true, plano: true, valor: true, dataInicio: true, dataFim: true, situacao: true }, orderBy: { dataInicio: "desc" } }),
      prisma.avaliacaoFisica.count({ where: { dataAvaliacao: { gte: new Date(`${inicioMes}T00:00:00.000Z`), lt: proximoMes } } }),
      prisma.avaliacaoFisica.count({ where: { dataAvaliacao: { gte: new Date(`${inicio}T00:00:00.000Z`), lt: limiteFim } } }),
    ]);
    const classificados = contratos.map(c => {
      const estado = c.situacao === "Suspenso" || c.situacao === "Cancelado" ? c.situacao :
        c.dataInicio.toISOString().slice(0, 10) > hoje ? "A iniciar" : c.dataFim.toISOString().slice(0, 10) < hoje ? "Vencido" : "Vigente";
      return { ...c, situacaoAtual: estado };
    });
    const vencidos = new Set(classificados.filter(c => c.situacaoAtual === "Vencido").map(c => c.alunoId));
    const aIniciar = new Set(classificados.filter(c => c.situacaoAtual === "A iniciar").map(c => c.alunoId));
    const receitaPrevista = Math.round(classificados.filter(c => c.situacaoAtual === "Vigente").reduce((soma, c) => soma + c.valor, 0) * 100) / 100;
    const porAluno = new Map<string, typeof classificados>();
    for (const contrato of classificados) {
      const lista = porAluno.get(contrato.alunoId) ?? [];
      lista.push(contrato);porAluno.set(contrato.alunoId, lista);
    }
    const dataLocal = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
    const resultados = alunos.filter(a => {
      const cadastro = dataLocal.format(a.criadoEm);
      return cadastro >= inicio && cadastro <= fim && (!busca || normalizar(a.nome).includes(busca) || normalizar(a.matricula).includes(busca) || (digitos && a.cpf.replace(/\D/g, "").includes(digitos)));
    }).flatMap(a => {
      const todos = porAluno.get(a.id) ?? [];
      const filtrados = situacao === "todos" ? todos : todos.filter(c => c.situacaoAtual === situacao);
      if (situacao !== "todos" && situacao !== "Sem contrato" && !filtrados.length) return [];
      if (situacao === "Sem contrato" && todos.length) return [];
      return [{ id: a.id, nome: a.nome, matricula: a.matricula, cpf: a.cpf, ativo: a.ativo, dataCadastro: dataLocal.format(a.criadoEm), contratos: filtrados }];
    });
    return { periodo: { dataInicio: inicio, dataFim: fim }, totais: { alunos: alunos.length, alunosAtivos: alunos.filter(a => a.ativo).length, receitaPrevista, avaliacoesMes, avaliacoesPeriodo, alunosVencidos: vencidos.size, alunosAIniciar: aIniciar.size }, alunos: resultados };
  },
};
