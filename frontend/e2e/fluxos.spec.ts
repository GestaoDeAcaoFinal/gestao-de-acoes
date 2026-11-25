import { randomInt, randomUUID } from 'node:crypto';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

// Credenciais exclusivamente sintéticas, recriadas no H2 a cada execução.
const API = 'http://127.0.0.1:18080';
const ADMIN = { username: 'e2e_admin', password: 'E2e-only-admin-123!' };
const PASSWORD = 'E2e-only-user-123!';
type Account = { id: number; username: string; password: string; papel: 'ADMIN' | 'USER'; cpf: string; telefone: string };
let adminToken: string;
let account: Account;

async function tokenFor(request: APIRequestContext, username: string, password = PASSWORD): Promise<string> {
  const response = await request.post(`${API}/api/auth/login`, { data: { username, password } });
  expect(response.status()).toBe(200);
  return (await response.json()).token;
}
function headers(token: string) { return { Authorization: `Bearer ${token}` }; }
function cpfDeTeste(): string {
  const digitos = String(randomInt(100_000_000, 999_999_999)).split('').map(Number);
  for (const tamanho of [9, 10]) {
    const soma = digitos.reduce((total, digito, i) => total + digito * (tamanho + 1 - i), 0);
    digitos.push((soma * 10 % 11) % 10);
  }
  return digitos.join('');
}
async function createAccount(request: APIRequestContext, papel: 'ADMIN' | 'USER' = 'USER'): Promise<Account> {
  const username = `e2e_${randomUUID().slice(0, 8)}`;
  const response = await request.post(`${API}/api/usuarios`, {
    headers: headers(adminToken), data: { username, password: PASSWORD, papel, cpf: cpfDeTeste(), telefone: '11999999999' }
  });
  expect(response.status()).toBe(201);
  return { ...(await response.json()), password: PASSWORD };
}
async function login(page: Page, username: string, password = PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('Usuário', { exact: true }).fill(username);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
}
async function trade(page: Page, type: 'Compra' | 'Venda', quantity: number, price: number) {
  await page.goto('/operacoes/nova');
  await page.getByLabel('Ação', { exact: true }).selectOption({ label: 'PETR4 — Empresa E2E PETR4' });
  await page.getByLabel(type, { exact: true }).check();
  await page.getByLabel('Quantidade', { exact: true }).fill(String(quantity));
  await page.getByLabel(type === 'Compra' ? 'Preço de compra' : 'Preço de venda', { exact: true }).fill(String(price));
  await page.getByRole('button', { name: 'Revisar operação', exact: true }).click();
  await page.getByRole('button', { name: type === 'Compra' ? 'Confirmar compra' : 'Confirmar venda', exact: true }).click();
}

test.beforeEach(async ({ request }) => {
  adminToken = await tokenFor(request, ADMIN.username, ADMIN.password);
  account = await createAccount(request);
});

test('cadastro, busca, duplicidade e cotação preservam BRK.A e BRK.B de ponta a ponta', async ({ page, request }) => {
  test.setTimeout(90_000);
  await login(page, ADMIN.username, ADMIN.password);
  for (const ticker of ['BRK.A', 'BRK.B']) {
    await page.goto('/acoes/nova');
    await page.getByLabel('Ticker', { exact: true }).fill(` ${ticker.toLowerCase()} `);
    const corretora = (await (await request.get(`${API}/corretoras`, { headers: headers(adminToken) })).json())[0];
    await page.getByLabel('Corretora', { exact: true }).selectOption({ label: corretora.razaoSocial || corretora.cnpj });
    await page.getByRole('button', { name: 'Salvar ação', exact: true }).click();
    await expect(page.locator('.result-card')).toContainText(ticker);
    await expect(page.locator('.result-card')).toContainText('US$');
    const response = await request.get(`${API}/acoes/ticker/${ticker.toLowerCase()}`, { headers: headers(adminToken) });
    expect(response.status()).toBe(200);
    const asset = await response.json();
    expect(asset.ticker).toBe(ticker);
    expect(asset.mercado).toBe('EUA');
    expect((await request.put(`${API}/acoes/${asset.id}/atualizar-cotacao`, { headers: headers(adminToken), data: {} })).status()).toBe(200);
    await page.goto('/acoes');
    await page.locator('details summary').click();
    await page.getByLabel('Consultar por', { exact: true }).selectOption('ticker');
    await page.getByLabel('Valor', { exact: true }).fill(ticker.toLowerCase());
    await page.getByRole('button', { name: 'Consultar', exact: true }).click();
    await expect(page.locator('.search-result')).toContainText(ticker);
    const duplicate = await request.post(`${API}/acoes`, { headers: headers(adminToken), data: { ticker: ` ${ticker.toLowerCase()} `, corretoraId: corretora.id } });
    expect(duplicate.status()).toBe(409);
    const all = await (await request.get(`${API}/acoes`, { headers: headers(adminToken) })).json();
    expect(all.filter((item: { ticker: string }) => item.ticker === ticker)).toHaveLength(1);
  }
});

