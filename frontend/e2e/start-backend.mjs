import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'node:net';

const cwd = resolve(process.env.E2E_BACKEND_DIR || '../GestaoDeAcao');
if (!existsSync(resolve(cwd, 'src/test/java/com/av2/gestaodeacao/e2e/E2eApplication.java'))) {
  throw new Error('Backend E2E não localizado. Defina E2E_BACKEND_DIR com o projeto Spring Boot atualizado.');
}
// Recusa portas já ocupadas; nunca se conecta à aplicação de desenvolvimento.
for (const port of [18080, 19090]) {
  await new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(port, '127.0.0.1', () => probe.close(resolvePort));
  });
}
const env = {};
for (const name of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'COMSPEC', 'ComSpec', 'USERPROFILE', 'HOME', 'TEMP', 'TMP', 'JAVA_HOME', 'MAVEN_HOME', 'M2_HOME']) {
  if (process.env[name]) env[name] = process.env[name];
}
env.MAVEN_OPTS = '-Xmx256m';
const args = ['-q', 'spring-boot:test-run',
  '-Dspring-boot.run.main-class=com.av2.gestaodeacao.e2e.E2eApplication',
  '-Dspring-boot.run.jvmArguments=-Xmx384m'];
const child = process.platform === 'win32'
  ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `mvn.cmd ${args.join(' ')}`], { cwd, env, stdio: 'inherit', windowsHide: true })
  : spawn('mvn', args, { cwd, env, stdio: 'inherit' });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => process.exit(code ?? 1));
