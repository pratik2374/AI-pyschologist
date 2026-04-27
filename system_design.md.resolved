# Dr. Aria - System Design Document

This document outlines the system architecture, data flows, scalability, and fallback mechanisms for the Dr. Aria AI Psychologist application. 

## 1. High-Level Architecture

The system follows a modern decoupled architecture consisting of a frontend client, a backend API, a database layer, and AI integrations.

### Components
- **Frontend (Client)**: Built with **Next.js 16** (React 19). Handles the user interface, SSE (Server-Sent Events) for real-time chat streaming, and client-side encryption logic (for Mode B).
- **Backend (API)**: Built with **Node.js** and **Express.js**. Manages authentication, rate limiting, MongoDB interactions, and acts as the orchestrator for AI prompts and responses.
- **Database Layer**: **MongoDB** (accessed via Mongoose). Stores Users, encrypted Messages, Chapter Summaries, Crisis Flags, Longitudinal Profiles, Observations, and Weekly Reports.
- **AI Layer**: Utilizes **OpenAI** APIs with a dual-model strategy:
  - `MAIN_MODEL` (e.g., `gpt-4o`): High-quality model used for the primary therapist responses.
  - `FAST_MODEL` (e.g., `gpt-4o-mini`): Cheaper, faster model used asynchronously for clinical observation, chapter compression, and profile synthesis.

## 2. Core Data Flow & Security Modes

The application uniquely implements a dual-mode privacy approach, dictating how the data flows between the client, server, and database.

### Mode A (Server-Side Encryption)
In this mode, the server holds the encryption keys and manages decryption in RAM.
1. **Request**: Client sends plaintext `message`.
2. **Context**: Server fetches encrypted history from DB, decrypts it in RAM, and builds the context window.
3. **AI Generation**: Server streams the plaintext response back to the client via SSE.
4. **Storage**: Both user message and AI response are encrypted on the server before being saved to MongoDB.

### Mode B (End-to-End Encryption)
In this mode, the server **never** sees the full plaintext history.
1. **Request**: Client encrypts their message locally. They send the `encryptedMessage` (for storage) alongside a temporary `conversationContext` (decrypted history, just for this request).
2. **Context**: Server uses the provided `conversationContext` strictly in RAM to feed the LLM. It never writes this plaintext to disk.
3. **AI Generation**: Server streams the plaintext response to the client via SSE. The client encrypts this response locally before saving it (e.g., in IndexedDB or sending back an encrypted blob).
4. **Storage**: Server only stores the `encryptedMessage` ciphertext. 

## 3. Asynchronous AI Subsystems

To keep the user experience fast, Dr. Aria breaks AI processing into a fast synchronous track and multiple asynchronous tracks.

1. **Synchronous Chat (`streamTherapistResponse`)**: Handled in real-time, streaming token-by-token back to the user to minimize Time-To-First-Token (TTFT).
2. **Clinical Observer (`runObserver`)**: Runs asynchronously every `N` messages. Analyzes the recent conversation to extract insights, emotions, and clinical notes, storing them as `Observation` records.
3. **Chapter Compression (`runCompression`)**: Summarizes long historical blocks of the chat into narrative summaries to prevent the LLM context window from overflowing.
4. **Profile Synthesis (`runProfileSynthesis`)**: Updates the user's `LongitudinalProfile` in the background, maintaining a persistent memory of the user's overarching journey.
5. **Weekly Reporter**: A cron job (`weeklyReporter.js`) runs periodically to compile insights.

## 4. Scalability & Handling Many Users

The architecture employs several strategies to handle high user concurrency gracefully:

### Node.js Event Loop & SSE
- **Non-blocking I/O**: Express and Mongoose rely on async operations, meaning a single Node instance can hold thousands of open SSE connections waiting for LLM tokens without thread exhaustion.
- **Connection Keep-Alive**: SSE connections use `Connection: keep-alive` and `X-Accel-Buffering: no` to ensure proxy servers (like NGINX) don't buffer responses.

### Load Balancing & Statelessness
- **JWT Authentication**: Auth is handled via stateless JWTs stored in HttpOnly cookies.
- **No In-Memory Sessions**: `req.decoded.userid` is used on every request. This allows the backend to be horizontally scaled across multiple instances without needing sticky sessions.

### Rate Limiting Strategies
Three distinct `express-rate-limit` instances protect the app:
1. **OTP Limiter**: Strict limit (e.g., 3 per 10 mins in prod) to prevent SMS/Email spam.
2. **Auth Limiter**: General auth limits (10 per 15 mins) to prevent brute-forcing.
3. **Chat Limiter**: Limits users to a reasonable conversational pace (e.g., 20 messages per minute) tied to the `userid`, preventing individual bad actors from draining the LLM quota.

## 5. Fallbacks and Resilience mechanisms

### LLM Rate Limits (HTTP 429) & Provider Outages
- **Retry Logic**: If the primary OpenAI endpoint returns a `429 Too Many Requests`, the `parseRetryWait` function intercepts the headers. It calculates the necessary wait time and automatically retries the request (up to 2 times).
- **Graceful Degradation**: If the API is entirely down or quotas are exceeded, the server safely aborts the stream, cleans up the unsent database records, and streams a user-friendly error event (`{"type": "error", "message": "Dr. Aria is unavailable..."}`).

### Database Resilience
- **Timeouts**: Mongoose connections utilize `serverSelectionTimeoutMS: 6000` to quickly fail and report if MongoDB is unreachable, rather than hanging indefinitely.

### Fallback Decryption
- In **Mode A**, if a message fails to decrypt (e.g., key rotation issues or corruption), the system safely falls back to returning the raw message, rather than crashing the entire history endpoint.