test('login, rota protegida e permissão USER são aplicados no navegador e na API', async ({ page, request }) => {
  await page.goto('/carteira');
  await expect(page).toHaveURL(/\/login\?returnUrl=/);
  await page.getByLabel('Usuário', { exact: true }).fill(account.username);
  await page.getByLabel('Senha', { exact: true }).fill('senha-incorreta');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await login(page, account.username);
  await expect(page.getByRole('link', { name: 'Usuários', exact: true })).toHaveCount(0);
  await page.goto('/usuarios');
  await expect(page).toHaveURL('http://127.0.0.1:4300/');
  const userToken = await tokenFor(request, account.username);
  expect((await request.get(`${API}/api/usuarios`, { headers: headers(userToken) })).status()).toBe(403);
});

for (const largura of [1280, 390]) {
  test(`cadastro com CPF e telefone: validação, persistência e duplicidade em ${largura}px`, async ({ page, request }, testInfo) => {
    await page.setViewportSize({ width: largura, height: 844 });
    await login(page, ADMIN.username, ADMIN.password);
    await page.goto('/usuarios');
    const username = `perfil_${randomUUID().slice(0, 8)}`;
    const cpf = cpfDeTeste();
    await page.locator('#usuario-nome').fill(username);
    await page.getByLabel('CPF', { exact: true }).fill('11111111111');
    await page.getByLabel('Telefone com DDD', { exact: true }).fill('(11) 99999-9999');
    await page.locator('#usuario-senha').fill(PASSWORD);
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.locator('#usuario-cpf-error')).toContainText('CPF válido');
    await page.getByLabel('CPF', { exact: true }).fill(cpf);
    await page.screenshot({ path: testInfo.outputPath('cadastro.png'), fullPage: true });
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    const linha = page.getByRole('row').filter({ hasText: username });
    await expect(linha).toBeVisible();
    await linha.getByRole('button', { name: 'Editar', exact: true }).click();
    await expect(page.getByLabel('CPF', { exact: true })).toHaveValue(cpf);
    await expect(page.getByLabel('Telefone com DDD', { exact: true })).toHaveValue('11999999999');
    await page.getByLabel('Telefone com DDD', { exact: true }).fill('(21) 3333-4444');
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Usuário salvo' })).toBeVisible();
    const users = await (await request.get(`${API}/api/usuarios`, { headers: headers(adminToken) })).json();
    expect(users.find((item: Account) => item.username === username)?.telefone).toBe('2133334444');
    await page.locator('#usuario-nome').fill(`duplicado_${randomUUID().slice(0, 6)}`);
    await page.getByLabel('CPF', { exact: true }).fill(cpf);
    await page.getByLabel('Telefone com DDD', { exact: true }).fill('11999999999');
    await page.locator('#usuario-senha').fill(PASSWORD);
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('CPF já cadastrado');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('interface impede rebaixar ou desativar o último ADMIN', async ({ page, request }) => {
  await login(page, ADMIN.username, ADMIN.password);
  await page.goto('/usuarios');
  await page.getByRole('row').filter({ hasText: ADMIN.username }).getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('CPF', { exact: true }).fill(cpfDeTeste());
  await page.getByLabel('Telefone com DDD', { exact: true }).fill('(11) 99999-9999');
  await page.getByLabel('Permissão', { exact: true }).selectOption('USER');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('administrador ativo');
  await page.getByLabel('Permissão', { exact: true }).selectOption('ADMIN');
  await page.getByLabel('Usuário ativo').uncheck();
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('administrador ativo');
  expect((await request.get(`${API}/api/usuarios`, { headers: headers(adminToken) })).status()).toBe(200);
});

test('histórico mantém filtros e detalhes acessíveis no celular e no desktop', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, account.username);
  await trade(page, 'Compra', 3, 35.125);
  await expect(page.getByRole('heading', { name: 'Operação registrada', exact: true })).toBeVisible();
  await page.goto('/operacoes');
  await expect(page.getByRole('heading', { name: 'Histórico de operações', exact: true })).toBeVisible();
  await page.getByLabel('Pesquisar nas operações', { exact: true }).fill('petr');
  await expect(page.locator('.record-count')).toContainText('1 de 1');
  const detalhes = page.getByRole('button', { name: /Detalhes da operação \d+ de PETR4/ });
  await detalhes.click();
  await expect(detalhes).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.history-detail-row:visible')).toContainText('35,125');
  await expect(page.locator('.history-detail-row:visible')).toContainText('Quantidade');
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(detalhes).toBeVisible();
    if (width === 390 || width === 1280) await page.screenshot({ path: testInfo.outputPath(`historico-${width}.png`), fullPage: true });
  }
  await page.getByLabel('Pesquisar nas operações', { exact: true }).fill('inexistente');
  await expect(page.getByText('Nenhuma operação corresponde aos filtros.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
  await expect(page.locator('.record-count')).toContainText('1 de 1');
  await page.getByText('Consulta direta por ID da operação', { exact: true }).click();
  await expect(page.getByLabel('Identificador', { exact: true })).toBeVisible();
});

test('telas-base e navegação respondem a desktop, tablet e celular nos dois perfis', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  for (const usuario of [{ username: ADMIN.username, password: ADMIN.password }, account]) {
    await login(page, usuario.username, usuario.password);
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['/', '/acoes', '/operacoes/nova', '/operacoes']) {
        await page.goto(path);
        await expect(page.locator('h1')).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const link = page.getByRole('navigation', { name: 'Navegação principal', exact: true }).getByRole('link', { name: 'Operações', exact: true });
        await link.focus();
        await expect(link).toBeFocused();
        await expect(link).toBeInViewport();
        if (usuario.username === ADMIN.username && [390, 1280].includes(width)) await page.screenshot({ path: testInfo.outputPath(`${width}-${path.replaceAll('/', '_')}.png`), fullPage: true });
      }
      await page.getByTestId('account-menu-trigger').click();
      if (usuario.username === ADMIN.username) await expect(page.getByRole('link', { name: 'Administração de usuários', exact: true })).toBeVisible();
      else await expect(page.getByRole('link', { name: 'Administração de usuários', exact: true })).toHaveCount(0);
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('account-menu-trigger')).toBeFocused();
      await expect(page.locator('.account-menu')).toHaveCount(0);
    }
    await page.getByTestId('account-menu-trigger').click(); await page.getByTestId('logout').click();
  }
});

