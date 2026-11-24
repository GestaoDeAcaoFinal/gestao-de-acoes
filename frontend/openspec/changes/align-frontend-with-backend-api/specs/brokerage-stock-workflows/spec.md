## Purpose

Oferecer fluxos completos e orientados por dados para cadastrar, listar, localizar e consultar corretoras e ações, incluindo a atualização de cotações.

## ADDED Requirements

### Requirement: Cadastro validado de corretora
O frontend SHALL permitir cadastrar corretora com CNPJ e CEP e SHALL validar ambos antes de enviar, aceitando os mesmos formatos públicos aceitos pelo backend.

#### Scenario: Dados válidos de corretora
- **WHEN** o usuário informar CNPJ com 14 dígitos, com ou sem pontuação, e CEP com 8 dígitos, com ou sem hífen
- **THEN** o frontend SHALL enviar o cadastro e apresentar a corretora enriquecida retornada pela API

#### Scenario: Dados inválidos de corretora
- **WHEN** CNPJ ou CEP estiver vazio ou fora dos formatos aceitos
- **THEN** o frontend SHALL exibir mensagens nos respectivos campos e MUST NOT enviar a requisição

### Requirement: Listagem e consulta de corretoras
O frontend SHALL listar corretoras e permitir consulta por identificador positivo e por CNPJ válido, mostrando todos os dados retornados pela API.

#### Scenario: Listagem sem resultados
- **WHEN** a API retornar uma lista vazia de corretoras
- **THEN** o frontend SHALL apresentar um estado vazio explícito

#### Scenario: Busca de corretora por identificador
- **WHEN** o usuário buscar com identificador positivo
- **THEN** o frontend SHALL consultar `GET /corretoras/{id}` e apresentar os detalhes da corretora encontrada

#### Scenario: Busca de corretora por CNPJ
- **WHEN** o usuário buscar com CNPJ válido
- **THEN** o frontend SHALL consultar `GET /corretoras/cnpj/{cnpj}` preservando corretamente o valor como segmento de URL

### Requirement: Cadastro validado de ação
O frontend SHALL permitir cadastrar uma ação com ticker válido e uma corretora existente selecionada a partir dos dados da API.

#### Scenario: Dados válidos de ação
- **WHEN** o usuário informar ticker alfanumérico de 1 a 12 caracteres contendo ao menos uma letra e selecionar uma corretora
- **THEN** o frontend SHALL enviar `ticker` e `corretoraId` e apresentar a ação enriquecida retornada pela API

#### Scenario: Dados inválidos de ação
- **WHEN** o ticker for inválido ou nenhuma corretora válida estiver selecionada
- **THEN** o frontend SHALL exibir mensagens nos respectivos campos e MUST NOT enviar a requisição

### Requirement: Listagem e consulta de ações
O frontend SHALL listar ações e permitir consulta por identificador positivo e por ticker válido, mostrando os dados de mercado, cotação, horário da cotação e corretora relacionada.

#### Scenario: Busca de ação por identificador
- **WHEN** o usuário buscar com identificador positivo
- **THEN** o frontend SHALL consultar `GET /acoes/{id}` e apresentar os detalhes da ação encontrada

#### Scenario: Busca de ação por ticker
- **WHEN** o usuário buscar com ticker válido
- **THEN** o frontend SHALL consultar `GET /acoes/ticker/{ticker}` e apresentar os detalhes da ação encontrada

#### Scenario: Listagem sem resultados
- **WHEN** a API retornar uma lista vazia de ações
- **THEN** o frontend SHALL apresentar um estado vazio explícito

### Requirement: Atualização de cotação
O frontend SHALL permitir atualizar a cotação de uma ação existente e refletir a resposta atualizada sem exigir recarregamento manual da página.

#### Scenario: Cotação atualizada
- **WHEN** o usuário solicitar a atualização e `PUT /acoes/{id}/atualizar-cotacao` retornar sucesso
- **THEN** o frontend SHALL atualizar cotação, moeda e horário visíveis e apresentar confirmação

#### Scenario: Provedor indisponível ou inválido
- **WHEN** a atualização retornar `502` ou `503`
- **THEN** o frontend SHALL manter os valores previamente exibidos e apresentar o detalhe seguro do erro
