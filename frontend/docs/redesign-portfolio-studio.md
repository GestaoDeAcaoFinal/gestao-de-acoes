# Interface Portfolio Studio + Modular Workspace

O redesign aprovado usa o nome provisório **Gestão de Ações**. Prioriza navegação horizontal, tipografia Inter, superfícies claras, tabelas editoriais e a distribuição interativa da carteira. Bootstrap 5.3 e os componentes, serviços e contratos existentes foram preservados.

## Estilos e dependências

O ponto de entrada continua sendo `src/styles.css`, carregado depois de `src/bootstrap.scss`:

- `styles/tokens.css`: cores semânticas, espaçamentos e aliases usados pelas telas existentes.
- `styles/patterns.css`: padrões estruturais de formulários, filtros, tabelas e feedback já utilizados no projeto.
- `styles/base.css`: tipografia, controles nativos/Bootstrap, foco e movimento reduzido.
- `styles/editorial.css`: aparência final compartilhada dos padrões. Ajustes exclusivamente locais permanecem no CSS da página.

Os textos secundários usam `#52635A`; nomes, títulos e valores usam `#1D2925`. O dourado `#C2A46D` é apenas um acento, sem uso como texto pequeno sobre fundo claro. A indicação de status também contém texto, não depende apenas de cor.

Inter é fornecida localmente por `@fontsource/inter@5.3.0`, com pesos 400, 500, 600 e 700. Não há dependência de Google Fonts em tempo de execução. `lucide-angular@1.0.0` usa os dados dos ícones selecionados via `[img]`; não registrar o catálogo inteiro. A alternativa `@lucide/angular@1.72.0` foi avaliada, mas atingiu o limite de heap de 2 GB neste ambiente durante a compilação. Angular permanece na versão 20.3.

## Navegação e dados

A navegação mantém Visão geral, Carteira, Ações, Corretoras e Operações. Usuários fica no menu da conta, exclusivamente para ADMIN. O menu fecha com Escape, clique externo ou navegação; Escape devolve foco ao botão. A rota e o backend continuam responsáveis por autorizar o acesso.

No celular, a navegação horizontal pode rolar sem ampliar a página. Ações mostra ativo, cotação e o botão textual **Detalhes**; o painel expandido preserva ID, empresa, mercado/moeda, corretora, data da cotação e atualização individual. Tabelas extensas de carteira, histórico e corretoras preservam todas as colunas com rolagem contida e indicação visível. Usuários mantém ações textuais Editar/Alterar senha e status legível.

Os indicadores da carteira usam os valores consolidados em BRL recebidos da API. O resultado nominal é a diferença entre valor atual e custo das posições abertas. Para ativos internacionais, o backend converte também o custo pelo câmbio atual; a interface não apresenta esse indicador como retorno histórico completo. Não foram adicionados gráficos de evolução, dividendos ou índices sem dados correspondentes.

A distribuição por ativo mantém a mesma geometria proporcional. Mouse sobre segmentos/legenda, foco de teclado e toque selecionam a posição; o deslizamento horizontal usa pointer capture e `touch-action: pan-y`, preservando a rolagem vertical. A legenda oferece alvos maiores para posições pequenas.

## Compra e venda

1. **Preencher:** formulário reativo com validações existentes, quantidade inteira e preço positivo. A precisão do preço unitário aceito pela API é preservada, inclusive em cotações automáticas com mais de duas casas decimais. A cotação sugerida de compra pode ser editada.
2. **Revisar:** nenhum POST é enviado. Uma cópia imutável dos valores primitivos congela ativo, tipo, quantidade, moeda e preço. O resumo e o total refletem essa revisão; os controles ficam bloqueados. O preço é multiplicado pela quantidade antes do arredondamento visual do total. Exemplo: 100 ações a 35,125 resultam em 3.512,50; o preço enviado permanece 35,125.
3. **Confirmar:** somente o botão explícito envia a requisição. A trava síncrona impede cliques/Enter repetidos durante o envio; após sucesso, outro envio exige iniciar **Nova operação** explicitamente.
4. **Erro:** mensagens de validação/autorização/saldo do backend são preservadas. Em erro de conexão ou 5xx, o resultado é tratado como incerto; não existe repetição automática, e o usuário é orientado a consultar o histórico antes de registrar novamente. Voltar e editar invalida a revisão anterior.

Esse bloqueio é por instância do formulário. Garantia global de processamento único entre abas, recargas ou requisições independentes requer idempotência no backend, que não foi adicionada neste redesign.

## Verificação

- Baseline anterior: 148 testes; resultado final: **157 testes aprovados**. A revisão independente acrescentou regressões para preço fracionário digitado/automático e retorno do foco, executadas primeiro com falha e depois aprovadas.
- Build de produção: inicial de **483,38 kB**, abaixo do orçamento de aviso de 500 kB. Permanecem avisos de depreciação Sass do Bootstrap.
- Conferência visual das oito telas em 1280, 768, 390 e 320 px, com API interceptada por dados fictícios; revisão dos valores, POST único e interações de mouse/foco/toque aprovados. Essa conferência complementa os testes integrados reais, sem substituí-los.
- **Dez cenários Playwright aprovados**, incluindo precisão do preço persistida e foco no fluxo completo. O helper de compra/venda foi atualizado para revisar e confirmar. Os testes integrados usam o backend Spring com H2 e provedor simulado; não usam contas ou dados do banco real.

Nenhum endpoint, DTO, regra de negócio, mecanismo JWT ou arquivo do backend foi alterado. O frontend continua apenas local até autorização de publicação.
