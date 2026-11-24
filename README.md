# Gestão de Ações

[![CI](https://github.com/GestaoDeAcaoFinal/gestao-de-acoes/actions/workflows/ci.yml/badge.svg)](https://github.com/GestaoDeAcaoFinal/gestao-de-acoes/actions/workflows/ci.yml)

Aplicação para registrar compras e vendas de ações e acompanhar uma carteira individual de investimentos. Reúne uma interface Angular e uma API Spring Boot, com autenticação JWT, perfis ADMIN/USER e consolidação dos valores da carteira em reais.

Este repositório contém o sistema completo e sua execução com Docker Compose. O nome atual do projeto é **Gestão de Ações**; o repositório anteriormente se chamava `nexo-capital`.

## Funcionalidades

- **Visão geral:** indicadores calculados a partir das posições do usuário e composição por ativo, com interação por mouse, teclado e toque.
- **Carteira:** quantidade, preço médio, custo investido e valor atual das posições; ativos em moeda estrangeira são convertidos para BRL no resumo.
- **Ações:** listagem, pesquisa, detalhes, cadastro por ticker e consulta de cotações. A validação aceita símbolos tradicionais e classes como `BRK.A` e `BRK.B`.
- **Corretoras:** cadastro e consulta, com integração de dados cadastrais e validação na CVM.
- **Operações:** compra e venda, revisão antes da confirmação, validação de saldo e bloqueio de envios repetidos pela interface enquanto a requisição está em andamento.
- **Histórico:** filtros, consulta por ID e detalhes das operações, preservando a moeda do ativo e a precisão dos preços.
- **Usuários:** criação de contas, alteração de papel/status e troca de senha pelo ADMIN, com invalidação das sessões anteriores quando os dados de acesso são alterados.

A interface segue a direção **Portfolio Studio + Modular Workspace**, com Bootstrap, fonte Inter, ícones Lucide e adaptação para desktop e celular.

## Permissões e dados

O catálogo de ações e corretoras é compartilhado. **Operações, histórico e carteira pertencem à conta autenticada**, inclusive para o ADMIN: administrar o sistema não dá acesso à carteira de outra conta.

| Recurso | USER | ADMIN |
| --- | --- | --- |
| Consultar ações e corretoras | Sim | Sim |
| Registrar compra/venda e consultar carteira própria | Sim | Sim |
| Cadastrar ações e corretoras | Não | Sim |
| Atualizar cotações individuais ou todo o catálogo | Não | Sim |
| Administrar usuários e alterar suas senhas | Não | Sim |

O backend aplica as permissões e o isolamento dos dados. Guards e botões do Angular complementam a navegação. O último ADMIN ativo não pode ser desativado ou rebaixado. Os JWTs ficam no `sessionStorage` da aba; não há refresh token automático.

## Arquitetura e tecnologias

```text
Navegador → Nginx / Angular → API Spring Boot → PostgreSQL
                                  ↓
                         Integrações externas
```

| Camada | Tecnologias |
| --- | --- |
| Frontend | Angular 20, TypeScript, RxJS, Bootstrap 5, Inter e Lucide |
| Backend | Java 17, Spring Boot 4, Spring Security, JWT e Spring Data JPA |
| Persistência | PostgreSQL e migrações Liquibase |
| Execução | Docker Compose e Nginx como servidor da SPA e proxy da API |
| Testes | JUnit, JaCoCo, Jasmine/Karma e Playwright |

O backend também possui perfis H2 e MySQL. O Compose da raiz oferece PostgreSQL em container ou um PostgreSQL já existente no host.

```text
backend/                       API, regras de negócio, integrações e testes
frontend/                      aplicação Angular, Nginx e testes
compose.yaml                   execução conjunta
.env.example                   exemplo de configuração, sem credenciais reais
.ci/upstream-revisions.json    revisões dos projetos de origem
.github/workflows/ci.yml        verificação automatizada do conjunto
```

## Executar com Docker

Requisito: Docker Desktop com Docker Compose **2.20 ou superior**. Os exemplos abaixo usam PowerShell; no Linux/macOS, substitua `Copy-Item` por `cp`.

```powershell
git clone https://github.com/GestaoDeAcaoFinal/gestao-de-acoes.git
cd gestao-de-acoes
Copy-Item .env.example .env
```

**Antes de iniciar, edite o `.env`:** substitua as senhas de exemplo, configure um `JWT_SECRET` aleatório (recomendação: pelo menos 64 caracteres) e informe as chaves dos provedores que utilizará. O `.env` não é versionado nem incluído nas imagens.

```powershell
docker compose config --quiet
docker compose up -d --build --wait
docker compose ps
```

- Aplicação: [http://localhost:4200](http://localhost:4200)
- Backend: [http://localhost:8080](http://localhost:8080)

Entre com o usuário definido em `APP_ADMIN_USERNAME` e a senha configurada em `APP_ADMIN_PASSWORD`. No perfil usado pelo Compose, a conta inicial é criada se aquele username ainda não existir. Alterar a configuração não redefine a senha de uma conta existente.

### Banco em container ou banco existente

**Instalação nova:** o exemplo ativa `COMPOSE_PROFILES=postgresql`, iniciando um PostgreSQL separado, com dados no volume persistente `postgres-data`. Isso não importa o banco do IntelliJ. Se a porta 5432 estiver ocupada, altere `POSTGRES_PORT`.

**Usar o PostgreSQL já instalado no Windows:** remova `COMPOSE_PROFILES=postgresql` do `.env` e configure `DB_URL`, `DB_USERNAME` e `DB_PASSWORD` para o banco existente. A URL dentro do container deve usar o host do Docker Desktop, por exemplo `jdbc:postgresql://host.docker.internal:5432/gestaodeacao`.

```powershell
docker compose up -d --build --wait app-host-postgresql frontend
```

Nesse modo, apenas backend e frontend são iniciados. O grupo no Docker Desktop chama-se **`gestao-de-acao`**, com os serviços `app-host-postgresql` e `frontend`. As imagens locais são `gestao-de-acao:local` e `gestao-acao-front:local`. O banco do host e os volumes existentes não são removidos ao atualizar esses serviços.

### Configuração principal

| Variável | Finalidade |
| --- | --- |
| `JWT_SECRET`, `JWT_EXPIRATION`, `JWT_ISSUER` | Assinatura, duração e emissor dos tokens |
| `APP_ADMIN_USERNAME`, `APP_ADMIN_PASSWORD` | Administrador inicial |
| `TWELVE_DATA_API_KEY` | Cotações de ativos americanos e câmbio |
| `BRAPI_TOKEN` | Acesso à Brapi conforme o plano contratado |
| `COMPOSE_PROFILES=postgresql` | Ativa o banco em container; omitir para usar banco externo |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` | Configuração do banco em container |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Conexão a um banco externo |
| `APP_PORT`, `FRONTEND_PORT` | Portas locais; padrões 8080 e 4200 |

As variáveis da configuração de execução do IntelliJ não são herdadas automaticamente pelo Docker ou por outro terminal. Configure os provedores somente no backend, nunca no Angular. Se usar um arquivo externo com `--env-file`, informe esse mesmo argumento nos demais comandos Compose e ajuste a URL do banco para o contexto do container.

### Atualizar, acompanhar e encerrar

```powershell
git pull --ff-only
docker compose up -d --build --wait
docker compose logs -f
```

Para encerrar preservando os dados, use `docker compose down`. Para atualizar, não use `down --volumes`: essa opção apaga os volumes do projeto. Alterações nos arquivos só chegam à aplicação em container depois da reconstrução da imagem.

## Integrações e limites

Brapi e Twelve Data fornecem dados de mercado; BrasilAPI, ViaCEP e o cadastro de intermediários da CVM apoiam o cadastro de corretoras. O retorno depende da disponibilidade, credenciais, cobertura de símbolos e plano de cada serviço.

O botão de atualização geral, exclusivo do ADMIN, percorre o catálogo por meio das atualizações individuais. A configuração atual da Twelve Data respeita **8 créditos por minuto**, compartilhados entre cotações e câmbio, com intervalo de aproximadamente **7,6 segundos**. Um lote pode levar mais de um minuto. O câmbio válido é reutilizado por até cinco minutos; cotações que falham mantêm o preço e a data da última consulta válida.

A data de atualização indica uma consulta bem-sucedida, mesmo que o preço não tenha mudado. O controle de créditos é por instância: outros processos usando a mesma chave também consomem a cota. O sistema não oferece streaming contínuo de preços.

## Desenvolvimento e testes

Para desenvolver fora do Docker, utilize Java 17, Node.js 22 (a partir de 22.12) ou 24 e PostgreSQL configurado para o backend. O Maven Wrapper atende aos comandos do backend; os testes E2E também precisam de Maven no `PATH`.

Configure `backend/.env` com `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, JWT, administrador e provedores, incluindo `BRAPI_TOKEN`. Para o banco no Windows, a URL JDBC usa `localhost`, em vez de `host.docker.internal`. O `.env` da raiz serve ao Compose e não é importado automaticamente pela execução local dentro de `backend/`.

Com as portas 8080/4200 disponíveis, execute em terminais separados, a partir da raiz:

```powershell
# Terminal 1
cd backend
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
```

```powershell
# Terminal 2
cd frontend
npm ci
npm start
```

Se os containers da aplicação estiverem ocupando essas portas, pare somente `app-host-postgresql` e `frontend` antes de executar localmente. Mais detalhes no [README do frontend](frontend/README.md#executar-o-gestão-de-ações-localmente) e nas [configurações do backend](backend/src/main/resources/).

Testes e cobertura do backend:

```powershell
cd backend
.\mvnw.cmd verify
```

Em Linux/macOS, use `./mvnw verify`. Em outro terminal, testes e build do frontend:

```powershell
cd frontend
npm ci
npm test -- --watch=false --browsers=ChromeHeadless --progress=false
npm run build
```

Para testar o conjunto com navegador, execute dentro de `frontend/`, com as dependências instaladas:

```powershell
$env:E2E_BACKEND_DIR = (Resolve-Path ../backend).Path
npx playwright install chromium
npm run test:e2e
```

No Linux/macOS, defina `E2E_BACKEND_DIR` com o caminho absoluto de `backend/`. O launcher inicia seus próprios servidores e usa H2 temporário e provedores simulados. Os testes não validam a disponibilidade nem a cobertura dos serviços externos reais.

O [CI do conjunto](https://github.com/GestaoDeAcaoFinal/gestao-de-acoes/actions/workflows/ci.yml) executa `mvn verify`, cobertura, testes Angular, build, validação do Compose, E2E e smoke das imagens de produção. A validação funcional de **24/11/2026** aprovou **187 testes backend, 164 testes Angular e 15 cenários E2E**, além dos builds e do smoke Docker.

## Projetos de origem e documentação

| Repositório | Papel |
| --- | --- |
| [gestao-de-acoes](https://github.com/GestaoDeAcaoFinal/gestao-de-acoes) | Código conjunto e execução integrada com Docker |
| [backend](https://github.com/GestaoDeAcaoFinal/backend) | Desenvolvimento da API Spring Boot |
| [frontend](https://github.com/GestaoDeAcaoFinal/frontend) | Desenvolvimento da interface Angular |

As pastas `backend/` e `frontend/` são **cópias versionadas, não submódulos**. Esta consolidação usa backend `3d22b2c` e frontend `a6457a1`, com SHAs completos em [.ci/upstream-revisions.json](.ci/upstream-revisions.json). Novos commits nos repositórios separados precisam ser sincronizados explicitamente com este conjunto.

Referências detalhadas:

- [Endpoints, DTOs, permissões e prefixos da API](frontend/docs/contratos-atuais.md) — no proxy atual, login usa `/api/api/auth/login`; rotas financeiras usam `/api/acoes` e `/api/operacoes`.
- [Design system e interface Portfolio Studio](frontend/docs/redesign-portfolio-studio.md).
- [Testes ponta a ponta e seus limites](frontend/docs/validacao-e2e.md).
- [Controle da cota Twelve Data](backend/docs/limite-twelvedata.md).
- [Tickers com separadores](backend/docs/tickers-com-separadores.md).
