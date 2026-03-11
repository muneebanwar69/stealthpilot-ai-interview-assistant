/**
 * Stealth Mode Helper
 * Opens a small popup window to display AI answers that won't be captured in screen shares
 */

export class StealthModeWindow {
    private popup: Window | null = null;
    private checkInterval: ReturnType<typeof setInterval> | null = null;

    /**
     * Open stealth mode popup window
     * This window can be positioned on a second monitor or minimized
     */
    open(): boolean {
        if (this.popup && !this.popup.closed) {
            this.popup.focus();
            return true;
        }

        // Open small popup window (300x400) at corner of screen
        const width = 350;
        const height = 500;
        const left = window.screen.width - width - 20;
        const top = window.screen.height - height - 100;

        this.popup = window.open(
            '',
            'StealthPilotAnswers',
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,resizable=yes,scrollbars=yes`
        );

        if (!this.popup) {
            return false;
        }

        // Initialize popup content
        this.initializePopup();

        // Monitor if popup is closed
        this.checkInterval = setInterval(() => {
            if (this.popup && this.popup.closed) {
                this.cleanup();
            }
        }, 1000);

        return true;
    }

    /**
     * Initialize popup with minimal HTML
     */
    private initializePopup() {
        if (!this.popup) return;

        this.popup.document.write(`
<!DOCTYPE html>
<html>
<head>
    <title>AI Answers</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0a0a0f;
            color: #fff;
            padding: 12px;
            font-size: 13px;
            line-height: 1.5;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #333;
        }
        .title {
            font-size: 11px;
            font-weight: 600;
            color: #7c6aff;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .status {
            font-size: 10px;
            color: #4ade80;
        }
        .answer-container {
            max-height: 420px;
            overflow-y: auto;
        }
        .answer {
            background: rgba(124, 106, 255, 0.1);
            border-left: 3px solid #7c6aff;
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 4px;
        }
        .question {
            font-size: 11px;
            color: #2dd4bf;
            font-weight: 600;
            margin-bottom: 6px;
        }
        .answer-text {
            font-size: 12px;
            color: #e5e7eb;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .confidence {
            font-size: 10px;
            color: #9ca3af;
            margin-top: 4px;
        }
        .empty {
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            padding: 40px 20px;
        }
        ::-webkit-scrollbar {
            width: 6px;
        }
        ::-webkit-scrollbar-track {
            background: #1a1a1f;
        }
        ::-webkit-scrollbar-thumb {
            background: #333;
            border-radius: 3px;
        }
        .instructions {
            background: rgba(45, 212, 191, 0.1);
            border: 1px solid rgba(45, 212, 191, 0.3);
            padding: 8px;
            border-radius: 4px;
            font-size: 11px;
            color: #2dd4bf;
            margin-bottom: 12px;
        }
    </style>
</head>
<body>
    <div class="instructions">
        💡 Stealth Mode Active: Move this window to your second monitor or minimize it. Press Alt+Tab to quickly switch between windows.
    </div>
    <div class="header">
        <div class="title">🤫 AI Answers (Stealth)</div>
        <div class="status">● Live</div>
    </div>
    <div id="answers" class="answer-container">
        <div class="empty">Waiting for questions...</div>
    </div>
</body>
</html>
        `);
        this.popup.document.close();
    }

    /**
     * Update popup with new answer
     */
    updateAnswer(question: string, answer: string, confidence: number) {
        if (!this.popup || this.popup.closed) return;

        const answersDiv = this.popup.document.getElementById('answers');
        if (!answersDiv) return;

        // Clear "waiting" message if exists
        if (answersDiv.querySelector('.empty')) {
            answersDiv.innerHTML = '';
        }

        // Add new answer at top
        const answerEl = this.popup.document.createElement('div');
        answerEl.className = 'answer';
        answerEl.innerHTML = `
            <div class="question">Q: ${this.escapeHtml(question)}</div>
            <div class="answer-text">${this.escapeHtml(answer)}</div>
            <div class="confidence">${Math.round(confidence * 100)}% confidence</div>
        `;

        answersDiv.insertBefore(answerEl, answersDiv.firstChild);

        // Keep only last 10 answers
        while (answersDiv.children.length > 10) {
            answersDiv.removeChild(answersDiv.lastChild!);
        }

        // Auto-scroll to top
        answersDiv.scrollTop = 0;

        // Flash the window title to get attention
        const originalTitle = this.popup.document.title;
        this.popup.document.title = '🔔 New Answer!';
        setTimeout(() => {
            if (this.popup && !this.popup.closed) {
                this.popup.document.title = originalTitle;
            }
        }, 2000);
    }

    /**
     * Close popup window
     */
    close() {
        if (this.popup && !this.popup.closed) {
            this.popup.close();
        }
        this.cleanup();
    }

    /**
     * Check if popup is open
     */
    isOpen(): boolean {
        return this.popup !== null && !this.popup.closed;
    }

    /**
     * Cleanup
     */
    private cleanup() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.popup = null;
    }

    /**
     * Escape HTML to prevent XSS
     */
    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Singleton instance
export const stealthMode = new StealthModeWindow();
