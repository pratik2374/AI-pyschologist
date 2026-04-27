// LLM Client — OpenAI GPT
//
// Four call types (same exports as before — nothing else in the codebase changes):
//   1. streamTherapistResponse — main Dr. Aria response (streaming)
//   2. runObserver             — silent clinical observer (JSON, non-streaming)
//   3. runCompression          — chapter compression (prose, non-streaming)
//   4. runProfileSynthesis     — longitudinal profile update (JSON, non-streaming)
//
// Model strategy:
//   MAIN_MODEL     = gpt-4o          → quality responses, Dr. Aria's voice
//   FAST_MODEL     = gpt-4o-mini     → observer, compression, synthesis (cheap + fast)
//
// Cost per user per day (10 messages, ~8k tokens/msg):
//   gpt-4o      main:  ~$0.25/user/day
//   gpt-4o-mini main:  ~$0.015/user/day   ← set OPENAI_MAIN_MODEL=gpt-4o-mini to use this

const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAIN_MODEL = process.env.OPENAI_MAIN_MODEL || 'gpt-4o';
const FAST_MODEL = process.env.OPENAI_FAST_MODEL || 'gpt-4o-mini';

const readOptionalMaxTokens = (envName) => {
    const raw = process.env[envName];
    if (!raw) return null;

    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;

    return parsed;
};

const MAIN_MAX_TOKENS       = readOptionalMaxTokens('OPENAI_MAIN_MAX_TOKENS');
const OBSERVER_MAX_TOKENS   = readOptionalMaxTokens('OPENAI_OBSERVER_MAX_TOKENS');
const COMPRESSION_MAX_TOKENS = readOptionalMaxTokens('OPENAI_COMPRESSION_MAX_TOKENS');
const SYNTHESIS_MAX_TOKENS  = readOptionalMaxTokens('OPENAI_SYNTHESIS_MAX_TOKENS');


// ─── Retry helper ─────────────────────────────────────────────────────────────

/**
 * Parse retry-after from an OpenAI rate-limit error.
 * OpenAI returns a `retry-after` header (seconds) on 429s.
 * Returns ms to wait, or null if not determinable / wait too long.
 */
const parseRetryWait = (err) => {
    // OpenAI SDK wraps headers in err.headers
    const headerSec = parseInt(err?.headers?.['retry-after'] || '0', 10);
    if (headerSec > 0 && headerSec <= 65) return headerSec * 1000;

    // Some OpenAI errors embed "Please try again in Xs" in the message
    const msg   = err?.message || err?.error?.message || '';
    const match = msg.match(/try again in\s+(?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?/i);
    if (match) {
        const totalMs = (
            parseFloat(match[1] || 0) * 3600 +
            parseFloat(match[2] || 0) * 60  +
            parseFloat(match[3] || 0)
        ) * 1000;
        if (totalMs > 120_000) return null;  // >2 min = quota issue, don't retry
        return totalMs;
    }

    return null;
};


// ─── 1. Streaming therapist response ─────────────────────────────────────────

/**
 * Streams Dr. Aria's response token by token.
 * Calls onChunk(text) for each delta, onDone(fullText) when stream ends.
 */
const streamTherapistResponse = async (systemPrompt, messages, onChunk, onDone, _attempt = 0) => {
    const MAX_RETRIES    = 2;
    const RETRY_FALLBACK = [10000, 20000];  // 10s, 20s — OpenAI 429s refill faster than Groq

    try {
        const request = {
            model:       MAIN_MODEL,
            temperature: 0.75,
            stream:      true,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages
            ]
        };

        if (MAIN_MAX_TOKENS) request.max_tokens = MAIN_MAX_TOKENS;

        const stream = await openai.chat.completions.create(request);

        let fullText = '';

        for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
                fullText += text;
                onChunk(text);
            }
        }

        onDone(fullText);

    } catch (err) {
        const isRateLimit = err?.status === 429;
        const isRetryable = isRateLimit || err?.status === 503 || err?.status === 500;

        if (isRetryable && _attempt < MAX_RETRIES) {
            const waitMs = parseRetryWait(err) ?? RETRY_FALLBACK[_attempt];

            if (waitMs === null) {
                console.error(`[OpenAI] Quota exhausted. Check platform.openai.com/usage for details.`);
                throw err;
            }

            console.warn(`[OpenAI] ${err?.status} on attempt ${_attempt + 1} — retrying in ${Math.round(waitMs / 1000)}s`);
            await new Promise(r => setTimeout(r, waitMs));
            return streamTherapistResponse(systemPrompt, messages, onChunk, onDone, _attempt + 1);
        }

        throw err;
    }
};


// ─── 2. Silent clinical observer ──────────────────────────────────────────────

/**
 * Runs the observer prompt and returns parsed JSON, or null on failure.
 * Uses gpt-4o-mini — fast, cheap, accurate enough for structured JSON output.
 */
const runObserver = async (observerPrompt) => {
    const request = {
        model:           FAST_MODEL,
        temperature:     0.1,
        stream:          false,
        response_format: { type: 'json_object' },   // forces valid JSON output
        messages: [{ role: 'user', content: observerPrompt }]
    };

    if (OBSERVER_MAX_TOKENS) request.max_tokens = OBSERVER_MAX_TOKENS;

    const response = await openai.chat.completions.create(request);

    const raw = response.choices[0]?.message?.content || '';

    try {
        return JSON.parse(raw);
    } catch {
        // Fallback: extract JSON object from prose
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) return null;
        try { return JSON.parse(match[0]); } catch { return null; }
    }
};


// ─── 3. Chapter compression ───────────────────────────────────────────────────

/**
 * Compresses a transcript block into a clinical narrative summary.
 * Uses gpt-4o-mini — summarization doesn't need the large model.
 */
const runCompression = async (compressionPrompt) => {
    const request = {
        model:       FAST_MODEL,
        temperature: 0.2,
        stream:      false,
        messages: [{ role: 'user', content: compressionPrompt }]
    };

    if (COMPRESSION_MAX_TOKENS) request.max_tokens = COMPRESSION_MAX_TOKENS;

    const response = await openai.chat.completions.create(request);

    return response.choices[0]?.message?.content?.trim() || '';
};


// ─── 4. Longitudinal profile synthesis ───────────────────────────────────────

/**
 * Updates the user's longitudinal profile from recent observations.
 * Uses gpt-4o-mini for speed — profile updates run in background.
 */
const runProfileSynthesis = async (synthesisPrompt) => {
    const request = {
        model:           FAST_MODEL,
        temperature:     0.2,
        stream:          false,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: synthesisPrompt }]
    };

    if (SYNTHESIS_MAX_TOKENS) request.max_tokens = SYNTHESIS_MAX_TOKENS;

    const response = await openai.chat.completions.create(request);

    const raw = response.choices[0]?.message?.content || '';

    try {
        return JSON.parse(raw);
    } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) return null;
        try { return JSON.parse(match[0]); } catch { return null; }
    }
};


module.exports = {
    streamTherapistResponse,
    runObserver,
    runCompression,
    runProfileSynthesis
};
