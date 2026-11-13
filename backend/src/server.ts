import express, { ErrorRequestHandler } from "express";
import cors from "cors";
import { Prisma } from "@prisma/client";
import { alunoRoutes } from "./routes/alunoRoutes";
import { contratoRoutes } from "./routes/contratoRoutes";
import { avaliacaoRoutes } from "./routes/avaliacaoRoutes";
import { relatorioRoutes } from "./routes/relatorioRoutes";
import { portariaRoutes } from "./routes/portariaRoutes";
import { liberacaoRoutes } from "./routes/liberacaoRoutes";
import { ErroAplicacao } from "./services/alunoService";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/api/alunos", alunoRoutes);
app.use("/api/financeiro", contratoRoutes);
app.use("/api/avaliacoes", avaliacaoRoutes);
app.use("/api/relatorios", relatorioRoutes);
app.use("/api/portaria", portariaRoutes);
app.use("/api/liberacoes", liberacaoRoutes);

const tratarErro: ErrorRequestHandler = (erro, _req, res, _next) => {
  if (erro instanceof ErroAplicacao) {
    res.status(erro.status).json({ erro: erro.message });
    return;
  }
  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    if (erro.code === "P2002") {
      res.status(409).json({ erro: "CPF ou matrícula já cadastrado." });
      return;
    }
    if (erro.code === "P2025") {
      res.status(404).json({ erro: "Aluno não encontrado." });
      return;
    }
  }
  console.error(erro);
  res.status(500).json({ erro: "Erro interno do servidor." });
};

app.use(tratarErro);

const porta = Number(process.env.PORT) || 3333;
app.listen(porta, () => {
  console.log(`Servidor da Academia Vida Ativa em http://localhost:${porta}`);
});
