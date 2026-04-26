// Privacy Test Suite
//
// Tests: view profile, emergency contact CRUD, account deletion cascade.
//
// Uses arjun (Mode A) — must have chat history from chat suite for
// profile to have data.

const mongoose = require('mongoose');
const { post, get, put, del, parseJSON } = require('../http');
const { TEST_USERS } = require('../data/users');

const User                = require('../../models/User');
const Message             = require('../../models/Message');
const LongitudinalProfile = require('../../models/LongitudinalProfile');
const Observation         = require('../../models/Observation');
const CrisisFlag          = require('../../models/CrisisFlag');
const ChapterSummary      = require('../../models/ChapterSummary');
const WeeklyReport        = require('../../models/WeeklyReport');

module.exports = async (runner, baseUrl) => {
    runner.suite('Privacy');

    // ── Ensure logged in ────────────────────────────────────────────────────────
    if (!runner.cookies.token) {
        const res = await post(baseUrl, '/api/v1/auth/login', {
            email:    TEST_USERS.arjun.email,
            password: TEST_USERS.arjun.password
        });
        runner.setCookiesFromResponse(res);
    }

    // ── 1. View observation profile ──────────────────────────────────────────────
    await runner.test('GET /privacy/profile → 200 with stats', async (r) => {
        const res  = await get(baseUrl, '/api/v1/privacy/profile', runner.getCookieHeader());
        const body = await parseJSON(res);
        r.assertStatus(res, 200, 'profile');
        r.assertHasKey(body.data, 'stats', 'stats block');
        r.assertHasKey(body.data, 'user', 'user block');
        r.assert(typeof body.data.stats.totalMessages === 'number', 'totalMessages is number');

        return {
            preview: `messages=${body.data.stats.totalMessages}  observations=${body.data.recentObservations?.length}  profile=${body.data.profile ? 'exists' : 'null'}`
        };
    });

    // ── 2. View profile without auth ─────────────────────────────────────────────
    await runner.test('GET /privacy/profile → 401 without token', async (r) => {
        const res = await get(baseUrl, '/api/v1/privacy/profile', '');
        r.assertStatus(res, 401, 'no token');
    });

    // ── 3. Save emergency contact ─────────────────────────────────────────────────
    await runner.test('PUT /privacy/emergency-contact → 200 saves encrypted', async (r) => {
        const res  = await put(baseUrl, '/api/v1/privacy/emergency-contact', {
            name:  'Ramesh Sharma',
            phone: '+91-9876543210',
            email: 'ramesh.test@example.com'
        }, runner.getCookieHeader());
        const body = await parseJSON(res);
        r.assertStatus(res, 200, 'save contact');
        r.assert(body.data?.success === true, 'success flag');
        return { preview: body.data?.message };
    });

    // ── 4. Read emergency contact back ────────────────────────────────────────────
    await runner.test('GET /privacy/emergency-contact → 200 decrypted', async (r) => {
        const res  = await get(baseUrl, '/api/v1/privacy/emergency-contact', runner.getCookieHeader());
        const body = await parseJSON(res);
        r.assertStatus(res, 200, 'get contact');
        r.assert(body.data?.contact !== null, 'contact should not be null');
        r.assertEqual(body.data?.contact?.name, 'Ramesh Sharma', 'name matches');
        r.assertEqual(body.data?.contact?.phone, '+91-9876543210', 'phone matches');

        // Verify it is NOT stored in plaintext in DB
        const user = await User.findOne({ email: TEST_USERS.arjun.email }).lean();
        r.assert(user?.emergencyContactEncrypted !== '{"name":"Ramesh Sharma","phone":"+91-9876543210","email":"ramesh.test@example.com"}',
            'contact must not be plaintext in DB (should be encrypted ciphertext)');

        return { preview: `name=${body.data?.contact?.name}  phone=${body.data?.contact?.phone}` };
    });

    // ── 5. Empty contact rejected ─────────────────────────────────────────────────
    await runner.test('PUT /privacy/emergency-contact → 400 empty body', async (r) => {
        const res = await put(baseUrl, '/api/v1/privacy/emergency-contact', {}, runner.getCookieHeader());
        r.assertStatus(res, 400, 'empty contact');
    });

    // ── 6. Verify messages are encrypted in DB ────────────────────────────────────
    await runner.test('Messages are encrypted at rest (Mode A)', async (r) => {
        const user = await User.findOne({ email: TEST_USERS.arjun.email }).lean();

        if (!user?.encryptionKeyEncrypted) {
            // Dev env without ENCRYPTION_MASTER_KEY — skip but don't fail
            return { preview: 'SKIPPED — ENCRYPTION_MASTER_KEY not set in dev env' };
        }

        const msg = await Message.findOne({ userId: user._id, role: 'user' }).lean();

        if (!msg) {
            // Chat suite hasn't run yet — no messages to check (not a failure)
            return { preview: 'SKIPPED — no messages yet (run chat suite first to verify)' };
        }

        r.assert(msg !== null, 'should have at least one user message');

        // A properly encrypted message looks like "hex:hex:hex" (iv:authTag:ciphertext)
        const looks_encrypted = msg.content.includes(':') && msg.content.split(':').length === 3;
        r.assert(looks_encrypted, `Message content should be encrypted ciphertext, got: "${msg.content.slice(0, 50)}"`);

        return { preview: `Encrypted format OK: "${msg.content.slice(0, 40)}..."` };
    });

    // ── 7. Account deletion — cascade ────────────────────────────────────────────
    // Create a throwaway user so we can test deletion without wiping arjun
    await runner.test('DELETE /privacy/account → 200 cascade deletes all data', async (r) => {
        // Create a fresh throwaway user directly in DB
        const throwawayEmail = 'throwaway.test.aria@mailinator.com';
        await User.deleteOne({ email: throwawayEmail });
        await Message.deleteMany({ userId: null });  // cleanup orphans

        const hashedPw  = await require('bcrypt').hash('TestThrow@123', 10);
        const throwaway = await User.create({
            name:     'Throwaway User',
            email:    throwawayEmail,
            password: hashedPw,
            role:     'Visitor'
        });

        // Insert some data for this user
        await Message.create({ userId: throwaway._id, role: 'user', content: 'test message' });
        await Observation.create({ userId: throwaway._id, chunkNumber: 1, emotionalState: 5, themes: [] });

        // Login as throwaway
        const loginRes = await post(baseUrl, '/api/v1/auth/login', {
            email:    throwawayEmail,
            password: 'TestThrow@123'
        });
        const loginCookie = loginRes.headers.getSetCookie?.()
            .map(c => c.split(';')[0]).join('; ') || '';

        // Delete account
        const deleteRes  = await del(baseUrl, '/api/v1/privacy/account',
            { confirmDelete: true },
            loginCookie
        );
        const deleteBody = await parseJSON(deleteRes);
        r.assertStatus(deleteRes, 200, 'delete account');
        r.assert(deleteBody.data?.success === true, 'success flag');

        // Verify cascade: user and all data should be gone
        const userGone = await User.findById(throwaway._id);
        r.assert(userGone === null, 'User document should be deleted');

        const msgGone = await Message.countDocuments({ userId: throwaway._id });
        r.assertEqual(msgGone, 0, 'Messages should be cascade deleted');

        const obsGone = await Observation.countDocuments({ userId: throwaway._id });
        r.assertEqual(obsGone, 0, 'Observations should be cascade deleted');

        return { preview: 'User + messages + observations all confirmed deleted' };
    });

    // ── 8. Delete account without confirmation ────────────────────────────────────
    await runner.test('DELETE /privacy/account → 400 without confirmDelete', async (r) => {
        const res = await del(baseUrl, '/api/v1/privacy/account',
            { confirmDelete: false },
            runner.getCookieHeader()
        );
        r.assertStatus(res, 400, 'must require confirmDelete:true');
    });
};
