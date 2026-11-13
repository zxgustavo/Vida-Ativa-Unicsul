# Relatórios e integridade dos recebimentos

## Diagnóstico reproduzido

Na `main` em `0e0992c`, a consulta de 07/10/2026, sem pagamentos, retornou
`receitaPrevista: 1596` e `alunos: []`. O valor somava contratos vigentes hoje;
a tabela usava a data de cadastro. O número era calculado, mas não representava
recebimentos nem respondia ao período. Alunos e alunos ativos eram totais gerais;
avaliações no período já usavam o intervalo. A renovação sobrescrevia o último
pagamento no contrato e não conservava os recebimentos anteriores.

A captura anterior usa uma cópia descartável do SQLite, com uma aluna cadastrada
em 2025 e contratos de R$ 120, R$ 324 e R$ 1.152 (este último pendente). Os dois
pagamentos foram registrados em 06/10. As capturas após a correção usam outra
base descartável, criada por migrações e preenchida pela API, com os mesmos
valores e um segundo aluno para testar a renovação. Nenhuma captura usa API em
memória ou alteração manual de números/textos da página.

## Regras dos indicadores

| Informação | Regra | Filtros aplicáveis |
| --- | --- | --- |
| Recebido no período | Soma em centavos dos recebimentos confirmados no histórico, inclusive de alunos cadastrados antes do intervalo | Data do pagamento, nome/CPF/matrícula e situação **atual** do contrato |
| Detalhamento dos recebimentos | Uma linha por recebimento; plano, forma e valor preservados no registro. Total inclui todas as páginas, não só a página visível | Os mesmos do recebido |
| Alunos cadastrados / ativos | Cadastros / cadastros ativos da lista filtrada | Data de cadastro, busca e situação atual |
| Valor dos contratos vigentes | Soma dos valores integrais dos contratos vigentes da lista filtrada; não é dinheiro recebido | Data de cadastro, busca e situação atual |
| Alunos com contrato vencido / a iniciar | Alunos distintos da lista filtrada com contrato nessa situação hoje | Data de cadastro, busca e situação atual |
| Avaliações no mês | Avaliações dos alunos filtrados, no mês atual e no intervalo selecionado | Data de cadastro, busca, situação e data da avaliação |
| Avaliações no período | Avaliações dos alunos filtrados com data civil no intervalo selecionado | Data de cadastro, busca, situação e data da avaliação |
| Cadastros no período e contratos | Data de cadastro do aluno em São Paulo; pode conter uma linha por contrato | Datas de cadastro, busca e situação atual |

As datas inicial e final são inclusivas. Datas civis `AAAA-MM-DD` não sofrem
deslocamento de fuso. Novos timestamps com offset/Z são convertidos para
`America/Sao_Paulo` antes de definir o dia do pagamento, inclusive perto da
meia-noite. A convenção antiga de datas civis gravadas em UTC à meia-noite é
preservada para registros legados. Não é possível distinguir retrospectivamente
esses valores de um eventual timestamp real exatamente à meia-noite UTC.

Busca por nome ignora acentos e caixa; CPF aceita máscara ou dígitos. Situação
é a situação atual, não uma reconstrução do contrato na data do recebimento.
Cancelar, suspender ou desativar não apaga dinheiro já registrado: esses
recebimentos continuam no histórico e aparecem sem filtro de situação.
“Sem contrato” retorna zero recebimentos, pois todo recebimento tem contrato.
Limpar restaura mês atual até hoje, todas as situações e busca vazia, consultando
novamente a API. Atualizações e erros limpam indicadores e tabelas anteriores;
respostas atrasadas são descartadas. A API usa `Cache-Control: no-store`.

## Histórico, renovação e repetição

`Pagamento` armazena valor em centavos, plano, forma, data civil, contrato,
origem e chave única. O estado atual continua em `Contrato`, por compatibilidade.
Uma criação já paga ou uma transição de pendente para pago cria um recebimento.
Um novo pagamento com data posterior ao último, em contrato vencido, preserva
o anterior e segue as regras existentes de renovação (1/3/12 meses desde hoje
em São Paulo, respeitando finais de mês, ano bissexto, suspensão e cancelamento).

Gravação do recebimento e atualização/renovação usam a mesma transação Prisma.
Falhas não deixam pagamento sem renovação ou renovação sem pagamento.
Os formulários e a prévia financeira usam o dia de São Paulo, inclusive em navegadores em outro fuso. O frontend envia `operacaoPagamento`, mantendo a chave nas tentativas da mesma
operação. Repetir uma chave já usada devolve o contrato sem somar novamente;
reutilização incompatível retorna conflito. Clientes antigos sem chave têm
proteção por contrato/data no PUT. Clientes que criam contratos pagos por POST
devem enviar e reutilizar a chave, pois o sistema permite vários contratos para
o mesmo aluno.

Editar metadados/valor atual do contrato não altera recebimentos anteriores.
Um pagamento já confirmado não pode ser apagado mudando o status para pendente;
alterar sua data sem um novo pagamento elegível também é recusado. Estornos e
correções contábeis não fazem parte desta mudança. Um contrato já pago e vigente
não gera um segundo recebimento simplesmente ao salvar novamente.

