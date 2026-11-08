-- CreateTable
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

-- CreateIndex
CREATE INDEX "Contrato_alunoId_idx" ON "Contrato"("alunoId");
