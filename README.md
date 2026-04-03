# Sanctum Send — Multi-Bot Telegram Chrome Extension

Send web content (text, links, images) to any of your Telegram bots via right-click or the popup. Configure multiple bots and pick which one receives each clip.

Forked from [phguo/Send-to-Telegram-Chrome-Extension](https://github.com/phguo/Send-to-Telegram-Chrome-Extension).

## Features

- **Multiple bots** — add as many as you want, each with a name, token, and chat ID
- **Right-click menus** — context menus auto-generate per bot (single bot = flat menu, multiple = submenus)
- **Popup picker** — click the extension icon to quick-send current page/selection to any bot
- **Image support** — right-click images to send via Telegram's `sendPhoto` API
- **File support** — send document URLs via `sendDocument`
- **No third-party servers** — direct to Telegram Bot API, nothing in between
- **Dark theme UI** — because light mode is a crime

## Install (Developer Mode)

1. Clone this repo
2. Open `chrome://extensions/` in Chrome
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" → select this folder
5. Click the extension icon → Settings → add your bots

## Setup

Each bot needs:
- **Name** — display name (e.g. "Desk", "Viaim", "Ministry")
- **Bot Token** — from @BotFather
- **Chat ID** — your Telegram user ID (DMs) or group ID (groups)

Get your chat ID: message @userinfobot on Telegram.

## Usage

- **Right-click** any text, link, image, or page → "Send to [Bot Name]"
- **Click the extension icon** → pick a bot → sends current page or selected text
- Context menus update automatically when you add/remove bots

## License

MIT (inherited from upstream)
