# Contratos atuais — 12/11/2026

Este documento descreve os controllers Spring Boot e os modelos TypeScript atuais. A proposta OpenSpec de integração inicial é histórica: autenticação JWT, administração de usuários e carteira individual foram acrescentadas depois dela.

## Endpoints do backend

As URLs abaixo são as recebidas pelo Spring Boot. Exceto login, todas exigem JWT Bearer válido e conta ativa. "Ambos" significa ADMIN e USER, cada um limitado às suas próprias operações/carteira.

| Método e rota | Acesso | Entrada | Saída |
| --- | --- | --- | --- |
| POST `/api/auth/login` | Público | JSON `username`, `password` | `TokenResponse` |
| GET `/api/usuarios` | ADMIN | — | `UsuarioResponse[]` |
| GET `/api/usuarios/{id}` | ADMIN | ID | `UsuarioResponse` |
| POST `/api/usuarios` | ADMIN | `UsuarioCreateRequest` | `UsuarioResponse`, 201 |
| PUT `/api/usuarios/{id}` | ADMIN | `UsuarioUpdateRequest` | `UsuarioResponse` |
| PUT `/api/usuarios/{id}/senha` | ADMIN | `AlterarSenhaRequest` | 204 |
| GET `/acoes` | Ambos | — | `Acao[]` |
| GET `/acoes/{id}` | Ambos | ID | `Acao` |
| GET `/acoes/ticker/{ticker}` | Ambos | Ticker | `Acao` |
| POST `/acoes` | ADMIN | `ticker`, `corretoraId` em JSON | `Acao` |
| PUT `/acoes/{id}/atualizar-cotacao` | ADMIN | ID | `Acao` atualizada |
| GET `/corretoras` | Ambos | — | `Corretora[]` |
| GET `/corretoras/{id}` | Ambos | ID | `Corretora` |
| GET `/corretoras/cnpj/{cnpj}` | Ambos | CNPJ | `Corretora` |
| POST `/corretoras` | ADMIN | `cnpj`, `cep` em JSON | `Corretora` |
| GET `/operacoes` | Ambos | — | `OperacaoAcao[]` do usuário |
| GET `/operacoes/carteira` | Ambos | — | `ResumoCarteira` do usuário |
| GET `/operacoes/{acaoId}` | Ambos | ID da ação | Histórico pessoal da ação |
| GET `/operacoes/compras` | Ambos | — | Compras pessoais |
| GET `/operacoes/vendas` | Ambos | — | Vendas pessoais |
| GET `/operacoes/buscar/{id}` | Ambos | ID da operação | Operação própria ou 404 |
| POST `/operacoes/comprar/{acaoId}` | Ambos | Query `quantidade`, `precoCompra` opcional | Operação criada |
| POST `/operacoes/vender/{acaoId}` | Ambos | Query `quantidade`, `precoVenda` | Operação criada |

"Atualizar todas as cotações" é uma sequência no frontend dos PUT individuais; não existe endpoint de lote. Falhas de um provedor são apresentadas por ticker. Quantidades são inteiros positivos e os preços informados devem ser positivos.

## DTOs e modelos

- `TokenResponse`: `token`, `tipo` (`Bearer`), `expiresIn` em segundos. Não contém refresh token.
- `UsuarioCreateRequest`: `username`, `password`, `papel` (`ADMIN`/`USER`).
- `UsuarioUpdateRequest`: `username`, `papel`, `ativo`. Senha tem endpoint próprio.
- `AlterarSenhaRequest`: `password`.
- `UsuarioResponse`: `id`, `username`, `papel`, `ativo`; sem senha/hash ou versão de sessão.
- `Acao`: `id`, `ticker`, `nomeEmpresa`, `mercado`, `moeda`, `cotacaoAtual`, `dataHoraCotacao`, `corretoraRelacionada`.
- `Corretora`: identificação, CNPJ, nomes, endereço/contato, situação cadastral, validação CVM e data de cadastro. Campos externos podem ser nulos.
- `OperacaoAcao`: `id`, `quantidade`, `precoUnitario`, `precoMedio`, `lucroPrejuizo`, `dataOperacao`, `valorTotal`, `tipoOperacao`, `acao`. O proprietário é atribuído pelo servidor e não é serializado.
- `ResumoCarteira`: `posicoes`, `quantidadeTotal`, `precoMedioCarteira`, `custoTotalCarteira`, `valorAtualCarteira`.
- `PosicaoCarteira`: `acaoId`, `ticker`, `quantidadeAtual`, `precoMedio`, `custoTotal`, `cotacaoAtual`, `valorAtual`.

Operações e cotações individuais usam a moeda do ativo; o resumo da carteira converte valores para BRL no backend. Os modelos TypeScript completos ficam em `src/app/core/api/api.models.ts` e `src/app/core/auth/auth.models.ts`.

## Autorização e sessão

O catálogo de ações/corretoras é compartilhado. Operações e carteira são particulares mesmo para ADMIN; outra conta não consulta nem vende sua posição. Não é permitido deixar o sistema sem ADMIN ativo.

JWT contém identidade (`sub`, `uid`), papel, expiração e versão (`sv`). Cada requisição verifica o cadastro atual. Alterar senha, username, papel ou status incrementa a versão e exige novo login para tokens anteriores. Reativar a conta não revive esses tokens. A verificação efetiva ocorre no backend; guards e botões Angular servem à navegação.

Falha de autenticação no sistema retorna 401 e encerra a sessão do frontend. Falha de permissão retorna 403. Uma resposta 401/403 da Brapi é convertida em 502 de integração, para não encerrar o login do investidor. Erros com `ProblemDetail` usam `title`, `status`, `detail` e, quando disponível, `errors`; respostas sem corpo recebem mensagem de fallback no frontend.

## URLs vistas pelo Angular

Desenvolvimento normal usa diretamente `http://localhost:8080`. Em produção e no ambiente E2E, a base é `/api` e o proxy remove um prefixo. Portanto o login passa por `/api/api/auth/login`; as operações passam por `/api/operacoes`. Não alterar um prefixo isoladamente.

Validação automatizada, limitações dos provedores simulados e execução local: [Validação E2E](validacao-e2e.md).
