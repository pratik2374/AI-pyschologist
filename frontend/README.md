# AI Psychologist – Frontend

React frontend for the AI Psychologist app. Connects to the backend at `http://localhost:4000` via the Vite proxy.

## Setup

```bash
cd frontend
npm install
```

## Run

```bash
npm run dev
```

Runs at [http://localhost:3000](http://localhost:3000). Ensure the backend is running on port 4000 and that `backend/.env` has `MONGODB_URL`, `SECRET_KEY`, and optionally `FRONTEND_URL=http://localhost:3000` for CORS.

## API usage

- **Auth:** Login, Signup (OTP sent to email), Logout (client-side; cookie is httpOnly).
- **Chat:** Past chats (grouped by session), open a session, send messages. New sessions are created via `generateSessionId`; messages are sent with `currChat` (backend forwards to your Django/LLM API).
- **Reset password:** Routes exist on the backend (`/api/v1/resetPasswordLink`, `/api/v1/resetPassword/:token`); add pages in the frontend if needed.

## Build

```bash
npm run build
```

Output is in `dist/`. For production, point your server at `dist` and set the API base URL if the backend is on another host.
