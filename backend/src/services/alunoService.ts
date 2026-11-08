import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { alunoRepository } from "../repositories/alunoRepository";

export class ErroAplicacao extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function objeto(dados: unknown): Record<string, unknown> {
  if (dados === null || typeof dados !== "object" || Array.isArray(dados)) {
    throw new ErroAplicacao("Envie um objeto JSON válido.", 400);
  }
  return dados as Record<string, unknown>;
}

function textoObrigatorio(valor: unknown, campo: string): string {
  if (typeof valor !== "string" || !valor.trim()) {
    throw new ErroAplicacao(`O campo ${campo} é obrigatório.`, 400);
  }
  return valor.trim();
}

function textoOpcional(valor: unknown, campo: string): string | null | undefined {
  if (valor === undefined) return undefined;
  if (valor === null) return null;
  if (typeof valor !== "string") {
    throw new ErroAplicacao(`O campo ${campo} deve ser texto.`, 400);
  }
  return valor.trim() || null;
}

function normalizarCpf(valor: unknown): string {
  const cpf = textoObrigatorio(valor, "cpf").replace(/\D/g, "");
  if (cpf.length !== 11) {
    throw new ErroAplicacao("O CPF deve conter 11 dígitos.", 400);
  }
  return cpf;
}

function normalizarMatricula(valor: unknown): string | undefined {
  if (valor === undefined || valor === null || valor === "") return undefined;
  if (typeof valor !== "string" || !/^\d{4,12}$/.test(valor.trim())) {
    throw new ErroAplicacao("A matrícula deve conter de 4 a 12 dígitos.", 400);
  }
  return valor.trim();
}

async function matriculaDisponivel(): Promise<string> {
  for (let tentativa = 0; tentativa < 20; tentativa++) {
    const matricula = String(randomInt(1000, 1_000_000));
    if (!(await alunoRepository.buscarPorMatricula(matricula))) {
      return matricula;
    }
  }
  throw new ErroAplicacao("Não foi possível gerar uma matrícula disponível.", 503);
}

export const alunoService = {
  async criar(entrada: unknown) {
    const dados = objeto(entrada);
    const nome = textoObrigatorio(dados.nome, "nome");
    const cpf = normalizarCpf(dados.cpf);
    if (await alunoRepository.buscarPorCpf(cpf)) {
      throw new ErroAplicacao("Este CPF já está cadastrado.", 409);
    }

    const matriculaEnviada = normalizarMatricula(dados.matricula);
    if (matriculaEnviada && await alunoRepository.buscarPorMatricula(matriculaEnviada)) {
      throw new ErroAplicacao("Esta matrícula já está cadastrada.", 409);
    }

    const matricula = matriculaEnviada ?? await matriculaDisponivel();
    const novoAluno: Prisma.AlunoCreateInput = {
      nome,
      cpf,
      matricula,
      telefone: textoOpcional(dados.telefone, "telefone"),
      dataNascimento: textoOpcional(dados.dataNascimento, "dataNascimento"),
      endereco: textoOpcional(dados.endereco, "endereco"),
      nomeEmergencia: textoOpcional(dados.nomeEmergencia, "nomeEmergencia"),
      telefoneEmergencia: textoOpcional(dados.telefoneEmergencia, "telefoneEmergencia"),
      foto: textoOpcional(dados.foto, "foto"),
      restricoesMedicas: textoOpcional(dados.restricoesMedicas, "restricoesMedicas"),
      observacoes: textoOpcional(dados.observacoes, "observacoes"),
    };
    return alunoRepository.criar(novoAluno);
  },

  listarTodos() {
    return alunoRepository.listarTodos();
  },

  async buscarPorId(id: string) {
    const aluno = await alunoRepository.buscarPorId(id);
    if (!aluno) throw new ErroAplicacao("Aluno não encontrado.", 404);
    return aluno;
  },

  async atualizar(id: string, entrada: unknown) {
    const dados = objeto(entrada);
    const atual = await this.buscarPorId(id);
    const alteracoes: Prisma.AlunoUpdateInput = {};

    if (dados.nome !== undefined) alteracoes.nome = textoObrigatorio(dados.nome, "nome");
    if (dados.cpf !== undefined) {
      const cpf = normalizarCpf(dados.cpf);
      if (cpf !== atual.cpf && await alunoRepository.buscarPorCpf(cpf)) {
        throw new ErroAplicacao("Este CPF já está cadastrado.", 409);
      }
      alteracoes.cpf = cpf;
    }
    if (dados.matricula !== undefined) {
      const matricula = normalizarMatricula(dados.matricula);
      if (!matricula) throw new ErroAplicacao("A matrícula não pode ficar vazia.", 400);
      if (matricula !== atual.matricula && await alunoRepository.buscarPorMatricula(matricula)) {
        throw new ErroAplicacao("Esta matrícula já está cadastrada.", 409);
      }
      alteracoes.matricula = matricula;
    }
    if (dados.telefone !== undefined) alteracoes.telefone = textoOpcional(dados.telefone, "telefone");
    if (dados.dataNascimento !== undefined) alteracoes.dataNascimento = textoOpcional(dados.dataNascimento, "dataNascimento");
    if (dados.endereco !== undefined) alteracoes.endereco = textoOpcional(dados.endereco, "endereco");
    if (dados.nomeEmergencia !== undefined) alteracoes.nomeEmergencia = textoOpcional(dados.nomeEmergencia, "nomeEmergencia");
    if (dados.telefoneEmergencia !== undefined) alteracoes.telefoneEmergencia = textoOpcional(dados.telefoneEmergencia, "telefoneEmergencia");
    if (dados.foto !== undefined) alteracoes.foto = textoOpcional(dados.foto, "foto");
    if (dados.restricoesMedicas !== undefined) {
      alteracoes.restricoesMedicas = textoOpcional(dados.restricoesMedicas, "restricoesMedicas");
    }
    if (dados.observacoes !== undefined) {
      alteracoes.observacoes = textoOpcional(dados.observacoes, "observacoes");
    }
    if (dados.ativo !== undefined) {
      if (typeof dados.ativo !== "boolean") {
        throw new ErroAplicacao("O campo ativo deve ser booleano.", 400);
      }
      alteracoes.ativo = dados.ativo;
    }
    if (Object.keys(alteracoes).length === 0) {
      throw new ErroAplicacao("Informe ao menos um campo para atualizar.", 400);
    }
    return alunoRepository.atualizar(id, alteracoes);
  },

  async desativar(id: string) {
    await this.buscarPorId(id);
    return alunoRepository.desativar(id);
  },
};
