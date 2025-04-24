# AI Chrome Automation Extension

A Chrome Extension that turns natural-language prompts into reliable, multi-step web automations.

## Features

- Natural language to automation workflow conversion
- Content script helpers for common web actions
- React-based popup UI
- TypeScript for type safety
- Vite for fast development and building

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` directory

## Building for Production

```bash
npm run build
```

The built extension will be in the `dist` directory.

## Project Structure

```
src/
  ├── background/    # Background service worker
  ├── content/       # Content scripts
  ├── popup/         # Popup UI
  └── utils/         # Shared utilities
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request 