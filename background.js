// Sanctum Send — Multi-bot Telegram sender

// ── Storage helpers ─────────────────────────────────────────

async function getBots() {
  const { bots } = await chrome.storage.local.get('bots');
  return bots || [];
}

async function getDefaultBot() {
  const { defaultBot } = await chrome.storage.local.get('defaultBot');
  return defaultBot || 0;
}

// ── Badge feedback ──────────────────────────────────────────

function showBadge(color, text, seconds) {
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), seconds * 1000);
}

// ── Telegram API ────────────────────────────────────────────

async function sendText(bot, text, source) {
  const body = {
    chat_id: bot.chatId,
    text: text + (source ? '\n\nFrom:\n' + source.title + '\n' + source.url : ''),
  };

  const resp = await fetch(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) throw new Error(`Telegram API error: ${resp.status}`);
  return resp.json();
}

async function sendImage(bot, imageSource, caption) {
  // If it's a blob/file, use multipart upload
  if (imageSource instanceof Blob) {
    const form = new FormData();
    form.append('chat_id', bot.chatId);
    form.append('photo', imageSource, 'image.png');
    if (caption) form.append('caption', caption.substring(0, 1024));

    const resp = await fetch(`https://api.telegram.org/bot${bot.token}/sendPhoto`, {
      method: 'POST',
      body: form,
    });
    if (!resp.ok) throw new Error(`Telegram API error: ${resp.status}`);
    return resp.json();
  }

  // URL-based image
  const body = {
    chat_id: bot.chatId,
    photo: imageSource,
    caption: caption ? caption.substring(0, 1024) : '',
  };

  const resp = await fetch(`https://api.telegram.org/bot${bot.token}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) throw new Error(`Telegram API error: ${resp.status}`);
  return resp.json();
}

async function sendDocument(bot, fileSource, caption, filename) {
  // If it's a blob/file, use multipart upload
  if (fileSource instanceof Blob) {
    const form = new FormData();
    form.append('chat_id', bot.chatId);
    form.append('document', fileSource, filename || 'file');
    if (caption) form.append('caption', caption.substring(0, 1024));

    const resp = await fetch(`https://api.telegram.org/bot${bot.token}/sendDocument`, {
      method: 'POST',
      body: form,
    });
    if (!resp.ok) throw new Error(`Telegram API error: ${resp.status}`);
    return resp.json();
  }

  // URL-based document
  const body = {
    chat_id: bot.chatId,
    document: fileSource,
    caption: caption ? caption.substring(0, 1024) : '',
  };

  const resp = await fetch(`https://api.telegram.org/bot${bot.token}/sendDocument`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) throw new Error(`Telegram API error: ${resp.status}`);
  return resp.json();
}

async function captureAndSend(bot, tab, caption) {
  // Capture visible tab as screenshot
  const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
  const resp = await fetch(dataUrl);
  const blob = await resp.blob();
  return sendImage(bot, blob, caption || tab.title || 'Screenshot');
}

// ── Send dispatcher ─────────────────────────────────────────

async function pushContent(type, tab, content, botIndex) {
  const bots = await getBots();
  const idx = botIndex !== undefined ? botIndex : await getDefaultBot();
  const bot = bots[idx];

  if (!bot) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const source = tab ? { title: tab.title || '', url: tab.url || '' } : null;

  try {
    switch (type) {
      case 'page':
        await sendText(bot, tab.url, { title: tab.title, url: '' });
        break;
      case 'link':
        await sendText(bot, content, source);
        break;
      case 'selection':
        await sendText(bot, content.substring(0, 4000), source);
        break;
      case 'image':
        await sendImage(bot, content, source ? source.title : '');
        break;
      case 'file':
        await sendDocument(bot, content, source ? source.title : '');
        break;
      case 'screenshot':
        await captureAndSend(bot, tab, 'Screenshot: ' + (tab ? tab.title : ''));
        break;
      case 'upload':
        // content is {blob, filename}
        await sendDocument(bot, content.blob, source ? source.title : '', content.filename);
        break;
      default:
        await sendText(bot, content || tab.url, source);
    }
    showBadge('#006400', '✓', 2);
  } catch (err) {
    console.error('Sanctum Send error:', err);
    showBadge('#ff0000', '✗', 3);
  }
}

