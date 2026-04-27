// Auth Test Suite
//
// Tests: OTP (mocked via DB direct insert), signup, login, /me,
//        profile update, token refresh, duplicate email, bad password,
//        invalid OTP, logout, protected route after logout.
//
// Users are created fresh each run — old test users deleted first.

const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');
const { post, get, put, del, parseJSON } = require('../http');
const { TEST_USERS } = require('../data/users');

const OTP              = require('../../models/otp');
const User             = require('../../models/User');

const USER = TEST_USERS.arjun;

module.exports = async (runner, baseUrl) => {
    runner.suite('Auth');

    // ── Cleanup: delete any existing test user ──────────────────────────────────
    await User.deleteOne({ email: USER.email });
    await OTP.deleteMany({ email: USER.email });

    // ── 1. OTP generation ───────────────────────────────────────────────────────
    await runner.test('POST /auth/generate-otp → 200', async (r) => {
        const res  = await post(baseUrl, '/api/v1/auth/generate-otp', { email: USER.email });
        const body = await parseJSON(res);
        r.assertStatus(res, 200, 'generate-otp');
        r.assert(body.data?.success === true, 'success flag');
        return { preview: body.data?.message };
    });

    // ── 2. Read OTP from DB (bypass email in tests) ─────────────────────────────
    let testOtp = null;
    await runner.test('OTP stored in DB', async (r) => {
        const record = await OTP.findOne({ email: USER.email }).sort({ createdAt: -1 });
        r.assert(record !== null, 'OTP document should exist');
        r.assert(record.otp.length === 6, 'OTP should be 6 digits');
        testOtp = record.otp;
        return { preview: `OTP: ${testOtp}` };
    });

    // ── 3. Signup with wrong OTP ────────────────────────────────────────────────
    await runner.test('POST /auth/signup → 400 wrong OTP', async (r) => {
        const res  = await post(baseUrl, '/api/v1/auth/signup', {
            name: USER.name, email: USER.email,
            password: USER.password, otp: '000000'
        });
        r.assertStatus(res, 400, 'wrong OTP should 400');
    });

    // ── 4. Signup with short password ───────────────────────────────────────────
    await runner.test('POST /auth/signup → 400 short password', async (r) => {
        const res  = await post(baseUrl, '/api/v1/auth/signup', {
            name: USER.name, email: USER.email,
            password: 'abc', otp: testOtp
        });
        r.assertStatus(res, 400, 'short password should 400');
    });

    // ── 5. Signup with client-supplied Admin role (must be ignored) ─────────────
    await runner.test('POST /auth/signup → role always Visitor', async (r) => {
        // Re-generate OTP since the previous attempt consumed state
        await OTP.deleteMany({ email: USER.email });
        const newOtp = '123456';
        await OTP.create({ otp: newOtp, email: USER.email });

        const res  = await post(baseUrl, '/api/v1/auth/signup', {
            name:          USER.name,
            preferredName: USER.preferredName,
            email:         USER.email,
            password:      USER.password,
            otp:           newOtp,
            role:          'Admin',    // attacker sends Admin
            encryptionMode: USER.encryptionMode
        });
        const body = await parseJSON(res);
        r.assertStatus(res, 201, 'signup should succeed');
        r.assertEqual(body.data?.user?.role, 'Visitor', 'role must be Visitor regardless of input');
        runner.setCookiesFromResponse(res);
        return { preview: `User created, role=${body.data?.user?.role}` };
    });

    // ── 6. Duplicate email signup ────────────────────────────────────────────────
    await runner.test('POST /auth/signup → 400 duplicate email', async (r) => {
        await OTP.create({ otp: '999999', email: USER.email });
        const res = await post(baseUrl, '/api/v1/auth/signup', {
            name: USER.name, email: USER.email,
            password: USER.password, otp: '999999'
        });
        r.assertStatus(res, 400, 'duplicate email should 400');
        await OTP.deleteMany({ email: USER.email });
    });

    // ── 7. GET /auth/me ──────────────────────────────────────────────────────────
    await runner.test('GET /auth/me → 200 with user data', async (r) => {
        const res  = await get(baseUrl, '/api/v1/auth/me', runner.getCookieHeader());
        const body = await parseJSON(res);
        r.assertStatus(res, 200, '/auth/me');
        r.assertHasKey(body.data, 'user', 'user object');
        r.assert(!body.data.user.password, 'password must be stripped');
        r.assert(!body.data.user.encryptionKeyEncrypted, 'encryption key must be stripped');
        return { preview: `name=${body.data.user.name}, mode=${body.data.user.encryptionMode}` };
    });

    // ── 8. /auth/me without token ────────────────────────────────────────────────
    await runner.test('GET /auth/me → 401 without token', async (r) => {
        const res = await get(baseUrl, '/api/v1/auth/me', '');
        r.assertStatus(res, 401, 'no token should 401');
    });

    // ── 9. Update profile ────────────────────────────────────────────────────────
    await runner.test('PUT /auth/profile → 200 updates preferredName', async (r) => {
        const res  = await put(baseUrl, '/api/v1/auth/profile',
            { preferredName: 'AJ', reportOptIn: true },
            runner.getCookieHeader()
        );
        const body = await parseJSON(res);
        r.assertStatus(res, 200, 'profile update');
        r.assertEqual(body.data?.user?.preferredName, 'AJ', 'preferredName updated');
        return { preview: `preferredName=${body.data?.user?.preferredName}` };
    });

    // ── 10. Token refresh ────────────────────────────────────────────────────────
    await runner.test('POST /auth/refresh → 200', async (r) => {
        const res  = await post(baseUrl, '/api/v1/auth/refresh', {}, runner.getCookieHeader());
        const body = await parseJSON(res);
        r.assertStatus(res, 200, 'refresh');
        // refreshed may be true or false depending on token age
        r.assert(typeof body.data?.refreshed === 'boolean', 'refreshed must be boolean');
        return { preview: `refreshed=${body.data?.refreshed}` };
    });

    // ── 11. Logout ───────────────────────────────────────────────────────────────
    await runner.test('POST /auth/logout → 200 clears cookie', async (r) => {
        const res  = await post(baseUrl, '/api/v1/auth/logout', {}, runner.getCookieHeader());
        const body = await parseJSON(res);
        r.assertStatus(res, 200, 'logout');
        r.assert(body.data?.success === true, 'success flag');
        runner.setCookiesFromResponse(res);   // receive the cleared cookie
    });

    // ── 12. Protected route after logout ─────────────────────────────────────────
    await runner.test('GET /auth/me → 401 after logout', async (r) => {
        const res = await get(baseUrl, '/api/v1/auth/me', runner.getCookieHeader());
        r.assertStatus(res, 401, 'should be 401 after logout');
    });

    // ── 13. Login ────────────────────────────────────────────────────────────────
    await runner.test('POST /auth/login → 200', async (r) => {
        const res  = await post(baseUrl, '/api/v1/auth/login', {
            email:    USER.email,
            password: USER.password
        });
        const body = await parseJSON(res);
        r.assertStatus(res, 200, 'login');
        r.assertEqual(body.data?.user?.email, USER.email, 'email matches');
        runner.setCookiesFromResponse(res);
        return { preview: `Logged in as ${body.data?.user?.email}` };
    });

    // ── 14. Login wrong password ─────────────────────────────────────────────────
    await runner.test('POST /auth/login → 401 wrong password', async (r) => {
        const res = await post(baseUrl, '/api/v1/auth/login', {
            email: USER.email, password: 'wrongpass99'
        });
        r.assertStatus(res, 401, 'wrong password should 401');
    });

    // ── 15. Login wrong email ────────────────────────────────────────────────────
    await runner.test('POST /auth/login → 401 unknown email', async (r) => {
        const res = await post(baseUrl, '/api/v1/auth/login', {
            email: 'nobody@nowhere.com', password: USER.password
        });
        r.assertStatus(res, 401, 'unknown email should 401');
    });
};
