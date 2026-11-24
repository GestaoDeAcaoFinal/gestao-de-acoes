> Registro histórico da integração inicial. As afirmações abaixo sobre ausência de JWT e backend inalterado pertencem àquele escopo e foram superadas. Consulte `docs/validacao-e2e.md` e `docs/frontend-jwt-validacao.md` para o contrato e a validação atuais.

## Why

O frontend Angular possui telas básicas para cadastrar e listar corretoras e ações e para registrar e listar operações, porém consome somente 6 das 16 operações HTTP atuais, usa tipos `any`, mantém a URL do backend hardcoded e oferece validação e feedback de erro incompletos. Esta mudança é necessária para tornar o frontend um consumidor integral, previsível e testável da API recém-concluída, sem alterar o backend.

## What Changes

- Introduzir modelos TypeScript explícitos para requests, responses, entidades e erros `ProblemDetail` retornados pelo backend.
- Centralizar e tornar configurável a URL base da API, removendo URLs absolutas duplicadas dos serviços.
- Integrar todos os endpoints atuais de ações, corretoras e operações, preservando os fluxos existentes e adicionando os fluxos ausentes.
- Substituir entrada manual de identificadores por seleções e buscas orientadas pelos dados disponíveis quando isso melhorar os fluxos existentes.
- Alinhar validações de ticker, CNPJ, CEP, identificadores, quantidade e preço de venda às restrições públicas do backend.
- Padronizar estados de carregamento, sucesso, vazio e erro, incluindo a interpretação de `ProblemDetail` e de erros por campo.
- Tratar respostas `400`, `404`, `409`, `422`, `502` e `503` com mensagens úteis, preservando o detalhe seguro fornecido pelo backend.
- Adicionar testes reais dos serviços HTTP, dos contratos tipados e dos principais estados e fluxos dos componentes, sem chamadas de rede reais.
- Registrar autenticação e autorização como não aplicáveis ao contrato atual: o backend não possui Spring Security, OAuth, JWT nem endpoints de sessão. A arquitetura do cliente HTTP deverá permitir a inclusão futura de um interceptor de autenticação sem implementar login fictício nesta mudança.
- Manter o backend, seus endpoints e seus formatos de resposta inalterados.

## Capabilities

### New Capabilities

- `frontend-api-client`: cliente HTTP tipado e configurável que cobre integralmente os 16 endpoints atuais e interpreta o contrato `ProblemDetail`.
- `brokerage-stock-workflows`: fluxos completos de cadastro, listagem e consulta de corretoras e de cadastro, listagem, consulta e atualização de cotação de ações.
- `trading-workflows`: fluxos completos de compra, venda, listagem geral, histórico por ação, filtros por tipo e consulta de operação por identificador.
- `request-state-feedback`: comportamento uniforme de validação, carregamento, sucesso, ausência de dados e falhas HTTP em todos os fluxos integrados.

### Modified Capabilities

Nenhuma. O frontend ainda não possuía especificações-base no OpenSpec; todas as capacidades serão introduzidas por esta mudança.

## Impact

- Serviços Angular de ações, corretoras e operações e uma camada compartilhada de configuração e tratamento de erros.
- Novos modelos TypeScript para `Acao`, `Corretora`, `OperacaoAcao`, requests e `ProblemDetail`.
- Rotas, componentes e templates existentes de cadastro e listagem, além de interfaces para buscas, detalhes, filtros e atualização de cotação.
- Configuração de ambientes do Angular e execução local contra o backend em `localhost:8080` por padrão.
- Testes unitários com `HttpTestingController` e testes de componentes para validações e estados observáveis.
- Nenhuma mudança no projeto Spring Boot, no banco de dados ou nos provedores externos.
