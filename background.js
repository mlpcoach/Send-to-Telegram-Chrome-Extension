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

async function sendImage(bot, imageUrl, caption) {
  const body = {
    chat_id: bot.chatId,
    photo: imageUrl,
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

async function sendDocument(bot, fileUrl, caption) {
  const body = {
    chat_id: bot.chatId,
    document: fileUrl,
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
      } else {
        pushContent(request.type || 'page', tab, request.content || '', request.botIndex);
      }
    });
  }
});

// Initial setup
setupContextMenus();
