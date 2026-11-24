# Validação ponta a ponta

Última consolidação em 18/11/2026: **164 testes Angular e 15 cenários E2E aprovados**, com build de produção de 483,67 kB. Backend: **187 testes aprovados por `mvn verify`**, incluindo os gates de cobertura. E2E executado com Chrome local, Angular/Spring reais, H2 temporário e provedor controlado que agora aplica limite compartilhado8 créditos por janela. Cadastro/busca/cotação/duplicidade de BRK.A/BRK.B, navegação ADMIN/USER em320/390/768/1280px e nove ativos americanos+câmbio aprovados. Detalhes em [correção do limite de cotações](correcao-limite-cotacoes.md).

Esta suíte usa o Angular e o Spring Boot reais, com dados sintéticos e banco H2 em memória. As APIs de cotação são simuladas por um servidor HTTP do launcher Java; não há uso de chaves reais ou requisições financeiras externas.

## Executar

Requer Node compatível com o Angular do projeto, Java 17 e Maven no PATH. O projeto backend atualizado deve estar ao lado do frontend, no diretório `../GestaoDeAcao`. Se estiver em outro local, configure `E2E_BACKEND_DIR`.

```powershell
npm.cmd ci
# Para usar o Google Chrome já instalado neste computador:
$env:PLAYWRIGHT_CHANNEL='chrome'
npm.cmd run test:e2e
```

Para Chromium gerenciado pelo Playwright, instale-o com `npx playwright install chromium` e deixe `PLAYWRIGHT_CHANNEL` sem configuração. Em Linux, o comando de instalação pode precisar de `--with-deps`.

O comando inicia e encerra seus servidores automaticamente. Portas reservadas: Angular `4300`, backend `18080`, provedor simulado `19090`. Portas ocupadas causam falha: servidores existentes nunca são reutilizados. A aplicação normal em `4200`/`8080` não precisa ser interrompida para executar E2E.

## Isolamento e limites

- `E2eApplication` está em `src/test/java` do backend e não entra no JAR de produção.
- Antes de iniciar o Spring, o launcher desativa importação de `.env`, força perfil H2, banco em memória com nome aleatório e propriedades de integração locais. O processo não herda as variáveis de credenciais do usuário.
- A chave de assinatura JWT é gerada em memória. A conta inicial e as senhas escritas na suíte são exclusivamente exemplos de teste, recriados a cada execução.
- Cada teste cria seus próprios usuários. O catálogo é comum ao processo; os testes não reutilizam operações de outras contas.
- Os contratos simulados cobrem somente as cotações exercitadas. Chamadas imprevistas recebem 501; ERRO3 recebe 401 de propósito. Isso não comprova disponibilidade, plano ou credenciais das APIs reais.
- Não há captura de trace/vídeo nem arquivo de storageState com tokens. Screenshots e relatório HTML usam apenas dados sintéticos e ficam ignorados pelo Git em `test-results/` e `playwright-report/`.
- O proxy E2E reproduz os prefixos de produção: `/api/acoes` → `/acoes`; `/api/api/auth/login` → `/api/auth/login`.

## Cenários

1. Login inválido/válido, rota protegida e restrições USER no navegador e na API.
2. Último ADMIN não pode ser rebaixado ou desativado pela interface.
3. Troca de senha identifica o usuário, invalida o token anterior e permite novo login.
4. Compra fica somente na carteira do proprietário, inclusive perante outra conta ADMIN. Histórico, filtros e consulta por ID também são protegidos; outra conta não pode vender a posição.
5. Venda acima do saldo preserva os dados revisados; Voltar e editar permite corrigir a quantidade e revisar/confirmar novamente. Venda permitida atualiza quantidade e preço médio.
6. Mudança de perfil/status encerra acesso; reativação não revive token antigo.
7. Atualização geral mostra falha parcial de autenticação do provedor sem encerrar o login do investidor; os registros do simulador confirmam as chamadas HTTP.
8. Cadastro de ação pelo formulário obtém a cotação e persiste no backend.
9. Preço fracionário (35,125 × 100 = 3.512,50) preservado na revisão e no backend, com foco correto ao revisar, editar, concluir e iniciar outra operação.
10. Distribuição interativa com três ativos em desktop/celular, com screenshots e verificação de ausência de rolagem horizontal em 390 px.
11. Cadastro de BRK.A/BRK.B pelo formulário, busca por caixa diferente, cotação via Twelve Data controlada e duplicidade com 409, sem retirar o ponto ou criar registros adicionais.
12. Histórico com pesquisa, vazio, limpar filtros, detalhes e preço fracionário, em 320/390/768/1280 px.
13. Telas-base e navegação por teclado/menu de conta nos perfis ADMIN/USER, nas mesmas quatro larguras, com capturas desktop/celular.
14. Nove ativos americanos mais câmbio respeitam a cota compartilhada, sem429acidental; FX consultado uma vez, valores convertidos verificados e carteira permanece visível após lote. Captura390px conferida.
15. 429 externo retorna503 com orientação de limite, mantémJWT válido e impede nova chamada ao provedor durante cooldown.

## Sessões

O backend associa `uid` e `sv` ao JWT. A versão da sessão é persistida em `usuario.versao_sessao`, inicialmente zero. Senha, username, papel ou status alterados incrementam essa versão dentro da transação. Login e troca de senha bloqueiam a linha da conta para que senha e versão pertençam ao mesmo estado na emissão.

A migração 006 preserva usuários, senhas e operações existentes. Após sua primeira aplicação, faça novo login: JWTs antigos não têm `sv`. A invalidação é observada na próxima requisição autenticada.
