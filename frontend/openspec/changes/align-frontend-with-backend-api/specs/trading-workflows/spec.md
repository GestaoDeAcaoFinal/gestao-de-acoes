## Purpose

Disponibilizar todos os fluxos de negociação e consulta de operações do backend com seleção orientada de ações e apresentação consistente dos resultados financeiros.

## ADDED Requirements

### Requirement: Registro validado de compra
O frontend SHALL permitir comprar uma ação existente com quantidade inteira positiva selecionando a ação a partir dos dados disponíveis.

#### Scenario: Compra válida
- **WHEN** o usuário selecionar uma ação, informar quantidade positiva e confirmar a compra
- **THEN** o frontend SHALL registrar a compra e apresentar a operação retornada e uma confirmação de sucesso

#### Scenario: Compra inválida
- **WHEN** a ação não estiver selecionada ou a quantidade não for inteira positiva
- **THEN** o frontend SHALL indicar os campos inválidos e MUST NOT enviar a requisição

### Requirement: Registro validado de venda
O frontend SHALL permitir vender uma ação existente com quantidade inteira positiva e preço de venda positivo.

#### Scenario: Venda válida
- **WHEN** o usuário selecionar uma ação, informar quantidade e preço positivos e confirmar a venda
- **THEN** o frontend SHALL registrar a venda e apresentar a operação retornada e uma confirmação de sucesso

#### Scenario: Venda sem posição ou acima do saldo
- **WHEN** a API rejeitar a venda com `400` ou `409`
- **THEN** o frontend SHALL preservar os dados preenchidos e apresentar o detalhe retornado pela API

### Requirement: Consulta completa de operações
O frontend SHALL permitir alternar entre todas as operações, somente compras, somente vendas e o histórico de uma ação selecionada.

#### Scenario: Histórico completo
- **WHEN** o usuário selecionar a visão de todas as operações
- **THEN** o frontend SHALL consultar `GET /operacoes` e apresentar os resultados

#### Scenario: Filtro de compras
- **WHEN** o usuário selecionar somente compras
- **THEN** o frontend SHALL consultar `GET /operacoes/compras` e apresentar apenas operações `COMPRA`

#### Scenario: Filtro de vendas
- **WHEN** o usuário selecionar somente vendas
- **THEN** o frontend SHALL consultar `GET /operacoes/vendas` e apresentar apenas operações `VENDA`

#### Scenario: Histórico por ação
- **WHEN** o usuário selecionar uma ação para histórico
- **THEN** o frontend SHALL consultar `GET /operacoes/{acaoId}` e apresentar as operações daquela ação

#### Scenario: Consulta sem resultados
- **WHEN** qualquer consulta retornar lista vazia
- **THEN** o frontend SHALL apresentar um estado vazio específico para o filtro ativo

### Requirement: Busca de operação por identificador
O frontend SHALL permitir consultar uma operação individual por identificador positivo e apresentar seus dados completos.

#### Scenario: Operação encontrada
- **WHEN** o usuário informar um identificador positivo
- **THEN** o frontend SHALL consultar `GET /operacoes/buscar/{id}` e apresentar a operação retornada

#### Scenario: Identificador inválido
- **WHEN** o identificador estiver ausente, não numérico ou não positivo
- **THEN** o frontend SHALL apresentar erro de validação e MUST NOT enviar a requisição

### Requirement: Apresentação de valores da operação
O frontend SHALL apresentar ticker, tipo, quantidade, preço unitário, valor total, preço médio, lucro ou prejuízo e data da operação, tratando valores opcionais sem quebrar a tela.

#### Scenario: Operação com valor financeiro opcional
- **WHEN** preço médio ou lucro/prejuízo vier nulo na resposta
- **THEN** o frontend SHALL apresentar um marcador de ausência em vez de texto inválido ou erro de renderização
