// Sanctum Send — Popup (bot picker + quick actions)

document.addEventListener('DOMContentLoaded', async () => {
  const selectEl = document.getElementById('bot-select');
  const statusEl = document.getElementById('status');
  const fileInput = document.getElementById('file-input');

  document.getElementById('settings').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  const { bots } = await chrome.storage.local.get('bots');

  if (!bots || bots.length === 0) {
    selectEl.innerHTML = '<option>No bots — click Settings</option>';
    return;
  }

  // Populate bot dropdown
  for (let i = 0; i < bots.length; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = bots[i].name;
    selectEl.appendChild(opt);
  }

  function getSelectedBot() {
    return parseInt(selectEl.value, 10);
  }

  function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = type || '';
    if (type === 'ok') setTimeout(() => window.close(), 1200);
  }

  // Send page URL
  document.getElementById('send-page').addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: 'send',
      type: 'page',
      botIndex: getSelectedBot(),
    });
    showStatus('Page sent to ' + bots[getSelectedBot()].name, 'ok');
  });

  // Send selected text
  document.getElementById('send-selection').addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: 'send',
      type: 'selection',
      botIndex: getSelectedBot(),
    });
    showStatus('Selection sent to ' + bots[getSelectedBot()].name, 'ok');
  });

  // Screenshot
  document.getElementById('send-screenshot').addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: 'send',
      type: 'screenshot',
      botIndex: getSelectedBot(),
    });
    showStatus('Screenshot sent to ' + bots[getSelectedBot()].name, 'ok');
  });

  // File upload trigger
  document.getElementById('send-file').addEventListener('click', () => {
    fileInput.click();
  });

  // File selected — read and send
  fileInput.addEventListener('change', async () => {
    const files = fileInput.files;
    if (!files.length) return;

    const botIdx = getSelectedBot();
    const botName = bots[botIdx].name;

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        chrome.runtime.sendMessage({
          action: 'upload-file',
          dataUrl: reader.result,
          filename: file.name,
          caption: file.name,
          botIndex: botIdx,
        });
      };
      reader.readAsDataURL(file);
    }

    showStatus(files.length + ' file(s) sent to ' + botName, 'ok');
    fileInput.value = '';
  });
});
