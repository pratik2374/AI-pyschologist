// HTTP helpers — thin wrappers around fetch for test suite use.
// All functions return the raw Response object so assertions can check status.
// SSE streaming is handled by readSSEStream() which collects all events.

/**
 * JSON POST
 */
const post = async (baseUrl, path, body, cookieHeader = '') => {
    return fetch(`${baseUrl}${path}`, {
        method:  'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(cookieHeader ? { Cookie: cookieHeader } : {})
        },
        body: JSON.stringify(body)
    });
};

/**
 * JSON GET
 */
const get = async (baseUrl, path, cookieHeader = '') => {
    return fetch(`${baseUrl}${path}`, {
        method:  'GET',
        headers: cookieHeader ? { Cookie: cookieHeader } : {}
    });
};

/**
 * JSON PUT
 */
const put = async (baseUrl, path, body, cookieHeader = '') => {
    return fetch(`${baseUrl}${path}`, {
        method:  'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...(cookieHeader ? { Cookie: cookieHeader } : {})
        },
        body: JSON.stringify(body)
    });
};

/**
 * JSON DELETE
 */
const del = async (baseUrl, path, body, cookieHeader = '') => {
    return fetch(`${baseUrl}${path}`, {
        method:  'DELETE',
        headers: {
            'Content-Type': 'application/json',
            ...(cookieHeader ? { Cookie: cookieHeader } : {})
        },
        body: body ? JSON.stringify(body) : undefined
    });
};

/**
 * SSE streaming POST — sends a chat message and collects all SSE events.
 *
 * Returns:
 * {
 *   chunks:        string[]   — all text chunks received
 *   fullText:      string     — concatenated response
 *   events:        object[]   — all parsed event payloads
 *   ttft:          number     — ms from request start to first chunk
 *   totalMs:       number     — ms from request start to done event
 *   tokenCount:    number     — rough token estimate (words * 1.3)
 *   tokensPerSec:  number     — throughput
 *   error:         string|null
 * }
 */
const streamChat = async (baseUrl, body, cookieHeader = '') => {
    const start  = Date.now();
    let ttft     = null;
    const chunks = [];
    const events = [];
    let errorMsg = null;

    const response = await fetch(`${baseUrl}/api/v1/chat`, {
        method:  'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept:         'text/event-stream',
            ...(cookieHeader ? { Cookie: cookieHeader } : {})
        },
        body: JSON.stringify(body)
    });

    if (!response.ok || !response.body) {
        const text = await response.text().catch(() => '');
        return {
            chunks: [], fullText: '', events: [],
            ttft: Date.now() - start, totalMs: Date.now() - start,
            tokenCount: 0, tokensPerSec: 0,
            status: response.status,
            error: `HTTP ${response.status}: ${text.slice(0, 200)}`
        };
    }

    // Read the response body stream and parse SSE lines
    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer    = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // SSE lines are separated by \n\n
            const lines = buffer.split('\n');
            buffer = lines.pop();   // last item might be incomplete — keep in buffer

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data:')) continue;

                const raw = trimmed.slice(5).trim();
                if (!raw) continue;

                try {
                    const payload = JSON.parse(raw);
                    events.push(payload);

                    if (payload.type === 'chunk') {
                        if (ttft === null) ttft = Date.now() - start;
                        chunks.push(payload.content);
                    }

                    if (payload.type === 'error') {
                        errorMsg = payload.message;
                    }
                } catch {
                    // non-JSON SSE line — skip
                }
            }
        }
    } finally {
        reader.releaseLock();
    }

    const totalMs    = Date.now() - start;
    const fullText   = chunks.join('');
    const wordCount  = fullText.split(/\s+/).filter(Boolean).length;
    const tokenCount = Math.round(wordCount * 1.3);   // rough estimate
    const tokensPerSec = totalMs > 0 ? Math.round(tokenCount / (totalMs / 1000)) : 0;

    return {
        chunks,
        fullText,
        events,
        ttft:         ttft ?? totalMs,
        totalMs,
        tokenCount,
        tokensPerSec,
        status:       response.status,
        error:        errorMsg
    };
};

/**
 * Safe JSON parse from a Response object — returns { ok, status, data, raw }
 */
const parseJSON = async (res) => {
    const raw = await res.text();
    try {
        return { ok: res.ok, status: res.status, data: JSON.parse(raw), raw };
    } catch {
        return { ok: res.ok, status: res.status, data: null, raw };
    }
};

module.exports = { post, get, put, del, streamChat, parseJSON };
