/**
 * Lightweight custom Matrix client for PARA community chat.
 * Loaded in a WebView by CommunityChatScreen.
 *
 * Uses a PARA-hosted matrix-js-sdk browser build.
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
   * OAuth refresh material for MAS-issued sessions. The homeserver's access
   * tokens are short-lived, so without these the conversation stops working a
   * few minutes after it opens. Absent on deployments where the bridge mints a
   * long-lived Synapse token instead.
   */
  refreshToken?: string
  tokenEndpoint?: string
  oauthClientId?: string
  strings?: Record<string, string>
  parentOrigin?: string
  /**
   * Override the URL used to load matrix-js-sdk.
   * Default: PARA-hosted SDK. Keep this off public CDNs in production so the
   * chat shell has a single trust boundary.
   */
  sdkUrl?: string
  cryptoStorePrefix?: string
  cryptoStorageKey?: string
  requireEncryption?: boolean
}

const SDK_VERSION = '41.8.0'

export function buildClientHtml(sdkBundle?: string): string {
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

    /* Media messages */
    .message-bubble img {
      max-width: 100%;
      max-height: 240px;
      border-radius: 12px;
      display: block;
    }
    .message-bubble .file {
      display: flex;
      align-items: center;
      gap: 8px;
      background: transparent;
      border: 0;
      padding: 0;
      font: inherit;
      text-align: left;
      color: inherit;
      text-decoration: none;
      word-break: break-word;
    }

    /* Reactions */
    .reactions {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 4px;
      padding: 0 8px;
    }
    .reaction {
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 10px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      cursor: pointer;
      user-select: none;
    }
    .reaction.self {
      background: var(--primary);
      color: var(--primary-text);
      border-color: var(--primary);
    }

    /* Reaction picker */
    #reaction-picker {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 8px 12px;
      box-shadow: 0 4px 20px var(--shadow);
      display: none;
      gap: 8px;
      z-index: 100;
    }
    #reaction-picker.visible { display: flex; }
    #reaction-picker span {
      font-size: 24px;
      cursor: pointer;
      padding: 4px;
      border-radius: 50%;
      transition: transform 0.1s;
    }
    #reaction-picker span:active { transform: scale(1.2); }
    #reaction-picker .report-btn {
      border: none;
      border-left: 1px solid var(--border);
      background: transparent;
      color: var(--text-secondary, inherit);
      font-size: 13px;
      padding: 4px 4px 4px 12px;
      cursor: pointer;
    }
    #reaction-picker .report-btn[hidden] { display: none; }

    /* Typing indicator */
    #typing-indicator {
      display: none;
      padding: 4px 16px;
      font-size: 12px;
      color: var(--text-secondary);
      font-style: italic;
    }
  </style>
