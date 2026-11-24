# Validação da integração Angular com JWT e permissões

Data: 11/11/2026.

## Escopo entregue

- Login com o contrato `username/password → token/tipo/expiresIn`.
- Sessão por aba, logout, restauração e expiração automática com retorno ao login.
- Rejeição de resposta de login inválida, JWT incompleto e claims incompatíveis.
- Interceptor restrito à API, excluindo login e preservando Authorization já informado.
- Tratamento separado de 401 (autenticar novamente) e 403 (sem permissão).
- Rotas administrativas protegidas por sessão e papel ADMIN.
- Menu de usuários, cadastro de ação/corretora e atualização de cotação ocultos para USER.
- Cadastro/edição de usuários, alteração de papel/status e endpoint dedicado de senha.
- Validação de ticker alinhada ao backend.

## Evidências desta revisão

`npm.cmd test -- --watch=false --browsers=ChromeHeadless --progress=false`

Resultado mais recente (correções de 12/11/2026): 146 testes aprovados, nenhuma falha.

## Correções relatadas no uso da interface

- A troca de senha identifica usuário, ID, permissão e status; o formulário de cadastro fica oculto enquanto essa ação estiver selecionada.
- Ações, dashboard e carteira oferecem a ADMIN a ação explícita “Atualizar todas as cotações”. Ela reutiliza os PUT individuais em sequência, bloqueia clique repetido e informa sucesso/falha por ticker. Erros 401/403 interrompem a sequência. Falhas do provedor em um ativo não impedem atualizar os demais.
- “Recarregar dados/carteira” apenas relê o que já está salvo. Após a atualização das cotações, o componente recarrega o resumo automaticamente.
- A privacidade da carteira e a proteção do último ADMIN foram implementadas no backend, com testes integrados entre contas distintas. Não dependem da ocultação de elementos na interface.

Os testes verificam os templates renderizados para USER, o menu ADMIN, os guards das rotas
reais, os quatro contratos HTTP de usuários, a expiração, os erros de autorização e a
recuperação de formulários. Isso não substitui um teste E2E em navegador com as duas contas.

`npm.cmd run build`

Resultado: build de produção concluído. Bundle inicial de 451,27 kB, abaixo do orçamento
de aviso de 500 kB. A transferência estimada inicial é de 103,77 kB.

## Otimização para entrega

- As dez páginas usam `loadComponent` e são carregadas sob demanda; os guards foram mantidos.
- `src/bootstrap.scss` importa as partes usadas do Bootstrap: base, grid, tabelas,
  formulários, botões, cards, alertas, helpers e utilitários.
- O CSS global caiu de 240,12 kB para 148,09 kB.
- O bundle inicial caiu de 665,36 kB para 451,27 kB (aproximadamente 32%).
- Os testes continuam cobrindo navegação real pelo Router, permissões e estilos/acessibilidade.
- O teste `production-api.spec.ts` valida o login e as consultas autenticadas com a base `/api`.
- Permanecem avisos de depreciação do Sass usados pelo Bootstrap 5.3. O build não emite
  os antigos avisos de orçamento inicial nem de seletores CSS ignorados.
- Dockerfile e mapeamento Nginx foram inspecionados em 11/11. A execução em containers
  foi concluída em 12/11, conforme o registro abaixo.

## Validação Docker/Nginx em 12/11/2026

As imagens foram reconstruídas a partir dos arquivos atuais, sem substituir as imagens
anteriores nem publicar em um registry:

- Frontend: `codex-gestao-front:validation-20261112`, ID `6550999c702e`.
- Backend: `codex-gestao-back:validation-20261112`, ID `a5b25f0ebbbd`.

Foi criada uma rede Docker temporária com alias `app-host-postgresql` para o backend.
O nome reproduz o destino do Nginx, mas o banco do teste foi H2 em memória, com contas
e segredo JWT gerados só para esse teste. O PostgreSQL real e as contas existentes não
foram usados nesta validação. O frontend foi exposto somente em `127.0.0.1:4300`.

Resultados:

- `nginx -t`: configuração válida.
- Login em `/api/api/auth/login`: contrato JWT válido.
- Ações, corretoras, carteira e usuários pelo proxy: HTTP 200 autenticado.
- Ações sem token: HTTP 401.
- USER consulta ações e recebe HTTP 403 ao consultar a administração.
- Rotas diretas `/login`, `/carteira` e `/usuarios`: fallback para o HTML da SPA.
- JavaScript referenciado no HTML: servido com tipo de conteúdo JavaScript.

