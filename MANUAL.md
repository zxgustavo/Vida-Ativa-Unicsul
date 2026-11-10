# Manual Operacional — Academia Vida Ativa

Guia para preparar o ambiente e apresentar o MVP localmente.

## Pré-requisitos

Antes da apresentação, instale na máquina:

- **[Node.js](https://nodejs.org/en/download)** — escolha uma versão LTS compatível; o instalador também inclui o npm. O Prisma 7 deste projeto exige Node.js `^20.19.0`, `^22.12.0` ou `>=24.0.0` ([requisitos do Prisma](https://www.prisma.io/docs/orm/v7/reference/system-requirements)).
- **[Git](https://git-scm.com/downloads)** — necessário para clonar o repositório.

Após a instalação, abra um novo terminal e confirme com `node --version`, `npm --version` e `git --version`.

## Perfis de acesso

| Perfil | Utilizador | Senha | Área inicial |
| --- | --- | --- | --- |
| Administração | `admin` | `admin123` | Gestão de Cadastros |
| Portaria | `portaria` | `portaria123` | Consulta de acesso |

O login é simulado e existe para separar as telas da apresentação. As credenciais ficam no JavaScript do navegador, e a API não autentica solicitações; não use dados reais ou esse mecanismo como segurança de produção.

## Instalação rápida

Os comandos abaixo usam PowerShell e criam o SQLite local na primeira execução. Abra o terminal na pasta em que deseja guardar o projeto.

> **Windows — erro de política de execução:** se o PowerShell bloquear `npm`, `npx` ou a inicialização por não permitir scripts, abra o PowerShell ou o terminal PowerShell do VS Code e execute:
>
> ```powershell
> Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```
>
> Se aparecer uma confirmação, responda `Y` ou `S`, conforme o idioma exibido, e pressione Enter. Em seguida, tente o comando novamente. A alteração vale para o usuário atual e permanece até ser alterada; normalmente não é necessário abrir o terminal como administrador para esse escopo. Políticas da organização podem impedir ou sobrepor essa configuração. Consulte a [documentação da Microsoft](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies?view=powershell-7.5).

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

3. Ainda na pasta `Vida-Ativa-Unicsul/backend`, crie o banco e gere o cliente Prisma:

   ```powershell
   npx prisma db push
   npx prisma generate
   ```

   Use `db push` para incluir todos os modelos atuais, incluindo os logs de acesso; as migrações versionadas ainda não contemplam essa tabela.

4. Ainda na pasta `backend`, para preencher a apresentação com dados fictícios, execute:

   ```powershell
   npx prisma db seed
   ```

   O seed atualiza o plano e o preço dos contratos fictícios identificados pelo próprio script. O banco local e o arquivo `.env` não são versionados.

5. Ainda na pasta `backend`, inicie a API e mantenha esse terminal aberto:

   ```powershell
   npm run dev
   ```

   A API ficará em **http://localhost:3333**. O projeto não possui script `npm start`; `npm run dev` é o comando configurado.

6. Abra outro terminal na **raiz do projeto**, `Vida-Ativa-Unicsul`, e inicie o frontend:

   ```powershell
   node iniciar-preview.cjs
   ```

   Se o segundo terminal abrir em `Vida-Ativa-Unicsul/backend`, execute `cd ..` antes de iniciar o frontend. Acesse **http://127.0.0.1:8765/**. Encerre cada processo com `Ctrl+C` no terminal correspondente.

## Roteiro para a apresentação

1. Entre como **Administração** e comece pelos Relatórios: destaque os indicadores de alunos, contratos, receita esperada e avaliações.
2. Abra **Cadastros**, procure um aluno e mostre a desativação por *soft delete*. Para preservar os exemplos, crie um aluno fictício antes de demonstrar a desativação.
3. Em **Financeiro**, apresente planos, pagamento e filtros. Mostre como a situação depende das datas e das regras do contrato.
4. Em **Avaliação Física**, registre medidas válidas e mostre o histórico. Peso, altura e percentual de gordura são validados na API.
5. Saia e entre como **Portaria**. Consulte uma matrícula ativa com contrato vigente e depois uma inativa ou inexistente para comparar os resultados. Cada consulta concluída registra sua decisão no banco. Repita a mesma matrícula em menos de três minutos para demonstrar o bloqueio por cooldown (HTTP 429); tentativas bloqueadas pelo cooldown não geram um novo log.

O módulo Liberação e Auditoria ainda utiliza dados locais de demonstração e não libera acessos na Portaria real. O sistema não aciona catracas nem processa pagamentos bancários.

## Pagamento e renovação

Em **Registrar pagamento**, marcar um contrato vencido como **Pago** renova sua validade a partir do dia atual em São Paulo: **1 mês** no Mensal, **3 meses** no Trimestral e **12 meses** no Anual. Quando o mês de destino não possui o mesmo dia, usa-se seu último dia. O resumo antecipa o novo vencimento; após salvar, a tabela e os indicadores são recarregados e o contrato aparece como **Vigente**.

O pagamento de um contrato vigente mantém suas datas. Contratos suspensos ou cancelados não são liberados pelo pagamento. Datas alteradas explicitamente em **Editar contrato e pagamento** são respeitadas. Reenviar o pagamento de um contrato já renovado não acrescenta outro período.

As tabelas de Cadastros, Financeiro, Auditoria, Avaliação e Relatórios exibem CPF formatado para conferir os resultados das buscas.

## Verificações

Na raiz, execute `node tests/front-end.test.cjs`. Os testes de integração em `tests/*-integration.test.cjs` e `tests/contrato-pagamento.test.cjs` exigem a API ligada na porta 3333; eles criam e removem registros próprios no SQLite local e devem ser executados sequencialmente.

Para verificar a renovação sem uma API ligada, após instalar as dependências do backend, execute `node --test tests/contrato-renovacao.test.cjs`. A suíte executa o serviço real com repositórios em memória e testa também a atualização da tela; ela não substitui a integração com Prisma/SQLite. O teste `contrato-pagamento.test.cjs` aceita `PAGAMENTO_TEST_URL` e `PAGAMENTO_TEST_DB` para apontar a uma API e base descartáveis.
