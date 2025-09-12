class ChatApp {
    constructor() {
        this.messages = [];
        this.isTyping = false;
        this.userId = this.generateUserId();
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadTheme();
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
            window.open('https://www.crisistextline.org/', '_blank');
            this.elements.crisisModal.style.display = 'none';
        });

        // Clear chat
        this.elements.clearChat.addEventListener('click', () => this.clearChat());

        // Theme toggle
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Auto-resize textarea
        this.elements.messageInput.addEventListener('input', () => {
            this.autoResizeTextarea();
        });

        // Make welcome screen scrollable
        this.elements.welcomeScreen.addEventListener('wheel', (e) => {
            e.stopPropagation();
        });
    }

    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
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
                    user_id: this.userId
                })
            });

            const data = await response.json();

            if (!response.ok) {
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