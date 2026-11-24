## Purpose

Disponibilizar um cliente HTTP configurável, integralmente tipado e compatível com todos os contratos públicos oferecidos pelo backend atual.

## ADDED Requirements

### Requirement: URL base configurável
O frontend SHALL obter a URL base da API por configuração de ambiente e SHALL usar `http://localhost:8080` como valor padrão de desenvolvimento, sem duplicar URLs absolutas nos clientes de domínio.

#### Scenario: Execução local
- **WHEN** a aplicação for iniciada com a configuração de desenvolvimento
- **THEN** todas as requisições SHALL usar `http://localhost:8080` como origem da API

#### Scenario: Ambiente alternativo
- **WHEN** uma configuração de build definir outra URL base
- **THEN** todos os clientes SHALL usar essa URL sem alteração do código dos serviços de domínio

### Requirement: Contratos TypeScript explícitos
O frontend SHALL representar com tipos explícitos os requests de cadastro, as respostas `Corretora`, `Acao` e `OperacaoAcao`, o enum de tipo de operação e o corpo de erro `ProblemDetail`, incluindo erros opcionais agrupados por campo.

#### Scenario: Resposta de ação encadeada
- **WHEN** a API retornar uma ação com sua corretora relacionada
- **THEN** o consumidor SHALL acessar os campos da ação e da corretora por contratos TypeScript, sem uso de `any`

#### Scenario: Resposta de operação encadeada
- **WHEN** a API retornar uma operação com sua ação relacionada
- **THEN** o consumidor SHALL acessar os dados financeiros, o tipo e a ação por contratos TypeScript, sem uso de `any`

#### Scenario: Erro de validação
- **WHEN** a API retornar `application/problem+json` com a propriedade `errors`
- **THEN** o frontend SHALL representar `status`, `title`, `detail` e as listas de mensagens por campo

### Requirement: Cobertura integral dos endpoints de ações
O cliente de ações SHALL suportar criar e listar ações, buscar por identificador, buscar por ticker e atualizar cotação pelos caminhos e métodos HTTP atuais do backend.

#### Scenario: Matriz HTTP de ações
- **WHEN** cada operação do cliente de ações for acionada
- **THEN** SHALL usar respectivamente `POST /acoes`, `GET /acoes`, `GET /acoes/{id}`, `GET /acoes/ticker/{ticker}` ou `PUT /acoes/{id}/atualizar-cotacao`

### Requirement: Cobertura integral dos endpoints de corretoras
O cliente de corretoras SHALL suportar criar e listar corretoras, buscar por identificador e buscar por CNPJ pelos caminhos e métodos HTTP atuais do backend.

#### Scenario: Matriz HTTP de corretoras
- **WHEN** cada operação do cliente de corretoras for acionada
- **THEN** SHALL usar respectivamente `POST /corretoras`, `GET /corretoras`, `GET /corretoras/{id}` ou `GET /corretoras/cnpj/{cnpj}`

### Requirement: Cobertura integral dos endpoints de operações
O cliente de operações SHALL suportar listar todas as operações, comprar, vender, obter histórico por ação, listar compras, listar vendas e buscar operação por identificador.

#### Scenario: Matriz HTTP de operações
- **WHEN** cada consulta do cliente de operações for acionada
- **THEN** SHALL usar `GET /operacoes`, `GET /operacoes/{acaoId}`, `GET /operacoes/compras`, `GET /operacoes/vendas` ou `GET /operacoes/buscar/{id}` conforme a intenção

#### Scenario: Registrar compra
- **WHEN** uma compra válida for enviada
- **THEN** o cliente SHALL executar `POST /operacoes/comprar/{acaoId}` com `quantidade` como query parameter e corpo vazio

#### Scenario: Registrar venda
- **WHEN** uma venda válida for enviada
- **THEN** o cliente SHALL executar `POST /operacoes/vender/{acaoId}` com `quantidade` e `precoVenda` como query parameters e corpo vazio

### Requirement: Compatibilidade de segurança atual
O frontend SHALL operar sem autenticação enquanto o backend não publicar contrato de identidade ou autorização e MUST NOT fabricar credenciais, tokens ou telas de login.

#### Scenario: Requisição no contrato atual
- **WHEN** qualquer endpoint atual for consumido
- **THEN** a requisição SHALL ser enviada sem cabeçalho de autenticação criado pelo frontend
