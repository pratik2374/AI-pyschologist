#!/usr/bin/env node
/**
 * Dr. Aria — Interactive CLI Chat
 *
 * Usage:
 *   node chat.js                               → auto create/login test user
 *   node chat.js --email=me@x.com             → use specific email (default password)
 *   node chat.js --email=me@x.com --password=X → use specific credentials
 *   node chat.js --signup                      → force fresh user creation
 *   node chat.js --verbose                     → show full error detail
 *   node chat.js --url=http://localhost:5000   → custom server URL
 *
 * Commands during chat:
 *   /quit       → exit
 *   /history    → show last 6 messages
 *   /me         → show user info
 *   /clear      → refresh session
 *   /help       → commands list
 */

require('dotenv').config();

const readline = require('readline');
const http     = require('http');
const https    = require('https');
const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = process.argv.find(a => a.startsWith('--url='))?.split('=')[1]
              || process.env.TEST_URL
              || 'http://localhost:4000';
const API = `${BASE_URL}/api/v1`;

const DEFAULT_EMAIL    = 'chat.cli@aria.test';
const DEFAULT_PASSWORD = 'CliTest@123';
const DEFAULT_NAME     = 'CLI Tester';

// ─── Args ─────────────────────────────────────────────────────────────────────
const args = {};
for (const a of process.argv.slice(2)) {
    const [k, v] = a.replace(/^--/, '').split('=');
    args[k] = v ?? true;
}
const useEmail    = args.email    || DEFAULT_EMAIL;
const usePassword = args.password || DEFAULT_PASSWORD;
const forceSignup = !!args.signup;
let   VERBOSE     = !!args.verbose;

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
    reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
    green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
    cyan: '\x1b[36m', magenta: '\x1b[35m',
    gray: '\x1b[90m', white: '\x1b[37m', orange: '\x1b[38;5;208m',
};
const c  = (col, s) => `${col}${s}${C.reset}`;
const hr = (ch = '─', n = 46) => ch.repeat(n);

// ─── Session ──────────────────────────────────────────────────────────────────
let sessionCookie = '';
let currentUser   = null;

// ─── Raw HTTP ─────────────────────────────────────────────────────────────────
const request = (method, path, body) => new Promise((resolve, reject) => {
    const url     = new URL(API + path);
    const lib     = url.protocol === 'https:' ? https : http;
    const data    = body ? JSON.stringify(body) : null;
    const options = {
        hostname: url.hostname,
        port:     url.port || (url.protocol === 'https:' ? 443 : 80),
        path:     url.pathname + url.search,
        method,
        headers: {
            'Content-Type': 'application/json',
            'Accept':       'application/json',
            ...(data          ? { 'Content-Length': Buffer.byteLength(data) } : {}),
            ...(sessionCookie ? { Cookie: sessionCookie } : {})
        }
    };

    const req = lib.request(options, (res) => {
        const sc = res.headers['set-cookie'];
        if (sc) sessionCookie = sc.map(c => c.split(';')[0]).join('; ');

        let raw = '';
        res.on('data', d => raw += d);
        res.on('end', () => {
            let data = null;
            try { data = JSON.parse(raw); } catch { /* leave null */ }
            resolve({ status: res.statusCode, data, raw, headers: res.headers });
        });
    });
    req.on('error', err => reject(new Error(`Connection error: ${err.message}\nIs the server running? Start it: node index.js`)));
    if (data) req.write(data);
    req.end();
});

