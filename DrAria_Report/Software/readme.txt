================================================================================
  Dr. Aria — AI Psychotherapist
  SOFTWARE & TOOLS REFERENCE GUIDE
  Team: Pratik Gond (123103006), Neha Roy (123303002), Kush Bohare (123103005)
================================================================================

This file describes all software tools used to build, run, and evaluate Dr. Aria.

--------------------------------------------------------------------------------
1. NODE.JS (v20 LTS)
   Purpose : Backend JavaScript runtime — runs the Express API server and all
             AI orchestration modules (observer, compressor, profiler, reporter).
   Version : 20.x LTS (tested on 22.19.0)
   Install : https://nodejs.org/en/download
             Windows: download the .msi installer and run it.
             Verify:  node --version
   Usage   : cd <project-root>
             node index.js          # start the API server on port 4000
             npm run dev            # start with nodemon (auto-reload on changes)
             npm run chat           # start the CLI therapy client for testing

--------------------------------------------------------------------------------
2. NPM (Node Package Manager) — included with Node.js
   Purpose : Installs all backend dependencies listed in package.json.
   Version : 10.x (bundled with Node 20)
   Usage   : cd <project-root>
             npm install            # install all backend dependencies
             cd Frontend
             npm install            # install all frontend dependencies

--------------------------------------------------------------------------------
3. NEXT.JS 16 (Frontend framework)
   Purpose : React-based web framework for the Dr. Aria chat interface,
             dashboard, login, and profile pages.
   Version : 16.2.3
   Install : Installed automatically via `npm install` in the Frontend folder.
   Usage   : cd Frontend
             npm run dev            # start dev server at http://localhost:3000
             npm run build          # production build
             npm start              # run production build

--------------------------------------------------------------------------------
4. MONGODB (v7.0 — Local or Atlas Cloud)
   Purpose : Primary database for all user data, messages, observations,
             longitudinal profiles, chapter summaries, crisis flags, and reports.
   Version : 7.0 Community Edition (local testing) / MongoDB Atlas (production)
   Install : https://www.mongodb.com/try/download/community
             Windows: download the .msi installer.
             Verify:  mongod --version
   Usage   : mongod                 # start local MongoDB on default port 27017
             Set MONGODB_URL in .env to:
               mongodb://localhost:27017/aipychologist   (local)
               mongodb+srv://...@cluster.mongodb.net/   (Atlas)
   Atlas   : https://www.mongodb.com/cloud/atlas (free M0 tier available)

--------------------------------------------------------------------------------
5. OPENAI API
   Purpose : Powers Dr. Aria's therapeutic responses (GPT-4o) and all
             background AI tasks including the observer, chapter compression,
             profile synthesis, and weekly report generation (GPT-4o-mini).
   Models  : gpt-4o         (main responses — streaming)
             gpt-4o-mini    (background tasks — JSON mode)
   Setup   : 1. Create account at https://platform.openai.com
             2. Generate API key at https://platform.openai.com/api-keys
             3. Add to .env:
                OPENAI_API_KEY=sk-proj-...
                OPENAI_MAIN_MODEL=gpt-4o
                OPENAI_FAST_MODEL=gpt-4o-mini
   Cost    : ~$0.08–0.12/user/day (10 messages, gpt-4o)
             ~$0.005–0.01/user/day (gpt-4o-mini background tasks)

--------------------------------------------------------------------------------
6. RESEND (Email delivery service)
   Purpose : Sends weekly clinical report emails to opted-in Mode A users.
             Also used for OTP delivery during signup and password reset.
   Version : SDK v4.0.0
   Setup   : 1. Create account at https://resend.com
             2. Verify your sending domain
             3. Generate API key
             4. Add to .env:
                RESEND_API_KEY=re_...
                FROM_EMAIL=Dr. Aria <noreply@yourdomain.com>
   Docs    : https://resend.com/docs

--------------------------------------------------------------------------------
7. GIT (Version Control)
   Purpose : Source code versioning and collaboration.
   Version : 2.x
   Install : https://git-scm.com/download/win
   Usage   : git clone https://github.com/pratik2374/AI-pyschologist
   GitHub  : https://github.com/pratik2374/AI-pyschologist

--------------------------------------------------------------------------------
8. PYTHON 3.x (Optional — for figure generation)
   Purpose : Generates editable matplotlib figures for the report.
             (Figure1–Figure4 scripts in Submission/Report/Figures/)
   Version : 3.10+
   Install : https://www.python.org/downloads/
   Usage   : pip install matplotlib
             cd "Submission/Report/Figures"
             python Figure1_System_Architecture.py
             python Figure2_Conversation_Flow.py
             python Figure3_Observer_Pipeline.py
             python Figure4_Encryption_Architecture.py

--------------------------------------------------------------------------------
9. VISUAL STUDIO CODE (Recommended IDE)
   Purpose : Code editor used for development.
   Install : https://code.visualstudio.com
   Recommended extensions:
     - ESLint
     - Prettier
     - MongoDB for VS Code
     - Thunder Client (API testing)
     - GitLens

--------------------------------------------------------------------------------
QUICK START (Full Stack)
--------------------------------------------------------------------------------

Step 1: Install Node.js 20, MongoDB 7.0, and Git (see above).

Step 2: Clone the repository:
        git clone https://github.com/pratik2374/AI-pyschologist
        cd AI-pyschologist

Step 3: Configure environment:
        Copy .env.example to .env (or create .env) with:
          PORT=4000
          FRONTEND_URL=http://localhost:3000
          MONGODB_URL=mongodb://localhost:27017/aipychologist
          SECRET_KEY=<generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
          OPENAI_API_KEY=sk-proj-...
          OPENAI_MAIN_MODEL=gpt-4o
          OPENAI_FAST_MODEL=gpt-4o-mini
          RESEND_API_KEY=re_...
          FROM_EMAIL=Dr. Aria <noreply@yourdomain.com>
          ENCRYPTION_MASTER_KEY=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

Step 4: Install backend dependencies:
        npm install

Step 5: Install frontend dependencies:
        cd Frontend && npm install && cd ..

Step 6: Start MongoDB:
        mongod

Step 7: Start backend:
        node index.js
        (Expected output: "Server is running on port 4000" + "Connected to MongoDB")

Step 8: Start frontend (new terminal):
        cd Frontend && npm run dev
        (Opens at http://localhost:3000)

Step 9 (Optional): Test via CLI:
        npm run chat

--------------------------------------------------------------------------------
DEPLOYMENT (Production)
--------------------------------------------------------------------------------
- Set NODE_ENV=production in .env
- Set TRUST_PROXY=true if behind a load balancer
- Use MongoDB Atlas for the database
- Deploy backend to Railway / Render / Azure App Service
- Deploy frontend to Vercel / Netlify
- Enable HTTPS at load balancer level
- Rotate SECRET_KEY and ENCRYPTION_MASTER_KEY before production launch

Existing deployment: https://ai-pyschologist.vercel.app/

================================================================================
END OF README
================================================================================
