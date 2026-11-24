## Context

O projeto é uma aplicação standalone em Angular 19.2 com Bootstrap 5.3, `provideHttpClient()` e seis páginas: cadastro e listagem de corretoras, cadastro e listagem de ações e cadastro e listagem de operações. Os três serviços usam `any` e repetem URLs absolutas. Os formulários são template-driven, recebem identificadores manualmente e os testes atuais verificam quase somente a criação de componentes e serviços.

O backend Spring Boot expõe 16 operações sem autenticação: 5 de ações, 4 de corretoras e 7 de operações. Requests inválidos e falhas de domínio usam `application/problem+json`, com `status`, `title`, `detail` e, para validação, `errors` por campo. A matriz observável de falhas inclui `400`, `404`, `409`, `422`, `502` e `503`. As entidades retornam relacionamentos aninhados: ação contém `corretoraRelacionada` e operação contém `acao`.

O desenho segue as capacidades descritas nas specs desta change e não pressupõe nenhuma alteração do backend.

## Goals / Non-Goals

**Goals:**

- Estabelecer uma fronteira HTTP tipada e centralizada para os 16 endpoints.
- Evoluir incrementalmente as páginas existentes, preservando rotas e familiaridade visual.
- Tornar validação e estados assíncronos explícitos, consistentes e testáveis.
- Manter o código preparado para receber autenticação futura sem introduzi-la antes de existir um contrato no backend.

**Non-Goals:**

- Alterar endpoints, payloads, entidades, CORS, persistência ou regras de negócio do backend.
- Criar login, armazenar token ou implementar autorização fictícia.
- Introduzir biblioteca externa de gerenciamento de estado ou refazer todo o design visual.
- Implementar paginação, exclusão ou edição, pois esses contratos não existem na API atual.
- Executar testes end-to-end contra provedores externos reais.

## Decisions

### 1. Evolução incremental das páginas existentes

As seis páginas existentes serão preservadas e aprimoradas. As listagens concentrarão busca, detalhes e ações contextuais: a lista de ações terá busca por id/ticker e atualização de cotação; a de corretoras terá busca por id/CNPJ; a de operações terá os filtros de todas/compras/vendas/histórico por ação e busca por id. Formulários de ação e operação carregarão seleções de entidades em vez de exigir que o usuário memorize identificadores.

Alternativas consideradas: uma tela nova para cada endpoint aumentaria navegação e duplicação; uma reescrita completa com novo layout ampliaria o risco sem agregar contrato funcional.

### 2. Modelos separados para transporte e domínio

Serão criadas interfaces para `CorretoraRequest`, `AcaoRequest`, `Corretora`, `Acao`, `OperacaoAcao`, `TipoOperacao`, `ProblemDetail` e o mapa de erros por campo. Os métodos dos serviços declararão `Observable<T>` específico. Requests não reutilizarão entidades de response, evitando enviar campos enriquecidos e relacionamentos por acidente.

Alternativa considerada: manter objetos estruturais locais ou `any` é mais curto, mas impede que divergências do contrato sejam detectadas em compilação e nos testes.

### 3. URL base por token de injeção e configuração de ambiente

Um `InjectionToken<string>` representará a URL base e será provido pela configuração da aplicação a partir do ambiente de build. Os serviços comporão somente caminhos relativos de domínio. Desenvolvimento usará `http://localhost:8080`; outros ambientes poderão substituir o valor por file replacement ou configuração equivalente do Angular.

Alternativa considerada: proxy local simplifica CORS durante desenvolvimento, mas não resolve sozinho a configuração de builds implantados. O token mantém os serviços testáveis e independente da origem final.

### 4. Formulários reativos tipados

Os três formulários e as entradas de busca usarão Reactive Forms com validações equivalentes ao contrato público do backend: ticker alfanumérico de 1 a 12 caracteres com ao menos uma letra; CNPJ e CEP nos formatos aceitos; ids, quantidade e preço positivos; quantidade inteira. Erros de servidor por campo serão combinados com os erros locais sem apagar os valores preenchidos.

