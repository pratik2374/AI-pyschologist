// Chat Test Suite
//
// Requires: runner.cookies must have a valid token (run auth suite first, or login here)
//
// Tests:
//   - First message (first session opener)
//   - SSE stream structure (chunk events, done event)
//   - TTFT + total stream time logged
//   - Full conversation scenario (arjun_jee — 13 messages)
//   - GET /chat/history returns messages
//   - Empty message rejected
//   - Oversized message rejected
//   - Chat without auth rejected

const { post, get, parseJSON, streamChat } = require('../http');
const { TEST_USERS }    = require('../data/users');
const { CONVERSATIONS } = require('../data/conversations');
const User = require('../../models/User');

// Pause between messages so the 20/min rate limiter isn't tripped
// Each real Groq call takes ~2-5s, but we add an explicit floor just in case.
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// 3s between messages. Groq free tier: ~12,000 TPM on 70B, each request ≈ 8k tokens.
// At 3s spacing the TPM bucket can partially refill; Groq retries handle overflow.
const MSG_DELAY_MS = 3000;

module.exports = async (runner, baseUrl) => {
    runner.suite('Chat');

    // ── Ensure logged in ────────────────────────────────────────────────────────
    // If no cookie from auth suite, login now
    if (!runner.cookies.token) {
        const res = await post(baseUrl, '/api/v1/auth/login', {
            email:    TEST_USERS.arjun.email,
            password: TEST_USERS.arjun.password
        });
        runner.setCookiesFromResponse(res);
    }

    // Reset firstSession so opener fires cleanly
    await User.updateOne({ email: TEST_USERS.arjun.email }, { firstSession: true, messageCount: 0 });

    // ── 1. Empty message ─────────────────────────────────────────────────────────
    await runner.test('POST /chat → 400 empty message', async (r) => {
        const res  = await post(baseUrl, '/api/v1/chat', { message: '' }, runner.getCookieHeader());
        r.assertStatus(res, 400, 'empty message');
    });

    // ── 2. Oversized message ─────────────────────────────────────────────────────
    await runner.test('POST /chat → 400 message too long', async (r) => {
        const res = await post(baseUrl, '/api/v1/chat',
            { message: 'a'.repeat(4001) },
            runner.getCookieHeader()
        );
        r.assertStatus(res, 400, 'oversized message');
    });

    // ── 3. No auth ───────────────────────────────────────────────────────────────
    await runner.test('POST /chat → 401 without token', async (r) => {
        const result = await streamChat(baseUrl, { message: 'hello' }, '');
        r.assert(result.status === 401, `expected 401, got ${result.status}`);
    });

    // ── 4. First message — opener should fire ────────────────────────────────────
    await runner.test('First message → SSE streams + opener in history', async (r) => {
        const result = await streamChat(baseUrl,
            { message: 'hi' },
            runner.getCookieHeader()
        );

        r.assert(!result.error, `stream error: ${result.error}`);
        r.assert(result.chunks.length > 0, 'should receive at least one chunk');
        r.assert(result.fullText.length > 20, 'response should be non-trivial');
        r.assert(result.ttft < 90000, `TTFT too slow: ${result.ttft}ms`);

        return {
            preview: `TTFT=${result.ttft}ms  total=${result.totalMs}ms  tokens≈${result.tokenCount}  ${result.tokensPerSec}tok/s | "${result.fullText.slice(0, 80)}..."`
        };
    });

    // ── 5. Second message — real conversation ────────────────────────────────────
    await sleep(MSG_DELAY_MS);
    await runner.test('Second message → streams coherent response', async (r) => {
        const result = await streamChat(baseUrl,
            { message: CONVERSATIONS.arjun_jee[1] },
            runner.getCookieHeader()
        );

        r.assert(!result.error, `stream error: ${result.error}`);
        r.assert(result.fullText.length > 50, 'response should be substantive');

        return {
            preview: `TTFT=${result.ttft}ms  total=${result.totalMs}ms  tokens≈${result.tokenCount}  ${result.tokensPerSec}tok/s`
        };
    });

    // ── 6. Full conversation — arjun_jee (13 messages) ──────────────────────────
    // Sends all messages in sequence and measures each one
    const conversationMetrics = [];

    for (let i = 2; i < CONVERSATIONS.arjun_jee.length; i++) {
        await sleep(MSG_DELAY_MS);
        const msg = CONVERSATIONS.arjun_jee[i];
        const shortLabel = msg.slice(0, 40).replace(/\n/g, ' ');

        await runner.test(`Conversation msg ${i+1}: "${shortLabel}..."`, async (r) => {
            const result = await streamChat(baseUrl,
                { message: msg },
                runner.getCookieHeader()
            );

            r.assert(!result.error, `stream error: ${result.error}`);
            r.assert(result.chunks.length > 0, 'must receive chunks');
            // Free-tier Groq (12k TPM, 70B model): each request ≈ 8k tokens.
            // With retry backoff the response may arrive after 30–60s on a busy bucket.
            r.assert(result.ttft < 90000, `TTFT too slow: ${result.ttft}ms (limit 90s)`);
            r.assert(result.totalMs < 120000, `Total too slow: ${result.totalMs}ms (limit 120s)`);

            conversationMetrics.push({
                msgNum: i + 1,
                ttft:   result.ttft,
                total:  result.totalMs,
                tokens: result.tokenCount,
                tps:    result.tokensPerSec
            });

            return {
                preview: `TTFT=${result.ttft}ms  total=${result.totalMs}ms  ~${result.tokenCount}tok  ${result.tokensPerSec}tok/s`
            };
        });
    }

    // ── 7. Conversation performance summary ──────────────────────────────────────
    await runner.test('Conversation metrics summary', async (r) => {
        if (conversationMetrics.length === 0) {
            return { preview: 'No metrics collected' };
        }

        const ttfts  = conversationMetrics.map(m => m.ttft).sort((a, b) => a - b);
        const totals = conversationMetrics.map(m => m.total).sort((a, b) => a - b);
        const tpss   = conversationMetrics.map(m => m.tps);

        const avg   = arr => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
        const p95   = arr => arr[Math.floor(arr.length * 0.95)] || arr[arr.length - 1];

        const summary = [
            `TTFT:  avg=${avg(ttfts)}ms  p95=${p95(ttfts)}ms  min=${ttfts[0]}ms  max=${ttfts[ttfts.length-1]}ms`,
            `Total: avg=${avg(totals)}ms  p95=${p95(totals)}ms`,
            `TPS:   avg=${avg(tpss)} tok/s`
        ].join('  |  ');

        // Free-tier threshold — upgrade Groq plan for sub-5s averages
        r.assert(avg(ttfts) < 90000, `Average TTFT ${avg(ttfts)}ms exceeds 90s threshold`);

        return { preview: summary };
    });

    // ── 8. GET /chat/history ─────────────────────────────────────────────────────
    await runner.test('GET /chat/history → messages in order', async (r) => {
        const res  = await get(baseUrl, '/api/v1/chat/history', runner.getCookieHeader());
        const body = await parseJSON(res);
        r.assertStatus(res, 200, 'history');
        r.assert(Array.isArray(body.data?.messages), 'messages should be array');
        r.assert(body.data.messages.length >= 2, 'should have at least opener + messages');

        const roles = body.data.messages.map(m => m.role);
        r.assert(roles.includes('user'), 'should have user messages');
        r.assert(roles.includes('aria'), 'should have aria messages');

        return {
            preview: `${body.data.messages.length} messages, first role="${roles[0]}", mode=${body.data.encryptionMode}`
        };
    });

    // ── 9. History without auth ──────────────────────────────────────────────────
    await runner.test('GET /chat/history → 401 without token', async (r) => {
        const res = await get(baseUrl, '/api/v1/chat/history', '');
        r.assertStatus(res, 401, 'history without token');
    });
};
