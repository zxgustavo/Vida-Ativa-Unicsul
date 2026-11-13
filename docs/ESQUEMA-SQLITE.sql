-- Academia Vida Ativa: estrutura existente em 12/11/2026.
-- Extraída em modo somente leitura de backend/dev.db. Sem dados pessoais.
-- Inclui a tabela técnica _prisma_migrations, sem seu histórico de registros.
-- Para banco vazio; não é uma migração nem substitui o Prisma Client.
PRAGMA foreign_keys = ON;

-- table: Aluno
CREATE TABLE "Aluno" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "telefone" TEXT,
    "restricoesMedicas" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
, "dataNascimento" TEXT, "endereco" TEXT, "foto" TEXT, "nomeEmergencia" TEXT, "telefoneEmergencia" TEXT);

-- table: AvaliacaoFisica
CREATE TABLE "AvaliacaoFisica" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alunoId" TEXT NOT NULL,
    "dataAvaliacao" DATETIME NOT NULL,
    "peso" REAL NOT NULL,
    "altura" REAL NOT NULL,
    "percentualGordura" REAL,
    "objetivo" TEXT NOT NULL,
    "dataReavaliacao" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "AvaliacaoFisica_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- table: Contrato
CREATE TABLE "Contrato" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alunoId" TEXT NOT NULL,
    "plano" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "dataInicio" DATETIME NOT NULL,
    "dataFim" DATETIME NOT NULL,
    "situacao" TEXT NOT NULL,
    "tolerancia" INTEGER NOT NULL DEFAULT 5,
    "diasSuspensos" INTEGER NOT NULL DEFAULT 0,
    "formaPagamento" TEXT NOT NULL DEFAULT 'PIX',
    "statusPagamento" TEXT NOT NULL DEFAULT 'Pendente',
    "dataPagamento" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Contrato_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- table: Liberacao
CREATE TABLE "Liberacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipoPessoa" TEXT NOT NULL,
    "alunoId" TEXT,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "matricula" TEXT,
    "tipoAcesso" TEXT NOT NULL,
    "justificativa" TEXT NOT NULL,
    "responsavel" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" DATETIME NOT NULL,
    "utilizadaEm" DATETIME,
    CONSTRAINT "Liberacao_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- table: LogAcesso
CREATE TABLE "LogAcesso" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matricula" TEXT NOT NULL,
    "alunoId" TEXT,
    "status" TEXT NOT NULL,
    "motivo" TEXT,
    "dataHora" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LogAcesso_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- table: Pagamento
CREATE TABLE "Pagamento" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "contratoId" TEXT NOT NULL,
  "chave" TEXT NOT NULL,
  "valorCentavos" INTEGER NOT NULL,
  "plano" TEXT NOT NULL,
  "formaPagamento" TEXT NOT NULL,
  "dataPagamento" TEXT NOT NULL,
  "origem" TEXT NOT NULL DEFAULT 'Registro',
  "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Pagamento_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- table: _prisma_migrations
CREATE TABLE "_prisma_migrations" (
    "id"                    TEXT PRIMARY KEY NOT NULL,
    "checksum"              TEXT NOT NULL,
    "finished_at"           DATETIME,
    "migration_name"        TEXT NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        DATETIME,
    "started_at"            DATETIME NOT NULL DEFAULT current_timestamp,
    "applied_steps_count"   INTEGER UNSIGNED NOT NULL DEFAULT 0
);

-- index: Aluno_cpf_key
CREATE UNIQUE INDEX "Aluno_cpf_key" ON "Aluno"("cpf");

-- index: Aluno_matricula_key
CREATE UNIQUE INDEX "Aluno_matricula_key" ON "Aluno"("matricula");

-- index: AvaliacaoFisica_alunoId_idx
CREATE INDEX "AvaliacaoFisica_alunoId_idx" ON "AvaliacaoFisica"("alunoId");

-- index: Contrato_alunoId_idx
CREATE INDEX "Contrato_alunoId_idx" ON "Contrato"("alunoId");

-- index: Liberacao_alunoId_idx
CREATE INDEX "Liberacao_alunoId_idx" ON "Liberacao"("alunoId");

-- index: Liberacao_cpf_idx
CREATE INDEX "Liberacao_cpf_idx" ON "Liberacao"("cpf");

-- index: Liberacao_criadoEm_idx
CREATE INDEX "Liberacao_criadoEm_idx" ON "Liberacao"("criadoEm");

-- index: LogAcesso_alunoId_idx
CREATE INDEX "LogAcesso_alunoId_idx" ON "LogAcesso"("alunoId");

-- index: LogAcesso_dataHora_idx
CREATE INDEX "LogAcesso_dataHora_idx" ON "LogAcesso"("dataHora");

-- index: Pagamento_chave_key
CREATE UNIQUE INDEX "Pagamento_chave_key" ON "Pagamento"("chave");

-- index: Pagamento_contratoId_idx
CREATE INDEX "Pagamento_contratoId_idx" ON "Pagamento"("contratoId");

-- index: Pagamento_dataPagamento_idx
CREATE INDEX "Pagamento_dataPagamento_idx" ON "Pagamento"("dataPagamento");