Alternativa considerada: manter `ngModel` exigiria lógica de validação espalhada e tornaria estados e testes menos previsíveis.

### 5. Normalização central de erros HTTP

Um interceptor funcional registrado com `provideHttpClient(withInterceptors(...))` converterá `HttpErrorResponse` em uma representação uniforme de erro da aplicação, preservando `ProblemDetail` válido e produzindo fallback estável para falha de rede ou corpo incompatível. Componentes continuarão responsáveis por decidir onde apresentar a mensagem e como associar `errors` aos campos.

Não haverá interceptor de autenticação nesta change. A cadeia funcional permite acrescentá-lo futuramente quando o backend definir o esquema de segurança.

Alternativas consideradas: tratamento integral em cada componente causaria duplicação; um serviço global que exibisse alertas automaticamente reduziria o controle de contexto e dificultaria testes.

### 6. Estado assíncrono local e explícito

Cada página manterá estados simples e tipados para `loading`, `success`, `error` e resultado/vazio. Não será adicionada biblioteca global de estado: os fluxos são independentes e de baixa complexidade. Submissões bloquearão apenas o comando relacionado; filtros e valores permanecerão disponíveis após falha.

Alternativa considerada: NgRx ou solução semelhante adicionaria estrutura desproporcional ao tamanho atual da aplicação.

### 7. Testes em camadas sem rede real

Os serviços serão testados com as utilidades de teste HTTP do Angular, verificando método, URL, query parameters, corpo e resposta/erro. Componentes serão testados com doubles dos serviços para validar formulários, seleção de entidades, loading, sucesso, vazio, erro e atualização da tela. O build de produção e a suíte unitária serão gates finais.

Os testes não alegarão integração de rede real: são testes de integração entre o cliente Angular e o contrato HTTP simulado. Uma verificação manual opcional poderá usar o backend H2 local após as suítes automatizadas.

### 8. Compatibilidade e codificação

Textos visíveis e arquivos modificados permanecerão em UTF-8, corrigindo textos com caracteres portugueses que estejam efetivamente corrompidos. Formatação de data, moeda e números tolerará valores nulos previstos nos responses.

## Risks / Trade-offs

- [Contrato baseado diretamente em entidades JPA] → Modelar somente os campos observados no backend atual, cobrir relações aninhadas por teste e atualizar os tipos quando o backend versionar DTOs de response.
- [CNPJ pontuado em segmento de URL] → Aplicar codificação segura do segmento e testar os formatos com e sem pontuação.
- [Provedores externos podem atrasar cadastros e cotações] → Mostrar loading específico, impedir duplicidade e preservar os valores anteriores em erro.
- [Validação do frontend pode divergir da validação futura do backend] → Tratar o backend como autoridade, espelhar somente regras públicas atuais e continuar exibindo `ProblemDetail`.
- [Ausência de autenticação] → Não simular segurança; documentar explicitamente a lacuna e manter a configuração HTTP extensível.
- [Testes Karma dependem de navegador disponível] → Manter testes unitários determinísticos e registrar separadamente qualquer limitação do ambiente de execução.

## Migration Plan

1. Introduzir configuração, modelos e camada compartilhada de erros mantendo as rotas atuais.
2. Completar e testar os três serviços HTTP antes de migrar componentes.
3. Migrar corretoras, ações e operações para formulários reativos e estados tipados, um domínio por vez.
4. Adicionar os fluxos ausentes às páginas existentes e manter compatibilidade das rotas atuais.
5. Executar testes unitários e build; depois validar manualmente, se desejado, contra o backend H2 local.

Rollback: como não há mudança no backend nem migração de dados, a reversão consiste em restaurar os arquivos do frontend anteriores à change. A API permanece compatível durante toda a implementação.