test('troca de senha identifica o alvo e invalida sua sessão anterior', async ({ page, request }) => {
  const oldToken = await tokenFor(request, account.username);
  await login(page, ADMIN.username, ADMIN.password);
  await page.goto('/usuarios');
  await page.getByRole('row').filter({ hasText: account.username }).getByRole('button', { name: 'Alterar senha', exact: true }).click();
  await expect(page.getByTestId('senha-destinatario')).toContainText(account.username);
  await expect(page.getByTestId('senha-destinatario')).toContainText('USER');
  const newPassword = 'E2e-only-new-password-123!';
  await page.getByLabel('Nova senha (8 a 72 caracteres)', { exact: true }).fill(newPassword);
  await page.locator('form').filter({ has: page.locator('#nova-senha') })
    .getByRole('button', { name: 'Alterar senha', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Senha alterada');
  expect((await request.get(`${API}/acoes`, { headers: headers(oldToken) })).status()).toBe(401);
  expect((await request.post(`${API}/api/auth/login`, { data: { username: account.username, password: PASSWORD } })).status()).toBe(401);
  await login(page, account.username, newPassword);
});

test('compra de um investidor não aparece na carteira, histórico ou consulta de outro', async ({ page, request, browser }) => {
  await login(page, account.username);
  await trade(page, 'Compra', 10, 20);
  await expect(page.getByRole('heading', { name: 'Operação registrada', exact: true })).toBeVisible();
  await page.goto('/carteira');
  await expect(page.getByTestId('posicao-PETR4').locator('td').nth(1)).toHaveText('10');
  const ownerToken = await tokenFor(request, account.username);
  const owned = await (await request.get(`${API}/operacoes`, { headers: headers(ownerToken) })).json();
  const other = await createAccount(request);
  const otherToken = await tokenFor(request, other.username);
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4300' });
  try {
    const otherPage = await context.newPage();
    await login(otherPage, other.username);
    await otherPage.goto('/carteira');
    await expect(otherPage.getByText('Nenhuma ação em posse', { exact: false })).toBeVisible();
    for (const path of ['/operacoes', `/operacoes/${owned[0].acao.id}`, '/operacoes/compras', '/operacoes/vendas']) {
      const response = await request.get(`${API}${path}`, { headers: headers(otherToken) });
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual([]);
    }
    expect((await request.get(`${API}/operacoes/buscar/${owned[0].id}`, { headers: headers(otherToken) })).status()).toBe(404);
    await trade(otherPage, 'Venda', 1, 30);
    await expect(otherPage.getByRole('alert')).toContainText('Não existe posição comprada');
    const adminWallet = await (await request.get(`${API}/operacoes/carteira`, { headers: headers(adminToken) })).json();
    expect(adminWallet.posicoes).toEqual([]);
  } finally { await context.close(); }
});

test('venda respeita saldo, preserva formulário após erro e atualiza a posição', async ({ page }) => {
  await login(page, account.username);
  await trade(page, 'Compra', 10, 20);
  await expect(page.getByRole('heading', { name: 'Operação registrada', exact: true })).toBeVisible();
  await trade(page, 'Venda', 11, 30);
  await expect(page.getByRole('alert')).toContainText('excede a posição disponível');
  await expect(page.getByLabel('Quantidade', { exact: true })).toHaveValue('11');
  await page.getByRole('button', { name: 'Voltar e editar', exact: true }).click();
  await page.getByLabel('Quantidade', { exact: true }).fill('4');
  await page.getByRole('button', { name: 'Revisar operação', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar venda', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Operação registrada', exact: true })).toBeVisible();
  await page.goto('/carteira');
  await expect(page.getByTestId('posicao-PETR4').locator('td').nth(1)).toHaveText('6');
  await expect(page.getByTestId('posicao-PETR4').locator('td').nth(2)).toContainText('20,00');
});

test('mudança de perfil/status encerra acesso e reativação não revive token antigo', async ({ page, request }) => {
  const target = await createAccount(request, 'ADMIN');
  await login(page, target.username);
  await page.goto('/usuarios');
  await expect(page.getByRole('heading', { name: 'Usuários', exact: true })).toBeVisible();
  const update = async (ativo: boolean) => {
    const response = await request.put(`${API}/api/usuarios/${target.id}`, {
      headers: headers(adminToken), data: { username: target.username, cpf: target.cpf, telefone: target.telefone, papel: 'USER', ativo }
    });
    expect(response.status()).toBe(200);
  };
  await update(true);
  await page.goto('/acoes');
  await expect(page).toHaveURL(/\/login/);
  await login(page, target.username);
  const userToken = await tokenFor(request, target.username);
  await update(false);
  await page.goto('/carteira');
  await expect(page).toHaveURL(/\/login/);
  await update(true);
  expect((await request.get(`${API}/acoes`, { headers: headers(userToken) })).status()).toBe(401);
});

test('atualização geral comunica falha parcial do provedor sem encerrar o login', async ({ page, request }) => {
  const catalog = await (await request.get(`${API}/acoes`, { headers: headers(adminToken) })).json();
  await login(page, ADMIN.username, ADMIN.password);
  await page.getByRole('button', { name: 'Atualizar todas as cotações', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'cotações atualizadas' }))
    .toContainText(`${catalog.length - 1} de ${catalog.length} cotações atualizadas.`);
  await expect(page.getByRole('alert').filter({ hasText: 'ERRO3' })).toContainText('autenticação');
  await expect(page).not.toHaveURL(/\/login/);
  const stats = await (await request.get('http://127.0.0.1:19090/__e2e/stats')).json();
  expect(stats['/api/quote/PETR4']).toBeGreaterThan(0);
  expect(stats['/api/quote/ERRO3']).toBeGreaterThan(0);
});

