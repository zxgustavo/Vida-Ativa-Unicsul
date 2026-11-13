-- Compatível com instalações que já criaram as liberações via db push.
CREATE TABLE IF NOT EXISTS "Liberacao" (
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
CREATE INDEX IF NOT EXISTS "Liberacao_criadoEm_idx" ON "Liberacao"("criadoEm");
CREATE INDEX IF NOT EXISTS "Liberacao_alunoId_idx" ON "Liberacao"("alunoId");
CREATE INDEX IF NOT EXISTS "Liberacao_cpf_idx" ON "Liberacao"("cpf");
