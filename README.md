# Gestão de Ações

Aplicação full stack para gestão de corretoras, ações e operações de compra e venda, com consolidação da carteira em reais e preservação da moeda local no histórico.

## Tecnologias

- Angular 20, Bootstrap, Inter, Lucide e Nginx
- Java 17 e Spring Boot
- PostgreSQL 17 e Liquibase
- Docker Compose

## Início rápido com Docker

Requisito: Docker Desktop com Docker Compose 2.20 ou superior. O nome técnico do repositório e do projeto Compose continua `nexo-capital`; a interface usa Gestão de Ações.

```powershell
git clone https://github.com/GestaoDeAcaoFinal/nexo-capital.git
cd nexo-capital
Copy-Item .env.example .env
# Edite o .env: defina JWT_SECRET aleatório, senha ADMIN e chaves dos provedores.
docker compose config --quiet
docker compose up -d --build --wait
docker compose ps
```

No Linux ou macOS, substitua `Copy-Item` por `cp`.

- Frontend: http://localhost:4200
- Backend: http://localhost:8080
- API pelo proxy: http://localhost:4200/api/operacoes/carteira (exige autenticação)

O `.env.example` ativa `COMPOSE_PROFILES=postgresql`, criando um PostgreSQL separado em volume persistente. Ele não importa o banco do IntelliJ. Se já houver PostgreSQL na porta 5432, altere `POSTGRES_PORT` ou use o banco do host conforme abaixo.

### Usar o banco existente no Windows

No `.env` local, remova `COMPOSE_PROFILES=postgresql` e configure `DB_URL=jdbc:postgresql://host.docker.internal:5432/gestaodeacao`, `DB_USERNAME` e `DB_PASSWORD` com as configurações do banco atual. Mantenha JWT, administrador e provedores configurados. Execute `docker compose up -d --build --wait app-host-postgresql frontend`. Somente backend e frontend serão iniciados; o banco do host será preservado. Não execute simultaneamente outro backend usando a mesma chave de cotações.

Para acompanhar os logs:

```shell
docker compose logs -f
```

Para encerrar preservando os dados:

```shell
docker compose down
```

Use `docker compose down --volumes` somente quando quiser apagar o banco local.

## Variáveis de ambiente

O arquivo `.env` não é versionado. Os exemplos de JWT e senha devem ser substituídos antes do uso. Configure `TWELVE_DATA_API_KEY` para ativos americanos e `BRAPI_TOKEN` para o acesso contratado à Brapi. Tokens não são incluídos nas imagens. O administrador inicial só é criado quando necessário; a configuração não redefine senhas de contas já existentes.

### Atualizar a instalação

```shell
git pull --ff-only
docker compose up -d --build --wait
```

O rebuild usa os arquivos atuais e recria os serviços quando necessário, preservando volumes. Não use `down --volumes` para atualizar.

## Testes

Backend:

```powershell
cd backend
./mvnw test
```

No Windows, também é possível usar `mvnw.cmd test`.

Frontend:

```shell
cd frontend
npm ci
npm test -- --watch=false --browsers=ChromeHeadless --progress=false
npm run build
```

O CI executa `mvn verify` com cobertura, testes Angular, build, testes ponta a ponta e smoke de produção em Docker. As integrações de teste usam dados fictícios, sem chaves reais ou o banco de desenvolvimento.

## Versões de origem

Esta entrega reúne as masters de backend `3d22b2c` e frontend `a6457a1`, registradas com SHA completo em `.ci/upstream-revisions.json`. Contém autenticação JWT, perfis ADMIN/USER, carteiras individuais, validação de tickers com ponto, proteção da cota Twelve Data e o layout Portfolio Studio. Os diretórios são cópias versionadas, não submódulos; alterações futuras nos repositórios separados precisam ser sincronizadas novamente. Metadados `.github/`, `.superpowers/`, `.agents/`, `.claude/` e `.vscode/` das origens são excluídos; o CI conjunto fica na raiz. Quatro documentos legados OpenSpec receberam somente normalização de linhas vazias finais.

## Estrutura

```text
backend/      API Spring Boot, persistência e integrações externas
frontend/     interface Angular e proxy Nginx para a API
compose.yaml  ambiente full stack reproduzível
```
