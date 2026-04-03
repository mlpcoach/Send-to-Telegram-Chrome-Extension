// Sanctum Send — Popup (bot picker + quick send)

document.addEventListener('DOMContentLoaded', async () => {
  const listEl = document.getElementById('bot-list');
  const statusEl = document.getElementById('status');
  const settingsLink = document.getElementById('settings');

  settingsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  const { bots } = await chrome.storage.local.get('bots');

  if (!bots || bots.length === 0) {
    listEl.innerHTML = '<div class="no-bots">No bots configured.<br><a href="#" id="add-bot">Add one in Settings</a></div>';
    document.getElementById('add-bot').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  for (let i = 0; i < bots.length; i++) {
    const bot = bots[i];
    const btn = document.createElement('div');
    btn.className = 'bot-btn';
    btn.innerHTML = `<span class="dot"></span><span class="name">${bot.name}</span><span class="arrow">Send &#x2192;</span>`;
    btn.addEventListener('click', () => {
      // Send current page/selection to this bot
      chrome.runtime.sendMessage({
        action: 'send',
        type: 'selection',
        botIndex: i,
      });
      statusEl.textContent = `Sent to ${bot.name}`;
      statusEl.className = 'ok';
      setTimeout(() => window.close(), 1200);
    });
    listEl.appendChild(btn);
  }
});
