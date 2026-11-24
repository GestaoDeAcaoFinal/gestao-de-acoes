## Purpose

Garantir que todos os fluxos assíncronos comuniquem validação, andamento, sucesso, ausência e falha de forma previsível e acessível ao usuário.

## ADDED Requirements

### Requirement: Estado de carregamento
Toda ação assíncrona iniciada pelo usuário SHALL apresentar um estado de carregamento, evitar submissões duplicadas enquanto estiver pendente e encerrar o estado após sucesso ou erro.

#### Scenario: Submissão pendente
- **WHEN** um cadastro, compra, venda ou atualização estiver aguardando resposta
- **THEN** o comando correspondente SHALL permanecer desabilitado e indicar processamento

#### Scenario: Consulta pendente
- **WHEN** uma listagem ou busca estiver aguardando resposta
- **THEN** a área de resultado SHALL indicar carregamento sem mostrar um estado vazio prematuramente

### Requirement: Feedback de sucesso
Operações mutáveis concluídas SHALL apresentar confirmação de sucesso e SHALL manter a interface coerente com a resposta mais recente.

#### Scenario: Mutação concluída
- **WHEN** cadastro, compra, venda ou atualização de cotação retornar sucesso
- **THEN** o frontend SHALL apresentar confirmação e atualizar ou disponibilizar o recurso retornado

### Requirement: Tratamento padronizado de ProblemDetail
O frontend SHALL interpretar erros HTTP do backend de forma uniforme, priorizando `detail`, mantendo `title` e `status` disponíveis e associando mensagens de `errors` aos campos correspondentes quando presentes.

#### Scenario: Erro conhecido da API
- **WHEN** a API retornar `400`, `404`, `409`, `422`, `502` ou `503` com `ProblemDetail`
- **THEN** o frontend SHALL apresentar uma mensagem segura derivada do corpo e MUST NOT depender somente do texto genérico do navegador

#### Scenario: Erros por campo
- **WHEN** o corpo contiver `errors` com mensagens de validação
- **THEN** o frontend SHALL associar as mensagens aos campos reconhecidos e apresentar as demais em uma área geral

#### Scenario: Erro sem ProblemDetail
- **WHEN** ocorrer falha de rede ou resposta incompatível com o contrato
- **THEN** o frontend SHALL apresentar uma mensagem genérica estável e permitir nova tentativa

### Requirement: Recuperação e preservação de contexto
Uma falha SHALL preservar o contexto útil do usuário e permitir repetir a operação sem recarregar toda a aplicação.

#### Scenario: Falha em formulário
- **WHEN** a submissão de um formulário falhar
- **THEN** os valores válidos já informados SHALL permanecer preenchidos

#### Scenario: Nova tentativa de consulta
- **WHEN** uma listagem ou busca falhar
- **THEN** o frontend SHALL oferecer uma nova tentativa ou permitir repetir o comando mantendo os filtros

### Requirement: Estados verificáveis
Os estados de validação, carregamento, sucesso, vazio e erro SHALL ser observáveis e cobertos por testes automatizados sem depender de rede real.

#### Scenario: Teste de serviço
- **WHEN** um teste acionar qualquer método de cliente HTTP
- **THEN** SHALL verificar método, URL, parâmetros e desserialização ou erro esperado com backend simulado

#### Scenario: Teste de componente
- **WHEN** um fluxo principal receber sucesso, lista vazia ou erro simulado
- **THEN** SHALL verificar o estado apresentado e a prevenção de requisições para formulário inválido
