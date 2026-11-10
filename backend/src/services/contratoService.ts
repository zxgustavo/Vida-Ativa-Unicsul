import { Prisma } from "@prisma/client";
import { alunoRepository } from "../repositories/alunoRepository";
import { contratoRepository } from "../repositories/contratoRepository";
import { ErroAplicacao } from "./alunoService";

function renovarVencimento(hoje: string, plano: string): Date {
  const meses = new Map([["mensal", 1], ["trimestral", 3], ["anual", 12]]).get(plano.trim().toLowerCase());
  if (!meses) throw new ErroAplicacao("Plano sem duração definida para renovação automática.", 400);
  const data = new Date(`${hoje}T00:00:00.000Z`), dia = data.getUTCDate();
  // Evita que 31/jan + 1 mês ultrapasse fevereiro (inclusive em anos bissextos).
  data.setUTCDate(1);
  data.setUTCMonth(data.getUTCMonth() + meses);
  const ultimoDia = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + 1, 0)).getUTCDate();
  data.setUTCDate(Math.min(dia, ultimoDia));
  return data;
}

function validar(input: unknown, atual?: any): Prisma.ContratoUncheckedCreateInput & { dataInicio: Date; dataFim: Date } {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ErroAplicacao("Informe os dados do contrato.", 400);
  const dados = { ...atual, ...(input as Record<string, unknown>) };
  for (const campo of ["alunoId", "plano", "situacao"] as const) {
    if (typeof dados[campo] !== "string" || !dados[campo].trim()) throw new ErroAplicacao(`Informe ${campo}.`, 400);
  }
  if (typeof dados.valor !== "number" || !Number.isFinite(dados.valor) || dados.valor < 0) throw new ErroAplicacao("Informe um valor válido.", 400);
  function data(valor: unknown, campo: string): Date {
    if (!(typeof valor === "string" || valor instanceof Date)) throw new ErroAplicacao(`Informe ${campo} válida.`, 400);
    const resultado = new Date(valor);
    if (!Number.isFinite(resultado.getTime())) throw new ErroAplicacao(`Informe ${campo} válida.`, 400);
    return resultado;
  }
  const dataInicio = data(dados.dataInicio, "data de início"), dataFim = data(dados.dataFim, "data de fim");
  if (dataFim < dataInicio) throw new ErroAplicacao("A data de fim deve ser igual ou posterior ao início.", 400);
  if (!["Ativo", "Vigente", "A Iniciar", "A iniciar", "Vencido", "Suspenso", "Cancelado"].includes(dados.situacao)) throw new ErroAplicacao("Situação de contrato inválida.", 400);
  const tolerancia = dados.tolerancia ?? 5, diasSuspensos = dados.diasSuspensos ?? 0;
  if (!Number.isInteger(tolerancia) || tolerancia < 0 || tolerancia > 30 || !Number.isInteger(diasSuspensos) || diasSuspensos < 0) throw new ErroAplicacao("Tolerância ou saldo de suspensão inválido.", 400);
  const formaPagamento = dados.formaPagamento ?? "PIX", statusPagamento = dados.statusPagamento ?? "Pendente";
  if (!["PIX", "Cartão", "Dinheiro", "Boleto"].includes(formaPagamento) || !["Pago", "Pendente", "Atrasado"].includes(statusPagamento)) throw new ErroAplicacao("Dados de pagamento inválidos.", 400);
  const dataPagamento = statusPagamento === "Pago" ? data(dados.dataPagamento, "data de pagamento") : null;
  if (dataPagamento && dataPagamento > new Date()) throw new ErroAplicacao("A data de pagamento não pode estar no futuro.", 400);
  return { alunoId: dados.alunoId.trim(), plano: dados.plano.trim(), valor: dados.valor, dataInicio, dataFim, situacao: dados.situacao, tolerancia, diasSuspensos, formaPagamento, statusPagamento, dataPagamento };
}

export const contratoService = {
  listar: () => contratoRepository.listar(),
  async buscar(id: string) {
    const contrato = await contratoRepository.buscar(id);
    if (!contrato) throw new ErroAplicacao("Contrato não encontrado.", 404);
    return contrato;
  },
  async criar(input: unknown) {
    const dados = validar(input);
    const aluno = await alunoRepository.buscarPorId(dados.alunoId);
    if (!aluno) throw new ErroAplicacao("Aluno não encontrado.", 404);
    if (!aluno.ativo) throw new ErroAplicacao("Não é possível criar contrato para aluno inativo.", 400);
    return contratoRepository.criar(dados);
  },
  async atualizar(id: string, input: unknown) {
    const atual = await this.buscar(id);
    const dados = validar(input, atual);
    if (dados.alunoId !== atual.alunoId) throw new ErroAplicacao("Não é possível alterar o aluno do contrato.", 400);
    const pagamentoInformado = (input as Record<string, unknown>).statusPagamento === "Pago";
    if (pagamentoInformado) {
      if (atual.situacao === "Cancelado") {
        dados.situacao = "Cancelado";
      } else if (dados.situacao !== "Cancelado" && dados.situacao !== "Suspenso" && atual.situacao !== "Suspenso") {
        const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
        const vencido = atual.situacao === "Vencido" || atual.dataFim.toISOString().slice(0, 10) < hoje;
        // Datas escolhidas explicitamente na edição continuam sendo respeitadas.
        // Registrar pagamento envia apenas os campos da cobrança.
        if (vencido && dados.dataInicio.toISOString().slice(0, 10) <= hoje && dados.dataFim.getTime() === atual.dataFim.getTime()) {
          dados.dataFim = renovarVencimento(hoje, dados.plano);
        }
        if (dados.dataInicio.toISOString().slice(0, 10) <= hoje && dados.dataFim.toISOString().slice(0, 10) >= hoje) {
          dados.situacao = "Vigente";
        }
      }
    }
    return contratoRepository.atualizar(id, dados);
  },
  async cancelar(id: string) {
    await this.buscar(id);
    return contratoRepository.atualizar(id, { situacao: "Cancelado" });
  },
};
