// Test Runner — core timing, assertions, colored output, file logging
//
// Usage:
//   const runner = new Runner({ baseUrl, logFile });
//   await runner.test('test name', async () => { ... assertions ... });
//   runner.summary();

const fs   = require('fs');
const path = require('path');

// ── ANSI colors ────────────────────────────────────────────────────────────────
const C = {
    reset:   '\x1b[0m',
    bold:    '\x1b[1m',
    dim:     '\x1b[2m',
    green:   '\x1b[32m',
    red:     '\x1b[31m',
    yellow:  '\x1b[33m',
    cyan:    '\x1b[36m',
    magenta: '\x1b[35m',
    white:   '\x1b[37m',
    gray:    '\x1b[90m'
};

const color = (c, str) => `${c}${str}${C.reset}`;

class Runner {
    constructor({ baseUrl, logPath, verbose = false }) {
        this.baseUrl = baseUrl;
        this.logPath = logPath;
        this.verbose = verbose;

        this.results  = [];
        this.current  = null;   // active suite name
        this.cookies  = {};     // cookie jar shared across tests { name: value }

        // Ensure reports directory exists
        fs.mkdirSync(path.dirname(logPath), { recursive: true });

        // Open log file stream
        this.logStream = fs.createWriteStream(logPath, { flags: 'w' });

        this._write(`Dr. Aria — Test Report`);
        this._write(`Started:  ${new Date().toISOString()}`);
        this._write(`Base URL: ${baseUrl}`);
        this._write(`${'─'.repeat(70)}\n`);

        console.log(color(C.bold + C.cyan, '\n  Dr. Aria — Test Suite'));
        console.log(color(C.gray, `  ${baseUrl}  →  ${logPath}\n`));
    }

    // ── Suite label ─────────────────────────────────────────────────────────────
    suite(name) {
        this.current = name;
        const label = `\n[ ${name.toUpperCase()} ]`;
        console.log(color(C.bold + C.magenta, label));
        this._write(`\n${label}`);
    }

    // ── Run a single test ───────────────────────────────────────────────────────
    async test(name, fn) {
        const start = Date.now();
        let passed  = false;
        let error   = null;
        let meta    = {};   // populated by assertions and helpers

        try {
            meta  = await fn(this) || {};
            passed = true;
        } catch (err) {
            error = err;
        }

        const ms     = Date.now() - start;
        const status = passed ? color(C.green, '  ✓') : color(C.red, '  ✗');
        const time   = color(C.gray, `${ms}ms`);
        const label  = passed
            ? `${status} ${name} ${time}`
            : `${status} ${color(C.red, name)} ${time}`;

        console.log(label);

        if (!passed && error) {
            console.log(color(C.red, `    → ${error.message}`));
        }

        if (meta.preview && this.verbose) {
            console.log(color(C.gray, `    → ${String(meta.preview).slice(0, 120)}`));
        }

        this.results.push({
            suite:  this.current,
            name,
            passed,
            ms,
            error:  error?.message || null,
            meta
        });

        this._write(`  ${passed ? 'PASS' : 'FAIL'} [${ms}ms] ${name}${error ? `\n       Error: ${error.message}` : ''}${meta.preview ? `\n       Preview: ${String(meta.preview).slice(0, 200)}` : ''}`);

        return passed;
    }

    // ── Assertions ──────────────────────────────────────────────────────────────
    assert(condition, message) {
        if (!condition) throw new Error(`Assertion failed: ${message}`);
    }

    assertEqual(a, b, message) {
        if (a !== b) throw new Error(`${message || 'assertEqual'}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
    }

    assertStatus(res, expected, label) {
        if (res.status !== expected) {
            throw new Error(`${label || 'HTTP status'}: expected ${expected}, got ${res.status}`);
        }
    }

    assertHasKey(obj, key, label) {
        if (obj[key] === undefined || obj[key] === null) {
            throw new Error(`${label || 'assertHasKey'}: missing key "${key}" in ${JSON.stringify(Object.keys(obj))}`);
        }
    }

    // ── Cookie jar ──────────────────────────────────────────────────────────────
    setCookiesFromResponse(res) {
        const raw = res.headers.getSetCookie?.() || [];
        for (const c of raw) {
            const [pair] = c.split(';');
            const [name, value] = pair.split('=');
            if (name && value !== undefined) {
                this.cookies[name.trim()] = value.trim();
            }
        }
    }

    getCookieHeader() {
        return Object.entries(this.cookies)
            .map(([k, v]) => `${k}=${v}`)
            .join('; ');
    }

    clearCookies() {
        this.cookies = {};
    }

    // ── Summary ─────────────────────────────────────────────────────────────────
    summary() {
        const total  = this.results.length;
        const passed = this.results.filter(r => r.passed).length;
        const failed = total - passed;

        const durations = this.results.map(r => r.ms).sort((a, b) => a - b);
        const avg  = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
        const p50  = durations[Math.floor(durations.length * 0.50)] || 0;
        const p95  = durations[Math.floor(durations.length * 0.95)] || 0;
        const p99  = durations[Math.floor(durations.length * 0.99)] || 0;

        const summaryText = [
            `\n${'─'.repeat(70)}`,
            `  RESULTS   ${passed}/${total} passed    ${failed > 0 ? failed + ' FAILED' : 'all passed'}`,
            `  LATENCY   avg ${avg}ms   p50 ${p50}ms   p95 ${p95}ms   p99 ${p99}ms`,
            `  REPORT    ${this.logPath}`,
            `${'─'.repeat(70)}`
        ].join('\n');

        const passColor = failed === 0 ? C.green : C.red;

        console.log('\n' + color(C.bold, '─'.repeat(70)));
        console.log(color(C.bold + passColor, `  ${passed}/${total} passed`) + (failed > 0 ? color(C.red, `  — ${failed} FAILED`) : ''));
        console.log(color(C.gray, `  avg ${avg}ms   p50 ${p50}ms   p95 ${p95}ms   p99 ${p99}ms`));
        console.log(color(C.gray, `  Report: ${this.logPath}`));
        console.log(color(C.bold, '─'.repeat(70)) + '\n');

        this._write(summaryText);
        this._write(`\nFinished: ${new Date().toISOString()}`);

        // Write JSON report alongside txt
        const jsonPath = this.logPath.replace('.txt', '.json');
        const jsonReport = {
            startedAt:  new Date().toISOString(),
            baseUrl:    this.baseUrl,
            total, passed, failed,
            latency: { avg, p50, p95, p99 },
            results: this.results
        };
        fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
        console.log(color(C.gray, `  JSON:   ${jsonPath}\n`));

        this.logStream.end();
        return failed === 0;
    }

    _write(line) {
        this.logStream.write(line + '\n');
    }
}

module.exports = { Runner };
