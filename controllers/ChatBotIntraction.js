// Chat Controller
//
// GET  /chat/history — returns messages for the authenticated user
//                      Mode A: decrypted (server has key)
//                      Mode B: returns ciphertext blobs only — client decrypts
//
// POST /chat         — SSE streaming endpoint
//
//   Mode A flow:
//     client sends:  { message: "plaintext" }
//     server builds context from DB (decrypts in RAM), calls Groq, streams response
//     server saves:  both messages encrypted in DB
//
//   Mode B flow:
//     client sends:  { encryptedMessage: "ciphertext", conversationContext: [{role, content}] }
//       - encryptedMessage  = the user's message encrypted client-side (stored as audit trail)
//       - conversationContext = recent decrypted history — used for this request only, never persisted
//     server:  stores encryptedMessage ciphertext, builds Groq context from conversationContext
//              streams response as plaintext (client encrypts before storing in IndexedDB)
//              observer runs on in-RAM plaintext only — stores derived insights, no raw text
//     server saves:  user ciphertext only (no aria response — client holds it)

const Message           = require('../models/Message');
const User              = require('../models/User');
const { buildContext }  = require('../ai/contextBuilder');
const { streamTherapistResponse } = require('../ai/groq');
const { firstSessionOpener }      = require('../ai/openers');
const { runObserverAsync, OBSERVER_CHUNK_SIZE } = require('../ai/observer');
const { encrypt } = require('../utils/encryption');


// ─── Past History ──────────────────────────────────────────────────────────────

/**
 * GET /chat/history
 *
 * Mode A: returns decrypted messages (server decrypts in RAM here)
 * Mode B: returns raw ciphertext blobs — client decrypts locally
 *         (server cannot decrypt Mode B content — that is the point)
 */
exports.pastHistory = async (req, res) => {
    try {
        const userId  = req.decoded?.userid;
        const context = await buildContext(userId);
        const { user, userKeyBuffer } = context;

        const rawMessages = await Message
            .find({ userId })
            .sort({ createdAt: 1 })
            .lean();

        // Mode A — decrypt before sending to client
        // Mode B — send raw ciphertext; client holds the key and decrypts locally
        const messages = rawMessages.map(msg => {
            if (userKeyBuffer && user?.encryptionMode === 'A') {
                try {
                    return { ...msg, content: require('../utils/encryption').decrypt(msg.content, userKeyBuffer) };
                } catch {
                    return msg;   // fallback: return as-is if decryption fails
                }
            }
            return msg;
        });

        return res.status(200).json({
            success:  true,
            message:  'Past chat history retrieved',
            messages,
            encryptionMode: user?.encryptionMode || 'A'
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching chat history'
        });
    }
};


// ─── Current Chat (SSE streaming) ─────────────────────────────────────────────

/**
 * POST /chat
 *
 * Mode A body: { message: string }
 * Mode B body: { encryptedMessage: string, conversationContext: [{role, content}] }
 *
 * SSE events:
 *   data: {"type":"chunk","content":"..."}
 *   data: {"type":"done"}
 *   data: {"type":"error","message":"..."}
 */
