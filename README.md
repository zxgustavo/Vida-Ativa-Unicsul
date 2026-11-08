# Academia Vida Ativa — MVP Fullstack

**Uma operação de academia conectada, do cadastro à portaria.**

O Vida Ativa reúne as rotinas essenciais de uma academia em uma interface de gestão corporativa inspirada na experiência de grandes redes, como Motion Fit e Sky Fit. O MVP conecta alunos, contratos e avaliações a um banco local, com informações consolidadas para a administração e consulta de acesso na portaria.

## Pilares tecnológicos

| Camada | Tecnologias |
| --- | --- |
| **Frontend** | HTML5, CSS3 customizado e Vanilla JavaScript, com módulos em iframes |
| **Backend** | Node.js, Express e TypeScript |
| **Dados** | Prisma ORM e SQLite local |

A API segue uma arquitetura em camadas: **Routes** recebem os pedidos, **Controllers** cuidam da interface HTTP, **Services** aplicam regras de negócio e **Repositories** encapsulam o acesso aos dados quando aplicável.

## O que o MVP entrega

- **Gestão de Cadastros** — cadastro e edição de alunos, busca, paginação e desativação por *soft delete*.
- **Financeiro** — planos, contratos e pagamentos, com situação atualizada pelas regras de vigência e indicadores de cobrança.
- **Controle de Acesso / Portaria** — consulta de matrícula em modo de leitura para verificar cadastro ativo e contrato vigente.
- **Avaliação Física** — registro e histórico de avaliações, com validação de peso, altura e percentual de gordura no frontend e no backend.
- **Relatórios Dinâmicos** — indicadores de alunos, contratos, receita esperada e avaliações, com filtros e paginação.

A navegação também inclui **Liberação e Auditoria**, ainda baseada em dados locais de demonstração e sem integração com a consulta real da Portaria.

## Comece por aqui

O [Manual Operacional](MANUAL.md) reúne instalação, credenciais de apresentação, execução e um roteiro para demonstrar o sistema.

> O login é simulado: as credenciais estão no frontend e a API não possui autenticação. O projeto é um MVP de apresentação e não deve ser tratado como uma solução de controle de acesso ou de proteção de dados para produção.
