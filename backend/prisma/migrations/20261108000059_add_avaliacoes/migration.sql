-- CreateTable
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

-- CreateIndex
CREATE INDEX "AvaliacaoFisica_alunoId_idx" ON "AvaliacaoFisica"("alunoId");
