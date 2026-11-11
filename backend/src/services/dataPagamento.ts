import { ErroAplicacao } from "./alunoService";

export function hojeSaoPaulo(instante = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(instante);
}

// O formulário antigo armazenava datas civis em UTC à meia-noite.
// Outros timestamps representam instantes e são convertidos para São Paulo.
export function diaPagamento(valor: unknown, legado = false): string {
  const texto = valor instanceof Date ? valor.toISOString() : valor;
  if (typeof texto !== "string") throw new ErroAplicacao("Informe data de pagamento válida.", 400);
  const civil = /^\d{4}-\d{2}-\d{2}$/.test(texto);
  const calendario = texto.slice(0,10);
  const base = new Date(`${calendario}T00:00:00.000Z`);
  if (!Number.isFinite(base.getTime()) || base.toISOString().slice(0,10) !== calendario) throw new ErroAplicacao("Informe data de pagamento válida.", 400);
  const legadoCivil = (legado || valor instanceof Date) && /^\d{4}-\d{2}-\d{2}T00:00:00(?:\.000)?Z$/.test(texto);
  const instante = new Date(civil ? `${texto}T00:00:00.000Z` : texto);
  if (!Number.isFinite(instante.getTime()) || (civil && instante.toISOString().slice(0,10) !== texto)) throw new ErroAplicacao("Informe data de pagamento válida.", 400);
  if (!civil && !legadoCivil && !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(texto)) throw new ErroAplicacao("Informe data de pagamento com fuso horário.", 400);
  return civil || legadoCivil ? instante.toISOString().slice(0,10) : hojeSaoPaulo(instante);
}
