import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const docker = process.env.DOCKER_BIN || 'docker';
const backendImage = process.env.BACKEND_IMAGE || 'gestao-backend:ci';
const frontendImage = process.env.FRONTEND_IMAGE || 'gestao-frontend:ci';
const id = randomUUID().slice(0, 8);
const network = `gestao-smoke-${id}`;
const ingress = `${network}-web`;
const backend = `gestao-smoke-back-${id}`;
const frontend = `gestao-smoke-front-${id}`;
const created = [];
let base;

function command(args, env = process.env) {
  try {
    return execFileSync(docker, args, { encoding: 'utf8', env, windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    throw new Error(`Falha no comando Docker: ${args[0]}. Nenhum conteúdo de credenciais foi registrado.`);
  }
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function createContainer(args, env, extraNetwork) {
  const container = command(['create', ...args], env);
  created.push(['rm', '-f', container]);
  if (extraNetwork) command(['network', 'connect', extraNetwork, container]);
  command(['start', container]);
}
function bearer(token) { return { Authorization: `Bearer ${token}` }; }
async function api(path, expected, { token, method = 'GET', data } = {}) {
  const response = await fetch(`${base}${path}`, {
    method, headers: { ...(token ? bearer(token) : {}), ...(data ? { 'Content-Type': 'application/json' } : {}) },
    body: data ? JSON.stringify(data) : undefined,
    signal: AbortSignal.timeout(10_000)
  });
  assert(response.status === expected, `${method} ${path}: HTTP ${response.status}, esperado ${expected}`);
  return response;
}
async function login(username, password) {
  const response = await api('/api/api/auth/login', 200, { method: 'POST', data: { username, password } });
  const result = await response.json();
  assert(result.tipo === 'Bearer' && result.token && result.expiresIn > 0, 'Contrato de login inválido');
  return result.token;
}

try {
  // Backend interno sem volumes ou portas públicas; só Nginx recebe acesso local.
  command(['network', 'create', '--internal', network]);
  created.push(['network', 'rm', network]);
  command(['network', 'create', ingress]);
  created.push(['network', 'rm', ingress]);
  const password = randomUUID();
  const config = {
    'spring.profiles.active': 'dev,h2',
    'spring.config.import': '',
    'spring.datasource.url': 'jdbc:h2:mem:docker_validation;DB_CLOSE_DELAY=-1',
    'spring.datasource.driver-class-name': 'org.h2.Driver',
    'spring.datasource.username': 'sa',
    'spring.datasource.password': '',
    'spring.jpa.database-platform': 'org.hibernate.dialect.H2Dialect',
    'spring.jpa.hibernate.ddl-auto': 'validate',
    'spring.h2.console.enabled': 'false',
    'app.jwt.secret': randomUUID() + randomUUID(),
    'app.jwt.issuer': 'gestao-docker-validation',
    'app.jwt.expiration': '30m',
    'app.admin.username': 'validation_admin',
    'app.admin.password': password,
    'integracoes.brapi.token': '',
    'twelvedata.api.key': ''
  };
  createContainer(['--name', backend, '--network', network, '--network-alias', 'app-host-postgresql',
    '--env', 'SPRING_APPLICATION_JSON', backendImage],
  { ...process.env, SPRING_APPLICATION_JSON: JSON.stringify(config) });
  createContainer(['--name', frontend, '--network', ingress,
    '--publish', '127.0.0.1::80', frontendImage], undefined, network);
  const address = command(['port', frontend, '80/tcp']).split(/\r?\n/).find(line => line.startsWith('127.0.0.1:'));
  assert(address, 'Porta local temporária não encontrada');
  base = `http://${address}`;
  command(['exec', frontend, 'nginx', '-t']);
  let ready = false;
  for (let attempt = 0; attempt < 90; attempt++) {
    try {
      const response = await fetch(`${base}/api/acoes`, { signal: AbortSignal.timeout(2000) });
      if (response.status === 401) { ready = true; break; }
    } catch { /* Aguarda somente os containers criados por este teste. */ }
    await delay(1000);
  }
  assert(ready, 'Backend de validação não ficou pronto');

  const admin = await login('validation_admin', password);
  for (const path of ['/api/acoes', '/api/corretoras', '/api/operacoes/carteira', '/api/api/usuarios']) {
    await api(path, 200, { token: admin });
  }
  await api('/api/acoes', 401);
  console.log('PASS Nginx e login JWT; proxy financeiro/administrativo; API protegida');

  const userPassword = randomUUID();
  const createdUser = await (await api('/api/api/usuarios', 201, {
    token: admin, method: 'POST', data: { username: 'validation_user', cpf: '52998224725', telefone: '11999999999', password: userPassword, papel: 'USER' }
  })).json();
  const user = await login('validation_user', userPassword);
  await api('/api/acoes', 200, { token: user });
  await api('/api/api/usuarios', 403, { token: user });
  console.log('PASS USER consulta e recebe 403 na administração');

  const newPassword = randomUUID();
  await api(`/api/api/usuarios/${createdUser.id}/senha`, 204, {
    token: admin, method: 'PUT', data: { password: newPassword }
  });
  await api('/api/acoes', 401, { token: user });
  const newUser = await login('validation_user', newPassword);
  await api('/api/acoes', 200, { token: newUser });
  for (const ativo of [false, true]) {
    await api(`/api/api/usuarios/${createdUser.id}`, 200, {
      token: admin, method: 'PUT', data: { username: 'validation_user', cpf: '52998224725', telefone: '11999999999', papel: 'USER', ativo }
    });
    await api('/api/acoes', 401, { token: newUser });
  }
  console.log('PASS senha/status invalidam sessões; reativação não revive token antigo');

  const users = await (await api('/api/api/usuarios', 200, { token: admin })).json();
  const adminId = users.find(item => item.username === 'validation_admin')?.id;
  assert(adminId, 'Administrador sintético não localizado');
  await api(`/api/api/usuarios/${adminId}`, 409, {
    token: admin, method: 'PUT', data: { username: 'validation_admin', cpf: '11144477735', telefone: '11999999999', papel: 'USER', ativo: true }
  });
  console.log('PASS último ADMIN permanece protegido no artefato de produção');

  const index = await (await api('/', 200)).text();
  for (const path of ['/login', '/carteira', '/usuarios']) {
    assert(await (await api(path, 200)).text() === index, `Fallback SPA inválido: ${path}`);
  }
  const assets = [...index.matchAll(/(?:src|href)="([^" ]+\.js)"/g)];
  assert(assets.length > 0, 'HTML não referencia JavaScript compilado');
  for (const [, asset] of assets) {
    const response = await api(`/${asset}`, 200);
    assert(/javascript/.test(response.headers.get('content-type') || ''), 'Content-Type inválido em JavaScript');
  }
  console.log('PASS rotas diretas SPA e arquivos de produção compilados');
} catch (error) {
  console.error(error.message);
  for (const name of [backend, frontend]) {
    try {
      const state = command(['inspect', '--format', '{{.State.Status}} ports={{json .NetworkSettings.Ports}}', name]);
      console.error(`${name}: ${state}`);
    } catch { /* Não lê configurações de ambiente dos containers. */ }
  }
  process.exitCode = 1;
} finally {
  let cleanupFailed = false;
  for (const args of created.reverse()) {
    try { command(args); } catch { cleanupFailed = true; console.error(`Falha na limpeza do recurso temporário ${args.at(-1)}`); }
  }
  if (cleanupFailed) process.exitCode = 1;
  else console.log('CLEANUP containers e rede temporários removidos; nenhum volume utilizado');
}
