/**
 * Lightweight custom Matrix client for PARA community chat.
 * Loaded in a WebView by CommunityChatScreen.
 *
 * Uses matrix-js-sdk browser build from unpkg CDN.
 * Configuration is injected via window.PARA_CONFIG.
 */

export interface MatrixClientConfig {
  accessToken: string
  userId: string
  homeServer: string
  deviceId: string
  roomId: string
  communityName: string
  /**
   * Override the URL used to load matrix-js-sdk.
   * Default: unpkg CDN (convenient for dev).
   * Production: host on your own domain, e.g.
   *   'https://chat.para.social/static/matrix-js-sdk.min.js'
   */
  sdkUrl?: string
}

export function buildClientHtml(
  sdkUrl = 'https://unpkg.com/matrix-js-sdk@34.11.0/dist/browser-matrix.min.js',
): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <style>
    :root {
      --bg: #ffffff;
      --bg-secondary: #f5f5f5;
      --text: #1a1a1a;
      --text-secondary: #666666;
      --border: #e0e0e0;
      --primary: #2563eb;
      --primary-text: #ffffff;
      --bubble-self: #2563eb;
      --bubble-self-text: #ffffff;
      --bubble-other: #f0f0f0;
      --bubble-other-text: #1a1a1a;
      --input-bg: #ffffff;
      --shadow: rgba(0,0,0,0.08);
      --error: #dc2626;
      --radius: 18px;
      --radius-self: 18px 18px 4px 18px;
      --radius-other: 18px 18px 18px 4px;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0a0a0a;
        --bg-secondary: #1a1a1a;
        --text: #f5f5f5;
        --text-secondary: #a0a0a0;
        --border: #2a2a2a;
        --primary: #3b82f6;
        --primary-text: #ffffff;
        --bubble-self: #3b82f6;
        --bubble-self-text: #ffffff;
        --bubble-other: #1f1f1f;
        --bubble-other-text: #f5f5f5;
        --input-bg: #1a1a1a;
        --shadow: rgba(0,0,0,0.3);
        --error: #ef4444;
      }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 15px;
      line-height: 1.4;
      background: var(--bg);
      color: var(--text);
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
    }

    #app {
      display: flex;
      flex-direction: column;
      height: 100vh;
      height: 100dvh;
    }

    /* Header */
    #header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      background: var(--bg);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 10;
    }
    #header-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text);
    }
    #header-status {
      position: absolute;
      right: 16px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--text-secondary);
      transition: background 0.3s;
    }
    #header-status.connected { background: #22c55e; }
    #header-status.connecting { background: #f59e0b; }
    #header-status.error { background: var(--error); }

    /* Messages */
    #messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      -webkit-overflow-scrolling: touch;
    }

    .message {
      display: flex;
      flex-direction: column;
      max-width: 80%;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .message.self { align-self: flex-end; }
    .message.other { align-self: flex-start; }

    .message-sender {
      font-size: 11px;
      color: var(--text-secondary);
      margin-bottom: 2px;
      padding: 0 8px;
    }

    .message-bubble {
      padding: 10px 14px;
      word-break: break-word;
    }
    .message.self .message-bubble {
      background: var(--bubble-self);
      color: var(--bubble-self-text);
      border-radius: var(--radius-self);
    }
    .message.other .message-bubble {
      background: var(--bubble-other);
      color: var(--bubble-other-text);
      border-radius: var(--radius-other);
    }

    .message-time {
      font-size: 10px;
      color: var(--text-secondary);
      margin-top: 3px;
      padding: 0 8px;
      align-self: flex-end;
    }
    .message.self .message-time { align-self: flex-end; }
    .message.other .message-time { align-self: flex-start; }

    /* Date separator */
    .date-sep {
      text-align: center;
      font-size: 11px;
      color: var(--text-secondary);
      margin: 12px 0;
      position: relative;
    }
    .date-sep::before,
    .date-sep::after {
      content: '';
      position: absolute;
      top: 50%;
      width: 30%;
      height: 1px;
      background: var(--border);
    }
    .date-sep::before { left: 0; }
    .date-sep::after { right: 0; }

    /* Loading */
    #loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      gap: 16px;
      color: var(--text-secondary);
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Error */
    #error {
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      gap: 12px;
      padding: 24px;
      text-align: center;
      color: var(--error);
    }
    #error button {
      padding: 10px 20px;
      border: none;
      border-radius: 20px;
      background: var(--primary);
      color: var(--primary-text);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }

    /* Composer */
    #composer {
      display: none;
      padding: 10px 12px;
      border-top: 1px solid var(--border);
      background: var(--bg);
      gap: 8px;
      align-items: flex-end;
    }
    #input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid var(--border);
      border-radius: 20px;
      background: var(--input-bg);
      color: var(--text);
      font-size: 15px;
      outline: none;
      max-height: 100px;
      resize: none;
      font-family: inherit;
    }
    #input:focus { border-color: var(--primary); }
    #send {
      width: 38px;
      height: 38px;
      border: none;
      border-radius: 50%;
      background: var(--primary);
      color: var(--primary-text);
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
    }
    #send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  </style>
