# Tickers e usabilidade — 16/11/2026

## Correção funcional

A restrição estava no Angular (cadastro e consulta direta), no DTO, no normalizador e na validação de parâmetro da rota de busca do backend. Todos aceitavam apenas letras/números. A última restrição foi identificada pelo E2E após o cadastro ter passado. O cliente Twelve Data já envia o ticker por `queryParam("symbol", ticker)`, sem precisar trocar ou retirar o ponto.

O contrato passa a aceitar de 1 a 12 caracteres, com pelo menos uma letra ASCII, em blocos alfanuméricos separados por ponto. Exemplos: `PETR4`, `AAPL`, `BRK.A`, `BRK.B`. Rejeitados: `.BRK`, `BRK.`, `BRK..B`, `BRK/B`, `BRK-B`, `BRK&B`, espaço interno e parâmetros de URL. Não foram liberados formatos de outros instrumentos nem aliases com hífen.

Espaços externos são removidos; caixa é normalizada para maiúsculas. `BRK.A` e `BRK.B` são ativos distintos; `brk.b` e `BRK.B` são o mesmo ticker para busca e unicidade. A checagem de duplicidade antes da API e a restrição única no banco continuam existentes. Nenhuma migração é necessária.

Referência oficial: a [documentação Twelve Data](https://twelvedata.com/docs/llms/fundamentals/profile.md) usa explicitamente `BRK.A`/`BRK.B` com ponto. Os testes HTTP verificam a URL exata do endpoint `/quote`. Disponibilidade e permissões da conta do provedor real não foram testadas; uma validação sintática não garante a existência de qualquer símbolo.

## Interface

- Histórico mantém as consultas existentes Todas/Compras/Vendas/por ativo, acrescentando pesquisa por ticker, empresa ou ID e período com limites inclusivos. A pesquisa local atua nos resultados da consulta selecionada; não representa pesquisa global ou paginação de servidor.
- Período invertido tem mensagem acessível. Limpar filtros restaura Todas e limpa texto, datas e ativo. Retry do histórico reutiliza o ativo efetivamente consultado, mesmo se o select tiver sido alterado depois.
- Desktop mantém os campos financeiros da tabela. Abaixo de 1100 px, ativo, data resumida, tipo, total e botão Detalhes têm prioridade; quantidade, preço com precisão original, data/hora, preço médio e resultado continuam nos detalhes expansíveis de cada operação.
- Consulta por ID fica em seção secundária recolhível. Filtros, navegação e ações têm alvos de toque e estados de foco; a identidade visual e Bootstrap são preservados.
- Não há soma entre moedas, alteração das operações, autenticação, regras financeiras ou endpoints. Nenhuma nova dependência/componente genérico.

## Arquivos principais

Frontend: `core/api/ticker-format.ts`; `pages/acao-form/*`; `pages/acao-list/acao-list.component.ts` e teste; `pages/operacao-list/*`; `app.component.css`; `e2e/fluxos.spec.ts`.

Backend: `validation/TickerNormalizer.java`, `domains/dtos/AcaoRequestDTO.java`, `resources/AcaoResource.java` e testes de DTO, normalizador, rota MVC, serviço, cliente HTTP e launcher E2E. Apenas os três primeiros são código de produção.

## Validação

- Angular: 162 testes aprovados; build de produção aprovado, 483,67 kB iniciais.
- Backend: `mvn verify` final, 157 testes aprovados e limites de cobertura JaCoCo atendidos, incluindo a rota de busca corrigida.
- Build de produção inspecionado em oito telas e quatro larguras (320/390/768/1280 px): sem overflow do documento, revisão/POST único, pesquisa/detalhes, menu, foco, gráfico com mouse/touch e rolagem vertical preservados. Todas as requisições foram interceptadas com dados sintéticos.
- E2E final: 13 cenários aprovados com Chrome local, Angular/Spring reais, H2 temporário e provedor controlado. Inclui cadastro, busca, atualização e duplicidade de BRK.A/BRK.B; histórico; navegação ADMIN/USER em quatro larguras; regressões de sessão, compra/venda e proteção das carteiras. A rota de busca foi retestada após a correção.
- Primeira tentativa E2E não abriu o browser por ausência do Chromium gerenciado. Reexecução usa `PLAYWRIGHT_CHANNEL=chrome`, já suportado pela configuração. QA auxiliar em 127.0.0.1:4200 recebeu conexão recusada e não serve como evidência de aprovação.

Os testes usam contas sintéticas, H2 temporário e provedor HTTP controlado. Não cadastram ativos nem operações no banco real, não exibem valores de `.env` e não dependem de credenciais externas.

## Entrega

Esta correção exige frontend e backend atualizados. Alterações locais nos diretórios usados pelo IntelliJ, sem merge/push. Antes de publicar o frontend em CI, publique a correção do backend e atualize `.ci/backend-ref.txt` para a revisão remota correspondente; a referência remota anterior não inclui este suporte. Reinicie o backend local se estiver executando uma compilação anterior.
