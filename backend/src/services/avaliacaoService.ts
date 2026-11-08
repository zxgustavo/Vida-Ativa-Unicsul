import { AvaliacaoFisica, Prisma } from "@prisma/client";
import { alunoRepository } from "../repositories/alunoRepository";
import { avaliacaoRepository } from "../repositories/avaliacaoRepository";
import { ErroAplicacao } from "./alunoService";

function data(valor: unknown, nome: string): Date {
  if (valor instanceof Date && Number.isFinite(valor.getTime())) return valor;
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/.test(valor)) throw new ErroAplicacao(`${nome} inválida.`, 400);
  const resultado = new Date(valor);
  if (!Number.isFinite(resultado.getTime()) || resultado.toISOString().slice(0, 10) !== valor.slice(0, 10)) throw new ErroAplicacao(`${nome} inválida.`, 400);
  return resultado;
}

function validar(input: unknown, atual?: AvaliacaoFisica): Prisma.AvaliacaoFisicaUncheckedCreateInput & { dataAvaliacao: Date } {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ErroAplicacao("Informe os dados da avaliação.", 400);
  const dados: Record<string, unknown> = { ...atual, ...input };
  if (typeof dados.alunoId !== "string" || !dados.alunoId.trim()) throw new ErroAplicacao("Informe o aluno.", 400);
  if (typeof dados.objetivo !== "string" || !dados.objetivo.trim()) throw new ErroAplicacao("Informe o objetivo.", 400);
  function medida(valor: unknown, nome: string, min: number, max: number): number {
    if (typeof valor !== "number" || !Number.isFinite(valor) || valor < min || valor > max) throw new ErroAplicacao(`${nome} deve estar entre ${min} e ${max}.`, 400);
    return valor;
  }
  const peso = medida(dados.peso, "O peso", 20, 350);
  const altura = medida(dados.altura, "A altura", 50, 250);
  const percentualGordura = dados.percentualGordura == null ? null : medida(dados.percentualGordura, "A gordura corporal", 2, 70);
  const dataAvaliacao = data(dados.dataAvaliacao, "Data da avaliação");
  const dataReavaliacao = dados.dataReavaliacao == null ? null : data(dados.dataReavaliacao, "Data da reavaliação");
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (dataAvaliacao.toISOString().slice(0, 10) > hoje) throw new ErroAplicacao("A avaliação não pode ser futura.", 400);
  if (dataReavaliacao && dataReavaliacao < dataAvaliacao) throw new ErroAplicacao("A reavaliação deve ser igual ou posterior à avaliação.", 400);
  return { alunoId: dados.alunoId.trim(), dataAvaliacao, peso, altura, percentualGordura, objetivo: dados.objetivo.trim(), dataReavaliacao };
}

export const avaliacaoService = {
  listar: () => avaliacaoRepository.listar(),
  async buscar(id: string) {
    const avaliacao = await avaliacaoRepository.buscar(id);
    if (!avaliacao) throw new ErroAplicacao("Avaliação não encontrada.", 404);
    return avaliacao;
  },
  async criar(input: unknown) {
    const dados = validar(input);
    const aluno = await alunoRepository.buscarPorId(dados.alunoId);
    if (!aluno) throw new ErroAplicacao("Aluno não encontrado.", 404);
    if (!aluno.ativo) throw new ErroAplicacao("Selecione um aluno ativo.", 400);
    if (aluno.dataNascimento && dados.dataAvaliacao.toISOString().slice(0, 10) < aluno.dataNascimento) throw new ErroAplicacao("A avaliação não pode ser anterior ao nascimento do aluno.", 400);
    return avaliacaoRepository.criar(dados);
  },
  async atualizar(id: string, input: unknown) {
    const atual = await this.buscar(id);
    const dados = validar(input, atual);
    if (dados.alunoId !== atual.alunoId) throw new ErroAplicacao("Não é possível alterar o aluno da avaliação.", 400);
    if (atual.aluno.dataNascimento && dados.dataAvaliacao.toISOString().slice(0, 10) < atual.aluno.dataNascimento) throw new ErroAplicacao("A avaliação não pode ser anterior ao nascimento do aluno.", 400);
    return avaliacaoRepository.atualizar(id, dados);
  },
  async excluir(id: string) {
    await this.buscar(id);
    return avaliacaoRepository.excluir(id);
  },
};
