# GestaoAcaoFront

## Executar o Gestão de Ações localmente

Contratos e permissões atuais: [referência da API](docs/contratos-atuais.md).

Automação de testes, validação Docker e ordem de publicação: [entrega e CI](docs/entrega-ci.md).

Interface aprovada, estilos compartilhados, responsividade e confirmação de operações: [Portfolio Studio](docs/redesign-portfolio-studio.md).

Requisitos: Node.js `^20.19.0`, `^22.12.0` ou `>=24.0.0`, dependências do
`package-lock.json`, Java 17, Maven e PostgreSQL local.
Configure o `.env` do backend a partir do exemplo do próprio backend, sem versionar credenciais.

Frontend atualizado para Angular 20.3.35, CLI 20.3.42 e TypeScript 5.9.3.
Use `npm.cmd ci` após atualizar o checkout para instalar as versões registradas no lockfile.

No diretório `GestaoDeAcao`, abra um terminal PowerShell e execute:

```powershell
$env:SPRING_APPLICATION_JSON='{"server.address":"127.0.0.1"}'
mvn spring-boot:run "-Dspring-boot.run.profiles=dev"
```

O perfil `dev` deve ser selecionado explicitamente: a chave `SPRING_PROFILES_ACTIVE`
em um `.env` importado como arquivo de propriedades não equivale a uma variável de ambiente.
O comando acima usa o PostgreSQL configurado em `DB_URL` e inicia o backend em `127.0.0.1:8080`.
Configure `BRAPI_TOKEN` no ambiente local ou use a configuração de execução existente no IntelliJ.
Um terminal separado não herda as variáveis dessa configuração da IDE. Não sobrescreva
`integracoes.brapi.token` com valor vazio no JSON. Nunca coloque esse token no Angular.

Em outro terminal, dentro de `gestao-acao-front`:

```powershell
npm.cmd ci
npm.cmd start -- --host 127.0.0.1 --port 4200
```

Abra `http://127.0.0.1:4200/`. Entre com uma conta cadastrada no backend.
O inicializador de desenvolvimento cria o administrador configurado somente se ele ainda não existe;
alterar a senha no `.env` não altera automaticamente um usuário já cadastrado.

### Permissões e sessão

- ADMIN: consultas, operações, cadastro de ações/corretoras, cotações e administração de usuários.

O cadastro administrativo exige username, CPF válido e único, telefone brasileiro com DDD e senha inicial. A edição exige completar CPF e telefone das contas antigas; o login dessas contas continua funcionando com username e senha. O formulário aceita CPF com ou sem máscara e telefone fixo/celular com DDD, normalizando ambos antes do envio. A senha continua no fluxo separado de troca durante a edição. Essa funcionalidade exige o backend com a migração Liquibase `007-cpf-telefone-usuario.xml`; não utiliza API externa nem confirmação por SMS.

Validação local em25/11/2026: 193 testes Angular, build de produção e17 testes Playwright em Chrome aprovados. O cadastro foi exercitado em1280px e390px com backendH2 isolado, incluindo CPF inválido, persistência, edição e duplicidade; as capturas foram inspecionadas. As fixtures do smokeDocker foram atualizadas, mas esse smoke não foi executado nesta etapa. O build ainda apresenta avisos de depreciação Sass/Bootstrap.
- USER: consultas, carteira e compra/venda.
- O JWT fica no `sessionStorage` da aba. Logout e expiração limpam a sessão.
- `401` em recurso protegido encaminha ao login; `403` mantém a sessão e apresenta o erro de permissão.
- O backend valida assinatura e permissões. A leitura dos claims pelo Angular serve à navegação e à interface.
- O backend usa uma versão de sessão no JWT. Alterar senha, username, papel ou status invalida
  os tokens anteriores na próxima requisição. Reativar a conta não revalida esses tokens.
- Tokens anteriores à migração `006-versao-sessao` exigem novo login. Não há refresh token automático.

### Verificação

```powershell
npm.cmd test -- --watch=false --browsers=ChromeHeadless --progress=false
npm.cmd run build
```

O build inicial está abaixo do orçamento de aviso de 500 kB. Podem aparecer avisos de
depreciação Sass do Bootstrap 5.3; confira o código de saída. Além dos testes unitários,
há uma suíte E2E com navegador e backend reais, descrita em [Validação E2E](docs/validacao-e2e.md).

As páginas são carregadas sob demanda em `app.routes.ts`. Os estilos globais do Bootstrap
usam imports selecionados em `src/bootstrap.scss`, tanto no build quanto nos testes.
Ao adicionar um componente Bootstrap, inclua seu partial nesse arquivo e verifique os estilos.
Não importe também `bootstrap.min.css`, pois isso duplicaria os estilos e aumentaria o bundle.

### Endereços da API

Em desenvolvimento, `environment.ts` aponta para `http://localhost:8080`.
Em produção, `environment.production.ts` usa `/api` e `nginx.conf` remove esse prefixo no proxy.
As rotas financeiras chegam ao backend sem prefixo (`/acoes`, `/corretoras`, `/operacoes`), enquanto
login e usuários usam `/api/auth/login` e `/api/usuarios` no backend. Por isso, o login público no
proxy atual usa `/api/api/auth/login`. Não remova o segundo prefixo sem ajustar o backend/proxy em conjunto.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.26.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
