# Academia Vida Ativa — apresentação do front-end

Prévia interativa em HTML, CSS e JavaScript. A identidade visual usa grafite suave, painéis cinza azulados e azul suave nas ações. Os componentes são compartilhados entre seis módulos. As telas usam textos operacionais para a apresentação ao cliente; os dados e serviços continuam fictícios e locais.

## Abrir a apresentação

Na pasta do projeto, com Node.js disponível:

```powershell
node iniciar-preview.cjs
```

Abra **http://127.0.0.1:8765/** no navegador. Encerre com Ctrl+C. Se a porta estiver ocupada, defina PORT antes de iniciar.

A abertura direta de index.html permite visualizar as telas, mas o comportamento de armazenamento e acesso entre iframes varia em URLs file://. Para apresentar os fluxos integrados, use a prévia HTTP acima.

## Percorrer a demonstração

1. Administração exibe Cadastros, Financeiro, Liberação e Auditoria, Avaliação Física e Relatórios. Portaria exibe somente o terminal da catraca. Use Área de trabalho para alternar entre essas telas.
2. Em Cadastros, use Novo aluno ou abra um registro existente. Nome, CPF válido, dados de contato e informações de saúde são obrigatórios. Matrícula é gerada automaticamente; fotos JPEG/PNG/WebP podem ter até 1 MB. Salvar cria ou edita somente o aluno: não cria contrato nem cobrança e não altera os registros financeiros existentes.
3. Em Financeiro, selecione um aluno para consultar ou cadastrar seu contrato/pagamento. Um aluno novo fica sem contrato até salvar nessa tela. Plano, vigência, pagamento, situação contratual e suspensão/reativação são administrados exclusivamente aqui. A prévia mantém uma cobrança por contrato, e os indicadores vêm desses registros.
4. Na Catraca, experimente as matrículas 1111, 2222 e 3333: os exemplos iniciais representam plano em dia, tolerância e atraso. Alterações nos demais módulos podem mudar esses resultados.
5. Liberação e Auditoria registra autorizações fictícias com justificativa, responsável e prazo. Autorizações de entrada/temporárias permitem um acesso e são consumidas pela catraca. Área restrita é registrada separadamente.
6. Avaliação Física registra peso, altura, gordura, objetivo e reavaliação; o histórico pode ser filtrado por aluno.
7. Relatórios mostra alunos com acessos liberados no período. A situação do contrato é a atual, e não a situação histórica na data de cada acesso.
8. A restauração é uma ferramenta de apoio aos testes e não aparece na interface. No console do navegador, na página principal, execute Demo.reset() e recarregue a página. Isso substitui os registros locais pelos exemplos iniciais; use somente quando puder descartar os dados adicionados.

Use apenas dados fictícios. Os dados da prévia são guardados no navegador quando o armazenamento está disponível. Quando ele é bloqueado, a prévia mantém estado em memória; esse estado pode se perder ao recarregar. A restauração afeta somente esta demonstração.

## Regras demonstrativas

- Catálogo: mensal R$ 120,00; trimestral R$ 324,00; anual R$ 1.152,00.
- Vencimentos de planos usam o mesmo dia do mês, limitado ao último dia do mês de destino.
- Suspensão guarda os dias restantes; reativação soma esse saldo à data atual.
- Contrato suspenso/cancelado não permite acesso normal. Cobrança paga com contrato vencido exige renovação.
- Cobrança pendente permite acesso com aviso até o vencimento e durante os dias de tolerância configurados, de 0 a 30.
- Autorizações excepcionais de entrada podem liberar um acesso mesmo fora dessas condições durante sua validade.
- Editar dados pessoais não altera contratos ou cobranças. O Financeiro salva explicitamente a situação do pagamento. Suspender ou reativar pelos botões preserva a cobrança e seu histórico de quitação.
- A cobrança da demonstração é atualizada, sem simular cobrança real ou transação bancária.

## Estrutura e verificações

- assets/app.css: componentes e adaptação de layout.
- assets/demo.js: catálogo, estado local, datas, validação, decisões de acesso e helpers de renderização segura.
- index.html, main.js, style.css: navegação principal.
- modulos/: HTML e controladores de cada módulo; styles importam os componentes comuns.
- tests/front-end.test.cjs: regressão de regras, inicialização com DOM simulado e verificações de tema/contraste.

```powershell
node tests/front-end.test.cjs
```

Os resultados são salvos em auditoria/TESTES-FRONTEND.json. Os testes não substituem inspeção visual em um navegador. A auditoria de 08/10/2026 e suas evidências originais foram preservadas como registro da versão anterior; o antigo auditoria/verificar.cjs se refere àquela versão.

Esta fase prepara a aprovação do front-end. Não há autenticação, API, banco de dados de produção, envio de pagamentos ou comando para equipamento físico de catraca.

## Identidade visual em grafite e azul

As cores e os estados dos componentes estão centralizados em assets/app.css; style.css aplica o mesmo tema à navegação e ao cabeçalho. Controles nativos usam color-scheme: dark. A marca mantém o raio em SVG local e as fontes do sistema.

A paleta e as decisões estão em auditoria/TEMA-GRAFITE-2026-10-09.md. A revisão atual de navegador está no mesmo relatório, com capturas em auditoria/visual/tema-grafite/. A revisão anterior do tema claro permanece em auditoria/VALIDACAO-TEMA-CLARO-2026-10-09.md. O relatório distingue a inspeção nas três larguras da verificação de reflow equivalente a 200%; o zoom real não pôde ser acionado no navegador integrado.

## Diagnóstico rápido da prévia local

Um processo Node ativo ou uma porta em estado `LISTENING` não garante que a página esteja respondendo. Se `http://127.0.0.1:8765/` expirar, confirme a resposta HTTP (por exemplo, `curl.exe --max-time 5 -i http://127.0.0.1:8765/`). Se a conexão expirar mesmo com a porta em escuta, encerre o processo Node que possui essa porta, inicie novamente `node iniciar-preview.cjs` e confirme `HTTP/1.1 200 OK` antes de compartilhar o link. Em ambientes com sandbox, o servidor pode precisar ser iniciado fora dele para que o navegador local consiga acessá-lo.