Os dois containers e a rede temporária foram removidos ao final; nenhum volume foi criado.
As imagens locais foram mantidas para reproduzir o teste. Docker é utilizado para validar
a entrega; o fluxo diário permanece com backend e Angular locais.

### Pendência identificada na instalação limpa

`npm audit --omit=dev --json` apontou 7 pacotes de produção sinalizados: 4 de severidade
alta e 3 moderada, sem alertas críticos nesse recorte. Os pacotes afetados pertencem ao
Angular. O npm sugere correções com mudança de versão principal, portanto nenhuma
atualização automática ou `npm audit fix --force` foi aplicada. A migração deve ser feita
em etapa própria, com verificação dos requisitos de Node/TypeScript e regressão dos testes.
Este registro comprova funcionamento e empacotamento, não aprovação para publicar com
as dependências atuais.

## Atualização de segurança para Angular 20 — 12/11/2026

O registro de alertas acima descreve a instalação anterior com Angular 19.
A atualização oficial `ng update @angular/core@20 @angular/cli@20 --allow-dirty`, executada
em modo CI, migrou o projeto para:

- Angular 20.3.35.
- Angular CLI e build-angular 20.3.42.
- TypeScript 5.9.3.
- Zone.js e Karma/Jasmine mantidos.

Antes da atualização, foi salvo um backup de `src`, arquivos npm/TypeScript/Angular,
README, Dockerfile e documentação. A comparação confirmou que o atualizador alterou
somente `package.json`, `package-lock.json` e `angular.json`; nenhum componente,
serviço, guard ou teste precisou de adaptação.

Verificações após a migração:

- Suíte Angular completa: 143 testes aprovados, nenhuma falha.
- Build de produção: concluído; bundle inicial de 462,54 kB, abaixo de 500 kB.
- `npm audit --omit=dev --json`: zero alertas em dependências de produção.
- `npm audit --json`: 34 alertas no conjunto completo (11 altos e 23 moderados,
  nenhum crítico). Permanecem nas ferramentas de desenvolvimento, não na árvore
  de dependências de produção. Isso requer avaliação própria, sem atualização forçada.
- `npm ls`: Angular, CLI e TypeScript instalados nas versões indicadas acima.

As imagens Docker identificadas anteriormente foram construídas antes desta migração.
Elas validam o snapshot Angular 19 e não devem ser confundidas com imagens Angular 20.
A próxima validação de entrega deverá reconstruí-las usando o novo lockfile.
O Dockerfile utiliza Node 22 Alpine; o Angular 20 requer Node 22.12 ou superior nessa linha.

O desenvolvimento diário continua local. O servidor Angular foi pausado para a instalação
das dependências e é reiniciado após as verificações. Nenhuma mudança no backend ou no
`.env` foi necessária para esta migração.

## Ajustes encontrados e corrigidos nesta revisão

- O erro de listagem de usuários era mantido depois de uma tentativa bem-sucedida.
- O formulário de usuário aceitava username composto somente por espaços.
- O formulário de login mantinha senha e estado de carregamento depois do sucesso.
- Um returnUrl apontando ao próprio login mantinha o usuário na tela de autenticação.

## Limites e cuidados para a entrega

- Nenhum commit, push ou publicação foi realizado nesta revisão.
- Os valores de ambiente, credenciais e JWT não fazem parte deste documento.
- A validação de entrada por perfil no backend foi informada pelo responsável pelo projeto.
- Os guards e templates controlam a interface; a autorização efetiva permanece no backend.
- Desde a consolidação de 12/11/2026, o backend verifica ID, versão de sessão, papel e status atuais em cada requisição. Trocar senha, username, papel ou status incrementa a versão e invalida tokens anteriores. Tokens sem `uid`/`sv` exigem novo login; reativação não revive sessões antigas.
- O proxy de produção mantém o mapeamento descrito no README, inclusive `/api/api/auth/login`.
- A validação autenticada da interface com contas reais ADMIN e USER não foi feita nesta revisão.

## Arquivos centrais

- `src/app/core/auth/`: sessão, modelos, guards e interceptor.
- `src/app/core/api/api-error.interceptor.ts`: mensagens e normalização HTTP.
- `src/app/app.routes.ts`, `src/app/app.component.*`: navegação e permissões.
- `src/app/pages/login/`, `src/app/pages/usuarios/`: formulários de autenticação e administração.
- `src/app/services/usuario.service.*`: contratos HTTP administrativos.
- `src/app/pages/acao-list/`, `src/app/pages/corretora-list/`: controles por perfil.
- `README.md`: execução local, endpoints, permissões e verificação.
