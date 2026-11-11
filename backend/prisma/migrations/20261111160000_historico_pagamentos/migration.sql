-- Completa também instalações antigas que usaram db push.
BEGIN IMMEDIATE;
CREATE TABLE IF NOT EXISTS "LogAcesso" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "matricula" TEXT NOT NULL,
  "alunoId" TEXT,
  "status" TEXT NOT NULL,
  "motivo" TEXT,
  "dataHora" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LogAcesso_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "LogAcesso_dataHora_idx" ON "LogAcesso"("dataHora");
CREATE INDEX IF NOT EXISTS "LogAcesso_alunoId_idx" ON "LogAcesso"("alunoId");

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
CREATE UNIQUE INDEX "Pagamento_chave_key" ON "Pagamento"("chave");
CREATE INDEX "Pagamento_contratoId_idx" ON "Pagamento"("contratoId");
CREATE INDEX "Pagamento_dataPagamento_idx" ON "Pagamento"("dataPagamento");

-- Recupera apenas o último pagamento comprovado pelo registro atual.
-- Preserva a data original, inclusive o formato numérico de adaptadores antigos.
INSERT INTO "Pagamento" ("id", "contratoId", "chave", "valorCentavos", "plano", "formaPagamento", "dataPagamento", "origem")
SELECT 'legado:' || "id", "id", 'legado:' || "id", CAST(ROUND("valor" * 100) AS INTEGER), "plano", "formaPagamento",
  CASE WHEN typeof("dataPagamento") IN ('integer','real')
    THEN strftime('%Y-%m-%dT%H:%M:%fZ', "dataPagamento" / 1000.0, 'unixepoch')
    ELSE "dataPagamento" END,
  'Legado'
FROM "Contrato" WHERE "statusPagamento" = 'Pago' AND "dataPagamento" IS NOT NULL;
COMMIT;
