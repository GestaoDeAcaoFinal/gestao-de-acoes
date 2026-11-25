# Publicação Docker — 25/11/2026

O projeto Compose existente `gestao-de-acao` foi atualizado com as imagens locais reconstruídas dos snapshots:

- Backend: `4c27a0d47fadfcf9df1d37b4a05fb156d79f6126`.
- Frontend: `ac927af67e3e98ac3e6020a0075c27c52431afe0`.

Os containers de backend e frontend foram recriados no mesmo projeto, mantendo o PostgreSQL existente no host e suas configurações. Nenhum volume foi removido. Um backup PostgreSQL em formato custom foi gerado antes da atualização e seu catálogo foi conferido; não foi realizado ensaio de restauração.

## Validação executada

- Maven `clean verify`: 382 testes aprovados; cobertura de linhas 98,78% e de branches 98,34%, com limites 85/85.
- Angular: 207 testes aprovados e build de produção concluído.
- Playwright: 18 cenários aprovados, com H2 temporário e provedores simulados.
- Código de produção consolidado comparado com as origens: 77 arquivos backend e 89 frontend, sem diferenças de conteúdo, desconsiderando somente finais de linha.
- Aplicação publicada: frontend HTTP 200; endpoints protegidos de ações e usuários via proxy HTTP 401 sem autenticação.
- Bundles efetivamente servidos contêm CPF, telefone e tratamento `AGUARDANDO_COTA`; labels das imagens correspondem aos SHAs acima.
- Contagens antes e depois: 4 usuários, 18 ações, 49 operações e 5 corretoras.
- Schema: CPF e telefone presentes, restrição de CPF único e migração 007 confirmadas.

A primeira sondagem terminou antes de o backend concluir sua inicialização, que levou cerca de 49 segundos. A verificação repetida após a inicialização passou. Não houve alteração adicional de configuração para contornar esse prazo.

A otimização respeita a cota de chamadas da Twelve Data e mantém filas independentes por provedor. Não foram alteradas as regras de cadastro, validação ou classificação de tickers. Também foi corrigido o foco tardio do formulário de usuários, identificado no CI, com teste de regressão e nova execução completa dos testes de interface.

As verificações de publicação não enviaram consultas aos provedores reais nem criaram usuários ou operações no banco existente. Os testes automatizados com provedores simulados não comprovam disponibilidade nem cobertura dos provedores externos. Nenhuma imagem foi publicada em registry externo; as imagens foram construídas e executadas no Docker local.

Os CIs individuais do backend e frontend concluíram com sucesso. O CI deste repositório conjunto é disparado separadamente ao publicar o commit e deve ser consultado no GitHub Actions.
