// AES-256-GCM Encryption Utility
//
// Two-layer design:
//   Layer 1 — Master key (in .env): encrypts each user's personal key
//   Layer 2 — Per-user key (in DB, encrypted): encrypts all user content
//
// This means:
//   - Rotating the master key only requires re-encrypting the per-user keys
//   - A DB breach exposes only encrypted blobs — no master key in DB
//   - Each user's data is isolated — one key per user
//
// Ciphertext format: "hex_iv:hex_authTag:hex_ciphertext"
// All three parts are hex-encoded and joined with colons.
//
// Usage:
//   const { encrypt, decrypt, generateUserKey, encryptUserKey, decryptUserKey } = require('./encryption');
//
//   const key   = generateUserKey();              // Buffer(32)
//   const stored = encryptUserKey(key);           // store this in User.encryptionKeyEncrypted
//   const back  = decryptUserKey(stored);         // recover Buffer(32)
//   const cipher = encrypt('hello world', key);   // "iv:tag:data"
//   const plain  = decrypt(cipher, key);          // 'hello world'

const crypto = require('crypto');

const ALGORITHM       = 'aes-256-gcm';
const IV_BYTES        = 12;   // 96-bit IV — GCM standard
const AUTH_TAG_BYTES  = 16;   // 128-bit auth tag — maximum security
const KEY_BYTES       = 32;   // 256-bit key


// ── Core encrypt / decrypt ─────────────────────────────────────────────────────

/**
 * Encrypts a plaintext string with a 32-byte key buffer.
 *
 * @param {string} plaintext
 * @param {Buffer} keyBuffer — 32 bytes
 * @returns {string} "hex_iv:hex_authTag:hex_ciphertext"
 */
const encrypt = (plaintext, keyBuffer) => {
    const iv     = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv, {
        authTagLength: AUTH_TAG_BYTES
    });

    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return [
        iv.toString('hex'),
        authTag.toString('hex'),
        encrypted.toString('hex')
    ].join(':');
};


/**
 * Decrypts a string produced by encrypt().
 *
 * @param {string} ciphertext — "hex_iv:hex_authTag:hex_ciphertext"
 * @param {Buffer} keyBuffer  — 32 bytes
 * @returns {string} original plaintext
 * @throws if the auth tag fails (tampered or wrong key)
 */
const decrypt = (ciphertext, keyBuffer) => {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid ciphertext format — expected iv:authTag:data');
    }

    const iv       = Buffer.from(parts[0], 'hex');
    const authTag  = Buffer.from(parts[1], 'hex');
    const data     = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv, {
        authTagLength: AUTH_TAG_BYTES
    });
    decipher.setAuthTag(authTag);

    return Buffer.concat([
        decipher.update(data),
        decipher.final()
    ]).toString('utf8');
};


// ── Key management ─────────────────────────────────────────────────────────────

/**
 * Generates a fresh random 32-byte key for a new user.
 * @returns {Buffer} 32 bytes
 */
const generateUserKey = () => crypto.randomBytes(KEY_BYTES);


/**
 * Returns the master key from ENCRYPTION_MASTER_KEY env var.
 * Throws a clear error on misconfiguration so the server fails fast at startup.
 *
 * @returns {Buffer} 32 bytes
 */
const getMasterKey = () => {
    const hex = process.env.ENCRYPTION_MASTER_KEY;
    if (!hex) {
        throw new Error('ENCRYPTION_MASTER_KEY is not set. Add a 64-character hex string to .env');
    }
    if (hex.length !== 64) {
        throw new Error(`ENCRYPTION_MASTER_KEY must be exactly 64 hex characters (32 bytes). Got ${hex.length} characters.`);
    }
    return Buffer.from(hex, 'hex');
};


/**
 * Encrypts a user's 32-byte key with the master key for storage in MongoDB.
 * The key is stored as its hex representation so it's a clean string.
 *
 * @param {Buffer} userKeyBuffer — 32 bytes
 * @returns {string} encrypted ciphertext string — safe to store in DB
 */
const encryptUserKey = (userKeyBuffer) => {
    return encrypt(userKeyBuffer.toString('hex'), getMasterKey());
};


/**
 * Decrypts a user's stored encrypted key back to a 32-byte Buffer.
 *
 * @param {string} encryptedKeyString — from User.encryptionKeyEncrypted
 * @returns {Buffer} 32 bytes
 */
const decryptUserKey = (encryptedKeyString) => {
    const keyHex = decrypt(encryptedKeyString, getMasterKey());
    return Buffer.from(keyHex, 'hex');
};


/**
 * Checks whether the master key is configured in the environment.
 * Used to gracefully degrade to plaintext in development if key not set.
 *
 * @returns {boolean}
 */
const isMasterKeyConfigured = () => {
    const hex = process.env.ENCRYPTION_MASTER_KEY;
    return !!(hex && hex.length === 64);
};


module.exports = {
    encrypt,
    decrypt,
    generateUserKey,
    encryptUserKey,
    decryptUserKey,
    isMasterKeyConfigured
};
