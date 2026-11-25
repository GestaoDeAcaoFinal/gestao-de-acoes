# Atualização Docker — 25/11/2026

Projeto Compose existente: `gestao-de-acao`. Foram reconstruídas as imagens `gestao-de-acao:local` e `gestao-acao-front:local` e recriados os dois containers de aplicação com os mesmos nomes de serviços. O PostgreSQL existente no host foi mantido; nenhum volume ou banco foi removido e nenhum projeto `nexo-capital` foi criado.

## Fontes utilizadas

- Backend: `3351184415b804024250347c4095bfeb47cfdbb6`.
- Frontend: `d8458e4cdf656dd0a5926e1e4dc31ad7b76f69e0`.

Os arquivos rastreados dos dois projetos foram sincronizados para `backend/` e `frontend/`, preservando as exclusões de metadados e ambientes locais. As revisões também constam em `.ci/upstream-revisions.json` e nos labels `org.opencontainers.image.revision` das imagens. As imagens anteriores receberam tags de retorno antes do build.

## Banco e validação

Antes da inicialização, foi criado um backup PostgreSQL em formato custom no diretório privado local `%LOCALAPPDATA%/GestaoDeAcao/Backups`; seu catálogo foi conferido com `pg_restore --list`. O backup e as credenciais não fazem parte do repositório. As configurações existentes dos containers foram reutilizadas somente em memória, sem exibição ou gravação em arquivos de ambiente.

Liquibase aplicou `007-cpf-telefone-usuario` com sucesso. Foram confirmadas as duas colunas novas e a restrição única `uk_usuario_cpf`. O login legado é preservado, e o próximo cadastro/edição exige CPF e telefone válidos.

Contagens antes e depois da atualização:

| Dados | Antes | Depois |
| --- | ---: | ---: |
| Usuários | 4 | 4 |
| Ações | 18 | 18 |
| Operações | 49 | 49 |
| Corretoras | 5 | 5 |

Frontend disponível em `http://127.0.0.1:4200/`, backend em `http://127.0.0.1:8080/`. A página inicial respondeu HTTP200; as rotas protegidas pelo proxy responderam HTTP401 sem credenciais. O JavaScript efetivamente publicado contém os novos campos de CPF e telefone, e os containers usam imagens com as revisões esperadas.

Não foram criadas contas nem operações de teste no banco real, nem feitas chamadas a provedores de cotação. O smoke automatizado com fixtures não foi executado nessa base; os testes funcionais da etapa anterior usaram H2 isolado. Não houve publicação de commits ou imagens em serviços remotos.
