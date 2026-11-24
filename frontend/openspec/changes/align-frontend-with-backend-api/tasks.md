> Checklist histórico da primeira integração, anterior a JWT e carteiras individuais. Consulte `docs/contratos-atuais.md` e `docs/validacao-e2e.md` para o estado consolidado.

## 1. Contratos, configuração e infraestrutura HTTP

- [x] 1.1 Criar os modelos TypeScript separados de request e response para corretora, ação, operação, tipo de operação e `ProblemDetail`; verificar com `ng build` que serviços e componentes não dependem de `any` nos contratos da API.
- [x] 1.2 Criar a configuração de ambiente e o token injetável da URL base, com `http://localhost:8080` no desenvolvimento; verificar em teste que uma URL alternativa pode ser injetada sem alterar os serviços.
- [x] 1.3 Implementar a normalização de `HttpErrorResponse`/`ProblemDetail` em interceptor funcional com fallback para rede ou corpo inválido; verificar em testes os status `400`, `404`, `409`, `422`, `502`, `503` e status `0`.
- [x] 1.4 Registrar o interceptor com `provideHttpClient(withInterceptors(...))` sem adicionar autenticação; verificar que uma requisição comum usa a URL configurada e não recebe cabeçalho de credenciais.
- [x] 1.5 Criar estruturas compartilhadas para loading, sucesso, erro e mensagens por campo; verificar por testes unitários a transição pendente → sucesso e pendente → erro.

## 2. Serviços HTTP tipados e cobertura integral da API

- [x] 2.1 Completar o serviço de corretoras com cadastro, listagem, busca por id e busca por CNPJ tipados; verificar com `HttpTestingController` método, URL, encoding do CNPJ, corpo e resposta dos 4 endpoints.
- [x] 2.2 Completar o serviço de ações com cadastro, listagem, busca por id, busca por ticker e atualização de cotação tipados; verificar com `HttpTestingController` método, URL, corpo e resposta dos 5 endpoints.
- [x] 2.3 Completar o serviço de operações com listagem geral, compra, venda, histórico por ação, filtros de compras/vendas e busca por id tipados; verificar com `HttpTestingController` os 7 endpoints e seus query parameters.
- [x] 2.4 Adicionar aos testes dos três serviços respostas representativas com relações aninhadas e campos opcionais; verificar a leitura de `corretoraRelacionada`, `acao`, datas, preço médio e lucro/prejuízo nulos.
- [x] 2.5 Adicionar cenários de erro aos testes dos serviços; verificar que `ProblemDetail`, erros por campo e fallback de rede chegam aos consumidores na forma padronizada.

## 3. Fluxos de corretoras

- [x] 3.1 Migrar o cadastro de corretora para Reactive Forms tipado com validações de CNPJ e CEP equivalentes ao backend; verificar que formatos válidos são enviados e formulários inválidos não chamam o serviço.
- [x] 3.2 Adicionar loading, bloqueio de duplicidade, sucesso com resposta enriquecida e erros gerais/por campo ao cadastro; verificar por testes de componente que valores são preservados após falha.
- [x] 3.3 Aprimorar a listagem com estados de loading, vazio, erro e nova tentativa; verificar os quatro estados com doubles do serviço.
- [x] 3.4 Implementar consultas por id positivo e CNPJ válido na página de corretoras, com apresentação dos detalhes completos; verificar sucesso, validação local e `404` em testes de componente.

## 4. Fluxos de ações

- [x] 4.1 Migrar o cadastro de ação para Reactive Forms tipado e carregar as corretoras em uma seleção; verificar que ticker e corretora seguem as validações e que o request contém somente `ticker` e `corretoraId`.
- [x] 4.2 Adicionar ao cadastro estados de carregamento inicial, submissão, sucesso e erros gerais/por campo; verificar que falha ao carregar corretoras ou cadastrar não apaga dados válidos.
- [x] 4.3 Aprimorar a listagem com estados de loading, vazio, erro, nova tentativa e apresentação de corretora/data da cotação; verificar cada estado e campos opcionais em testes de componente.
- [x] 4.4 Implementar consultas de ação por id positivo e ticker válido na página de ações; verificar sucesso, bloqueio de entrada inválida e apresentação de `404`.
- [x] 4.5 Implementar a atualização de cotação a partir da lista/detalhe com loading por ação; verificar que sucesso substitui os dados visíveis e erro `502`/`503` preserva os valores anteriores.

## 5. Fluxos de operações

- [x] 5.1 Migrar o formulário de operação para Reactive Forms tipado, carregar ações em uma seleção e validar ação, quantidade inteira positiva e preço positivo somente para venda; verificar que compras e vendas inválidas não chamam o serviço.
- [x] 5.2 Integrar compra e venda ao formulário com estados de loading, sucesso e erro; verificar que a operação retornada é apresentada e que erros `400`/`409` preservam os valores preenchidos.
- [x] 5.3 Aprimorar a lista de operações com estados de loading, vazio, erro e formatação tolerante a valores financeiros nulos; verificar todos os estados com respostas simuladas.
- [x] 5.4 Implementar os filtros remotos de todas, compras e vendas; verificar que cada seleção chama exatamente seu endpoint e mantém o filtro após erro.
- [x] 5.5 Implementar histórico por ação selecionada; verificar chamada a `GET /operacoes/{acaoId}`, resultado vazio e erro de ação inexistente.
- [x] 5.6 Implementar busca de operação por id positivo e painel de detalhes; verificar validação local, operação encontrada e `404`.

## 6. Consistência da interface e navegação

- [x] 6.1 Padronizar alertas contextuais, indicadores de processamento, estados vazios e comandos de nova tentativa nas seis páginas; verificar que os elementos possuem texto observável e não dependem apenas de cor.
- [x] 6.2 Preservar as rotas atuais e atualizar navegação e títulos para tornar buscas, filtros e atualização de cotação descobríveis; verificar manualmente todos os links a partir da página inicial.
- [x] 6.3 Corrigir nos arquivos tocados qualquer texto português efetivamente corrompido e padronizar formatação de datas, moedas e números; verificar no build e nos testes de template que não aparecem `NaN`, `Invalid Date` ou caracteres mojibake.

## 7. Verificação final

- [x] 7.1 Substituir testes gerados ou superficiais por testes de componentes que cubram validação, loading, sucesso, vazio, erro, preservação de contexto e prevenção de submissão duplicada; verificar execução em navegador headless.
- [x] 7.2 Executar `npm test -- --watch=false --browsers=ChromeHeadless` e corrigir falhas até toda a suíte passar sem chamadas de rede reais.
- [x] 7.3 Executar `npm run build` e verificar que o build de produção termina sem erros de TypeScript, template ou orçamento.
- [x] 7.4 Executar busca final por `any` nos contratos/serviços, por URLs `http://localhost:8080` fora da configuração e por código de autenticação fictício; verificar que nenhuma ocorrência indevida permanece.
- [x] 7.5 Com o backend H2 iniciado e configurado pelo usuário, realizar smoke test manual dos fluxos de corretoras, ações e operações e registrar separadamente qualquer falha causada por credencial ou provedor externo, sem modificar o backend.
