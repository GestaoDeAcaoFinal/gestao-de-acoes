# Entrega e integração contínua

O workflow `.github/workflows/ci.yml` valida pushes, pull requests e disparos manuais. Não faz deploy, publicação de imagens ou merge; usa permissões de leitura e ações oficiais fixadas em SHA completo.

O primeiro job usa Node 24, `npm ci`, testes Karma no ChromeHeadless e build de produção. O segundo baixa o backend público `GestaoDeAcaoFinal/backend` na revisão exata de `.ci/backend-ref.txt`, executa Playwright com Java 17 e H2 em memória, constrói as duas imagens e roda `npm run test:docker`.

## Desenvolvimento e Docker

Os arquivos locais abertos no IntelliJ são a fonte do projeto. O desenvolvimento pode continuar com Angular na porta 4200 e Spring Boot na 8080. O Docker serve para validar o pacote de produção com Nginx; uma imagem já construída só incorpora novas alterações depois de um novo build.

O cache persistente da CLI está desativado em `angular.json`. Nesta máquina, a execução com cache terminou com zero testes, inclusive após limpar o cache; com cache desativado, a mesma suíte executou os 148 testes. Essa medida evita a execução vazia observada, ao custo de recompilações mais lentas. A causa interna do problema no cache da ferramenta não foi determinada.

O teste Docker usa imagens locais, redes temporárias, banco H2 em memória e credenciais geradas durante a execução. Não monta volumes nem usa o PostgreSQL real. Apenas o Nginx expõe uma porta temporária em `127.0.0.1`; o backend permanece na rede interna. O script remove os recursos temporários ao encerrar, inclusive quando o início de um container falha.

Para repetir o teste, com Docker ativo:

```bash
docker build --tag gestao-backend:ci ../GestaoDeAcao
docker build --tag gestao-frontend:ci .
npm run test:docker
```

Se necessário, ajuste o caminho do backend. `BACKEND_IMAGE`, `FRONTEND_IMAGE` e `DOCKER_BIN` permitem selecionar imagens existentes e o executável do Docker. Os requisitos para os testes de navegador estão em [Validação E2E](validacao-e2e.md).

## Ordem de publicação

1. Publicar a branch do backend contendo a revisão registrada em `.ci/backend-ref.txt`.
2. Confirmar que esse commit está acessível no repositório público do backend.
3. Publicar a branch do frontend e acompanhar os dois jobs do workflow.
4. Revisar os resultados e os pull requests antes de integrar as branches.

Ao atualizar o contrato, valide os dois projetos em conjunto e atualize o SHA completo do backend no mesmo conjunto de alterações do frontend. O arquivo deve conter uma revisão com 40 caracteres hexadecimais, sem nome de branch flutuante.

## Evidências e limites

Na validação local da entrega de 12/11/2026, o backend teve 140 testes aprovados e cobertura validada; o frontend teve 148 testes aprovados e build de produção abaixo do orçamento inicial de 500 kB. Os nove testes E2E passaram. O teste das imagens confirmou proxy Nginx, login, proteção da API, restrição ADMIN/USER, revogação de sessões, proteção do último ADMIN e navegação direta da SPA. O caminho de falha ao iniciar um container também teve a limpeza verificada.

O [redesign de 13/11/2026](redesign-portfolio-studio.md) foi validado em execução local, com 157 testes, dez cenários E2E e build inicial de 483,38 kB. As imagens da validação anterior não incluem o redesign; para usá-lo no Docker, reconstrua a imagem do frontend a partir do código atualizado.

Esses resultados locais não representam uma execução no GitHub Actions. A validação remota depende da publicação dos commits, começando pelo backend. O workflow integrado usa dados fictícios e provedor simulado; ele não comprova disponibilidade, credenciais ou cobertura de tickers dos provedores reais de cotações.

Os relatórios E2E ficam como artefatos por sete dias. Logs locais, configurações do IntelliJ, `.env`, tokens, grafos e arquivos de ferramentas não fazem parte da entrega.
