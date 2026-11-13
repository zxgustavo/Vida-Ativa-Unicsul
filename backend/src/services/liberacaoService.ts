import { alunoRepository } from "../repositories/alunoRepository";
import { liberacaoRepository } from "../repositories/liberacaoRepository";
import { ErroAplicacao } from "./alunoService";

function texto(valor: unknown, campo: string, min: number, max: number): string {
  if (typeof valor !== "string") throw new ErroAplicacao(`Informe ${campo}.`, 400);
  const result = valor.trim().replace(/\s+/g, " ");
  if (result.length < min || result.length > max) throw new ErroAplicacao(`Informe ${campo} com ${min} a ${max} caracteres.`, 400);
  return result;
}

function cpfExterno(valor: unknown): string {
  const informado = texto(valor, "um CPF válido", 11, 14);
  if (!/^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/.test(informado)) throw new ErroAplicacao("Informe um CPF válido.", 400);
  const cpf = informado.replace(/\D/g, "");
  if (/^(\d)\1{10}$/.test(cpf)) throw new ErroAplicacao("Informe um CPF válido.", 400);
  for (let tamanho = 9; tamanho < 11; tamanho++) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (tamanho + 1 - i);
    const digito = (soma * 10) % 11;
    if (Number(cpf[tamanho]) !== (digito === 10 ? 0 : digito)) throw new ErroAplicacao("Informe um CPF válido.", 400);
  }
  return cpf;
}

export const liberacaoService = {
  listar: () => liberacaoRepository.listar(),
  async criar(input: unknown) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new ErroAplicacao("Informe os dados da autorização.", 400);
    const dados = input as Record<string, unknown>;
    const tipoPessoa = dados.tipoPessoa;
    if (tipoPessoa !== "Aluno" && tipoPessoa !== "Outra pessoa") throw new ErroAplicacao("Selecione Aluno ou Outra pessoa.", 400);
    if (typeof dados.tipoAcesso !== "string" || !["entrada", "temporaria", "restrita"].includes(dados.tipoAcesso)) throw new ErroAplicacao("Selecione o tipo de acesso.", 400);
    if (typeof dados.minutos !== "number" || ![15, 30, 60].includes(dados.minutos)) throw new ErroAplicacao("Selecione a validade de 15, 30 ou 60 minutos.", 400);
    const justificativa = texto(dados.justificativa, "a justificativa", 10, 250);
    let alunoId: string | null = null, matricula: string | null = null, nome: string, cpf: string;
    if (tipoPessoa === "Aluno") {
      alunoId = texto(dados.alunoId, "o aluno", 1, 100);
      const aluno = await alunoRepository.buscarPorId(alunoId);
      if (!aluno) throw new ErroAplicacao("Aluno não encontrado.", 404);
      if (!aluno.ativo) throw new ErroAplicacao("Selecione um aluno ativo.", 400);
      // Identificação preservada como estava no momento da autorização.
      nome = aluno.nome; cpf = aluno.cpf; matricula = aluno.matricula;
    } else {
      if (dados.alunoId) throw new ErroAplicacao("Outra pessoa não deve estar vinculada a um aluno.", 400);
      nome = texto(dados.nome, "o nome completo", 3, 150);
      cpf = cpfExterno(dados.cpf);
    }
    const criadoEm = new Date();
    return liberacaoRepository.criar({ tipoPessoa, alunoId, nome, cpf, matricula, tipoAcesso: dados.tipoAcesso, justificativa,
      responsavel: "Administração (login simulado)", criadoEm, expiraEm: new Date(criadoEm.getTime() + dados.minutos * 60000) });
  },
};
