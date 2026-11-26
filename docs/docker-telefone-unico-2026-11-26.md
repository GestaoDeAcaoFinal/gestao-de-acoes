# Publicação — telefone único — 26/11/2026

## Revisões e escopo

- Backend: `f6e151276786a6a81d84db7ce0dfb3585111506f`.
- Frontend: `c7b72ea59d1a03dac38ac19b82cb47ade2f94018`.
- Projeto Compose existente: `gestao-de-acao`; imagens locais reconstruídas e containers de aplicação recriados. O banco PostgreSQL no host e seus dados foram preservados. Nenhum volume foi removido e nenhuma imagem foi publicada em registry externo.

O backend normaliza o telefone antes de verificar a disponibilidade na criação e edição. Telefone de outra conta, inclusive inativa, é rejeitado com HTTP 409; o próprio número pode ser mantido. A migração 008 adiciona a restrição `uk_usuario_telefone`, preservando valores nulos legados e sem alterar a migração 007. Se já existirem duplicidades, a migração interrompe sem modificar registros automaticamente. O frontend reutiliza o tratamento de erros existente, sem alterações no layout, contratos, JWT ou permissões.

## Evidências de validação

- Teste de regressão antes da correção: a API aceitava cadastro repetido (201 em vez de 409) e o banco permitia a gravação.
- Maven `clean verify`: **389 testes**, zero falhas/erros/ignorados; JaCoCo **894/905 linhas (98,78%)** e **358/364 branches (98,35%)**, limites85/85 atendidos.
- Angular: **207 testes** aprovados e build de produção concluído; avisos preexistentes de depreciação Sass/Bootstrap continuam presentes.
- Playwright: **18 cenários** aprovados, incluindo conflitos na criação/edição e manutenção do próprio número em 1280px e390px. Banco H2 temporário e provedores simulados; nenhuma consulta a provedores reais.
- Smoke das imagens: Nginx, login JWT, autorização USER/ADMIN, revogação de sessão, telefone único com/sem máscara, proteção do último administrador e rotas SPA aprovados em containers temporários com H2. Recursos temporários removidos ao terminar.
- Fontes consolidadas conferidas contra os projetos individuais:118 arquivos backend em `src/` e89 frontend, sem diferenças de conteúdo, desconsiderando finais de linha.
- Banco existente antes da atualização: zero grupos de telefones duplicados. Backup custom PostgreSQL com catálogo conferido e imagens anteriores preservadas para rollback; não foi executado ensaio de restauração.
- Após a atualização: **5 usuários,23 ações,49 operações e7 corretoras**, mesmas contagens anteriores. CPF e telefone presentes; restrições de CPF e telefone únicos e migrações007/008 confirmadas.
- Aplicação servida: frontend HTTP200; APIs protegidas de ações e usuários retornam401 sem autenticação; labels das imagens correspondem às revisões acima. Os testes funcionais de escrita usaram exclusivamente bancos temporários, sem criar usuários ou operações no banco existente.

O CI remoto do backend passou. Os novos CIs do frontend e do conjunto possuem execução independente; consulte seus resultados no GitHub Actions. Resultados locais não significam automaticamente sucesso remoto. Os alertas de dependências preexistentes não foram auditados ou corrigidos nesta mudança.