</head>
<body>
  <div id="app">
    <div id="header">
      <span id="header-title">Cargando...</span>
      <span id="header-status" class="connecting"></span>
    </div>

    <div id="loading">
      <div class="spinner"></div>
      <span>Conectando al chat...</span>
    </div>

    <div id="error">
      <span style="font-size:32px">⚠️</span>
      <span id="error-text">No se pudo conectar al chat</span>
      <button onclick="initClient()">Reintentar</button>
    </div>

    <div id="messages"></div>

    <div id="composer">
      <textarea id="input" rows="1" placeholder="Escribe un mensaje..."></textarea>
      <button id="send">➤</button>
    </div>
  </div>

  <!--
    SECURITY NOTE: Loading the Matrix SDK from a CDN (unpkg) is convenient for
    development but creates a supply-chain risk. In production, self-host this
    file on your own domain (e.g. https://chat.para.social/static/matrix-js-sdk.min.js)
    and update the src below. The integrity hash pins the exact build.

    To update the SDK version:
    1. Download the new browser build
    2. Compute SRI: curl -sL URL | openssl dgst -sha384 -binary | openssl base64 -A
    3. Update src and integrity below.
  -->
  <script id="matrix-sdk-script"
    src="${sdkUrl}"
    integrity="sha384-PXdWGFv64mA2MdFTsOmjdSCIf/izWrYIb1P504cN8Kgn8XL9zijRXNICYup07Wuj"
    crossorigin="anonymous"
  ></script>
  <script>
    (function() {
      'use strict';

      const CONFIG = window.PARA_CONFIG || {};
      const messagesEl = document.getElementById('messages');
      const composerEl = document.getElementById('composer');
      const loadingEl = document.getElementById('loading');
      const errorEl = document.getElementById('error');
      const headerTitle = document.getElementById('header-title');
      const headerStatus = document.getElementById('header-status');
      const inputEl = document.getElementById('input');
      const sendBtn = document.getElementById('send');

      let client = null;
      let room = null;
      let myUserId = CONFIG.userId || '';
      let isReady = false;

      function show(state) {
        loadingEl.style.display = state === 'loading' ? 'flex' : 'none';
        errorEl.style.display = state === 'error' ? 'flex' : 'none';
        messagesEl.style.display = state === 'chat' ? 'flex' : 'none';
        composerEl.style.display = state === 'chat' ? 'flex' : 'none';
      }

      function setStatus(status) {
        headerStatus.className = status;
      }

      function formatTime(ts) {
        const d = new Date(ts);
        return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      }

      function formatDate(ts) {
        const d = new Date(ts);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === today.toDateString()) return 'Hoy';
        if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
        return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
      }

      let lastDate = '';

      function renderEvent(event) {
        if (event.getType() !== 'm.room.message') return;
        const content = event.getContent();
        const body = content && content.body ? content.body : '';
        if (!body) return;

        const sender = event.getSender();
        const ts = event.getTs();
        const isSelf = sender === myUserId;
        const dateStr = formatDate(ts);

        if (dateStr !== lastDate) {
          lastDate = dateStr;
          const sep = document.createElement('div');
          sep.className = 'date-sep';
          sep.textContent = dateStr;
          messagesEl.appendChild(sep);
        }

        const msgDiv = document.createElement('div');
        msgDiv.className = 'message ' + (isSelf ? 'self' : 'other');

        if (!isSelf) {
          const senderEl = document.createElement('div');
          senderEl.className = 'message-sender';
          senderEl.textContent = sender.split(':')[0].replace('@', '');
          msgDiv.appendChild(senderEl);
        }

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.textContent = body;
        msgDiv.appendChild(bubble);

        const timeEl = document.createElement('div');
        timeEl.className = 'message-time';
        timeEl.textContent = formatTime(ts);
        msgDiv.appendChild(timeEl);

        messagesEl.appendChild(msgDiv);
        scrollToBottom();
      }

      function scrollToBottom() {
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }

      function loadHistory() {
        if (!room) return;
        const timeline = room.getLiveTimeline();
        const events = timeline.getEvents();
        messagesEl.innerHTML = '';
        lastDate = '';
        events.forEach(renderEvent);
        scrollToBottom();
      }

      async function sendMessage() {
        const text = inputEl.value.trim();
        if (!text || !client || !room) return;
        inputEl.value = '';
        inputEl.rows = 1;
        sendBtn.disabled = true;
        try {
          await client.sendTextMessage(room.roomId, text);
        } catch (err) {
          console.error('Failed to send:', err);
          inputEl.value = text;
        } finally {
          sendBtn.disabled = false;
          inputEl.focus();
        }
      }

      async function initClient() {
        show('loading');
        setStatus('connecting');
        headerTitle.textContent = CONFIG.communityName || 'Chat';

        if (!CONFIG.accessToken || !CONFIG.userId || !CONFIG.homeServer || !CONFIG.roomId) {
          console.error('Missing PARA_CONFIG', CONFIG);
          document.getElementById('error-text').textContent = 'Falta configuración de autenticación';
          show('error');
          setStatus('error');
          return;
        }

        try {
          client = window.matrixcs.createClient({
            baseUrl: CONFIG.homeServer,
            accessToken: CONFIG.accessToken,
            userId: CONFIG.userId,
            deviceId: CONFIG.deviceId,
          });

          client.on('sync', function(state) {
            if (state === 'PREPARED') {
              setStatus('connected');
              room = client.getRoom(CONFIG.roomId);
              if (room) {
                loadHistory();
                show('chat');
                isReady = true;
              } else {
                // Try to join the room
                client.joinRoom(CONFIG.roomId).then(function(joinedRoom) {
                  room = joinedRoom;
                  loadHistory();
                  show('chat');
                  isReady = true;
                }).catch(function(err) {
                  console.error('Failed to join room:', err);
                  document.getElementById('error-text').textContent = 'No se pudo unir a la sala';
                  show('error');
                  setStatus('error');
                });
              }
            } else if (state === 'ERROR') {
              setStatus('error');
            }
          });

          client.on('Room.timeline', function(event, _room, toStartOfTimeline) {
            if (toStartOfTimeline) return;
            if (_room && _room.roomId === CONFIG.roomId) {
              renderEvent(event);
            }
          });

          await client.startClient({ initialSyncLimit: 50 });
        } catch (err) {
          console.error('Init error:', err);
          document.getElementById('error-text').textContent = 'Error de conexión: ' + (err.message || 'desconocido');
          show('error');
          setStatus('error');
        }
      }

      // Event listeners
      sendBtn.addEventListener('click', sendMessage);
      inputEl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
      inputEl.addEventListener('input', function() {
        this.rows = Math.min(5, Math.max(1, this.value.split('\\n').length));
      });

      // Start
      initClient();
    })();
  </script>
</body>
</html>`
}

/**
 * Build the injectedJavaScript that sets window.PARA_CONFIG
 * before the WebView page loads.
 */
export function buildConfigScript(config: MatrixClientConfig): string {
  return `
    (function() {
      window.PARA_CONFIG = ${JSON.stringify(config)};
    })();
  `
}
