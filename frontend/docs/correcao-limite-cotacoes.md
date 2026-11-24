# Atualização de cotações e limite Twelve Data — 18/11/2026

O lote anterior não coordenava a cota de cotações americanas e câmbio. A conta verificada tem8 créditos/minuto; nove ativos americanos mais USD/BRL podem ultrapassar a cota. A atualização individual funciona com mais frequência por espaçar as consultas. A quantidade exibida representa somente os sucessos daquela execução, e a hora registrada representa consulta válida, mesmo com preço igual ao anterior.

## Correção

- O backend compartilha um limitador entre quote e exchange_rate, com intervalo padrão7,6s. O lote internacional pode levar cerca de um minuto. Brapi não utiliza essa cota.
- Câmbio válido é reutilizado por até5min, sem fallback vencido. Falhas preservam cotação/timestamp das ações. HTTP/JSON429 tem orientação própria e503, sem invalidar JWT.
- Angular mostra progresso por ativo, mantém busy/botão bloqueado até terminar ou cancelar e faz uma única recarga final. Ao sair da tela, cancela as próximas chamadas do lote. Consultas já recebidas pelo backend podem concluir normalmente, pois são atualizações idempotentes de cotação.
- Botão de atualização geral também fica bloqueado durante carregamento da carteira/catálogo. Nenhum endpoint, schema ou cálculo de carteira foi alterado.

## Verificação

Angular164 testes e build483,67kB aprovados. Primeira suíte backend184 e gatesJaCoCo aprovados. Primeira execução E2E15/15 aprovada: inclui provedor que aplicaquota8 por janela, nove ativos americanos+câmbio, valores convertidos (2×USD100,25×5,25=R$1.052,63), uma única consulta de FX, zero429 acidentais e429 deliberado que mantém sessão e bloqueia nova chamada externa.

Revisão independente encontrou fila de cacheFX não interrompível/sem tempo máximo, corrigida com dois testes de regressão RED→GREEN; o prazo Retry-After passou a ser verificado diretamente, inclusive data futura. Resultado final: **187 testes backend e gatesJaCoCo aprovados**, **164 testes Angular e build aprovados**, **15 E2E aprovados novamente após a correção da revisão**. Nenhum teste pendente foi considerado aprovado.

## Arquivos envolvidos

Backend: `cliente/TwelveDataCliente.java`, `cliente/support/TwelveDataLimitador.java`, `cliente/support/ProvedorHttpExecutor.java`, exceções de indisponibilidade/limite e `application.properties`; testes de cliente, cache, limitador, preservação de cotação e launcherE2E.

Frontend: `services/acao.service.ts`, `pages/acao-list/atualizar-cotacoes.component.ts`, templates de Ações/Carteira/Visão geral, testes de serviço/componente e `e2e/fluxos.spec.ts`.

## Uso e limites

Os arquivos reais usados no IntelliJ estão atualizados. Reiniciar o backend para carregar o limitador; recompilar/recarregar o Angular para o feedback. Esta entrega é local, sem merge/push. Publicação futura exige backend atualizado e novo pin E2E de CI antes do frontend.

O controle é por processo/instância: não execute dois backends ou outros consumidores da mesma chave com orçamento8 cada. Consumo externo ou cota diária esgotada ainda podem causar429; o sistema informará e entrará em cooldown. Não houve nova consulta com credencial real durante a implementação; todos os novos testes usam H2 e integrações controladas.
