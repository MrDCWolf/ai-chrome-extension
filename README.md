# AI Chrome Extension

A Chrome extension that enhances browsing experience with AI-powered features.

## Features

- AI-powered content analysis
- Context-aware suggestions
- Seamless browser integration
- Modern React-based UI

## Development Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Chrome browser

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-chrome-extension
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Load the extension in Chrome:
- Open Chrome and navigate to `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked"
- Select the `dist` directory from the project

### Development

- Start development server:
```bash
npm run dev
```

- Build for production:
```bash
npm run build
```

## Project Structure

```
src/
├── background/     # Background service worker
├── content/       # Content scripts for web automation
├── popup/         # Popup UI components
└── utils/         # Shared utilities
```

## Content Script API

The extension provides three main automation functions:

### click(selector: string): Promise<void>
Clicks an element matching the given selector.
```javascript
await chrome.runtime.sendMessage({ 
  type: 'click', 
  selector: '#submit-button' 
});
```

### type(selector: string, text: string): Promise<void>
Types text into an input element.
```javascript
await chrome.runtime.sendMessage({ 
  type: 'type', 
  selector: '#search-input',
  text: 'Hello world'
});
```

### navigate(url: string): Promise<void>
Navigates to the specified URL.
```javascript
await chrome.runtime.sendMessage({ 
  type: 'navigate', 
  url: 'https://example.com' 
});
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Development Status

See [TASK.md](TASK.md) for current development status and pending tasks.
See [PLANNING.md](PLANNING.md) for development strategy and roadmap.

## License

MIT License - see LICENSE file for details 