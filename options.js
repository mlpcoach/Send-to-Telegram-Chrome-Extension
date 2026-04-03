// Sanctum Send — Options (multi-bot management)

const listEl = document.getElementById('bot-list');
const statusEl = document.getElementById('status');
let bots = [];

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = type || '';
  if (type === 'ok') setTimeout(() => { statusEl.textContent = ''; }, 3000);
}

function renderBots() {
  listEl.innerHTML = '';

  if (bots.length === 0) {
    listEl.innerHTML = '<div class="empty">No bots yet. Click "+ Add Bot" to get started.</div>';
    return;
  }

  for (let i = 0; i < bots.length; i++) {
    const bot = bots[i];
    const card = document.createElement('div');
    card.className = 'bot-card';
    card.innerHTML = `
      <div class="header">
        <span class="name">#${i + 1}</span>
        <button class="remove-btn" data-idx="${i}">Remove</button>
      </div>
      <div class="field">
        <label>Name</label>
        <input type="text" data-idx="${i}" data-key="name" value="${bot.name || ''}" placeholder="e.g. Desk, Viaim, Ministry">
      </div>
      <div class="field">
        <label>Bot Token</label>
        <input type="text" data-idx="${i}" data-key="token" value="${bot.token || ''}" placeholder="123456789:AABBccDDeeFF...">
      </div>
      <div class="field">
        <label>Chat ID</label>
        <input type="text" data-idx="${i}" data-key="chatId" value="${bot.chatId || ''}" placeholder="Your Telegram user ID or group ID">
      </div>
    `;
    listEl.appendChild(card);
  }

  // Wire up remove buttons
  listEl.querySelectorAll('.remove-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      bots.splice(idx, 1);
      renderBots();
    });
  });

  // Wire up input changes
  listEl.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      const idx = parseInt(input.dataset.idx, 10);
      const key = input.dataset.key;
      bots[idx][key] = input.value.trim();
    });
  });
}

async function save() {
  // Validate
  for (let i = 0; i < bots.length; i++) {
    const b = bots[i];
    if (!b.name || !b.token || !b.chatId) {
      showStatus(`Bot #${i + 1}: all fields required`, 'err');
      return;
    }
  }

  await chrome.storage.local.set({ bots });
  chrome.runtime.sendMessage({ action: 'reload-contextmenus' });

  // Validate each bot by sending a test
  let allGood = true;
  for (let i = 0; i < bots.length; i++) {
    const b = bots[i];
    try {
      const resp = await fetch(`https://api.telegram.org/bot${b.token}/getMe`);
      if (!resp.ok) {
        showStatus(`Bot #${i + 1} (${b.name}): invalid token`, 'err');
        allGood = false;
        break;
      }
    } catch (e) {
      showStatus(`Bot #${i + 1} (${b.name}): connection error`, 'err');
      allGood = false;
      break;
    }
  }

  if (allGood) {
    showStatus(`Saved ${bots.length} bot${bots.length === 1 ? '' : 's'} successfully!`, 'ok');
  }
}

async function load() {
  const data = await chrome.storage.local.get('bots');
  bots = data.bots || [];
  renderBots();
}

document.getElementById('add-bot').addEventListener('click', () => {
  bots.push({ name: '', token: '', chatId: '' });
  renderBots();
  // Focus the new name field
  const inputs = listEl.querySelectorAll('input[data-key="name"]');
  if (inputs.length) inputs[inputs.length - 1].focus();
});

document.getElementById('save').addEventListener('click', save);
window.addEventListener('load', load);
