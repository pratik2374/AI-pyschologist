class ChatApp {
    constructor() {
        this.messages = [];
        this.isTyping = false;
        this.userId = null;
        this.currentSessionId = null;

        this.initializeElements();
        this.attachEventListeners();
        this.loadTheme();
        this.bootstrapAuth();
    }

    initializeElements() {
        this.elements = {
            welcomeScreen: document.getElementById('welcomeScreen'),
            messagesContainer: document.getElementById('messagesContainer'),
            messages: document.getElementById('messages'),
            messageInput: document.getElementById('messageInput'),
            sendButton: document.getElementById('sendButton'),
            charCount: document.getElementById('charCount'),
            typingIndicator: document.getElementById('typingIndicator'),
            crisisModal: document.getElementById('crisisModal'),
            crisisMessage: document.getElementById('crisisMessage'),
            clearChat: document.getElementById('clearChat'),
            themeToggle: document.getElementById('themeToggle'),
            sessionList: document.getElementById('sessionList'),
            newSessionBtn: document.getElementById('newSessionBtn'),
            sidebarToggle: document.getElementById('sidebarToggle'),
            appContainer: document.getElementById('appContainer')
        };
    }

    attachEventListeners() {
        // Send message
        this.elements.sendButton.addEventListener('click', () => this.sendMessage());
        this.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Input handling
        this.elements.messageInput.addEventListener('input', () => this.handleInput());

        // Quick prompts
        document.querySelectorAll('.quick-prompt').forEach(button => {
            button.addEventListener('click', (e) => {
                const prompt = e.currentTarget.dataset.prompt;
                this.elements.messageInput.value = prompt;
                this.sendMessage();
            });
        });

        // Crisis modal
        document.getElementById('crisisOk').addEventListener('click', () => {
            this.elements.crisisModal.style.display = 'none';
        });

        document.getElementById('crisisResources').addEventListener('click', () => {
            window.open('https://www.crisistextline.org/ ', '_blank');
            this.elements.crisisModal.style.display = 'none';
        });

        // Clear chat
        this.elements.clearChat.addEventListener('click', () => this.clearChat());

        // Theme toggle
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Sidebar toggle (Gemini-like)
        if (this.elements.sidebarToggle && this.elements.appContainer) {
            this.elements.sidebarToggle.addEventListener('click', () => {
                this.elements.appContainer.classList.toggle('sidebar-collapsed');
            });
        }

        // Logout (optional button on main page)
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await fetch('/api/logout', { method: 'POST' });
                window.location.href = '/static/login.html';
            });
        }

        // New session
        if (this.elements.newSessionBtn) {
            this.elements.newSessionBtn.addEventListener('click', async () => {
                const res = await fetch('/api/sessions/start', { method: 'POST' });
                if (res.ok) {
                    const data = await res.json();
                    this.currentSessionId = data.session_id;
                    await this.refreshSidebar();
                    await this.loadSessionToChat(this.currentSessionId);
                }
            });
        }

        // Auto-resize textarea
        this.elements.messageInput.addEventListener('input', () => {
            this.autoResizeTextarea();
        });

        // Make welcome screen scrollable
        this.elements.welcomeScreen.addEventListener('wheel', (e) => {
            e.stopPropagation();
        });
    }

    async bootstrapAuth() {
        try {
            const res = await fetch('/api/me');
            if (!res.ok) {
                window.location.href = '/static/login.html';
                return;
            }
            const data = await res.json();
            this.userId = data.user_id;
            await this.refreshSidebar();
        } catch (e) {
            window.location.href = '/static/login.html';
        }
    }

    async refreshSidebar() {
        if (!this.elements.sessionList) return;

        const [sessionsRes, currentRes] = await Promise.all([
            fetch('/api/sessions'),
            fetch('/api/sessions/current')
        ]);

        if (!sessionsRes.ok) return;
        const sessionsData = await sessionsRes.json();
        const currentData = currentRes.ok ? await currentRes.json() : { session_id: null };

        this.currentSessionId = currentData.session_id || this.currentSessionId;

        const sessions = sessionsData.sessions || [];
        this.elements.sessionList.innerHTML = '';

        sessions.forEach((s) => {
            const btn = document.createElement('button');
            btn.className = 'session-item' + (s.session_id === this.currentSessionId ? ' active' : '');
            btn.type = 'button';

            const dot = document.createElement('span');
            dot.className = 'session-dot';

            const meta = document.createElement('div');
            meta.className = 'session-meta';

            const title = document.createElement('div');
            title.className = 'session-title';
            title.textContent = s.session_id;

            const time = document.createElement('div');
            time.className = 'session-time';
            time.textContent = (s.created_at || '').toString().slice(0, 19).replace('T', ' ');

            meta.appendChild(title);
            meta.appendChild(time);
            btn.appendChild(dot);
            btn.appendChild(meta);

            btn.addEventListener('click', async () => {
                await fetch('/api/sessions/select', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_id: s.session_id })
                });
                this.currentSessionId = s.session_id;
                await this.refreshSidebar();
                await this.loadSessionToChat(s.session_id);
            });

            this.elements.sessionList.appendChild(btn);
        });
    }

    async loadSessionToChat(sessionId) {
        const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/messages`);
        if (!res.ok) return;
        const data = await res.json();

        // Clear UI and render history
        this.messages = [];
        this.elements.messages.innerHTML = '';

        const messages = data.messages || [];
        if (messages.length) {
            this.elements.welcomeScreen.style.display = 'none';
            this.elements.messagesContainer.style.display = 'block';
        } else {
            this.elements.welcomeScreen.style.display = 'flex';
            this.elements.messagesContainer.style.display = 'none';
            return;
        }

        messages.forEach((m) => {
            if (m.user_message) this.addMessage(m.user_message, 'user');
            if (m.agent_response) this.addMessage(m.agent_response, 'ai', m.therapy_mode);
        });
    }

    handleInput() {
        const value = this.elements.messageInput.value.trim();
        const length = this.elements.messageInput.value.length;

        this.elements.sendButton.disabled = !value;
        this.elements.charCount.textContent = `${length} / 1000`;

        if (length > 900) {
            this.elements.charCount.style.color = 'var(--warning-color)';
        } else {
            this.elements.charCount.style.color = 'var(--text-light)';
        }
    }

    autoResizeTextarea() {
        const textarea = this.elements.messageInput;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    async sendMessage() {
        const message = this.elements.messageInput.value.trim();
        if (!message || this.isTyping) return;

        // Hide welcome screen
        if (this.elements.welcomeScreen.style.display !== 'none') {
            this.elements.welcomeScreen.style.display = 'none';
            this.elements.messagesContainer.style.display = 'block';
        }

        // Add user message
        this.addMessage(message, 'user');
        this.elements.messageInput.value = '';
        this.elements.sendButton.disabled = true;
        this.elements.charCount.textContent = '0 / 1000';
        this.autoResizeTextarea();

        // Show typing indicator
        this.showTypingIndicator();

        try {
            const response = await fetch('/psychologist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: message,
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/static/login.html';
                    return;
                }
                throw new Error(data.detail || 'Something went wrong');
            }

            // Hide typing indicator
            this.hideTypingIndicator();

            // Handle crisis response
            if (data.possible_crisis) {
                this.showCrisisModal(data.response);
            }

            // Add AI response
            this.addMessage(data.response, 'ai', data.therapy_mode);
            await this.refreshSidebar();

        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage(`I'm sorry, I encountered an error: ${error.message}. Please try again.`, 'ai');
        }
    }

    addMessage(text, sender, therapyMode = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-brain"></i>';

        const content = document.createElement('div');
        content.className = 'message-content';

        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.textContent = text;

        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        content.appendChild(textDiv);
        content.appendChild(timeDiv);

        // Add therapy mode badge below AI message
        if (therapyMode && sender === 'ai') {
            const badge = document.createElement('div');
            badge.className = 'therapy-mode-badge';
            badge.textContent = therapyMode;
            content.appendChild(badge);
        }

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);

        this.elements.messages.appendChild(messageDiv);
        this.scrollToBottom();

        this.messages.push({ text, sender, therapyMode, timestamp: new Date() });
    }

    showTypingIndicator() {
        this.isTyping = true;
        this.elements.typingIndicator.style.display = 'flex';
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.isTyping = false;
        this.elements.typingIndicator.style.display = 'none';
    }

    showCrisisModal(message) {
        this.elements.crisisMessage.textContent = message;
        this.elements.crisisModal.style.display = 'flex';
    }

    scrollToBottom() {
        this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
    }

    clearChat() {
        if (confirm('Are you sure you want to clear the chat? This action cannot be undone.')) {
            this.messages = [];
            this.elements.messages.innerHTML = '';
            this.elements.welcomeScreen.style.display = 'flex';
            this.elements.messagesContainer.style.display = 'none';
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        const icon = this.elements.themeToggle.querySelector('i');
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);

        const icon = this.elements.themeToggle.querySelector('i');
        icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});