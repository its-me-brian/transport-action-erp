// ============================================================================
// REPORTER — pasos, asserts y resumen de la batería
// ============================================================================

const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

export class Reporter {
  constructor({ verbose = false, grep = null } = {}) {
    this.verbose = verbose;
    this.grep = grep;
    this.results = [];
    this.suite = null;
    this.startedAt = Date.now();
  }

  section(title) {
    console.log(`\n${C.bold}${C.cyan}── ${title} ${'─'.repeat(Math.max(0, 58 - title.length))}${C.reset}`);
  }

  suiteStart(name, description) {
    this.suite = name;
    console.log(`\n${C.bold}▶ ${name}${description ? C.reset + C.dim + ' — ' + description : ''}${C.reset}`);
  }

  _record(status, name, extra = {}) {
    const entry = { suite: this.suite, name, status, ...extra };
    this.results.push(entry);
    return entry;
  }

  _matches(name) {
    return !this.grep || name.toLowerCase().includes(this.grep.toLowerCase());
  }

  async step(name, fn) {
    if (!this._matches(name)) return undefined;
    const t0 = Date.now();
    try {
      const value = await fn();
      const ms = Date.now() - t0;
      this._record('pass', name, { ms });
      console.log(`  ${C.green}✓${C.reset} ${name} ${C.dim}(${ms}ms)${C.reset}`);
      return value;
    } catch (e) {
      const ms = Date.now() - t0;
      this._record('fail', name, { ms, error: e.message, code: e.code, statusCode: e.statusCode });
      console.log(`  ${C.red}✗ ${name}${C.reset}`);
      console.log(`      ${C.red}${e.code ? `[${e.code}] ` : ''}${e.message}${C.reset}`);
      if (this.verbose && e.stack) console.log(C.dim + e.stack.split('\n').slice(1, 4).join('\n') + C.reset);
      return undefined;
    }
  }

  /** Ejecuta y exige que FALLE. Devuelve el error para inspeccionarlo. */
  async expectFailure(name, fn, matcher) {
    if (!this._matches(name)) return undefined;
    const t0 = Date.now();
    try {
      const value = await fn();
      const ms = Date.now() - t0;
      this._record('fail', name, { ms, error: 'Se esperaba un error y la llamada tuvo éxito' });
      console.log(`  ${C.red}✗ ${name}${C.reset}`);
      console.log(`      ${C.red}Se esperaba un error y la llamada tuvo éxito: ${JSON.stringify(value).slice(0, 160)}${C.reset}`);
      return undefined;
    } catch (e) {
      const ms = Date.now() - t0;
      const text = `${e.code || ''} ${e.message}`;
      const ok = !matcher || matcher.test(text);
      if (!ok) {
        this._record('fail', name, { ms, error: `Error inesperado: ${text}` });
        console.log(`  ${C.red}✗ ${name}${C.reset}`);
        console.log(`      ${C.red}El error no coincide con ${matcher}: ${text}${C.reset}`);
        return e;
      }
      this._record('pass', name, { ms, expected: text });
      console.log(`  ${C.green}✓${C.reset} ${name} ${C.dim}(rechazado: ${text.slice(0, 90)})${C.reset}`);
      return e;
    }
  }

  check(name, condition, detail) {
    if (!this._matches(name)) return condition;
    if (condition) {
      this._record('pass', name);
      console.log(`  ${C.green}✓${C.reset} ${name}${detail ? C.dim + ' — ' + detail + C.reset : ''}`);
      return true;
    }
    this._record('fail', name, { error: detail || 'assert falló' });
    console.log(`  ${C.red}✗ ${name}${C.reset}${detail ? ' — ' + detail : ''}`);
    return false;
  }

  skip(name, reason) {
    if (!this._matches(name)) return;
    this._record('skip', name, { reason });
    console.log(`  ${C.yellow}○${C.reset} ${name} ${C.dim}(omitido: ${reason})${C.reset}`);
  }

  note(message) {
    console.log(`  ${C.dim}· ${message}${C.reset}`);
  }

  summary() {
    const total = this.results.length;
    const pass = this.results.filter((r) => r.status === 'pass').length;
    const fail = this.results.filter((r) => r.status === 'fail').length;
    const skip = this.results.filter((r) => r.status === 'skip').length;
    const ms = Date.now() - this.startedAt;

    console.log(`\n${C.bold}${'═'.repeat(64)}${C.reset}`);
    console.log(
      `${C.bold}  ${fail === 0 ? C.green + 'PASS' : C.red + 'FAIL'}${C.reset}  ` +
        `${pass}/${total} pasos · ${skip} omitidos · ${(ms / 1000).toFixed(1)}s`
    );
    console.log(`${C.bold}${'═'.repeat(64)}${C.reset}`);

    if (fail) {
      console.log(`\n${C.red}${C.bold}Fallos:${C.reset}`);
      for (const r of this.results.filter((x) => x.status === 'fail')) {
        console.log(`  ${C.red}✗${C.reset} ${C.dim}[${r.suite}]${C.reset} ${r.name}`);
        console.log(`      ${r.error}`);
      }
    }
    if (skip) {
      console.log(`\n${C.yellow}Omitidos:${C.reset}`);
      for (const r of this.results.filter((x) => x.status === 'skip')) {
        console.log(`  ${C.yellow}○${C.reset} ${r.name} — ${r.reason}`);
      }
    }
    console.log('');
    return { total, pass, fail, skip, ms, results: this.results };
  }
}
