;(function () {
  'use strict'

  // Simple markdown parser for rich text support
  function parseMarkdown(text) {
    if (!text) return ''

    let html = text

    // Store code blocks and inline code with placeholders before escaping HTML
    const codeBlockPlaceholders = []
    const inlineCodePlaceholders = []

    // Extract code blocks first (```code```)
    html = html.replace(/```([\s\S]*?)```/g, function (match, code) {
      const placeholder = `__CODEBLOCK_${codeBlockPlaceholders.length}__`
      codeBlockPlaceholders.push(code)
      return placeholder
    })

    // Extract inline code (`code`)
    html = html.replace(/`([^`\n]+)`/g, function (match, code) {
      const placeholder = `__INLINECODE_${inlineCodePlaceholders.length}__`
      inlineCodePlaceholders.push(code)
      return placeholder
    })

    // Escape HTML to prevent XSS
    const div = document.createElement('div')
    div.textContent = html
    html = div.innerHTML

    // Restore code blocks
    codeBlockPlaceholders.forEach((code, index) => {
      // Escape HTML in code content
      const codeDiv = document.createElement('div')
      codeDiv.textContent = code
      const escapedCode = codeDiv.innerHTML
      html = html.replace(
        `__CODEBLOCK_${index}__`,
        '<pre><code>' + escapedCode + '</code></pre>'
      )
    })

    // Restore inline code
    inlineCodePlaceholders.forEach((code, index) => {
      // Escape HTML in code content
      const codeDiv = document.createElement('div')
      codeDiv.textContent = code
      const escapedCode = codeDiv.innerHTML
      html = html.replace(
        `__INLINECODE_${index}__`,
        '<code>' + escapedCode + '</code>'
      )
    })

    // Bold (**text** or __text__) - handle before italic
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>')

    // Italic (*text* or _text_)
    html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    html = html.replace(/\b_([^_\n]+)_\b/g, '<em>$1</em>')

    // Links [text](url)
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    )

    // Headers (process before line breaks)
    html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>')
    html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>')
    html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>')

    // Process lists (need to group consecutive list items)
    const lines = html.split('\n')
    const processedLines = []
    let inList = false
    let listType = null

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const ulMatch = line.match(/^[\*\-] (.+)$/)
      const olMatch = line.match(/^\d+\. (.+)$/)

      if (ulMatch) {
        if (!inList || listType !== 'ul') {
          if (inList) {
            processedLines.push(listType === 'ul' ? '</ul>' : '</ol>')
          }
          processedLines.push('<ul>')
          inList = true
          listType = 'ul'
        }
        processedLines.push('<li>' + ulMatch[1] + '</li>')
      } else if (olMatch) {
        if (!inList || listType !== 'ol') {
          if (inList) {
            processedLines.push(listType === 'ul' ? '</ul>' : '</ol>')
          }
          processedLines.push('<ol>')
          inList = true
          listType = 'ol'
        }
        processedLines.push('<li>' + olMatch[1] + '</li>')
      } else {
        if (inList) {
          processedLines.push(listType === 'ul' ? '</ul>' : '</ol>')
          inList = false
          listType = null
        }
        processedLines.push(line)
      }
    }

    if (inList) {
      processedLines.push(listType === 'ul' ? '</ul>' : '</ol>')
    }

    html = processedLines.join('\n')

    // Line breaks (convert remaining newlines to <br>)
    html = html.replace(/\n/g, '<br>')

    return html
  }

  // Sanitize HTML to prevent XSS
  function sanitizeHTML(html) {
    const div = document.createElement('div')
    div.innerHTML = html

    // Remove script tags and event handlers
    const scripts = div.querySelectorAll('script')
    scripts.forEach((script) => script.remove())

    // Remove on* attributes
    const allElements = div.querySelectorAll('*')
    allElements.forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        if (attr.name.startsWith('on')) {
          el.removeAttribute(attr.name)
        }
      })
    })

    return div.innerHTML
  }

  // Helper function to normalize widget config with fallbacks
  function normalizeConfig(widgetData) {
    // Handle both snake_case (from API) and camelCase (from direct config)
    const colors = widgetData.colors || {}
    const radius = widgetData.radius || {}
    const initPage = widgetData.init_page || widgetData.initPage || {}

    return {
      id: widgetData.id || 'default',
      name: widgetData.name || 'Chat Support',
      theme: widgetData.theme || 'light',
      position: widgetData.position || 'bottom-right',
      colors: {
        primary: colors.primary || '#3b82f6',
        background: colors.background || '#ffffff',
        text: colors.text || '#1f2937',
        userBubble: colors.userBubble || colors.user_bubble || '#3b82f6',
        botBubble: colors.botBubble || colors.bot_bubble || '#f3f4f6',
        userText: colors.userText || colors.user_text || '#ffffff',
        botText: colors.botText || colors.bot_text || '#1f2937',
      },
      radius: {
        widget: Number(radius.widget) || 16,
        messageBubble:
          Number(radius.messageBubble || radius.message_bubble) || 12,
        button: Number(radius.button) || 50,
      },
      welcomeMessage:
        widgetData.welcome_message ||
        widgetData.welcomeMessage ||
        'Hi! How can I help you today?',
      placeholder: widgetData.placeholder || 'Type your message...',
      apiEndpoint: 'http://localhost:8000/api/v1/chat/stream',
      initPage: {
        enabled: initPage.enabled !== undefined ? initPage.enabled : false,
        welcomeMessage:
          initPage.welcome_message || initPage.welcomeMessage || '',
        faqs: initPage.faqs || [],
        showStartNewMessage:
          initPage.showStartNewMessage !== undefined
            ? initPage.showStartNewMessage
            : true,
        showContinueConversation:
          initPage.showContinueConversation !== undefined
            ? initPage.showContinueConversation
            : true,
      },
      showBotIcon:
        widgetData.show_bot_icon !== undefined
          ? widgetData.show_bot_icon
          : widgetData.showBotIcon !== undefined
            ? widgetData.showBotIcon
            : true,
      showUserIcon:
        widgetData.show_user_icon !== undefined
          ? widgetData.show_user_icon
          : widgetData.showUserIcon !== undefined
            ? widgetData.showUserIcon
            : true,
      enabled: widgetData.enabled !== undefined ? widgetData.enabled : true,
    }
  }

  // ChatWidget namespace
  window.ChatWidget = {
    config: null,
    isOpen: false,
    showInitPage: false,
    messages: [],
    container: null,
    sessionToken: null,
    tokenExpiresAt: null,
    tokenRefreshTimer: null,

    init: async function (widgetIdOrConfig) {
      let widgetData = null
      let widgetId = null

      // Determine if input is a widget ID (string) or config object
      if (typeof widgetIdOrConfig === 'string') {
        // Fetch widget config from API
        widgetId = widgetIdOrConfig
        const apiBaseUrl =
          window.CHAT_WIDGET_API_BASE_URL || 'http://localhost:8000'
        const apiUrl = `${apiBaseUrl}/api/v1/chat-widgets/${widgetId}`

        try {
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          // If widget not found (404), don't render
          if (response.status === 404) {
            console.warn('Chat widget not found:', widgetId)
            return
          }

          // If unauthorized or forbidden, don't render
          if (response.status === 401 || response.status === 403) {
            console.warn('Chat widget access denied:', widgetId)
            return
          }

          // If other error, don't render
          if (!response.ok) {
            console.error(
              'Failed to fetch chat widget:',
              response.status,
              response.statusText
            )
            return
          }

          widgetData = await response.json()

          // Check if widget is enabled - if not, don't render
          if (widgetData.enabled === false) {
            console.warn('Chat widget is disabled:', widgetId)
            return
          }
        } catch (error) {
          console.error('Error fetching chat widget:', error)
          return
        }
      } else {
        // Use provided config object (backward compatibility)
        widgetData = widgetIdOrConfig
        widgetId = widgetData.id || 'default'
      }

      // Prevent double initialization
      if (document.getElementById(`chat-widget-container-${widgetId}`)) {
        console.warn('Chat widget already initialized')
        return
      }

      // Normalize config with fallbacks
      this.config = normalizeConfig(widgetData)

      // Validate that we have minimum required attributes
      if (!this.config.id || !this.config.name) {
        console.error('Chat widget config missing required attributes')
        return
      }

      // Fetch initial session token (only if we have a valid widget ID)
      if (widgetId && widgetId !== 'default') {
        await this.fetchSessionToken(widgetId)
      }

      this.render()
      this.attachEventListeners()
      if (this.config.initPage.enabled) {
        this.showInitPage()
      } else {
        this.addWelcomeMessage()
      }
    },

    getApiBaseUrl: function () {
      return window.CHAT_WIDGET_API_BASE_URL || 'http://localhost:8000'
    },

    fetchSessionToken: async function (widgetId) {
      const apiBaseUrl = this.getApiBaseUrl()
      const tokenUrl = `${apiBaseUrl}/api/v1/chat-widgets/${widgetId}/session-token`

      try {
        const response = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          console.error('Failed to fetch session token:', response.status)
          return null
        }

        const data = await response.json()
        this.sessionToken = data.token
        // Set expiration time (refresh 30 seconds before expiration for safety)
        const expiresIn = data.expires_in || 300 // Default 5 minutes
        this.tokenExpiresAt = Date.now() + (expiresIn - 30) * 1000

        // Schedule automatic token refresh
        this.scheduleTokenRefresh(widgetId, expiresIn - 30)

        return this.sessionToken
      } catch (error) {
        console.error('Error fetching session token:', error)
        return null
      }
    },

    scheduleTokenRefresh: function (widgetId, refreshInSeconds) {
      // Clear existing timer if any
      if (this.tokenRefreshTimer) {
        clearTimeout(this.tokenRefreshTimer)
      }

      // Schedule refresh before expiration
      this.tokenRefreshTimer = setTimeout(() => {
        this.fetchSessionToken(widgetId).catch((error) => {
          console.error('Error refreshing session token:', error)
          // Retry after 10 seconds if refresh fails
          setTimeout(() => {
            this.fetchSessionToken(widgetId)
          }, 10000)
        })
      }, refreshInSeconds * 1000)
    },

    getValidToken: async function (widgetId) {
      // Check if token is expired or about to expire (within 30 seconds)
      if (
        !this.sessionToken ||
        !this.tokenExpiresAt ||
        Date.now() >= this.tokenExpiresAt
      ) {
        // Token expired or missing, fetch new one
        await this.fetchSessionToken(widgetId)
      }
      return this.sessionToken
    },

    getPositionStyles: function () {
      const positions = {
        'bottom-right': 'bottom: 20px; right: 20px;',
        'bottom-left': 'bottom: 20px; left: 20px;',
        'top-right': 'top: 20px; right: 20px;',
        'top-left': 'top: 20px; left: 20px;',
      }
      return positions[this.config.position] || positions['bottom-right']
    },

    render: function () {
      const styles = `
        #chat-widget-container-${this.config.id} * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        #chat-widget-container-${this.config.id} {
          position: fixed !important;
          ${this.getPositionStyles()}
          z-index: 99999 !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: ${this.config.position.includes('right') ? 'flex-end' : 'flex-start'} !important;
        }

        #chat-widget-button-${this.config.id} {
          width: 60px !important;
          height: 60px !important;
          border-radius: ${this.config.radius.button}px !important;
          background: ${this.config.colors.primary} !important;
          border: none !important;
          cursor: pointer !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: transform 0.2s, box-shadow 0.2s !important;
          flex-shrink: 0 !important;
        }

        #chat-widget-button-${this.config.id}:hover {
          transform: scale(1.1) !important;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2) !important;
        }

        #chat-widget-button-${this.config.id} svg {
          width: 28px !important;
          height: 28px !important;
          display: block !important;
          flex-shrink: 0 !important;
        }
        
        #chat-widget-button-${this.config.id} svg path {
          fill: white !important;
        }

        #chat-widget-window-${this.config.id} {
          display: none !important;
          width: 380px !important;
          height: calc(100vh - 100px) !important;
          max-width: calc(100vw - 40px) !important;
          max-height: 600px !important;
          background: ${this.config.colors.background} !important;
          border-radius: ${this.config.radius.widget}px !important;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
          flex-direction: column !important;
          overflow: hidden !important;
          margin-bottom: 10px !important;
          flex-shrink: 0 !important;
        }

        #chat-widget-window-${this.config.id}.open {
          display: flex !important;
        }

        #chat-widget-header-${this.config.id} {
          background: ${this.config.colors.primary} !important;
          color: white !important;
          padding: 16px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
        }

        #chat-widget-header-${this.config.id} h3 {
          font-size: 16px !important;
          font-weight: 600 !important;
        }

        #chat-widget-close-${this.config.id} {
          background: transparent !important;
          border: none !important;
          color: white !important;
          cursor: pointer !important;
          padding: 4px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        #chat-widget-messages-${this.config.id} {
          flex: 1 !important;
          overflow-y: auto !important;
          padding: 16px !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 12px !important;
        }

        #chat-widget-init-page-${this.config.id} {
          flex: 1 !important;
          overflow-y: auto !important;
          padding: 20px !important;
          display: flex !important;
          flex-direction: column !important;
        }

        #chat-widget-init-page-${this.config.id}.hidden {
          display: none !important;
        }

        .chat-widget-init-welcome {
          text-align: center !important;
          margin-bottom: 24px !important;
          white-space: pre-line !important;
          color: ${this.config.colors.text} !important;
          font-size: 14px !important;
          line-height: 1.6 !important;
        }

        .chat-widget-faq-title {
          font-weight: 600 !important;
          font-size: 16px !important;
          margin-bottom: 16px !important;
          color: ${this.config.colors.text} !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
        }

        .chat-widget-faq-item {
          padding: 12px 16px !important;
          margin-bottom: 8px !important;
          background: ${this.config.colors.botBubble} !important;
          border-radius: ${this.config.radius.messageBubble}px !important;
          cursor: pointer !important;
          transition: background 0.2s !important;
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
        }

        .chat-widget-faq-item:hover {
          background: ${this.config.colors.primary}15 !important;
        }

        .chat-widget-faq-indicator {
          width: 8px !important;
          height: 8px !important;
          border-radius: 50% !important;
          background: ${this.config.colors.primary} !important;
          flex-shrink: 0 !important;
        }

        .chat-widget-faq-question {
          flex: 1 !important;
          color: ${this.config.colors.text} !important;
          font-size: 14px !important;
        }

        .chat-widget-init-actions {
          margin-top: 20px !important;
          padding-top: 20px !important;
          border-top: 1px solid #e5e7eb !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 12px !important;
        }

        .chat-widget-init-action {
          padding: 10px 16px !important;
          background: transparent !important;
          border: 1px solid ${this.config.colors.primary} !important;
          color: ${this.config.colors.primary} !important;
          border-radius: 8px !important;
          cursor: pointer !important;
          font-size: 14px !important;
          text-align: left !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          transition: all 0.2s !important;
        }

        .chat-widget-init-action:hover {
          background: ${this.config.colors.primary} !important;
          color: white !important;
        }

        .chat-widget-message {
          display: flex !important;
          gap: 8px !important;
          animation: slideIn 0.3s ease-out !important;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .chat-widget-message.user {
          flex-direction: row-reverse !important;
        }

        .chat-widget-message-icon {
          width: 32px !important;
          height: 32px !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
          background: #e5e7eb !important;
        }

        .chat-widget-message.bot .chat-widget-message-icon {
          background: #e5e7eb !important;
        }

        .chat-widget-message.bot .chat-widget-message-icon svg {
          color: ${this.config.colors.primary} !important;
          width: 16px !important;
          height: 16px !important;
        }

        .chat-widget-message.user .chat-widget-message-icon {
          background: #e5e7eb !important;
          color: ${this.config.colors.text} !important;
          font-size: 12px !important;
          font-weight: 600 !important;
        }

        .chat-widget-message-content {
          max-width: 75% !important;
          padding: 10px 14px !important;
          border-radius: ${this.config.radius.messageBubble}px !important;
          font-size: 14px !important;
          line-height: 1.5 !important;
          word-wrap: break-word !important;
        }

        .chat-widget-message-content h1,
        .chat-widget-message-content h2,
        .chat-widget-message-content h3 {
          margin: 8px 0 4px 0 !important;
          font-weight: 600 !important;
        }

        .chat-widget-message-content h1 {
          font-size: 18px !important;
        }

        .chat-widget-message-content h2 {
          font-size: 16px !important;
        }

        .chat-widget-message-content h3 {
          font-size: 15px !important;
        }

        .chat-widget-message-content ul,
        .chat-widget-message-content ol {
          margin: 8px 0 !important;
          padding-left: 20px !important;
        }

        .chat-widget-message-content li {
          margin: 4px 0 !important;
        }

        .chat-widget-message-content code {
          background: rgba(0, 0, 0, 0.1) !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
          font-family: 'Courier New', monospace !important;
          font-size: 13px !important;
        }

        .chat-widget-message.user .chat-widget-message-content code {
          background: rgba(255, 255, 255, 0.2) !important;
        }

        .chat-widget-message-content pre {
          background: rgba(0, 0, 0, 0.05) !important;
          padding: 10px !important;
          border-radius: 6px !important;
          overflow-x: auto !important;
          margin: 8px 0 !important;
        }

        .chat-widget-message.user .chat-widget-message-content pre {
          background: rgba(255, 255, 255, 0.15) !important;
        }

        .chat-widget-message-content pre code {
          background: transparent !important;
          padding: 0 !important;
        }

        .chat-widget-message-content a {
          color: ${this.config.colors.primary} !important;
          text-decoration: underline !important;
        }

        .chat-widget-message.user .chat-widget-message-content a {
          color: rgba(255, 255, 255, 0.9) !important;
        }

        .chat-widget-message-content strong {
          font-weight: 600 !important;
        }

        .chat-widget-message-content em {
          font-style: italic !important;
        }

        .chat-widget-message-content br {
          line-height: 1.5 !important;
        }

        .chat-widget-message.bot .chat-widget-message-content {
          background: ${this.config.colors.botBubble} !important;
          color: ${this.config.colors.botText || this.config.colors.text} !important;
          border-bottom-left-radius: 4px !important;
        }

        .chat-widget-message.user .chat-widget-message-content {
          background: ${this.config.colors.userBubble} !important;
          color: ${this.config.colors.userText || '#ffffff'} !important;
          border-bottom-right-radius: 4px !important;
        }

        #chat-widget-input-container-${this.config.id} {
          padding: 16px !important;
          border-top: 1px solid #e5e7eb !important;
          display: flex !important;
          gap: 8px !important;
        }

        #chat-widget-input-${this.config.id} {
          flex: 1 !important;
          padding: 10px 14px !important;
          border: 1px solid #d1d5db !important;
          border-radius: 8px !important;
          font-size: 14px !important;
          outline: none !important;
          font-family: inherit !important;
        }

        #chat-widget-input-${this.config.id}:focus {
          border-color: ${this.config.colors.primary} !important;
        }

        #chat-widget-send-${this.config.id} {
          background: ${this.config.colors.primary} !important;
          color: white !important;
          border: none !important;
          padding: 0 !important;
          width: 40px !important;
          height: 40px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 50% !important;
          cursor: pointer !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          transition: opacity 0.2s !important;
        }

        #chat-widget-send-${this.config.id}:hover {
          opacity: 0.9 !important;
        }

        #chat-widget-send-${this.config.id}:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
        }

        .chat-widget-loading {
          display: flex !important;
          gap: 4px !important;
          padding: 10px 14px !important;
        }

        .chat-widget-loading-dot {
          width: 8px !important;
          height: 8px !important;
          border-radius: 50% !important;
          background: ${this.config.colors.primary} !important;
          animation: bounce 1.4s infinite ease-in-out both !important;
        }

        .chat-widget-loading-dot:nth-child(1) {
          animation-delay: -0.32s !important;
        }

        .chat-widget-loading-dot:nth-child(2) {
          animation-delay: -0.16s !important;
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }

        /* Mobile styles - full page */
        @media (max-width: 768px) {
          #chat-widget-container-${this.config.id} {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            align-items: stretch !important;
          }

          #chat-widget-window-${this.config.id} {
            width: 100% !important;
            height: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
            border-radius: 0 !important;
            margin: 0 !important;
          }

          #chat-widget-button-${this.config.id} {
            position: fixed !important;
            bottom: 20px !important;
            ${this.config.position.includes('right') ? 'right: 20px !important;' : 'left: 20px !important;'}
            z-index: 100000 !important;
          }

          #chat-widget-window-${this.config.id}.open ~ #chat-widget-button-${this.config.id} {
            display: none !important;
          }
        }
      `

      // Add styles only if not already added
      const styleId = `chat-widget-styles-${this.config.id}`
      if (!document.getElementById(styleId)) {
        const styleEl = document.createElement('style')
        styleEl.id = styleId
        styleEl.textContent = styles
        document.head.appendChild(styleEl)
      }

      const html = `
        <div id="chat-widget-window-${this.config.id}">
          <div id="chat-widget-header-${this.config.id}">
            <h3>${this.config.name}</h3>
            <button id="chat-widget-close-${this.config.id}" aria-label="Close chat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div id="chat-widget-init-page-${this.config.id}" class="hidden"></div>
          <div id="chat-widget-messages-${this.config.id}"></div>
          <div id="chat-widget-input-container-${this.config.id}">
            <input
              type="text"
              id="chat-widget-input-${this.config.id}"
              placeholder="${this.config.placeholder}"
              aria-label="Chat message input"
            />
            <button id="chat-widget-send-${this.config.id}" aria-label="Send message">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up-bold size-4" aria-hidden="true"><path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path></svg>
            </button>
          </div>
        </div>
        <button id="chat-widget-button-${this.config.id}" aria-label="Open chat">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bot size-6" aria-hidden="true"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>
        </button>
      `

      const container = document.createElement('div')
      container.id = `chat-widget-container-${this.config.id}`
      container.innerHTML = html
      document.body.appendChild(container)

      this.container = container
    },

    attachEventListeners: function () {
      const button = document.getElementById(
        `chat-widget-button-${this.config.id}`
      )
      const closeBtn = document.getElementById(
        `chat-widget-close-${this.config.id}`
      )
      const sendBtn = document.getElementById(
        `chat-widget-send-${this.config.id}`
      )
      const input = document.getElementById(
        `chat-widget-input-${this.config.id}`
      )
      const container = document.getElementById(
        `chat-widget-container-${this.config.id}`
      )

      button.addEventListener('click', (e) => {
        e.stopPropagation()
        this.toggleWidget()
      })
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.toggleWidget()
      })
      sendBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.sendMessage()
      })
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendMessage()
        }
      })

      // Prevent clicks inside widget from closing it
      const widgetWindow = document.getElementById(
        `chat-widget-window-${this.config.id}`
      )
      if (widgetWindow) {
        widgetWindow.addEventListener('click', (e) => {
          e.stopPropagation()
        })
      }

      // Click outside to close
      const handleClickOutside = (e) => {
        if (this.isOpen && container && !container.contains(e.target)) {
          this.toggleWidget()
        }
      }

      // Add click listener to document
      document.addEventListener('click', handleClickOutside)

      // Store handler for cleanup if needed
      this._clickOutsideHandler = handleClickOutside
    },

    toggleWidget: function () {
      const window = document.getElementById(
        `chat-widget-window-${this.config.id}`
      )
      this.isOpen = !this.isOpen
      window.classList.toggle('open', this.isOpen)

      if (this.isOpen && this.config.initPage.enabled) {
        this.showInitPage()
      } else if (!this.isOpen) {
        // Reset init page state when closing
        this.showInitPage = false
      }
    },

    showInitPage: function () {
      const initPage = document.getElementById(
        `chat-widget-init-page-${this.config.id}`
      )
      const messages = document.getElementById(
        `chat-widget-messages-${this.config.id}`
      )
      const inputContainer = document.getElementById(
        `chat-widget-input-container-${this.config.id}`
      )

      if (initPage) {
        initPage.classList.remove('hidden')
        if (messages) messages.style.display = 'none'
        if (inputContainer) inputContainer.style.display = 'none'
        this.renderInitPage()
      }
    },

    hideInitPage: function () {
      const initPage = document.getElementById(
        `chat-widget-init-page-${this.config.id}`
      )
      const messages = document.getElementById(
        `chat-widget-messages-${this.config.id}`
      )
      const inputContainer = document.getElementById(
        `chat-widget-input-container-${this.config.id}`
      )

      if (initPage) {
        initPage.classList.add('hidden')
        if (messages) messages.style.display = 'flex'
        if (inputContainer) inputContainer.style.display = 'flex'
        this.showInitPage = false
        if (this.messages.length === 0) {
          this.addWelcomeMessage()
        }
      }
    },

    renderInitPage: function () {
      const initPage = document.getElementById(
        `chat-widget-init-page-${this.config.id}`
      )
      if (!initPage) return

      const welcomeMsg =
        this.config.initPage.welcomeMessage ||
        'Hello 👋\nI am a Virtual Assistant\nHow may I help you?'

      let html = `<div class="chat-widget-init-welcome">${welcomeMsg}</div>`

      if (this.config.initPage.faqs && this.config.initPage.faqs.length > 0) {
        html +=
          '<div class="chat-widget-faq-title">Frequently Asked Questions ?</div>'
        this.config.initPage.faqs.forEach((faq, index) => {
          html += `
            <div class="chat-widget-faq-item" data-faq-index="${index}">
              <div class="chat-widget-faq-indicator"></div>
              <div class="chat-widget-faq-question">${faq.question}</div>
            </div>
          `
        })
      }

      if (
        this.config.initPage.showStartNewMessage ||
        this.config.initPage.showContinueConversation
      ) {
        html += '<div class="chat-widget-init-actions">'

        if (this.config.initPage.showStartNewMessage) {
          html += `
            <button class="chat-widget-init-action" data-action="start-new">
              Start new message →
            </button>
          `
        }

        if (this.config.initPage.showContinueConversation) {
          html += `
            <button class="chat-widget-init-action" data-action="continue">
              Continue conversation →
            </button>
          `
        }

        html += '</div>'
      }

      initPage.innerHTML = html

      // Attach FAQ click handlers
      initPage.querySelectorAll('.chat-widget-faq-item').forEach((item) => {
        item.addEventListener('click', (e) => {
          e.stopPropagation()
          const index = parseInt(e.currentTarget.dataset.faqIndex)
          const faq = this.config.initPage.faqs[index]
          if (faq) {
            this.hideInitPage()
            this.addMessage(faq.question, 'user')
            setTimeout(() => {
              this.addMessage(faq.answer, 'bot')
            }, 500)
          }
        })
      })

      // Attach action button handlers
      initPage.querySelectorAll('.chat-widget-init-action').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          const action = e.currentTarget.dataset.action
          this.hideInitPage()
          if (action === 'start-new') {
            this.messages = []
            const messagesContainer = document.getElementById(
              `chat-widget-messages-${this.config.id}`
            )
            if (messagesContainer) {
              messagesContainer.innerHTML = ''
            }
            this.addWelcomeMessage()
          }
        })
      })
    },

    addWelcomeMessage: function () {
      this.addMessage(this.config.welcomeMessage, 'bot')
    },

    addMessage: function (content, role) {
      const messagesContainer = document.getElementById(
        `chat-widget-messages-${this.config.id}`
      )

      const messageEl = document.createElement('div')
      messageEl.className = `chat-widget-message ${role}`

      // Add icon if enabled
      if (
        (role === 'bot' && this.config.showBotIcon) ||
        (role === 'user' && this.config.showUserIcon)
      ) {
        const iconEl = document.createElement('div')
        iconEl.className = 'chat-widget-message-icon'

        if (role === 'bot') {
          iconEl.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 8V4H8"></path>
              <rect width="16" height="12" x="4" y="8" rx="2"></rect>
              <path d="M2 14h2"></path>
              <path d="M20 14h2"></path>
              <path d="M15 13v2"></path>
              <path d="M9 13v2"></path>
            </svg>
          `
        } else {
          iconEl.textContent = 'U'
        }

        messageEl.appendChild(iconEl)
      }

      const contentEl = document.createElement('div')
      contentEl.className = 'chat-widget-message-content'

      // Parse markdown and render as HTML
      const parsedContent = parseMarkdown(content)
      const sanitizedContent = sanitizeHTML(parsedContent)
      contentEl.innerHTML = sanitizedContent

      messageEl.appendChild(contentEl)
      messagesContainer.appendChild(messageEl)

      messagesContainer.scrollTop = messagesContainer.scrollHeight

      this.messages.push({ role, content, timestamp: new Date() })
    },

    showLoading: function () {
      const messagesContainer = document.getElementById(
        `chat-widget-messages-${this.config.id}`
      )

      const loadingEl = document.createElement('div')
      loadingEl.id = `chat-widget-loading-${this.config.id}`
      loadingEl.className = 'chat-widget-message bot'

      let loadingHTML = ''

      // Add icon if enabled
      if (this.config.showBotIcon) {
        loadingHTML += `
          <div class="chat-widget-message-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 8V4H8"></path>
              <rect width="16" height="12" x="4" y="8" rx="2"></rect>
              <path d="M2 14h2"></path>
              <path d="M20 14h2"></path>
              <path d="M15 13v2"></path>
              <path d="M9 13v2"></path>
            </svg>
          </div>
        `
      }

      loadingHTML += `
        <div class="chat-widget-loading">
          <div class="chat-widget-loading-dot"></div>
          <div class="chat-widget-loading-dot"></div>
          <div class="chat-widget-loading-dot"></div>
        </div>
      `

      loadingEl.innerHTML = loadingHTML
      messagesContainer.appendChild(loadingEl)
      messagesContainer.scrollTop = messagesContainer.scrollHeight
    },

    hideLoading: function () {
      const loadingEl = document.getElementById(
        `chat-widget-loading-${this.config.id}`
      )
      if (loadingEl) {
        loadingEl.remove()
      }
    },

    sendMessage: async function () {
      const input = document.getElementById(
        `chat-widget-input-${this.config.id}`
      )
      const sendBtn = document.getElementById(
        `chat-widget-send-${this.config.id}`
      )
      const message = input.value.trim()

      if (!message) return

      input.value = ''
      sendBtn.disabled = true

      this.addMessage(message, 'user')
      this.showLoading()

      try {
        const conversationHistory = this.messages.slice(-5).map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        }))

        // Get valid token before making request
        const token = await this.getValidToken(this.config.id)
        const headers = {
          'Content-Type': 'application/json',
        }
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(this.config.apiEndpoint, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            user_input: message,
            conversation_history: conversationHistory,
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let accumulatedContent = ''
        let hasAddedMessage = false

        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))

                if (data.error) {
                  throw new Error(data.error)
                }

                if (data.chunk) {
                  accumulatedContent += data.chunk

                  if (!hasAddedMessage) {
                    this.hideLoading()
                    this.addMessage(accumulatedContent, 'bot')
                    hasAddedMessage = true
                  } else {
                    const messagesContainer = document.getElementById(
                      `chat-widget-messages-${this.config.id}`
                    )
                    const lastMessage = messagesContainer.lastElementChild
                    const contentEl = lastMessage.querySelector(
                      '.chat-widget-message-content'
                    )
                    if (contentEl) {
                      // Parse markdown and render as HTML for streaming updates
                      const parsedContent = parseMarkdown(accumulatedContent)
                      const sanitizedContent = sanitizeHTML(parsedContent)
                      contentEl.innerHTML = sanitizedContent
                    }
                  }
                }

                if (data.done) {
                  if (data.full_response && !hasAddedMessage) {
                    this.hideLoading()
                    this.addMessage(data.full_response, 'bot')
                  }
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', parseError)
              }
            }
          }
        }
      } catch (error) {
        console.error('Chat error:', error)
        this.hideLoading()
        this.addMessage(
          'Sorry, I encountered an error. Please try again later.',
          'bot'
        )
      } finally {
        sendBtn.disabled = false
      }
    },
  }
})()