test('ADMIN cadastra ação pelo formulário com cotação obtida pelo backend', async ({ page, request }) => {
  await login(page, ADMIN.username, ADMIN.password);
  await page.goto('/acoes/nova');
  await page.getByLabel('Ticker', { exact: true }).fill('roxo34');
  await page.getByLabel('Corretora', { exact: true }).selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Salvar ação', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ação cadastrada', exact: true })).toBeVisible();
  await expect(page.locator('.result-card')).toContainText('ROXO34');
  const catalog = await (await request.get(`${API}/acoes`, { headers: headers(adminToken) })).json();
  expect(catalog.find((stock: { ticker: string }) => stock.ticker === 'ROXO34')?.cotacaoAtual).toBe(30);
});

test('revisão preserva preço fracionário, total e foco antes de registrar no backend', async ({ page, request }) => {
  await login(page, account.username);
  await page.goto('/operacoes/nova');
  await page.getByLabel('Ação', { exact: true }).selectOption({ label: 'PETR4 — Empresa E2E PETR4' });
  await page.getByLabel('Quantidade', { exact: true }).fill('100');
  await page.getByLabel('Preço de compra', { exact: true }).fill('35.125');
  await page.getByRole('button', { name: 'Revisar operação', exact: true }).click();
  await expect(page.locator('.operation-review')).toContainText('35,125');
  await expect(page.getByTestId('review-total')).toContainText('3.512,50');
  await expect(page.getByRole('heading', { name: 'Confira sua operação.', exact: true })).toBeFocused();
  await page.getByTestId('editar-operacao').click();
  await expect(page.getByLabel('Ação', { exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Revisar operação', exact: true }).click();
  await page.getByTestId('confirmar-operacao').click();
  await expect(page.getByRole('heading', { name: 'Operação registrada', exact: true })).toBeFocused();
  const ownerToken = await tokenFor(request, account.username);
  const operations = await (await request.get(`${API}/operacoes`, { headers: headers(ownerToken) })).json();
  expect(operations).toHaveLength(1);
  expect(operations[0].precoUnitario).toBe(35.125);
  expect(operations[0].valorTotal).toBe(3512.5);
  await page.getByRole('button', { name: 'Nova operação', exact: true }).click();
  await expect(page.getByLabel('Ação', { exact: true })).toBeFocused();
});

test('distribuição interativa permanece utilizável em desktop e celular', async ({ page, request }, testInfo) => {
  const token = await tokenFor(request, account.username);
  const catalog = await (await request.get(`${API}/acoes`, { headers: headers(token) })).json();
  for (const [ticker, quantidade] of [['PETR4', 10], ['VALE3', 4], ['TAEE11', 1]] as const) {
    const stock = catalog.find((item: { ticker: string }) => item.ticker === ticker);
    expect(stock).toBeDefined();
    const response = await request.post(`${API}/operacoes/comprar/${stock.id}`, {
      headers: headers(token), params: { quantidade, precoCompra: 20 }
    });
    expect(response.status()).toBe(200);
  }
  await login(page, account.username);
  await expect(page.locator('.allocation-segment')).toHaveCount(3);
  await page.locator('.allocation-legend__button').filter({ hasText: 'VALE3' }).click();
  await expect(page.getByTestId('allocation-detail')).toContainText('VALE3');
  await page.screenshot({ path: testInfo.outputPath('dashboard-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.allocation-legend__button').filter({ hasText: 'TAEE11' })).toBeVisible();
  await page.locator('.allocation-legend__button').filter({ hasText: 'TAEE11' }).click();
  await expect(page.getByTestId('allocation-detail')).toContainText('TAEE11');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('dashboard-mobile.png'), fullPage: true });
});

test('nove ativos americanos e câmbio respeitam cota compartilhada e preservam carteira', async ({ page, request }, testInfo) => {
  test.setTimeout(90_000);
  const owner = await createAccount(request, 'ADMIN');
  const token = await tokenFor(request, owner.username);
  const brokers = await (await request.get(`${API}/corretoras`, { headers: headers(token) })).json();
  for (const ticker of ['AAPL', 'TSLA', 'MSFT', 'PARA', 'F', 'GOOG', 'BA', 'KO', 'GOOGL']) {
    const response = await request.post(`${API}/acoes`, { headers: headers(token), data: { ticker, corretoraId: brokers[0].id } });
    expect(response.status()).toBe(200);
  }
  const stocks = await (await request.get(`${API}/acoes`, { headers: headers(token) })).json();
  const apple = stocks.find((stock: { ticker: string }) => stock.ticker === 'AAPL');
  expect((await request.post(`${API}/operacoes/comprar/${apple.id}`, { headers: headers(token), params: { quantidade: 2, precoCompra: 80 } })).status()).toBe(200);
  const before = await (await request.get('http://127.0.0.1:19090/__e2e/stats')).json();
  await login(page, owner.username);
  await page.goto('/carteira');
  await expect(page.getByTestId('posicao-AAPL')).toBeVisible();
  await expect(page.getByTestId('valor-atual')).toContainText('1.052,63');
  await page.getByRole('button', { name: 'Atualizar todas as cotações', exact: true }).click();
  await expect(page.locator('app-atualizar-cotacoes button')).toBeDisabled();
  await expect(page.locator('app-atualizar-cotacoes [role="status"]')).toContainText('ações processadas');
  await expect(page.locator('app-atualizar-cotacoes [role="status"]')).toContainText(`${stocks.length - 1} de ${stocks.length} cotações atualizadas.`);
  await expect(page.getByTestId('posicao-AAPL')).toBeVisible();
  await expect(page.getByTestId('valor-atual')).toContainText('1.052,63');
  await expect(page.locator('app-atualizar-cotacoes [role="alert"]')).toContainText('ERRO3');
  await expect(page.locator('app-atualizar-cotacoes [role="alert"]')).not.toContainText('Twelve Data');
  const after = await (await request.get('http://127.0.0.1:19090/__e2e/stats')).json();
  expect(after['TWELVE_RATE_LIMIT_ERRORS'] || 0).toBe(0);
  expect(after['/quote'] - before['/quote']).toBeGreaterThanOrEqual(9);
  expect((after['/exchange_rate'] || 0) - (before['/exchange_rate'] || 0)).toBe(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('carteira-quota-390.png'), fullPage: true });
});

test('429 externo retorna orientação de limite sem encerrar sessão e impede nova chamada durante cooldown', async ({ request }) => {
  const body = { ticker: 'LIMITE', corretoraId: 1 };
  const primeira = await request.post(`${API}/acoes`, { headers: headers(adminToken), data: body });
  expect(primeira.status()).toBe(503);
  expect((await primeira.json()).detail).toContain('limite de consultas');
  const antes = await (await request.get('http://127.0.0.1:19090/__e2e/stats')).json();
  const segunda = await request.post(`${API}/acoes`, { headers: headers(adminToken), data: body });
  expect(segunda.status()).toBe(503);
  const depois = await (await request.get('http://127.0.0.1:19090/__e2e/stats')).json();
  expect(depois['/quote']).toBe(antes['/quote']);
  expect((await request.get(`${API}/acoes`, { headers: headers(adminToken) })).status()).toBe(200);
});
