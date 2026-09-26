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
  strings?: Record<string, string>
  parentOrigin?: string
  /**
   * Override the URL used to load matrix-js-sdk.
   * Default: PARA-hosted SDK. Keep this off public CDNs in production so the
   * chat shell has a single trust boundary.
   */
  sdkUrl?: string
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

    <div id="messages"></div>
    <div id="typing-indicator"></div>

    <div id="composer">
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
          headers: {Authorization: 'Bearer ' + CONFIG.accessToken},
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

      async function openMedia(mxcUrl, filename, eventId, download) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({type: 'matrix-open-media', mxcUrl, filename}));
          return;
        }
        const blob = await fetchMedia(mxcUrl, false, DOWNLOAD_LIMIT_BYTES);
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
        if (msgtype === 'm.image') {
          if (mediaEndpoint(content.url, true)) {
            const container = document.createElement('span');
            container.textContent = STRINGS.imageLoading;
            fetchMedia(content.url, true, PREVIEW_LIMIT_BYTES).then(blob => {
              if (!container.isConnected) return;
              const url = URL.createObjectURL(blob);
              retainMediaUrl(eventId, url);
              const img = document.createElement('img');
              img.src = url;
              img.alt = content.body || STRINGS.image;
              container.replaceChildren(img);
            }).catch(err => {
              if (!container.isConnected) return;
              container.replaceChildren(mediaButton(content.url, content.body || STRINGS.imageLower, eventId, STRINGS.downloadImage, true));
              if (err.message !== 'MEDIA_TOO_LARGE') console.error('Media preview failed:', err);
            });
            return container;
          }
        }
        if ((msgtype === 'm.video' || msgtype === 'm.audio' || msgtype === 'm.file') && mediaEndpoint(content.url, false)) {
          const prefix = msgtype === 'm.video' ? '🎬 ' : msgtype === 'm.audio' ? '🎵 ' : '📎 ';
          return mediaButton(content.url, content.body || STRINGS.file, eventId, prefix + STRINGS.download + ' ' + (content.body || STRINGS.file), true);
        }
        const span = document.createElement('span');
        span.textContent = content.body || '';
        return span;
      }

      function mediaButton(mxcUrl, filename, eventId, label, download) {
        const button = document.createElement('button');
        button.className = 'file';
        button.type = 'button';
        button.textContent = label;
        button.addEventListener('click', async function(event) {
          event.stopPropagation();
          button.disabled = true;
          try {
            await openMedia(mxcUrl, filename, eventId, download);
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

      function showReactionPicker(eventId, isSelf) {
        const picker = document.getElementById('reaction-picker');
        picker.dataset.eventId = eventId;
        // Your own messages cannot be reported.
        document.getElementById('report-message').hidden = !!isSelf;
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
        headerTitle.textContent = CONFIG.communityName || STRINGS.chat;

        if (!CONFIG.accessToken || !CONFIG.userId || !CONFIG.homeServer || !CONFIG.roomId) {
          console.error('Missing PARA_CONFIG', CONFIG);
          document.getElementById('error-text').textContent = STRINGS.missingAuth;
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
            if (_room && _room.roomId === CONFIG.roomId) {
              renderEvent(event);
            }
          });

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
          document.getElementById('error-text').textContent = STRINGS.connectionError + ' ' + (err.message || STRINGS.unknown);
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
      window.addEventListener('beforeunload', releaseAllMediaUrls);
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