// ─── SSE streaming ────────────────────────────────────────────────────────────
const streamChat = (message) => new Promise((resolve, reject) => {
    const url     = new URL(API + '/chat');
    const body    = JSON.stringify({ message });
    const lib     = url.protocol === 'https:' ? https : http;
    const start   = Date.now();

    const req = lib.request({
        hostname: url.hostname,
        port:     url.port || (url.protocol === 'https:' ? 443 : 80),
        path:     url.pathname,
        method:   'POST',
        headers: {
            'Content-Type':   'application/json',
            'Accept':         'text/event-stream',
            'Content-Length': Buffer.byteLength(body),
            'Cache-Control':  'no-cache',
            ...(sessionCookie ? { Cookie: sessionCookie } : {})
        }
    }, (res) => {
        if (res.statusCode !== 200) {
            let raw = '';
            res.on('data', d => raw += d);
            res.on('end', () => {
                let detail = raw;
                try { detail = JSON.stringify(JSON.parse(raw), null, 2); } catch {}
                reject(new Error(`HTTP ${res.statusCode}\n${detail}`));
            });
            return;
        }

        let buffer = '', full = '', ttft = null;
        process.stdout.write(c(C.bold + C.cyan, '\n  Dr. Aria  ') + c(C.dim, hr() + '\n'));
        process.stdout.write('  ');

        res.on('data', chunk => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                const t = line.trim();
                if (!t.startsWith('data:')) continue;
                const raw = t.slice(5).trim();
                if (!raw) continue;

                let p;
                try { p = JSON.parse(raw); }
                catch {
                    if (VERBOSE) process.stdout.write(c(C.gray, `[unparseable SSE: ${raw}] `));
                    continue;
                }

                if (p.type === 'chunk') {
                    if (ttft === null) ttft = Date.now() - start;
                    process.stdout.write(p.content);
                    full += p.content;
                }

                if (p.type === 'done') {
                    const ms   = Date.now() - start;
                    const toks = Math.round(full.split(/\s+/).filter(Boolean).length * 1.3);
                    const tps  = ms > 0 ? Math.round(toks / (ms / 1000)) : 0;
                    process.stdout.write('\n');
                    process.stdout.write(c(C.dim, `\n  ⏱  TTFT ${ttft ?? '?'}ms  |  ${ms}ms  |  ~${toks} tokens  |  ${tps} tok/s\n`));
                    resolve(full);
                }

                if (p.type === 'error') {
                    process.stdout.write('\n');
                    // Full error from server — show everything
                    res.destroy();
                    reject(new Error(p.message));
                }
            }
        });

        res.on('error',  err => {
            res.destroy();
            reject(new Error(`Stream I/O: ${err.message}`));
        });
        res.on('end',    ()  => { 
            if (ttft === null) reject(new Error('Stream closed with no data')); 
        });
    });

    req.on('error', err => {
        req.destroy();
        reject(new Error(`Connection: ${err.message}\nStart server: node index.js`));
    });
    req.write(body);
    req.end();
});

// ─── Error printer (always shows full detail) ─────────────────────────────────
const printError = (label, err) => {
    console.log('');
    console.log(c(C.red + C.bold, `  ✗ ${label}`));
    if (err?.message) {
        err.message.split('\n').forEach(line => console.log(c(C.red, `    ${line}`)));
    }
    if (VERBOSE && err?.stack) {
        console.log(c(C.gray, '  Stack:'));
        err.stack.split('\n').slice(1, 6).forEach(line => console.log(c(C.gray, `  ${line}`)));
    }
    console.log('');
};

// ─── Auth — mint JWT directly, no rate-limit exposure ─────────────────────────
/**
 * Connects to MongoDB, finds or creates the test user,
 * mints a JWT with the same payload/secret as Auth.js,
 * and injects it into the session cookie — no HTTP login needed.
 */