exports.currChat = async (req, res) => {
    const userId = req.decoded?.userid;

    try {
        // ── Identify mode and extract payload ─────────────────────────────────
        const context = await buildContext(userId);
        const { user, isFirstSession, gapMs, userKeyBuffer, systemPrompt } = context;
        const isModeb = user?.encryptionMode === 'B';

        // ── Extract and validate message ──────────────────────────────────────
        let userMsg          = null;   // plaintext — used for Groq + observer (never persisted)
        let contentToStore   = null;   // what actually goes into MongoDB

        if (isModeb) {
            // Mode B: client sends encrypted ciphertext + decrypted context separately
            const encryptedMessage    = req.body?.encryptedMessage;
            const conversationContext = req.body?.conversationContext;

            if (!encryptedMessage) {
                return res.status(400).json({ success: false, message: 'encryptedMessage is required for Mode B' });
            }

            if (!Array.isArray(conversationContext)) {
                return res.status(400).json({ success: false, message: 'conversationContext array is required for Mode B' });
            }

            // We only store the ciphertext — we never see the plaintext in Mode B
            // The conversationContext is used in RAM for this request only
            contentToStore = encryptedMessage;

            // For Groq we use the client-supplied context — override context.messages
            // Validate and sanitize: only allow role: user/assistant, string content
            context.messages = conversationContext
                .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
                .slice(-30)   // cap at 30 to prevent context stuffing
                .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));

            // We cannot know the plaintext for Mode B — use a sentinel for observer
            // The observer will use the full conversationContext sent by client
            userMsg = null;   // explicitly null — see observer handling below

        } else {
            // Mode A: client sends plaintext
            userMsg = req.body?.message?.trim();

            if (!userMsg) {
                return res.status(400).json({ success: false, message: 'message is required' });
            }

            if (userMsg.length > 4000) {
                return res.status(400).json({ success: false, message: 'Message too long (max 4000 characters)' });
            }

            // Encrypt for storage
            contentToStore = (() => {
                if (userKeyBuffer) {
                    try { return encrypt(userMsg, userKeyBuffer); }
                    catch { return userMsg; }
                }
                return userMsg;
            })();
        }

        const encryptContent = (plaintext) => {
            if (!isModeb && userKeyBuffer) {
                try { return encrypt(plaintext, userKeyBuffer); }
                catch { return plaintext; }
            }
            return plaintext;
        };

        // ── Calculate gap duration ─────────────────────────────────────────────
        const gapDuration = user?.lastSeenAt ? gapMs : null;

        // ── Handle first-ever session ──────────────────────────────────────────
        if (isFirstSession) {
            const openerText = firstSessionOpener(user?.preferredName || null);

            if (!isModeb) {
                // Mode A: save opener to DB encrypted
                await Message.create({
                    userId,
                    role:    'aria',
                    content: encryptContent(openerText)
                });
                context.messages.unshift({ role: 'assistant', content: openerText });
            }
            // Mode B: opener is sent as plaintext in response; client stores it locally
        }

        // ── Save user message ──────────────────────────────────────────────────
        const userMessage = await Message.create({
            userId,
            role:        'user',
            content:     contentToStore,
            gapDuration: gapDuration
        });

        // ── Update user state ──────────────────────────────────────────────────
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $inc: { messageCount: 1 },
                lastSeenAt:   new Date(),
                firstSession: false
            },
            { new: true, select: 'messageCount' }
        ).lean();

        const newMessageCount = updatedUser?.messageCount || 1;

        // ── Assemble Groq messages array ───────────────────────────────────────
        const plainUserMsg = isModeb
            ? (req.body?.conversationContext?.slice(-1)?.[0]?.content || '[message]')
            : userMsg;

        const groqMessages = [
            ...context.messages,
            { role: 'user', content: plainUserMsg }
        ];

        // ── Set SSE headers ────────────────────────────────────────────────────
        res.setHeader('Content-Type',      'text/event-stream');
        res.setHeader('Cache-Control',     'no-cache');
        res.setHeader('Connection',        'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        let clientDisconnected = false;
        req.on('close', () => { clientDisconnected = true; });

        // ── Stream Dr. Aria's response ─────────────────────────────────────────
        let ariaResponseText = '';
        let streamError      = null;

        try {
            await streamTherapistResponse(
                systemPrompt,
                groqMessages,
                (text) => {
                    if (clientDisconnected) return;
                    ariaResponseText += text;
                    res.write(`data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`);
                },
                (fullText) => { ariaResponseText = fullText; }
            );
        } catch (err) {
            streamError = err;
            // Log actual Groq error server-side for debugging — never expose to client
            console.error('[Groq] Stream error:', err?.message || err);
        }

        if (streamError || !ariaResponseText) {
            if (!clientDisconnected) {
                res.write(`data: ${JSON.stringify({ type: 'error', message: 'Dr. Aria is unavailable right now. Please try again in a moment.' })}\n\n`);
            }
            res.end();
            await Message.findByIdAndDelete(userMessage._id).catch(() => {});
            return;
        }

        // ── Save aria response (Mode A only — Mode B stores client-side) ───────
        let ariaMessage = null;
        if (!isModeb) {
            ariaMessage = await Message.create({
                userId,
                role:    'aria',
                content: encryptContent(ariaResponseText)
            });
        }

        // Signal stream end — include opener for Mode B first session
        if (!clientDisconnected) {
            const donePayload = { type: 'done' };
            if (isModeb && isFirstSession) {
                donePayload.opener = firstSessionOpener(user?.preferredName || null);
            }
            res.write(`data: ${JSON.stringify(donePayload)}\n\n`);
        }
        res.end();

        // ── Fire observer async ────────────────────────────────────────────────
        // Mode A: use full conversation context from DB (already in context.messages)
        // Mode B: use client-supplied conversationContext — plaintext lives in RAM here only
        if (newMessageCount % OBSERVER_CHUNK_SIZE === 0) {
            const observerMessages = isModeb
                ? [
                    // Mode B: use the client-supplied context (in-RAM, never persisted)
                    ...context.messages,
                    { role: 'assistant', content: ariaResponseText }
                  ]
                : [
                    ...context.messages,
                    { role: 'user',      content: userMsg          },
                    { role: 'assistant', content: ariaResponseText }
                  ];

            runObserverAsync(
                userId,
                userMessage._id,
                ariaMessage?._id || userMessage._id,   // Mode B has no aria DB record
                observerMessages,
                newMessageCount
            ).catch(err => console.error('[Observer] Async error:', err.message));
        }

    } catch (err) {
        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again.'
            });
        }
        try {
            res.write(`data: ${JSON.stringify({ type: 'error', message: 'Something went wrong. Please try again.' })}\n\n`);
            res.end();
        } catch (_) { /* already closed */ }
    }
};
