import { Prisma } from "@prisma/client";
import { alunoRepository } from "../repositories/alunoRepository";
import { contratoRepository } from "../repositories/contratoRepository";
import { ErroAplicacao } from "./alunoService";
import { diaPagamento, hojeSaoPaulo } from "./dataPagamento";

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
  if (Math.abs(dados.valor * 100 - Math.round(dados.valor * 100)) > 0.000001 || Math.round(dados.valor * 100) > 2147483647) throw new ErroAplicacao("Informe um valor com até duas casas decimais, de no máximo R$ 21.474.836,47.", 400);
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
  const dia = statusPagamento === "Pago" ? diaPagamento(dados.dataPagamento) : null;
  if (dia && dia > hojeSaoPaulo()) throw new ErroAplicacao("A data de pagamento não pode estar no futuro.", 400);
  const dataPagamento = dia ? new Date(`${dia}T00:00:00.000Z`) : null;
  return { alunoId: dados.alunoId.trim(), plano: dados.plano.trim(), valor: dados.valor, dataInicio, dataFim, situacao: dados.situacao, tolerancia, diasSuspensos, formaPagamento, statusPagamento, dataPagamento };
}

type Repo = Parameters<Parameters<typeof contratoRepository.transacao>[0]>[0];
type Dados = ReturnType<typeof validar>;

function chaveOperacao(input: unknown): string | undefined {
  const chave = (input as Record<string, unknown>)?.operacaoPagamento;
  if (chave === undefined) return;
  if (typeof chave !== "string" || !/^[\w:-]{8,120}$/.test(chave)) throw new ErroAplicacao("Identificador de pagamento inválido.", 400);
  return chave;
}

async function registrar(repo: Repo, id: string, dados: Dados, chave?: string) {
  if (dados.statusPagamento !== "Pago" || !dados.dataPagamento) return;
  const dia = diaPagamento(dados.dataPagamento);
  // Clientes antigos sem chave: um recebimento por contrato e dia.
  const identificador = chave ?? `${id}:${dia}`;
  if (await repo.pagamentoPorChave(identificador)) return;
  await repo.registrarPagamento({ contratoId: id, chave: identificador, valorCentavos: Math.round(dados.valor * 100), plano: dados.plano, formaPagamento: dados.formaPagamento!, dataPagamento: dia });
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
    const chave = chaveOperacao(input);
    return contratoRepository.transacao(async repo => {
      const repetido = chave && await repo.pagamentoPorChave(chave);
      if (repetido) {
        const contrato = await repo.buscar(repetido.contratoId);
        if (!contrato || contrato.alunoId !== dados.alunoId || repetido.valorCentavos !== Math.round(dados.valor * 100) || repetido.dataPagamento !== diaPagamento(dados.dataPagamento)) throw new ErroAplicacao("Identificador já utilizado em outro pagamento.", 409);
        return contrato;
      }
      const contrato = await repo.criar(dados);
      await registrar(repo, contrato.id, dados, chave);
      return contrato;
    });
  },
  async atualizar(id: string, input: unknown) {
    return contratoRepository.transacao(async repo => {
    const atual = await repo.buscar(id);
    if (!atual) throw new ErroAplicacao("Contrato não encontrado.", 404);
    const dados = validar(input, atual);
    if (dados.alunoId !== atual.alunoId) throw new ErroAplicacao("Não é possível alterar o aluno do contrato.", 400);
    const pagamentoInformado = (input as Record<string, unknown>).statusPagamento === "Pago";
    const chave = chaveOperacao(input);
    const chaveConsulta = chave ?? (pagamentoInformado && dados.dataPagamento ? `${id}:${diaPagamento(dados.dataPagamento)}` : undefined);
    const repetido = chaveConsulta && await repo.pagamentoPorChave(chaveConsulta);
    if (repetido) {
      if (repetido.contratoId !== id || repetido.dataPagamento !== diaPagamento(dados.dataPagamento) || repetido.valorCentavos !== Math.round(dados.valor * 100)) throw new ErroAplicacao("Identificador já utilizado em outro pagamento.", 409);
      return atual;
    }
    if (atual.statusPagamento === "Pago" && dados.statusPagamento !== "Pago") throw new ErroAplicacao("Um recebimento registrado não pode ser apagado alterando o status do contrato.", 409);
    const hoje = hojeSaoPaulo();
    const vencido = atual.situacao === "Vencido" || atual.dataFim.toISOString().slice(0,10) < hoje;
    const novaData = dados.dataPagamento && (!atual.dataPagamento || diaPagamento(dados.dataPagamento) !== diaPagamento(atual.dataPagamento));
    if (pagamentoInformado && atual.statusPagamento === "Pago" && novaData && atual.dataPagamento && diaPagamento(dados.dataPagamento) < diaPagamento(atual.dataPagamento)) throw new ErroAplicacao("Um novo recebimento não pode anteceder o último pagamento registrado.", 409);
    const novoPagamento = pagamentoInformado && (atual.statusPagamento !== "Pago" || (vencido && novaData));
    if (pagamentoInformado) {
      if (atual.situacao === "Cancelado") {
        dados.situacao = "Cancelado";
      } else if (dados.situacao !== "Cancelado" && dados.situacao !== "Suspenso" && atual.situacao !== "Suspenso") {
        // Datas escolhidas explicitamente na edição continuam sendo respeitadas.
        // Registrar pagamento envia apenas os campos da cobrança.
        if (novoPagamento && vencido && dados.dataInicio.toISOString().slice(0, 10) <= hoje && dados.dataFim.getTime() === atual.dataFim.getTime()) {
          dados.dataFim = renovarVencimento(hoje, dados.plano);
        }
        if (dados.dataInicio.toISOString().slice(0, 10) <= hoje && dados.dataFim.toISOString().slice(0, 10) >= hoje) {
          dados.situacao = "Vigente";
        }
      }
    }
    if (atual.statusPagamento === "Pago" && novaData && !novoPagamento) throw new ErroAplicacao("A data de um recebimento já registrado não pode ser alterada. Um novo pagamento exige contrato vencido.", 409);
    const contrato = await repo.atualizar(id, dados);
    if (novoPagamento) await registrar(repo, id, dados, chave);
    return contrato;
    });
  },
  async cancelar(id: string) {
    await this.buscar(id);
    return contratoRepository.atualizar(id, { situacao: "Cancelado" });
  },
};