const ensureUser = async () => {
    if (mongoose.connection.readyState !== 1) {
        if (VERBOSE) console.log(c(C.gray, `  Connecting to MongoDB...`));
        await mongoose.connect(process.env.MONGODB_URL, { serverSelectionTimeoutMS: 6000 });
    }

    const User = require('./models/User');

    // Try to find existing user
    let user = await User.findOne({ email: useEmail });

    if (!user || forceSignup) {
        // Delete old user if forcing signup
        if (user && forceSignup) {
            await User.deleteOne({ email: useEmail });
            console.log(c(C.gray, `  Deleted existing user: ${useEmail}`));
        }

        // Create fresh user
        const hash = await bcrypt.hash(usePassword, 10);
        user = await User.create({
            name:           DEFAULT_NAME,
            preferredName:  'Tester',
            email:          useEmail,
            password:       hash,
            role:           'Visitor',
            encryptionMode: 'A',
        });
        console.log(c(C.green, `  ✓ User created: ${user.name} (${useEmail})`));
    } else {
        console.log(c(C.green, `  ✓ User found: ${user.preferredName || user.name} (${useEmail})`));
    }

    // Mint JWT — same payload/secret/expiry as Auth.js
    if (!process.env.SECRET_KEY) {
        throw new Error('SECRET_KEY not set in .env — cannot mint JWT');
    }
    const token = jwt.sign(
        { role: user.role, userid: user._id, email: user.email },
        process.env.SECRET_KEY,
        { expiresIn: '7d' }
    );
    sessionCookie = `token=${token}`;
    currentUser   = user;

    if (VERBOSE) console.log(c(C.gray, `  JWT minted. Mode: ${user.encryptionMode} | ID: ${user._id}`));
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const main = async () => {
    console.clear();
    console.log(c(C.bold + C.magenta, `\n  ╔══════════════════════════════════════════╗`));
    console.log(c(C.bold + C.magenta,   `  ║          Dr. Aria — CLI Chat              ║`));
    console.log(c(C.bold + C.magenta,   `  ╚══════════════════════════════════════════╝`));
    console.log(c(C.gray,             `  Server: ${BASE_URL}`));
    console.log(c(C.gray,               `  /help for commands  |  Ctrl+C or /quit to exit\n`));

    // ── Auth ──────────────────────────────────────────────────────────────────
    try {
        await ensureUser();
        console.log(c(C.dim, `  Encryption: ${currentUser?.encryptionMode || 'A'}  |  Messages so far: ${currentUser?.messageCount || 0}\n`));
    } catch (err) {
        printError('Failed to authenticate', err);
        console.log(c(C.yellow, '  Checklist:'));
        console.log(c(C.white,  '    1. Server running?  →  node index.js'));
        console.log(c(C.white,  '    2. MongoDB up?      →  check MONGODB_URL in .env'));
        console.log(c(C.white,  '    3. SECRET_KEY set?  →  check .env\n'));
        process.exit(1);
    }

    // ── REPL ──────────────────────────────────────────────────────────────────
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const prompt = () => process.stdout.write(c(C.bold + C.green, '\n  You  ') + c(C.dim, hr() + '\n  '));

    // Pause readline while streaming so stdin EOF doesn't kill the process mid-response
    let streaming = false;

    prompt();

    rl.on('line', async (line) => {
        if (streaming) return;
        
        const msg = line.trim();
        if (!msg) { prompt(); return; }

        // ── Slash commands ─────────────────────────────────────────────────────
        switch (msg) {
            case '/quit': case '/exit':
                console.log(c(C.dim, '\n  Goodbye.\n'));
                process.exit(0);

            case '/help':
                console.log(c(C.bold, '\n  Commands:'));
                [
                    ['/quit',    'exit the chat'],
                    ['/history', 'show last 6 messages from server'],
                    ['/me',      'show current user info'],
                    ['/clear',   'refresh JWT / reset session'],
                    ['/verbose', 'toggle verbose error output (currently ' + (VERBOSE ? 'ON' : 'OFF') + ')'],
                ].forEach(([cmd, desc]) =>
                    console.log(c(C.cyan, `    ${cmd.padEnd(12)}`) + c(C.gray, desc))
                );
                console.log('');
                prompt(); return;

            case '/verbose':
                VERBOSE = !VERBOSE;
                console.log(c(C.yellow, `\n  Verbose: ${VERBOSE ? 'ON' : 'OFF'}\n`));
                prompt(); return;

            case '/me': {
                try {
                    const r = await request('GET', '/auth/me');
                    if (r.status === 200) {
                        const u = r.data?.user;
                        console.log(c(C.bold, '\n  Current user:'));
                        console.log(c(C.gray, `    Name:      ${u.name}`));
                        console.log(c(C.gray, `    Email:     ${u.email}`));
                        console.log(c(C.gray, `    Mode:      ${u.encryptionMode}`));
                        console.log(c(C.gray, `    Messages:  ${u.messageCount || 0}`));
                        console.log(c(C.gray, `    Session:   firstSession=${u.firstSession}`));
                        console.log('');
                    } else {
                        printError(`/me → HTTP ${r.status}`, new Error(r.raw));
                    }
                } catch (err) { printError('/me request failed', err); }
                prompt(); return;
            }

            case '/history': {
                try {
                    const r = await request('GET', '/chat/history');
                    if (r.status === 200) {
                        const msgs = r.data?.messages || [];
                        if (!msgs.length) {
                            console.log(c(C.gray, '\n  No messages yet.\n'));
                        } else {
                            console.log(c(C.bold, `\n  Last ${Math.min(msgs.length, 6)} messages:`));
                            msgs.slice(-6).forEach(m => {
                                const role = m.role === 'user'
                                    ? c(C.green + C.bold, '  You:  ')
                                    : c(C.cyan  + C.bold, '  Aria: ');
                                console.log(role + c(C.gray, (m.content || '').replace(/\n/g, ' ').slice(0, 130)));
                            });
                            console.log('');
                        }
                    } else {
                        // Show full error
                        printError(`/chat/history → HTTP ${r.status}`, new Error(JSON.stringify(r.data, null, 2) || r.raw));
                    }
                } catch (err) { printError('/history failed', err); }
                prompt(); return;
            }

            case '/clear': {
                console.log(c(C.yellow, '\n  Refreshing session...\n'));
                try {
                    await ensureUser();
                    console.log(c(C.dim, `  Mode: ${currentUser?.encryptionMode}  |  Messages: ${currentUser?.messageCount || 0}\n`));
                } catch (err) { printError('Session refresh failed', err); }
                prompt(); return;
            }
        }

        // ── Chat ───────────────────────────────────────────────────────────────
        streaming = true;
        rl.pause();           // stop reading stdin until stream is done
        try {
            await streamChat(msg);
        } catch (err) {
            // Always print the full error — every line
            printError('Dr. Aria response error', err);

            const m = err.message.toLowerCase();

            // Contextual hints based on error type
            if (m.includes('401') || m.includes('authentication required')) {
                console.log(c(C.yellow, '  Session expired → refreshing JWT...\n'));
                sessionCookie = '';
                try {
                    await ensureUser();
                    console.log(c(C.dim, '  Done. Try your message again.\n'));
                } catch (re) { printError('JWT refresh failed', re); }
            }
            else if (m.includes('tpd') || m.includes('tokens per day') || m.includes('100000') || m.includes('daily')) {
                console.log(c(C.orange, '  ⚠  Groq FREE TIER daily quota exhausted (100,000 tok/day).'));
                console.log(c(C.gray,   '     Check server.log for exact reset time (usually ~1-2h).'));
                console.log(c(C.gray,   '     Or upgrade: console.groq.com/settings/billing\n'));
            }
            else if (m.includes('429') || m.includes('rate limit')) {
                console.log(c(C.yellow, '  ⚠  Rate limited. Wait 1 minute and try again.\n'));
            }
            else if (m.includes('unavailable') || m.includes('try again')) {
                console.log(c(C.yellow, '  Groq API temporarily unavailable. Try again in a moment.\n'));
            }
            else if (m.includes('econnrefused') || m.includes('connection')) {
                console.log(c(C.red,    '  Cannot reach server.'));
                console.log(c(C.white,  '  Start it: node index.js\n'));
            }
        }

        streaming = false;
        rl.resume();          // re-enable stdin after stream is done
        prompt();
    });

    // Only exit on close if we're not mid-stream (stream completion calls resume → prompt)
    rl.on('close', () => {
        if (!streaming) {
            console.log(c(C.dim, '\n\n  Session ended.\n'));
            process.exit(0);
        }
    });
};

main().catch(err => {
    console.error(c(C.red, `\n  Fatal: ${err.message}\n`));
    if (VERBOSE) console.error(err.stack);
    process.exit(1);
});
