## Smoke test integrado — 2026-09-05

### Ambiente

- Frontend Angular local em `http://127.0.0.1:4200`.
- Backend local em `http://localhost:8080`, perfil `h2` e banco em memória.
- Nenhum arquivo do backend foi modificado.
- O navegador integrado não estava disponível na sessão. A integração real foi exercitada pelos mesmos contratos HTTP usados pelos serviços do frontend, complementando os testes dos componentes em Chrome Headless.

### Fluxos aprovados

- Cadastro enriquecido, listagem, busca por id e busca por CNPJ de corretora: HTTP 200.
- Cadastro, listagem, busca por id, busca por ticker e atualização de cotação de `PETR4`: HTTP 200.
- Compra de duas unidades e venda de uma unidade: HTTP 200.
- Listagem geral, filtros de compras e vendas, histórico por ação e busca de operação por id: HTTP 200.
- Resultado persistido no H2: 1 corretora, 1 ação e 2 operações, sendo 1 compra e 1 venda.

### Provedores externos e credenciais

- ViaCEP, BrasilAPI, cadastro CVM e Brapi responderam com sucesso no fluxo aprovado.
- O primeiro CNPJ candidato (`02.332.886/0011-78`) retornou HTTP 422 porque não constava como intermediário ativo no cadastro CVM atual. O comportamento foi corretamente apresentado como `ProblemDetail` e o dado não foi persistido.
- O fluxo brasileiro de `PETR4` não utiliza Twelve Data; portanto, nenhuma credencial desse provedor foi necessária ou validada neste smoke test.
