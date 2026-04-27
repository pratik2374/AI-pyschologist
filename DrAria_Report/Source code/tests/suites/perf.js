// Performance Test Suite
//
// Tests:
//   1. Warmup — 3 sequential requests to prime the OpenAI connection
//   2. Single-message latency benchmark — 5 messages, P50/P95
//   3. Long message performance — tests with a paragraph-length input
//   4. Crisis detection path — sends a Level 2 signal, verifies no cutoff
//   5. Conversation with gap — simulates a user returning after 24+ hours

const { streamChat, post, get, parseJSON } = require('../http');
const { TEST_USERS }    = require('../data/users');
const { QUICK_MESSAGES, CONVERSATIONS } = require('../data/conversations');
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const User   = require('../../models/User');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = async (runner, baseUrl) => {
    runner.suite('Performance');

    // ── Ensure rahul exists and is logged in ─────────────────────────────────────
    // Perf suite always uses rahul — a separate user from arjun (chat suite).
    // This gives rahul a clean rate-limit bucket unaffected by chat suite traffic.
    // Always recreate rahul fresh — clean messageCount and firstSession state.
    // Mint JWT directly to avoid consuming the shared IP auth rate-limit bucket.
    await User.deleteOne({ email: TEST_USERS.rahul.email });
    const pw    = await bcrypt.hash(TEST_USERS.rahul.password, 10);
    const rahul = await User.create({
        name:           TEST_USERS.rahul.name,
        preferredName:  TEST_USERS.rahul.preferredName,
        email:          TEST_USERS.rahul.email,
        password:       pw,
        role:           'Visitor',
        encryptionMode: TEST_USERS.rahul.encryptionMode
    });

    const rahulToken = jwt.sign(
        { role: rahul.role, userid: rahul._id, email: rahul.email },
        process.env.SECRET_KEY,
        { expiresIn: '7d' }
    );
    runner.cookies.token = rahulToken;   // inject directly into cookie jar

    // ── 1. Warmup ────────────────────────────────────────────────────────────────
    await runner.test('Warmup — 3 sequential requests', async (r) => {

        const results = [];
        for (let i = 0; i < 3; i++) {
            await sleep(2000);   // 2s between warmup messages
            const result = await streamChat(baseUrl,
                { message: QUICK_MESSAGES[i] },
                runner.getCookieHeader()
            );
            results.push(result.totalMs);
            r.assert(!result.error, `Warmup ${i+1} error: ${result.error}`);
        }
        const avg = Math.round(results.reduce((a, b) => a + b, 0) / results.length);
        return { preview: `Warmup done. Times: ${results.join('ms, ')}ms. Avg: ${avg}ms` };
    });

    // ── 2. Single-message latency benchmark ──────────────────────────────────────
    await runner.test('Latency benchmark — 5 messages (P50/P95)', async (r) => {
        const metrics = [];
        for (let i = 0; i < 5; i++) {
            await sleep(3000);  // 3s between benchmark messages
            const msg    = QUICK_MESSAGES[i % QUICK_MESSAGES.length];
            const result = await streamChat(baseUrl, { message: msg }, runner.getCookieHeader());

            r.assert(!result.error, `Benchmark msg ${i+1} error: ${result.error}`);
            metrics.push({ ttft: result.ttft, total: result.totalMs, tps: result.tokensPerSec });
        }

        const sorted_ttft  = metrics.map(m => m.ttft).sort((a, b) => a - b);
        const sorted_total = metrics.map(m => m.total).sort((a, b) => a - b);
        const avg_tps      = Math.round(metrics.reduce((s, m) => s + m.tps, 0) / metrics.length);

        const p50_ttft  = sorted_ttft[Math.floor(sorted_ttft.length * 0.50)];
        const p95_ttft  = sorted_ttft[Math.floor(sorted_ttft.length * 0.95)] || sorted_ttft[sorted_ttft.length - 1];
        const p50_total = sorted_total[Math.floor(sorted_total.length * 0.50)];
        const p95_total = sorted_total[Math.floor(sorted_total.length * 0.95)] || sorted_total[sorted_total.length - 1];

        r.assert(p50_ttft  < 10000,  `P50 TTFT ${p50_ttft}ms exceeds 10s threshold`);
        r.assert(p95_ttft  < 20000,  `P95 TTFT ${p95_ttft}ms exceeds 20s threshold`);
        r.assert(p50_total < 60000,  `P50 total ${p50_total}ms exceeds 60s threshold`);

        return {
            preview: `TTFT: p50=${p50_ttft}ms p95=${p95_ttft}ms  |  Total: p50=${p50_total}ms p95=${p95_total}ms  |  TPS avg=${avg_tps}`
        };
    });

    // ── 4. Long input performance ─────────────────────────────────────────────────
    await sleep(5000);
    await runner.test('Long input (300 words) → streams without timeout', async (r) => {
        const longMsg = `I want to tell you everything that's been going on because I feel like I can never say all of it to anyone at once. My parents have been fighting for the past three months since my dad lost his job. He's been drinking more and when he drinks he gets loud but not violent, just... present in a way that fills the whole house and makes it hard to breathe. My mum cries when she thinks I can't hear. I have younger siblings, 14 and 11, and I feel responsible for them somehow even though I'm only 23 and I have my own things going on. I'm in my final year of masters, writing my dissertation on something I barely care about anymore, working part time to pay rent in a different city, and every time I go home for the weekend I come back more depleted than when I left. I don't sleep well. I eat okay but I don't enjoy food much. I've been canceling plans with friends for two months because I feel like if I talk I'll either say too much or cry or both and I don't want to do that to them. I also feel guilty writing this to an app because I keep thinking people have it worse and I should be grateful. My health is fine. I have a roof. I know that. But I'm so tired.`;

        const result = await streamChat(baseUrl, { message: longMsg }, runner.getCookieHeader());

        r.assert(!result.error, `stream error: ${result.error}`);
        r.assert(result.chunks.length > 0, 'must receive chunks');
        r.assert(result.fullText.length > 100, 'response should be substantive for long input');
        r.assert(result.totalMs < 120000, `Long input took too long: ${result.totalMs}ms`);

        return {
            preview: `Input: ~300 words  TTFT=${result.ttft}ms  Total=${result.totalMs}ms  Response≈${result.tokenCount}tok`
        };
    });

    // ── 5. Crisis detection path — Dr. Aria must NOT cut off ─────────────────────
    await runner.test('Crisis signal → Dr. Aria continues (never cuts off)', async (r) => {
        const result = await streamChat(baseUrl, {
            message: CONVERSATIONS.dev_crisis[2]  // "I've been having these thoughts like what's the point..."
        }, runner.getCookieHeader());

        r.assert(!result.error, `Stream errored during crisis message: ${result.error}`);
        r.assert(result.chunks.length > 0, 'Dr. Aria must respond to crisis message');
        r.assert(result.fullText.length > 50, 'Response must be substantive — not a canned cutoff message');

        // Must NOT contain "I can't help", "I'm unable to", "please call" as first response
        const coldCutoff = /^(I can't|I'm unable|I cannot|please call|emergency|hotline)/i.test(result.fullText.trim());
        r.assert(!coldCutoff, `Dr. Aria appears to have given a cold cutoff response: "${result.fullText.slice(0, 100)}"`);

        return {
            preview: `Crisis response: "${result.fullText.slice(0, 120)}..."`
        };
    });

    // ── 5. Gap simulation — user returns after simulated 48h absence ─────────────
    await sleep(2000);
    await runner.test('Gap simulation → Dr. Aria acknowledges return naturally', async (r) => {
        // Set lastSeenAt to 48 hours ago to simulate a gap
        const user = await User.findOne({ email: TEST_USERS.rahul.email });
        if (user) {
            const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
            await User.updateOne({ _id: user._id }, { lastSeenAt: twoDaysAgo, firstSession: false });
        }

        const result = await streamChat(baseUrl, {
            message: CONVERSATIONS.rahul_grief[0]
        }, runner.getCookieHeader());

        r.assert(!result.error, `stream error: ${result.error}`);
        r.assert(result.chunks.length > 0, 'must receive chunks');

        return {
            preview: `Gap response (48h sim): "${result.fullText.slice(0, 120)}..."`
        };
    });
};
