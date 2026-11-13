import { prisma } from "../database/prisma";
import { ErroAplicacao } from "./alunoService";
import { diaPagamento } from "./dataPagamento";

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
    const inicio = data(filtros.dataInicio ?? inicioMes, "Data inicial");
    const fim = data(filtros.dataFim ?? hoje, "Data final");
    if (inicio > fim) throw new ErroAplicacao("A data final deve ser igual ou posterior à inicial.", 400);
    const situacao = filtros.situacao ?? "todos";
    if (typeof situacao !== "string" || !situacoes.includes(situacao as Situacao)) throw new ErroAplicacao("Situação de contrato inválida.", 400);
    if (filtros.busca !== undefined && (typeof filtros.busca !== "string" || filtros.busca.length > 200)) throw new ErroAplicacao("Busca inválida.", 400);
    const busca = normalizar((filtros.busca as string | undefined) ?? "");
    const digitos = /^[\d.\- /]+$/.test(busca) ? busca.replace(/\D/g, "") : "";
    const limiteFim = new Date(`${fim}T00:00:00.000Z`);limiteFim.setUTCDate(limiteFim.getUTCDate() + 1);
    const [alunos, contratos, avaliacoes, pagamentos] = await prisma.$transaction([
      prisma.aluno.findMany({ select: { id: true, nome: true, matricula: true, cpf: true, ativo: true, criadoEm: true }, orderBy: { nome: "asc" } }),
      prisma.contrato.findMany({ select: { id: true, alunoId: true, plano: true, valor: true, dataInicio: true, dataFim: true, situacao: true }, orderBy: { dataInicio: "desc" } }),
      prisma.avaliacaoFisica.findMany({ select: { alunoId: true, dataAvaliacao: true }, where: { dataAvaliacao: { gte: new Date(`${inicio}T00:00:00.000Z`), lt: limiteFim } } }),
      prisma.pagamento.findMany(),
    ]);
    const classificados = contratos.map(c => {
      const estado = c.situacao === "Suspenso" || c.situacao === "Cancelado" ? c.situacao :
        c.dataInicio.toISOString().slice(0, 10) > hoje ? "A iniciar" : c.dataFim.toISOString().slice(0, 10) < hoje ? "Vencido" : "Vigente";
      return { ...c, situacaoAtual: estado };
    });
    const porAluno = new Map<string, typeof classificados>();
    for (const contrato of classificados) {
      const lista = porAluno.get(contrato.alunoId) ?? [];
      lista.push(contrato);porAluno.set(contrato.alunoId, lista);
    }
    const dataLocal = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
    const corresponde = (a: typeof alunos[number]) => !busca || normalizar(a.nome).includes(busca) || normalizar(a.matricula).includes(busca) || Boolean(digitos && a.cpf.replace(/\D/g, "").includes(digitos));
    const alunosPorId = new Map(alunos.map(a => [a.id, a]));
    const contratosPorId = new Map(classificados.map(c => [c.id, c]));
    const recebimentos = pagamentos.flatMap(p => {
      const contrato = contratosPorId.get(p.contratoId), aluno = contrato && alunosPorId.get(contrato.alunoId);
      const dia = diaPagamento(p.dataPagamento, p.origem === "Legado");
      if (!contrato || !aluno || dia < inicio || dia > fim || !corresponde(aluno) || (situacao !== "todos" && contrato.situacaoAtual !== situacao)) return [];
      return [{ id: p.id, contratoId: p.contratoId, aluno: { id: aluno.id, nome: aluno.nome, cpf: aluno.cpf, matricula: aluno.matricula }, plano: p.plano, valorCentavos: p.valorCentavos, formaPagamento: p.formaPagamento, dataPagamento: dia, situacaoAtual: contrato.situacaoAtual, origem: p.origem }];
    }).sort((a,b) => b.dataPagamento.localeCompare(a.dataPagamento) || a.aluno.nome.localeCompare(b.aluno.nome) || a.id.localeCompare(b.id));
    const recebidoCentavos = recebimentos.reduce((soma, p) => soma + p.valorCentavos, 0);
    const resultados = alunos.filter(a => {
      const cadastro = dataLocal.format(a.criadoEm);
      return cadastro >= inicio && cadastro <= fim && corresponde(a);
    }).flatMap(a => {
      const todos = porAluno.get(a.id) ?? [];
      const filtrados = situacao === "todos" ? todos : todos.filter(c => c.situacaoAtual === situacao);
      if (situacao !== "todos" && situacao !== "Sem contrato" && !filtrados.length) return [];
      if (situacao === "Sem contrato" && todos.length) return [];
      return [{ id: a.id, nome: a.nome, matricula: a.matricula, cpf: a.cpf, ativo: a.ativo, dataCadastro: dataLocal.format(a.criadoEm), contratos: filtrados }];
    });
    // Cards e tabela compartilham o mesmo recorte de cadastro, situação e busca.
    // Cada aluno é contado uma vez, mesmo quando possui vários contratos na lista.
    const ids = new Set(resultados.map(a => a.id));
    const contratosFiltrados = resultados.flatMap(a => a.contratos);
    const vencidos = new Set(contratosFiltrados.filter(c => c.situacaoAtual === "Vencido").map(c => c.alunoId));
    const aIniciar = new Set(contratosFiltrados.filter(c => c.situacaoAtual === "A iniciar").map(c => c.alunoId));
    const receitaPrevista = Math.round(contratosFiltrados.filter(c => c.situacaoAtual === "Vigente").reduce((soma, c) => soma + c.valor, 0) * 100) / 100;
    const avaliacoesFiltradas = avaliacoes.filter(a => ids.has(a.alunoId));
    const avaliacoesMes = avaliacoesFiltradas.filter(a => a.dataAvaliacao.toISOString().slice(0, 7) === hoje.slice(0, 7)).length;
    return { periodo: { dataInicio: inicio, dataFim: fim }, totais: { recebidoCentavos, recebidoPeriodo: recebidoCentavos / 100, alunos: resultados.length, alunosAtivos: resultados.filter(a => a.ativo).length, receitaPrevista, avaliacoesMes, avaliacoesPeriodo: avaliacoesFiltradas.length, alunosVencidos: vencidos.size, alunosAIniciar: aIniciar.size }, pagamentos: recebimentos, alunos: resultados };
  },
};