## Migração sem apagar o banco existente

Na pasta `backend`, com a API parada e `DATABASE_URL` configurada:

```bash
npm ci
npm run db:migrate
npx prisma generate --config prisma7.config.ts
```

O comando verifica a integridade e preserva um backup SQLite ao lado da base
(`dev.db.backup-<instante>`). Para instalações antigas sem histórico Prisma,
confere colunas, vínculos e unicidade do schema conhecido antes de registrar o
baseline das quatro migrações antigas. Schemas incompatíveis são recusados.
Depois usa `prisma migrate deploy --config prisma7.config.ts`. A nova migração
inclui `LogAcesso` quando necessário e cria o histórico em uma transação.

É recuperado **apenas um** recebimento legado por contrato que ainda tenha
`statusPagamento = Pago` e data salva. O valor recuperado é o valor disponível
no contrato na migração; se ele foi editado depois de pagar, o valor original
já não pode ser provado. Registros sem data não recebem data inventada.
Pagamentos sobrescritos por renovações anteriores não podem ser recuperados.
Os recebimentos recuperados têm origem **Legado**, visível no detalhamento.
Os novos registros preservam valor, forma, plano e data independentemente de
edições futuras. Reaplicar a migração não duplica o legado.

Não use `db push` para atualizar bases existentes: ele não executa o backfill.
O seed inclui recebimentos dos contratos fictícios pagos, sem duplicá-los.

## Evidências executadas em 11/11/2026

Ambiente: Node 24.22.1, npm 11.9.0, Prisma 7.10.1 e Chromium. Cliente Prisma e
schema engine funcionaram com TLS e integridade habilitados. O `dev.db` existente
foi preservado; todas as mutações de testes aconteceram em bancos descartáveis.

```bash
node tests/run-isolated.cjs
```

- Instalação nova com todas as migrações e TypeScript (`tsc --noEmit`): aprovados.
- Migração de dados legados e reaplicação: registros existentes preservados,
  backup, recuperação apenas do pago com data e nenhum recebimento duplicado.
- Frontend: **97/97**. Usa DOM mínimo e respostas de API simuladas.
- Renovação: **12/12**. Usa os serviços reais com repositórios e relógio simulados.
- Integrações reais: pagamento, financeiro, avaliação, relatórios e portaria.
  Os testes de interface dessas suítes usam DOM mínimo com API/Prisma/SQLite reais.
- Nova integração de recebimentos: zero/um/vários, exclusão de pendentes e
  pagamentos externos ao período, limites inclusivos, meia-noite SP, datas
  inválidas, cadastro anterior, busca com CPF e acentos, situação, soma exata,
  limpeza, erro sem números antigos, paginação com total de todas as páginas,
  histórico após renovação, repetição, concorrência e rollback após falha real de inserção no SQLite. A falha de conexão no teste de DOM é simulada por rejeição de fetch.

Para reproduzir as capturas, use outro SQLite vazio descartável. Migre-o com
`DATABASE_URL=file:/tmp/vida-ativa-browser.db npm run db:migrate` em `backend`,
inicie a API com essa mesma variável e `npm run dev`, e a interface na raiz com
`node iniciar-preview.cjs`. Com Playwright Python e Chromium instalados:

```bash
TEST_DATABASE_PATH=/tmp/vida-ativa-browser.db TEST_API_URL=http://localhost:3333 python3 tests/relatorios-browser.py
```

O script cria seus próprios dados fictícios pela API e usa SQLite para conferir
a persistência. Exige base nova. Respeita a proteção de 900 ms contra duplo
clique da aplicação. Verificou login, recebido 444/zero, CPF, renovação, histórico
com dois recebimentos, repetição sem duplicar, limpeza, ausência de erros JS e
viewport de 390 × 844 sem transbordamento horizontal da página. As tabelas
continuam com rolagem interna no celular.

| Captura real | O que comprova |
| --- | --- |
| [Antes](./prints/relatorios/antes-periodo-vazio.png) | Período sem pagamentos ainda mostrando R$ 1.596,00 como receita esperada |
| [Desktop com pagamentos](./prints/relatorios/com-pagamentos-desktop.png) | R$ 444,00 em 06/10 e separação dos indicadores gerais |
| [Detalhamento](./prints/relatorios/detalhamento-soma.png) | R$ 120,00 + R$ 324,00 = R$ 444,00; CPF formatado e cadastro anterior ao período |
| [Sem pagamentos](./prints/relatorios/sem-pagamentos-desktop.png) | R$ 0,00 em 07/10, sem zerar os indicadores gerais |
| [Financeiro após renovação](./prints/relatorios/apos-renovacao-financeiro.png) | Pago, Vigente e novo vencimento após salvar pelo formulário |
| [Relatório após renovação](./prints/relatorios/apos-renovacao-relatorio.png) | Novo recebimento de R$ 120,00 no dia do pagamento |
| [Celular](./prints/relatorios/com-pagamentos-celular.png) | Indicadores responsivos e tabelas com rolagem interna |