</head>
<body>
  <div id="app">
    <div id="header">
      <span id="header-title"></span>
      <span id="header-status" class="connecting"></span>
    </div>

    <div id="loading">
      <div class="spinner"></div>
      <span id="loading-text"></span>
    </div>

    <div id="error">
      <span style="font-size:32px">⚠️</span>
      <span id="error-text"></span>
      <button id="retry" onclick="initClient()"></button>
    </div>

    <details id="security-panel" hidden>
      <summary>Seguridad y recuperación</summary>
      <p id="security-status" role="status"></p>
      <button id="verify-device" type="button">Verificar con otro dispositivo</button>
      <button id="accept-verification" type="button" hidden>Aceptar verificación</button>
      <p id="verification-sas" hidden></p>
      <button id="verification-match" type="button" hidden>Coinciden</button>
      <button id="verification-mismatch" type="button" hidden>No coinciden</button>
      <button id="verification-cancel" type="button" hidden>Cancelar verificación</button>
      <label for="recovery-input">Clave de recuperación</label>
      <input id="recovery-input" type="password" autocomplete="off" />
      <button id="restore-history" type="button">Recuperar historial</button>
      <button id="setup-backup" type="button">Configurar recuperación</button>
      <label for="recovery-output" id="recovery-output-label" hidden>Guarda esta clave en un lugar seguro. No la compartas.</label>
      <textarea id="recovery-output" readonly hidden></textarea>
      <button id="show-pending-key" type="button" hidden>Mostrar clave pendiente</button>
      <button id="ack-pending-key" type="button" hidden>Ya guardé mi clave</button>
    </details>
    <div id="messages"></div>
    <div id="typing-indicator"></div>

    <div id="composer">
      <span id="compose-context" hidden></span>
      <button id="cancel-context" type="button" hidden>Cancelar</button>
      <input id="attachment" type="file" aria-label="Adjuntar archivo cifrado" hidden />
      <textarea id="input" rows="1"></textarea>
      <button id="send">➤</button>
    </div>

    <div id="reaction-picker">
      <span data-emoji="👍">👍</span>
      <span data-emoji="❤️">❤️</span>
      <span data-emoji="😂">😂</span>
      <span data-emoji="😮">😮</span>
      <span data-emoji="😢">😢</span>
      <span data-emoji="🎉">🎉</span>
      <button id="reply-message" type="button">Responder</button>
      <button id="edit-message" type="button">Editar</button>
      <button id="report-message" class="report-btn" type="button"></button>
      <span data-emoji="🔥">🔥</span>
    </div>
  </div>

  <!--
    PARA Chat uses a self-hosted, pinned build of matrix-js-sdk.
    Version: ${SDK_VERSION}
    To update: bump matrix-js-sdk in package.json, run pnpm build:chat-bundle,
    and commit the regenerated assets/chat/matrix-js-sdk.bundle.txt.
  -->
  ${
    sdkBundle
      ? `<script id="matrix-sdk-script">${sdkBundle}</script>`
      : `<script id="matrix-sdk-script" src="https://chat.para.social/static/matrix-js-sdk.bundle.txt"></script>`
  }
  <script>
    (function() {
      'use strict';

      const CONFIG = window.PARA_CONFIG || {};
      const STRINGS = CONFIG.strings || {};
      const messagesEl = document.getElementById('messages');
      const composerEl = document.getElementById('composer');
      const loadingEl = document.getElementById('loading');
      const errorEl = document.getElementById('error');
      const headerTitle = document.getElementById('header-title');
      const headerStatus = document.getElementById('header-status');
      const inputEl = document.getElementById('input');
      const sendBtn = document.getElementById('send');
      headerTitle.textContent = STRINGS.loading || '';
      document.getElementById('loading-text').textContent = STRINGS.connecting || '';
      document.getElementById('error-text').textContent = STRINGS.connectionFailed || '';
      document.getElementById('retry').textContent = STRINGS.retry || '';
      document.getElementById('typing-indicator').textContent = STRINGS.someoneTyping || '';
      inputEl.placeholder = STRINGS.messagePlaceholder || '';
      inputEl.setAttribute('aria-label', STRINGS.messagePlaceholder || '');
      sendBtn.setAttribute('aria-label', STRINGS.sendMessage || '');

      let client = null;
      let room = null;
      let myUserId = CONFIG.userId || '';
      let isReady = false;
      let composeContext = null;
      let recoveryKey = null;
      let pendingRecoveryStore = null;
      const secretKeys = new Map();
      let verificationRequest = null;
      let verificationCallbacks = null;
      const verificationVerifiers = new WeakSet();
      function showSas(callbacks) {
        verificationCallbacks = callbacks;
        const sas = document.getElementById('verification-sas');
        sas.textContent = callbacks.sas.emoji
          ? callbacks.sas.emoji.map(entry => entry[0] + ' ' + entry[1]).join(' · ')
          : (callbacks.sas.decimal || []).join(' · ');
        sas.hidden = false;
        document.getElementById('verification-match').hidden = false;
        document.getElementById('verification-mismatch').hidden = false;
        securityStatus.textContent = 'Compara estos símbolos con tu otro dispositivo antes de confirmar.';
      }
      function runVerifier(verifier) {
        if (!verifier || verificationVerifiers.has(verifier)) return;
        verificationVerifiers.add(verifier);
        verifier.on('show_sas', showSas);
        const callbacks = verifier.getShowSasCallbacks();
        if (callbacks) showSas(callbacks);
        void verifier.verify().catch(() => {securityStatus.textContent = 'Verificación cancelada o vencida. Puedes volver a intentarlo.';});
      }
      function resetVerification() {
        verificationCallbacks = null;
        ['accept-verification', 'verification-sas', 'verification-match', 'verification-mismatch', 'verification-cancel'].forEach(id => {
          document.getElementById(id).hidden = true;
        });
        document.getElementById('verify-device').disabled = false;
      }
      function trackVerification(request) {
        if (!request.isSelfVerification || request.otherUserId !== CONFIG.userId) return;
        if (verificationRequest && verificationRequest.pending && verificationRequest !== request) return;
        verificationRequest = request;
        document.getElementById('verify-device').disabled = true;
        document.getElementById('verification-cancel').hidden = false;
        securityStatus.textContent = 'Verificación con tu dispositivo ' + (request.otherDeviceId || '') + '. Abre el otro cliente para continuar.';
        let starting = false;
        const changed = async function() {
          if (verificationRequest !== request) return;
          document.getElementById('accept-verification').hidden = request.initiatedByMe || request.phase !== 2;
          if (request.phase === 5 || request.phase === 6) {
            resetVerification();
            securityStatus.textContent = request.phase === 6 ? 'Dispositivo verificado.' : 'Verificación cancelada o vencida.';
            return;
          }
          if (request.phase === 3 && request.initiatedByMe && !starting) {
            starting = true;
            try {runVerifier(await request.startVerification('m.sas.v1'));}
            catch {resetVerification(); securityStatus.textContent = 'No se pudo iniciar la verificación. Intenta de nuevo.';}
          } else if (request.phase === 4) runVerifier(request.verifier);
        };
        request.on('change', changed); void changed();
      }

      const securityStatus = document.getElementById('security-status');
      function requireEncryptedRoom() {
        if (CONFIG.requireEncryption && (!isReady || !client.getCrypto() || !client.isRoomEncrypted(CONFIG.roomId)))
          throw new Error('CHAT_ENCRYPTION_REQUIRED');
      }
      async function fetchAttachment(mxcUrl, thumbnail, limit, encryptedFile, mime) {
        const blob = await fetchMedia(mxcUrl, encryptedFile ? false : thumbnail, limit);
        if (!encryptedFile) return blob;
        const helpers = window.paraMatrixCrypto;
        const attachment = new helpers.EncryptedAttachment(new Uint8Array(await blob.arrayBuffer()), JSON.stringify(encryptedFile));
        try { return new Blob([helpers.Attachment.decrypt(attachment)], {type: mime || 'application/octet-stream'}); }
        finally { attachment.free(); }
      }
      function clearComposeContext() {
        composeContext = null;
        document.getElementById('compose-context').hidden = true;
        document.getElementById('cancel-context').hidden = true;
      }


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
        return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      }

      function formatDate(ts) {
        const d = new Date(ts);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === today.toDateString()) return STRINGS.today;
        if (d.toDateString() === yesterday.toDateString()) return STRINGS.yesterday;
        return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      }

      let lastDate = '';
      const messageElements = new Map(); // eventId -> msgDiv
      const mediaObjectUrls = new Map(); // eventId -> blob URLs
      const PREVIEW_LIMIT_BYTES = 8 * 1024 * 1024;
      const DOWNLOAD_LIMIT_BYTES = 100 * 1024 * 1024;
      const reactionPickers = new Set();

      function mediaEndpoint(mxcUrl, thumbnail) {
        if (!mxcUrl || !mxcUrl.startsWith('mxc://')) return null;
        const path = mxcUrl.slice(6);
        const separator = path.indexOf('/');
        if (separator < 1 || separator === path.length - 1) return null;
        const serverName = path.slice(0, separator);
        const mediaId = path.slice(separator + 1);
        if (/[?#/]/.test(mediaId) || /[?#/]/.test(serverName)) return null;
        const endpoint = thumbnail ? 'thumbnail' : 'download';
        const size = thumbnail ? '?width=800&height=600&method=scale' : '';
        return CONFIG.homeServer.replace(/\\/$/, '') + '/_matrix/client/v1/media/' + endpoint + '/' + encodeURIComponent(serverName) + '/' + encodeURIComponent(mediaId) + size;
      }

      async function fetchMedia(mxcUrl, thumbnail, limitBytes) {
        const url = mediaEndpoint(mxcUrl, thumbnail);
        if (!url) throw new Error('INVALID_MXC');
        const response = await fetch(url, {
          headers: {Authorization: 'Bearer ' + (client ? client.getAccessToken() : CONFIG.accessToken)},
        });
        if (!response.ok) throw new Error('MEDIA_HTTP_' + response.status);
        const length = Number(response.headers.get('content-length'));
        if (Number.isFinite(length) && length > limitBytes) {
          if (response.body) await response.body.cancel();
          throw new Error('MEDIA_TOO_LARGE');
        }
        if (!response.body) throw new Error('MEDIA_STREAM_UNAVAILABLE');
        const reader = response.body.getReader();
        const chunks = [];
        let total = 0;
        try {
          while (true) {
            const result = await reader.read();
            if (result.done) break;
            total += result.value.byteLength;
            if (total > limitBytes) throw new Error('MEDIA_TOO_LARGE');
            chunks.push(result.value);
          }
        } catch (err) {
          await reader.cancel().catch(() => {});
          throw err;
        }
        return new Blob(chunks, {type: response.headers.get('content-type') || 'application/octet-stream'});
      }

      function retainMediaUrl(eventId, url) {
        const urls = mediaObjectUrls.get(eventId) || [];
        urls.push(url);
        mediaObjectUrls.set(eventId, urls);
      }

      function releaseMediaUrls(eventId) {
        const urls = mediaObjectUrls.get(eventId) || [];
        urls.forEach(url => URL.revokeObjectURL(url));
        mediaObjectUrls.delete(eventId);
      }

      function releaseAllMediaUrls() {
        mediaObjectUrls.forEach(urls => urls.forEach(url => URL.revokeObjectURL(url)));
        mediaObjectUrls.clear();
      }

      async function openMedia(mxcUrl, filename, eventId, download, encryptedFile, mime) {
        if (window.ReactNativeWebView && !encryptedFile) {
          window.ReactNativeWebView.postMessage(JSON.stringify({type: 'matrix-open-media', mxcUrl, filename}));
          return;
        }
        const blob = await fetchAttachment(mxcUrl, false, DOWNLOAD_LIMIT_BYTES, encryptedFile, mime);
        const url = URL.createObjectURL(blob);
        retainMediaUrl(eventId, url);
        const link = document.createElement('a');
        link.href = url;
        if (download) link.download = filename || STRINGS.file;
        else link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      function renderEvent(event) {
        const type = event.getType();
        if (type === 'm.reaction') {
          updateReactions(event);
          return;
        }
        if (type === 'm.room.redaction') {
          removeMessage(event.getAssociatedId());
          return;
        }
        if (type === 'm.room.encrypted') {
          const unavailable = document.createElement('div');
          unavailable.className = 'message';
          unavailable.textContent = 'Mensaje cifrado: recupera tus claves para ver el historial.';
          messagesEl.appendChild(unavailable);
          return;
        }
        if (type !== 'm.room.message') return;

        const content = event.getContent();
        const msgtype = content.msgtype;
        const eventId = event.getId();

        // Handle edits: if this is an edit, update the original message
        const relatesTo = content['m.relates_to'];
        if (relatesTo && relatesTo.rel_type === 'm.replace' && relatesTo.event_id) {
          updateMessageBody(relatesTo.event_id, content['m.new_content'] || content);
          return;
        }

        if (!content.body && msgtype !== 'm.image' && msgtype !== 'm.video' && msgtype !== 'm.audio' && msgtype !== 'm.file') return;

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
        msgDiv.dataset.eventId = eventId;

        if (!isSelf) {
          const senderEl = document.createElement('div');
          senderEl.className = 'message-sender';
          senderEl.textContent = sender.split(':')[0].replace('@', '');
          msgDiv.appendChild(senderEl);
        }

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.appendChild(renderMessageContent(content, eventId));
        msgDiv.appendChild(bubble);

        const timeEl = document.createElement('div');
        timeEl.className = 'message-time';
        timeEl.textContent = formatTime(ts);
        msgDiv.appendChild(timeEl);

        const reactionsEl = document.createElement('div');
        reactionsEl.className = 'reactions';
        reactionsEl.dataset.eventId = eventId;
        msgDiv.appendChild(reactionsEl);

        msgDiv.addEventListener('click', function(e) {
          if (e.target.closest('.file') || e.target.closest('.reaction')) return;
          showReactionPicker(eventId, isSelf);
        });

        messageElements.set(eventId, msgDiv);
        messagesEl.appendChild(msgDiv);
        scrollToBottom();

        // Send read receipt for this message
        if (client && eventId && !isSelf) {
          client.sendReadReceipt(event).catch(() => {});
        }
      }

      function renderMessageContent(content, eventId) {
        const msgtype = content.msgtype;
        const mediaUrl = content.file ? content.file.url : content.url;
        const mime = content.info && content.info.mimetype;
        if (msgtype === 'm.image') {
          if (mediaEndpoint(mediaUrl, true)) {
            const container = document.createElement('span');
            container.textContent = STRINGS.imageLoading;
            fetchAttachment(mediaUrl, true, PREVIEW_LIMIT_BYTES, content.file, mime).then(blob => {
              if (!container.isConnected) return;
              const url = URL.createObjectURL(blob);
              retainMediaUrl(eventId, url);
              const img = document.createElement('img');
              img.src = url;
              img.alt = content.body || STRINGS.image;
              container.replaceChildren(img);
            }).catch(err => {
              if (!container.isConnected) return;
              container.replaceChildren(mediaButton(mediaUrl, content.body || STRINGS.imageLower, eventId, STRINGS.downloadImage, true, content.file, mime));
              if (err.message !== 'MEDIA_TOO_LARGE') console.error('Media preview failed:', err);
            });
            return container;
          }
        }
        if ((msgtype === 'm.video' || msgtype === 'm.audio' || msgtype === 'm.file') && mediaEndpoint(mediaUrl, false)) {
          const prefix = msgtype === 'm.video' ? '🎬 ' : msgtype === 'm.audio' ? '🎵 ' : '📎 ';
          return mediaButton(mediaUrl, content.body || STRINGS.file, eventId, prefix + STRINGS.download + ' ' + (content.body || STRINGS.file), true, content.file, mime);
        }
        const span = document.createElement('span');
        span.textContent = content.body || '';
        return span;
      }

      function mediaButton(mxcUrl, filename, eventId, label, download, encryptedFile, mime) {
        const button = document.createElement('button');
        button.className = 'file';
        button.type = 'button';
        button.textContent = label;
        button.addEventListener('click', async function(event) {
          event.stopPropagation();
          button.disabled = true;
          try {
            await openMedia(mxcUrl, filename, eventId, download, encryptedFile, mime);
          } catch (err) {
            console.error('Media download failed:', err);
            button.textContent = STRINGS.downloadFailed;
          } finally {
            button.disabled = false;
          }
        });
        return button;
      }

      function updateMessageBody(eventId, content) {
        const msgDiv = messageElements.get(eventId);
        if (!msgDiv) return;
        const bubble = msgDiv.querySelector('.message-bubble');
        if (bubble) {
          releaseMediaUrls(eventId);
          bubble.innerHTML = '';
          bubble.appendChild(renderMessageContent(content, eventId));
        }
      }

      function removeMessage(eventId) {
        const msgDiv = messageElements.get(eventId);
        if (msgDiv) {
          releaseMediaUrls(eventId);
          msgDiv.remove();
          messageElements.delete(eventId);
        }
      }

      function updateReactions(event) {
        const content = event.getContent();
        const relatesTo = content && content['m.relates_to'];
        if (!relatesTo || relatesTo.rel_type !== 'm.annotation') return;
        const eventId = relatesTo.event_id;
        const key = relatesTo.key;
        if (!eventId || !key) return;

        const reactionsEl = document.querySelector('.reactions[data-event-id="' + eventId + '"]');
        if (!reactionsEl) return;

        const sender = event.getSender();
        const existing = reactionsEl.querySelector('.reaction[data-key="' + key + '"]');
        if (existing) {
          // Toggle: if sender already reacted with this key, remove; else add sender
          const senders = existing.dataset.senders ? existing.dataset.senders.split(',') : [];
          const idx = senders.indexOf(sender);
          if (idx >= 0) {
            senders.splice(idx, 1);
          } else {
            senders.push(sender);
          }
          if (senders.length === 0) {
            existing.remove();
            return;
          }
          existing.dataset.senders = senders.join(',');
          existing.textContent = key + ' ' + senders.length;
          existing.classList.toggle('self', senders.includes(myUserId));
        } else {
          const btn = document.createElement('span');
          btn.className = 'reaction' + (sender === myUserId ? ' self' : '');
          btn.dataset.key = key;
          btn.dataset.senders = sender;
          btn.textContent = key + ' 1';
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            sendReaction(eventId, key);
          });
          reactionsEl.appendChild(btn);
        }
      }

      // One channel to the app: React Native bridge, or the iframe parent at
      // its configured origin only.
      function postToApp(payload) {
        const message = JSON.stringify(payload);
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(message);
        else if (window.parent !== window && CONFIG.parentOrigin) window.parent.postMessage(message, CONFIG.parentOrigin);
      }

      // Live state for the app's room rail and member panel: per-room unread
      // counts and presence of the joined members. IDs and counts only; no
      // message content crosses to the app.
      let liveTimer = null;
      function publishLiveState() {
        if (liveTimer) return;
        liveTimer = setTimeout(function() {
          liveTimer = null;
          if (!client) return;
          const rooms = client.getRooms().map(function(r) {
            return {roomId: r.roomId, unread: r.getUnreadNotificationCount('total') || 0};
          });
          const presence = {};
          if (room) {
            room.getJoinedMembers().forEach(function(m) {
              if (m.user && m.user.presence) presence[m.userId] = m.user.presence;
            });
          }
          postToApp({type: 'matrix-live-state', activeRoomId: CONFIG.roomId, rooms: rooms, presence: presence});
        }, 250);
      }

      function showReactionPicker(eventId, isSelf) {
        const picker = document.getElementById('reaction-picker');
        picker.dataset.eventId = eventId;
        // Your own messages cannot be reported.
        document.getElementById('report-message').hidden = !!isSelf;
        document.getElementById('edit-message').hidden = !isSelf;
        picker.classList.add('visible');
        function hide(e) {
          if (!picker.contains(e.target)) {
            picker.classList.remove('visible');
            document.removeEventListener('click', hide);
          }
        }
        // Defer so the current click doesn't immediately hide it
        setTimeout(() => document.addEventListener('click', hide), 0);
      }

      async function sendReaction(eventId, emoji) {
        if (!client || !room || !eventId) return;
        try {
          await client.sendEvent(room.roomId, 'm.reaction', {
            'm.relates_to': {
              rel_type: 'm.annotation',
              event_id: eventId,
              key: emoji,
            },
          });
        } catch (err) {
          console.error('Failed to send reaction:', err);
        }
      }

      function scrollToBottom() {
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }

      function loadHistory() {
        if (!room) return;
        const timeline = room.getLiveTimeline();
        const events = timeline.getEvents();
        releaseAllMediaUrls();
        messagesEl.innerHTML = '';
        lastDate = '';
        messageElements.clear();
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
          requireEncryptedRoom();
          let content = {msgtype: 'm.text', body: text};
          if (composeContext && composeContext.kind === 'reply')
            content['m.relates_to'] = {'m.in_reply_to': {event_id: composeContext.eventId}};
          if (composeContext && composeContext.kind === 'edit')
            content = {msgtype: 'm.text', body: '* ' + text, 'm.new_content': content,
              'm.relates_to': {rel_type: 'm.replace', event_id: composeContext.eventId}};
          await client.sendMessage(room.roomId, content);
          clearComposeContext();
          client.sendTyping(room.roomId, false).catch(() => {});
        } catch (err) {
          console.error('Failed to send:', err);
          inputEl.value = text;
        } finally {
          sendBtn.disabled = false;
          inputEl.focus();
        }
      }

      async function initClient() {
        if (client) {
          client.stopClient();
          client = null;
        }
        isReady = false;
        show('loading');
        setStatus('connecting');
        headerTitle.textContent = CONFIG.communityName || STRINGS.chat;

        if (!CONFIG.accessToken || !CONFIG.userId || !CONFIG.homeServer || !CONFIG.roomId) {
          console.error('Missing chat configuration');
          document.getElementById('error-text').textContent = STRINGS.missingAuth;
          show('error');
          setStatus('error');
          return;
        }

        try {
          // The SDK calls this when the homeserver rejects the access token,
          // and uses whatever it returns for subsequent requests. MAS is a
          // public client, so the refresh carries the client id and no secret.
          var tokenRefreshFunction = CONFIG.refreshToken && CONFIG.tokenEndpoint
            ? function(refreshToken) {
                return fetch(CONFIG.tokenEndpoint, {
                  method: 'POST',
                  headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                  body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                    client_id: CONFIG.oauthClientId,
                  }).toString(),
                }).then(function(res) {
                  if (!res.ok) throw new Error('refresh failed: ' + res.status);
                  return res.json();
                }).then(function(body) {
                  // Tell the host so the next page load starts from the live
                  // token instead of replaying a dead one.
                  postToApp({
                    type: 'matrix-token-refreshed',
                    accessToken: body.access_token,
                    refreshToken: body.refresh_token || refreshToken,
                    expiresInMs: body.expires_in ? body.expires_in * 1000 : undefined,
                  });
                  return {
                    accessToken: body.access_token,
                    refreshToken: body.refresh_token || refreshToken,
                  };
                });
              }
            : undefined;

          client = window.matrixcs.createClient({
            baseUrl: CONFIG.homeServer,
            accessToken: CONFIG.accessToken,
            userId: CONFIG.userId,
            deviceId: CONFIG.deviceId,
            refreshToken: CONFIG.refreshToken,
            tokenRefreshFunction: tokenRefreshFunction,
            cryptoCallbacks: CONFIG.requireEncryption ? {
              getSecretStorageKey: async function(opts) {
                const keyId = await client.secretStorage.getDefaultKeyId();
                const key = secretKeys.get(keyId) || recoveryKey;
                if (!keyId || !opts.keys[keyId] || !key) throw new Error('RECOVERY_KEY_REQUIRED');
                if (!await client.secretStorage.checkKey(key, opts.keys[keyId])) throw new Error('RECOVERY_KEY_INVALID');
                return [keyId, key];
              },
              cacheSecretStorageKey: function(id, info, key) {secretKeys.set(id, key);},
            } : undefined,
          });

          if (CONFIG.requireEncryption) {
            if (!CONFIG.cryptoStorePrefix || !/^[a-f0-9]{64}$/.test(CONFIG.cryptoStorageKey || ''))
              throw new Error('CHAT_CRYPTO_STORE_UNAVAILABLE');
            var storeKey = Uint8Array.from(CONFIG.cryptoStorageKey.match(/../g), function(b) { return parseInt(b, 16); });
            await client.initRustCrypto({
              cryptoDatabasePrefix: CONFIG.cryptoStorePrefix,
              storageKey: storeKey,
            });
            pendingRecoveryStore = await window.paraMatrixCrypto.createPendingRecoveryStore(CONFIG.cryptoStorePrefix, storeKey);
            const pendingKey = await pendingRecoveryStore.get();
            if (pendingKey) showPendingRecovery(pendingKey, false);
            client.on('crypto.verificationRequestReceived', trackVerification);
            client.on('Event.decrypted', function(event) {
              if (event.getRoomId() === CONFIG.roomId) loadHistory();
            });
          }

          client.on('sync', function(state) {
            if (state === 'PREPARED') {
              setStatus('connected');
              publishLiveState();
              room = client.getRoom(CONFIG.roomId);
              if (room) {
                if (CONFIG.requireEncryption && !client.isRoomEncrypted(CONFIG.roomId)) {
                  document.getElementById('error-text').textContent = STRINGS.encryptedRoomRequired || 'Esta sala no está cifrada de extremo a extremo.';
                  show('error');
                  setStatus('error');
                  return;
                }
                loadHistory();
                show('chat');
                isReady = true;
              } else {
                // Try to join the room
                client.joinRoom(CONFIG.roomId).then(function(joinedRoom) {
                  room = joinedRoom;
                  if (CONFIG.requireEncryption && !client.isRoomEncrypted(CONFIG.roomId)) throw new Error('ENCRYPTED_ROOM_REQUIRED');
                  loadHistory();
                  show('chat');
                  isReady = true;
                }).catch(function(err) {
                  console.error('Failed to join room:', err);
                  document.getElementById('error-text').textContent = STRINGS.joinFailed;
                  show('error');
                  setStatus('error');
                });
              }
            } else if (state === 'ERROR') {
              setStatus('error');
            }
          });

          client.on('RoomMember.membership', function(_event, member) {
            if (member.userId !== CONFIG.userId || member.roomId !== CONFIG.roomId || member.membership !== 'leave') return;
            postToApp({type: 'matrix-membership-left', roomId: CONFIG.roomId});
          });

          client.on('Room.timeline', function(event, _room, toStartOfTimeline) {
            if (toStartOfTimeline) return;
            publishLiveState();
            if (_room && _room.roomId === CONFIG.roomId) {
              renderEvent(event);
            }
          });

          client.on('Room.receipt', publishLiveState);
          client.on('Room.unreadNotifications', publishLiveState);
          client.on('User.presence', publishLiveState);

          client.on('RoomMember.typing', function(event, member) {
            const typing = member.typing;
            const indicator = document.getElementById('typing-indicator');
            if (typing && member.userId !== myUserId) {
              indicator.style.display = 'block';
              indicator.textContent = member.name + ' ' + STRINGS.typingSuffix;
            } else {
              indicator.style.display = 'none';
            }
          });

          await client.startClient({ initialSyncLimit: 50 });
        } catch (err) {
          console.error('Init error:', err);
          document.getElementById('error-text').textContent = STRINGS.connectionError;
          show('error');
          setStatus('error');
        }
      }

      // Reaction picker listeners
      const picker = document.getElementById('reaction-picker');
      const reportBtn = document.getElementById('report-message');
      reportBtn.textContent = STRINGS.reportMessage || '';
      reportBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const eventId = picker.dataset.eventId;
        picker.classList.remove('visible');
        // IDs only: the app collects a reason; the message text never leaves
        // the room (D2).
        if (eventId) postToApp({type: 'matrix-report-message', roomId: CONFIG.roomId, eventId: eventId});
      });
      picker.querySelectorAll('span').forEach(function(span) {
        span.addEventListener('click', function(e) {
          e.stopPropagation();
          const eventId = picker.dataset.eventId;
          const emoji = span.dataset.emoji;
          picker.classList.remove('visible');
          if (eventId && emoji) sendReaction(eventId, emoji);
        });
      });

      document.getElementById('cancel-context').addEventListener('click', clearComposeContext);
      ['reply', 'edit'].forEach(function(kind) {
        document.getElementById(kind + '-message').addEventListener('click', function() {
          const event = room && room.findEventById(picker.dataset.eventId);
          if (!event || (kind === 'edit' && event.getSender() !== myUserId)) return;
          composeContext = {kind: kind, eventId: event.getId()};
          const context = document.getElementById('compose-context');
          context.textContent = kind === 'edit' ? 'Editando mensaje' : 'Respondiendo mensaje';
          context.hidden = false;
          document.getElementById('cancel-context').hidden = false;
          if (kind === 'edit') inputEl.value = event.getContent().body || '';
          picker.classList.remove('visible'); inputEl.focus();
        });
      });
      document.getElementById('attachment').hidden = !CONFIG.requireEncryption;
      document.getElementById('attachment').addEventListener('change', async function() {
        const file = this.files && this.files[0];
        if (!file || !client || !room) return;
        this.disabled = true;
        let encrypted;
        try {
          requireEncryptedRoom();
          if (file.size > DOWNLOAD_LIMIT_BYTES) throw new Error('MEDIA_TOO_LARGE');
          encrypted = window.paraMatrixCrypto.Attachment.encrypt(new Uint8Array(await file.arrayBuffer()));
          const info = JSON.parse(encrypted.mediaEncryptionInfo);
          const upload = await client.uploadContent(new Blob([encrypted.encryptedData], {type: 'application/octet-stream'}),
            {type: 'application/octet-stream', includeFilename: false});
          info.url = upload.content_uri;
          requireEncryptedRoom();
          const mime = file.type || 'application/octet-stream';
          const kind = mime.startsWith('image/') ? 'm.image' : mime.startsWith('video/') ? 'm.video' : mime.startsWith('audio/') ? 'm.audio' : 'm.file';
          await client.sendMessage(room.roomId, {msgtype: kind, body: file.name,
            file: info, info: {mimetype: mime, size: file.size}});
        } catch (_) { securityStatus.textContent = 'No se pudo enviar el archivo. Intenta de nuevo.'; }
        finally {if (encrypted) encrypted.free(); this.value = ''; this.disabled = false;}
      });
      document.getElementById('security-panel').hidden = !CONFIG.requireEncryption;
      function showPendingRecovery(key, visible) {
        const output = document.getElementById('recovery-output');
        output.value = key; output.hidden = !visible;
        document.getElementById('recovery-output-label').hidden = !visible;
        document.getElementById('show-pending-key').hidden = false;
        document.getElementById('ack-pending-key').hidden = false;
      }
      async function recoveryAction(setup) {
        const restore = document.getElementById('restore-history');
        const create = document.getElementById('setup-backup');
        restore.disabled = create.disabled = true;
        securityStatus.textContent = 'Procesando recuperación…';
        try {
          requireEncryptedRoom();
          const crypto = client.getCrypto();
          if (setup) {
            if (await client.secretStorage.getDefaultKeyId()) throw new Error('RECOVERY_EXISTS');
            const signing = await crypto.getCrossSigningStatus();
            if (await crypto.getCrossSigningKeyId() && !signing.privateKeysCachedLocally.masterKey)
              throw new Error('RECOVERY_NEEDS_VERIFIED_DEVICE');
            const pendingKey = await pendingRecoveryStore.get();
            const key = pendingKey
              ? {encodedPrivateKey: pendingKey, privateKey: window.paraMatrixCrypto.decodeRecoveryKey(pendingKey)}
              : await crypto.createRecoveryKeyFromPassphrase();
            recoveryKey = key.privateKey;
            // Persist the encrypted pending copy before any setup network write.
            await pendingRecoveryStore.set(key.encodedPrivateKey);
            showPendingRecovery(key.encodedPrivateKey, true);
            await crypto.bootstrapCrossSigning({});
            await crypto.bootstrapSecretStorage({createSecretStorageKey: async () => key, setupNewKeyBackup: true});
            securityStatus.textContent = 'Recuperación configurada. Guarda la clave antes de cerrar.';
          } else {
            const input = document.getElementById('recovery-input');
            recoveryKey = window.paraMatrixCrypto.decodeRecoveryKey(input.value.trim()); input.value = '';
            await crypto.loadSessionBackupPrivateKeyFromSecretStorage();
            const signing = await crypto.getCrossSigningStatus();
            if (signing.privateKeysInSecretStorage) await crypto.bootstrapCrossSigning({});
            await crypto.checkKeyBackupAndEnable();
            const restored = await crypto.restoreKeyBackup({});
            securityStatus.textContent = restored.imported > 0 ? 'Historial recuperado.' : 'No hay claves de historial disponibles en la copia de seguridad.';
            loadHistory();
          }
        } catch (error) {
          securityStatus.textContent = error.message === 'RECOVERY_EXISTS'
            ? 'Ya existe recuperación. Usa tu clave actual; no se reemplazó.'
            : error.message === 'RECOVERY_NEEDS_VERIFIED_DEVICE'
              ? 'Verifica este dispositivo con otro cliente antes de configurar recuperación.'
              : 'No se pudo recuperar o guardar el historial. Revisa la clave y la conexión, y vuelve a intentar.';
        } finally {
          recoveryKey = null; secretKeys.clear(); restore.disabled = false;
          create.disabled = false;
        }
      }
      document.getElementById('verify-device').addEventListener('click', async function() {
        try {requireEncryptedRoom(); trackVerification(await client.getCrypto().requestOwnUserVerification());}
        catch {securityStatus.textContent = 'No se pudo solicitar la verificación. Revisa la conexión y abre tu otro dispositivo.';}
      });
      document.getElementById('accept-verification').addEventListener('click', async function() {
        if (verificationRequest) await verificationRequest.accept().catch(() => {resetVerification();});
      });
      document.getElementById('verification-match').addEventListener('click', async function() {
        if (verificationCallbacks) {
          const callbacks = verificationCallbacks; verificationCallbacks = null;
          await callbacks.confirm().catch(() => {resetVerification();});
        }
      });
      document.getElementById('verification-mismatch').addEventListener('click', function() {
        if (verificationCallbacks) verificationCallbacks.mismatch(); resetVerification();
      });
      document.getElementById('verification-cancel').addEventListener('click', function() {
        if (verificationRequest) void verificationRequest.cancel().catch(() => {}); resetVerification();
      });
      document.getElementById('restore-history').addEventListener('click', function() {void recoveryAction(false);});
      document.getElementById('setup-backup').addEventListener('click', function() {void recoveryAction(true);});
      document.getElementById('show-pending-key').addEventListener('click', async function() {
        try {
          const output = document.getElementById('recovery-output');
          if (output.hidden) {output.value = await pendingRecoveryStore.get() || ''; output.hidden = false;}
          else {output.value = ''; output.hidden = true;}
          document.getElementById('recovery-output-label').hidden = output.hidden;
        } catch {securityStatus.textContent = 'No se pudo abrir la clave pendiente en este dispositivo.';}
      });
      document.getElementById('ack-pending-key').addEventListener('click', function() {
        try {
          pendingRecoveryStore.acknowledge();
          document.getElementById('recovery-output').value = '';
          document.getElementById('recovery-output').hidden = true;
          document.getElementById('recovery-output-label').hidden = true;
          document.getElementById('show-pending-key').hidden = true;
          document.getElementById('ack-pending-key').hidden = true;
          document.getElementById('setup-backup').disabled = false;
        } catch {securityStatus.textContent = 'No se pudo actualizar el almacén de recuperación. Reintenta.';}
      });
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
        // Send typing notification
        if (client && room) {
          client.sendTyping(room.roomId, true, 30000).catch(() => {});
        }
      });

      // Start
      window.addEventListener('pagehide', function() {
        releaseAllMediaUrls(); recoveryKey = null; secretKeys.clear();
        document.getElementById('recovery-output').value = '';
        document.getElementById('recovery-input').value = '';
        if (verificationRequest && verificationRequest.pending) void verificationRequest.cancel().catch(() => {});
        verificationRequest = null; verificationCallbacks = null;
        if (client) {client.stopClient();}
      });
      document.addEventListener('visibilitychange', function() {
        if (!document.hidden) return;
        const output = document.getElementById('recovery-output'); output.value = ''; output.hidden = true;
        document.getElementById('recovery-output-label').hidden = true;
        document.getElementById('recovery-input').value = '';
      });
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
      window.PARA_CONFIG = ${JSON.stringify(config).replace(/</g, '\\u003c')};
    })();
  `
}

export function buildConfiguredClientHtml(
  sdkBundle: string | undefined,
  config: MatrixClientConfig,
): string {
  return buildClientHtml(sdkBundle).replace(
    '  <script>\n    (function() {',
    `  <script>${buildConfigScript(config)}</script>\n  <script>\n    (function() {`,
  )
}
