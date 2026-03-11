class ChatApp {
    constructor() {
        this.messages = [];
        this.isTyping = false;

        this.API_URL = 'https://ai-pyschologist-production.up.railway.app/psychologist';

        this.sessionId = this.generateUUID();

        this.initializeElements();
        this.attachEventListeners();
        this.loadTheme();
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
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
            themeToggle: document.getElementById('themeToggle')
        };
    }

    attachEventListeners() {
        this.elements.sendButton.addEventListener('click', () => this.sendMessage());

        this.elements.messageInput.addEventListener('keypress', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.elements.messageInput.addEventListener('input', () => {
            this.handleInput();
            this.autoResizeTextarea();
        });

        document.querySelectorAll('.quick-prompt').forEach(btn => {
            btn.addEventListener('click', e => {
                this.elements.messageInput.value = e.currentTarget.dataset.prompt;
                this.sendMessage();
            });
        });

        document.getElementById('crisisOk').addEventListener('click', () => {
            this.elements.crisisModal.style.display = 'none';
        });

        document.getElementById('crisisResources').addEventListener('click', () => {
            window.open('https://www.crisistextline.org/', '_blank');
            this.elements.crisisModal.style.display = 'none';
        });

        this.elements.clearChat.addEventListener('click', () => this.clearChat());
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    handleInput() {
        const text = this.elements.messageInput.value;
        const trimmed = text.trim();

        this.elements.sendButton.disabled = !trimmed;
        this.elements.charCount.textContent = `${text.length} / 1000`;
        this.elements.charCount.style.color =
            text.length > 900 ? 'var(--warning-color)' : 'var(--text-light)';
    }

    autoResizeTextarea() {
        const t = this.elements.messageInput;
        t.style.height = 'auto';
        t.style.height = Math.min(t.scrollHeight, 120) + 'px';
    }

    async sendMessage() {
        const message = this.elements.messageInput.value.trim();
        if (!message || this.isTyping) return;

        if (this.elements.welcomeScreen.style.display !== 'none') {
            this.elements.welcomeScreen.style.display = 'none';
            this.elements.messagesContainer.style.display = 'block';
        }

        this.addMessage(message, 'user');
        this.elements.messageInput.value = '';
        this.elements.sendButton.disabled = true;
        this.elements.charCount.textContent = '0 / 1000';
        this.autoResizeTextarea();

        this.showTypingIndicator();

        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: message,
                    user_id: this.sessionId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Server error');
            }

            this.hideTypingIndicator();

            if (data.possible_crisis) {
                this.showCrisisModal(data.response);
            }

            this.addMessage(data.response, 'ai', data.therapy_mode);

        } catch (err) {
            this.hideTypingIndicator();
            this.addMessage(
                'I had trouble reaching the server. Please check your connection and try again.',
                'ai'
            );
            console.error(err);
        }
    }

    addMessage(text, sender, therapyMode = null) {
        const msg = document.createElement('div');
        msg.className = `message ${sender}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = sender === 'user'
            ? '<i class="fas fa-user"></i>'
            : '<i class="fas fa-brain"></i>';

        const content = document.createElement('div');
        content.className = 'message-content';

        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.textContent = text;

        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        content.appendChild(textDiv);
        content.appendChild(time);

        if (therapyMode && sender === 'ai') {
            const badge = document.createElement('div');
            badge.className = 'therapy-mode-badge';
            badge.textContent = therapyMode;
            content.appendChild(badge);
        }

        msg.appendChild(avatar);
        msg.appendChild(content);
        this.elements.messages.appendChild(msg);

        this.scrollToBottom();
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
        this.elements.messagesContainer.scrollTop =
            this.elements.messagesContainer.scrollHeight;
    }

    clearChat() {
        if (!confirm('Clear entire chat?')) return;

        this.messages = [];
        this.elements.messages.innerHTML = '';
        this.elements.welcomeScreen.style.display = 'flex';
        this.elements.messagesContainer.style.display = 'none';
    }

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);

        this.elements.themeToggle.querySelector('i').className =
            next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    loadTheme() {
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);

        this.elements.themeToggle.querySelector('i').className =
            theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});
