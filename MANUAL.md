# Manual Operacional — Academia Vida Ativa

Guia para preparar o ambiente e apresentar o MVP localmente.

## Perfis de acesso

| Perfil | Utilizador | Senha | Área inicial |
| --- | --- | --- | --- |
| Administração | `admin` | `admin123` | Relatórios |
| Portaria | `portaria` | `portaria123` | Consulta de acesso |

O login é simulado e existe para separar as telas da apresentação. As credenciais ficam no JavaScript do navegador, e a API não autentica solicitações; não use dados reais ou esse mecanismo como segurança de produção.

## Instalação rápida

Pré-requisito: Node.js compatível com Prisma 7 e npm. Os comandos abaixo usam PowerShell e criam o SQLite local na primeira execução.

1. Clone o repositório e entre na pasta:

   ```powershell
   git clone https://github.com/zxgustavo/Vida-Ativa-Unicsul.git
   cd Vida-Ativa-Unicsul
   ```

2. Entre no backend, instale as dependências e configure a conexão local:

   ```powershell
   cd backend
   npm install
   Set-Content -Path .env -Value 'DATABASE_URL="file:./dev.db"'
   ```

3. Crie o banco e gere o cliente Prisma:

   ```powershell
   npx prisma db push
   npx prisma generate
   ```

   Em um banco novo, também é possível aplicar as migrações versionadas com `npx prisma migrate deploy` em vez de `npx prisma db push`.

4. Para preencher a apresentação com dados fictícios, execute:

   ```powershell
   npx prisma db seed
   ```

   O seed atualiza o plano e o preço dos contratos fictícios identificados pelo próprio script. O banco local e o arquivo `.env` não são versionados.

5. Inicie a API e mantenha o terminal aberto:

   ```powershell
   npm run dev
   ```

   A API ficará em **http://localhost:3333**. O projeto não possui script `npm start`; `npm run dev` é o comando configurado.

6. Em outro terminal, volte à raiz do projeto e inicie o frontend:

   ```powershell
   cd ..
   node iniciar-preview.cjs
   ```

   Acesse **http://127.0.0.1:8765/**. Encerre cada processo com `Ctrl+C` no terminal correspondente.

## Roteiro para a apresentação

1. Entre como **Administração** e comece pelos Relatórios: destaque os indicadores de alunos, contratos, receita esperada e avaliações.
2. Abra **Cadastros**, procure um aluno e mostre a desativação por *soft delete*. Para preservar os exemplos, crie um aluno fictício antes de demonstrar a desativação.
3. Em **Financeiro**, apresente planos, pagamento e filtros. Mostre como a situação depende das datas e das regras do contrato.
4. Em **Avaliação Física**, registre medidas válidas e mostre o histórico. Peso, altura e percentual de gordura são validados na API.
5. Saia e entre como **Portaria**. Consulte uma matrícula ativa com contrato vigente e depois uma inativa ou inexistente para comparar os resultados. A consulta é somente de leitura.

O módulo Liberação e Auditoria ainda utiliza dados locais de demonstração e não libera acessos na Portaria real. O sistema não aciona catracas nem processa pagamentos bancários.

## Verificações

Na raiz, execute `node tests/front-end.test.cjs`. Os testes de integração em `tests/*-integration.test.cjs` e `tests/contrato-pagamento.test.cjs` exigem a API ligada na porta 3333; eles criam e removem registros próprios no SQLite local e devem ser executados sequencialmente.
