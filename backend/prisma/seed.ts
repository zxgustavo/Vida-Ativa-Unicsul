import { prisma } from "../src/database/prisma";

// Identificadores fixos isolam os dados iniciais dos demais registros.
const id = (tipo: "a" | "c" | "e", numero: number) =>
  `${tipo}1000000-0000-4000-8000-${String(numero).padStart(12, "0")}`;

function cpfFicticio(numero: number): string {
  let cpf = String(900000000 + numero).padStart(9, "0");
  for (let tamanho = 9; tamanho <= 10; tamanho++) {
    const soma = [...cpf].reduce((total, digito, indice) => total + Number(digito) * (tamanho + 1 - indice), 0);
    const digito = (soma * 10) % 11;
    cpf += String(digito === 10 ? 0 : digito);
  }
  return cpf;
}

const hojeTexto = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());
const hoje = new Date(`${hojeTexto}T00:00:00.000Z`);
function deslocarDias(data: Date, dias: number): Date {
  const resultado = new Date(data);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado;
}

const pessoas = [
  { nome: "Ana Clara Martins", nascimento: "1994-03-18", objetivo: "Emagrecimento", peso: 68.4, altura: 165, gordura: 25.2 },
  { nome: "Bruno Ribeiro Alves", nascimento: "1989-08-12", objetivo: "Ganho de massa muscular", peso: 81.3, altura: 180, gordura: 18.5 },
  { nome: "Camila Ferreira Souza", nascimento: "1998-05-24", objetivo: "Condicionamento físico", peso: 59.8, altura: 162, gordura: 22.1 },
  { nome: "Daniel Costa Pereira", nascimento: "1986-11-07", objetivo: "Manutenção da saúde", peso: 88.1, altura: 176, gordura: 24.3 },
  { nome: "Eduarda Lima Nunes", nascimento: "1992-01-15", objetivo: "Ganho de massa muscular", peso: 64.2, altura: 169, gordura: 21.7 },
  { nome: "Felipe Gomes Rocha", nascimento: "2000-09-28", objetivo: "Condicionamento físico", peso: 75.6, altura: 178, gordura: 17.9 },
  { nome: "Gabriela Melo Santos", nascimento: "1983-04-03", objetivo: "Emagrecimento", peso: 72.5, altura: 163, gordura: 29.4 },
  { nome: "Henrique Oliveira Dias", nascimento: "1996-07-21", objetivo: "Manutenção da saúde", peso: 78.9, altura: 174, gordura: 20.8 },
  { nome: "Isabela Almeida Freitas", nascimento: "1991-12-09", objetivo: "Condicionamento físico", peso: 63.7, altura: 168, gordura: 23.6 },
  { nome: "João Pedro Carvalho", nascimento: "1988-06-30", objetivo: "Emagrecimento", peso: 92.4, altura: 182, gordura: 26.1 },
];

const mensal = { nome: "Mensal", valor: 120 } as const;
const trimestral = { nome: "Trimestral", valor: 324 } as const;
const anual = { nome: "Anual", valor: 1152 } as const;
const planos = [mensal, trimestral, anual, mensal, trimestral, anual, mensal, trimestral, mensal, anual];

async function main() {
  await prisma.$transaction(async tx => {
    for (const [indice, pessoa] of pessoas.entries()) {
      const numero = indice + 1, alunoId = id("a", numero);
      const cpf = cpfFicticio(numero), matricula = String(940000 + numero);
      // Uma colisão com um cadastro prévio não deve alterar nem substituir esse cadastro.
      const conflito = await tx.aluno.findFirst({ where: { OR: [{ cpf }, { matricula }], NOT: { id: alunoId } }, select: { id: true } });
      if (conflito) throw new Error(`CPF ou matrícula do aluno fictício ${numero} já está em uso. Nenhum dado foi alterado.`);
      await tx.aluno.upsert({
        where: { id: alunoId }, update: {},
        create: {
          id: alunoId, nome: pessoa.nome, cpf, matricula, ativo: indice < 8,
          telefone: `1198${String(1000000 + numero).padStart(7, "0")}`,
          dataNascimento: pessoa.nascimento, endereco: `Rua das Palmeiras, ${100 + numero}`,
          nomeEmergencia: "Contato de emergência", telefoneEmergencia: `1197${String(1000000 + numero).padStart(7, "0")}`,
          restricoesMedicas: "Nenhuma restrição informada.", observacoes: "Cadastro fictício para apresentação.",
        },
      });
      const situacao = indice < 6 ? "Vigente" : indice < 8 ? "Vencido" : "A Iniciar";
      const inicio = situacao === "Vigente" ? -10 : situacao === "Vencido" ? -45 : 10;
      const fim = situacao === "Vigente" ? 20 : situacao === "Vencido" ? -5 : 40;
      const plano = planos[indice];
      const pago = situacao === "Vigente" && indice % 2 === 0;
      await tx.contrato.upsert({
        where: { id: id("c", numero) }, update: { plano: plano.nome, valor: plano.valor },
        create: {
          id: id("c", numero), alunoId, plano: plano.nome, valor: plano.valor,
          dataInicio: deslocarDias(hoje, inicio), dataFim: deslocarDias(hoje, fim), situacao,
          formaPagamento: ["PIX", "Cartão", "Dinheiro", "Boleto"][indice % 4],
          statusPagamento: pago ? "Pago" : "Pendente", dataPagamento: pago ? deslocarDias(hoje, -2) : null,
        },
      });
      if (indice < 8) {
        // Todas as avaliações ficam no mês atual, inclusive quando o seed roda no dia 1.
        const dataAvaliacao = deslocarDias(hoje, -Math.min(indice, hoje.getUTCDate() - 1));
        await tx.avaliacaoFisica.upsert({
          where: { id: id("e", numero) }, update: {},
          create: {
            id: id("e", numero), alunoId, dataAvaliacao, peso: pessoa.peso, altura: pessoa.altura,
            percentualGordura: pessoa.gordura, objetivo: pessoa.objetivo, dataReavaliacao: deslocarDias(dataAvaliacao, 30),
          },
        });
      }
    }
  });
  console.log("Seed concluído: preços e planos dos contratos fictícios atualizados; demais registros preservados.");
}

main().catch(erro => { console.error("Falha ao executar o seed:", erro); process.exitCode = 1; }).finally(() => prisma.$disconnect());
