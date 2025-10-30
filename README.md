<div align="center">
  <img style="margin-bottom: 12px;" src="https://raw.githubusercontent.com/diragb/slop-muter-webapp/refs/heads/main/public/twitter-image.jpg" alt="Slop Muter Cover">

  # SlopMuter Extension

  **Browser extension that automatically blocks slop posts on your X/Twitter feed**

  [![Twitter Follow](https://img.shields.io/twitter/follow/slopmuter?style=social)](https://twitter.com/slopmuter)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

## ✨ Features

- 🚫 **Automatic Blocking** - Automatically hides tweets from users in enabled blocklists
- 📋 **Multiple Blocklists** - Choose from multiple curated blocklists
- ⚙️ **Customizable** - Enable or disable blocklists through the extension popup
- 🔄 **Real-time Updates** - Changes take effect immediately
- 🎯 **Lightweight** - Minimal performance impact on your browsing experience

## 🚀 Installation

### Chrome/Edge

1. Clone this repository
2. Install dependencies: `yarn install` or `npm install`
3. Build the extension: `yarn build` or `npm run build`
4. Load the extension:
   - Open Chrome/Edge and navigate to `chrome://extensions/` or `edge://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `.output/chrome-mv3` directory

### Firefox

1. Clone this repository
2. Install dependencies: `yarn install` or `npm install`
3. Build the extension: `yarn build:firefox` or `npm run build:firefox`
4. Load the extension:
   - Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select the manifest file from the `.output/firefox-mv2` directory

## 📖 How It Works

SlopMuter works by automatically hiding tweets from users who belong to the enabled blocklists. Here's the process:

1. **Blocklist Management** - The extension maintains a collection of curated blocklists with users known for posting slop content
2. **User Selection** - You can select which blocklists you want to enable via the extension popup
3. **Real-time Filtering** - As you browse your X/Twitter feed, the extension checks each tweet's author against your enabled blocklists
4. **Automatic Removal** - Tweets from blocked users are automatically hidden from your feed

Simply select your preferred blocklists from the extension popup, and SlopMuter will handle the rest!

## 🛠️ Development

### Prerequisites

- Node.js (v18 or higher)
- Yarn or npm

### Setup

```bash
# Install dependencies
yarn install

# Start development server (Chrome)
yarn dev

# Start development server (Firefox)
yarn dev:firefox
```

### Building

```bash
# Build for Chrome/Edge
yarn build

# Build for Firefox
yarn build:firefox

# Create zip file for distribution (Chrome)
yarn zip

# Create zip file for distribution (Firefox)
yarn zip:firefox
```

### Type Checking

```bash
yarn compile
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature or fix branch (`git checkout -b feat/amazing-feature` or `git checkout -b fix/required-fix`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'` or `git commit -m 'fix: add required fix'`)
4. Push to the branch (`git push origin feat/amazing-feature` or `git push origin fix/required-fix`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Issues](https://github.com/diragb/slop-muter-extension/issues)
- [Repository](https://github.com/diragb/slop-muter-extension)
- [Author](https://github.com/diragb)

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/diragb">Dirag Biswas</a>
</div>