// ── Context menus ───────────────────────────────────────────

async function setupContextMenus() {
  chrome.contextMenus.removeAll();
  const bots = await getBots();

  if (bots.length === 0) return;

  const contexts = ['page', 'link', 'image', 'selection'];
  const labels = {
    page: 'Send page',
    link: 'Send link',
    image: 'Send image',
    selection: 'Send selection',
  };

  // Screenshot menu item (always available on page context)
  if (bots.length === 1) {
    chrome.contextMenus.create({
      id: 'screenshot:0',
      title: `Screenshot to ${bots[0].name}`,
      contexts: ['page'],
    });
  } else {
    const ssParent = 'parent:screenshot';
    chrome.contextMenus.create({
      id: ssParent,
      title: 'Screenshot page',
      contexts: ['page'],
    });
    for (let i = 0; i < bots.length; i++) {
      chrome.contextMenus.create({
        id: `screenshot:${i}`,
        parentId: ssParent,
        title: bots[i].name,
        contexts: ['page'],
      });
    }
  }

  chrome.contextMenus.create({ id: 'sep', type: 'separator', contexts: ['page'] });

  if (bots.length === 1) {
    // Single bot — flat menu
    for (const ctx of contexts) {
      chrome.contextMenus.create({
        id: `send:${ctx}:0`,
        title: `${labels[ctx]} to ${bots[0].name}`,
        contexts: [ctx],
      });
    }
  } else {
    // Multiple bots — submenus per context
    for (const ctx of contexts) {
      const parentId = `parent:${ctx}`;
      chrome.contextMenus.create({
        id: parentId,
        title: labels[ctx],
        contexts: [ctx],
      });

      for (let i = 0; i < bots.length; i++) {
        chrome.contextMenus.create({
          id: `send:${ctx}:${i}`,
          parentId,
          title: bots[i].name,
          contexts: [ctx],
        });
      }
    }
  }
}

// ── Event listeners ─────────────────────────────────────────

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const parts = info.menuItemId.split(':');

  if (parts[0] === 'screenshot') {
    const botIndex = parseInt(parts[1], 10);
    pushContent('screenshot', tab, '', botIndex);
    return;
  }

  if (parts[0] !== 'send') return;

  const type = parts[1];
  const botIndex = parseInt(parts[2], 10);

  switch (type) {
    case 'page':
      pushContent('page', tab, '', botIndex);
      break;
    case 'link':
      pushContent('link', tab, info.linkUrl, botIndex);
      break;
    case 'image':
      pushContent('image', tab, info.srcUrl, botIndex);
      break;
    case 'selection':
      pushContent('selection', tab, info.selectionText, botIndex);
      break;
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'reload-contextmenus') {
    setupContextMenus();
  } else if (request.action === 'send') {
    // From popup — send with selected bot
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (request.type === 'selection') {
        chrome.tabs.sendMessage(tab.id, { method: 'selection' }, (text) => {
          pushContent('selection', tab, text || tab.url, request.botIndex);
        });
      } else if (request.type === 'screenshot') {
        pushContent('screenshot', tab, '', request.botIndex);
      } else {
        pushContent(request.type || 'page', tab, request.content || '', request.botIndex);
      }
    });
  } else if (request.action === 'upload-file') {
    // File upload from popup — request contains base64 data
    (async () => {
      const bots = await getBots();
      const bot = bots[request.botIndex];
      if (!bot) return;
      try {
        const resp = await fetch(request.dataUrl);
        const blob = await resp.blob();
        await sendDocument(bot, blob, request.caption || '', request.filename);
        showBadge('#006400', '✓', 2);
      } catch (err) {
        console.error('Upload error:', err);
        showBadge('#ff0000', '✗', 3);
      }
    })();
  }
});

// Initial setup
setupContextMenus();
