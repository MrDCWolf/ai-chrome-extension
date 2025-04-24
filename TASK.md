# Chrome Extension Development Tasks

## Completed Tasks
- [x] Set up basic extension structure
- [x] Implement content script actions
  - [x] `click(selector: string): Promise<void>`
  - [x] `type(selector: string, text: string): Promise<void>`
  - [x] `navigate(url: string): Promise<void>`
- [x] Set up build process with Vite
- [x] Create extension manifest
- [x] Add placeholder icons
- [x] Set up message passing between background and content scripts
- [x] Create basic popup UI

## Current Status
- Extension builds successfully
- Basic functionality implemented
- Icons and manifest configured
- Ready for manual testing

## Pending Tasks
- [ ] Add comprehensive error handling
- [ ] Add proper TypeScript types for message passing
- [ ] Improve popup UI with better user interaction
- [ ] Add automated tests
- [ ] Add proper documentation
- [ ] Add proper logging system
- [ ] Add proper error reporting system

## Testing Status
- [x] Build process works
- [x] Manual testing of content script functions
- [ ] Integration testing
- [x] Unit testing (click, type, navigate)

## Notes
- Content script functions implemented as per requirements
- Using real browser events for interactions
- Clear error messages implemented
- TypeScript compilation successful

# Task Backlog & Milestones

## 🛠️ Phase 1: Scaffold & Core APIs  
- [x] Set up repo skeleton: MV3 manifest, TS, React/Vite  
- [x] Configure GitHub Actions (build, lint, test)  
- [x] Implement content-script helpers:  
  - [x] `click(selector)`  
  - [x] `type(selector, text)`  
  - [x] `navigate(url)`  
- [x] Write unit tests for each helper  

## 🔗 Phase 2: LLM Integration & Intent→Plan  
- [x] Create `LLMClient` wrapper (LangChain + OpenAI SDK)  
- [x] Unit test `LLMClient` constructor and `ask` method
- [ ] Build `parseIntent(prompt)` → action list via GPT-4.1 nano  
- [ ] Unit test: simple NL → JSON action  

## 📝 Phase 3: JSON/YAML DSL Engine  
- [ ] Define DSL JSON Schema (steps, loops, conditionals, `jsHatch`)  
- [ ] Integrate YAML parser + schema validator  
- [ ] Implement DSL executor to call content-script APIs  
- [ ] End-to-end test: sample DSL runs on a demo page  

## 🔐 Phase 4: Session & Auth  
- [ ] Credential vault in `chrome.storage` (encrypted)  
- [ ] DSL step `login(siteId)` → vault lookup + 2FA prompt  
- [ ] Test login flow on a test site  

## ⚙️ Phase 5: Error Handling & Retry Learning  
- [ ] Wrap every step in retry logic (default 3 attempts)  
- [ ] Persist run history: selector, outcome, timestamp  
- [ ] On load, skip selectors known to fail  
- [ ] Test: simulate selector failure → next run skips it  

## 👁️ Phase 6: Watch & Learn Mode  
- [ ] Capture DOM events (`click`, `input`, `navigate`)  
- [ ] Convert recorded events → draft DSL recipe  
- [ ] UI for naming, editing, saving recipes  
- [ ] Test: manual demo → valid DSL → replay  

## 🧠 Phase 7: Archon MCP Integration  
- [ ] Deploy Archon MCP Docker container (v6)  
- [ ] Build AI-Coder client to talk to MCP (REST/WebSocket)  
- [ ] Generate/refine TS modules via Archon agents  
- [ ] Feedback loop: test results → Archon refiner  

## 🔌 Phase 8: Extensibility & Network Hooks  
- [ ] Define `registerSiteAdapter(name, handlers)` API  
- [ ] Implement `chrome.webRequest` interception helpers  
- [ ] Example plugin: inject header on `example.com`  

## 🎨 Phase 9: UX & Options  
- [ ] Popup UI: prompt entry, run button, status  
- [ ] Options page: model selector, retry count, DSL editor, recipe library  
- [ ] Test: change settings → behaviors update  

## ✅ Phase 10: E2E Testing & Deployment  
- [ ] Playwright tests for 10 core workflows + recipes  
- [ ] GitHub Actions: on `main` → build, test, auto-publish dev  
- [ ] Merge to `release` → manual approval → prod publish  

---

> **Next:** Pick a phase or task to expand into detailed AI-coder instructions. 

You can test the extension in several ways:

1. **Test the Service Worker:**
   - Go to `chrome://extensions/`
   - Find your extension
   - Click on "Service Worker" to open DevTools
   - You should see the initial log message: "Background service worker loaded"
   - You can also test the service worker by opening the console and running:
     ```javascript
     chrome.runtime.sendMessage({ type: 'EXECUTE_ACTION', action: 'test' });
     ```

2. **Test the Popup:**
   - Click on the extension icon in your Chrome toolbar
   - Open DevTools for the popup (right-click > Inspect)
   - You should see the popup interface
   - Try interacting with any UI elements

3. **Test Content Script:**
   - Open any webpage (e.g., google.com)
   - Open DevTools (F12 or right-click > Inspect)
   - Go to the Console tab
   - You should see any initialization logs from the content script

4. **Test Message Passing:**
   - Open a webpage
   - Open the popup
   - Try sending a message from the popup to the background script:
     ```javascript
     chrome.runtime.sendMessage({ type: 'EXECUTE_ACTION', action: 'test' });
     ```
   - Check both the popup console and background service worker console for the message logs

5. **Verify Permissions:**
   - Go to `chrome://extensions/`
   - Find your extension
   - Click "Details"
   - Verify that all required permissions are listed and working:
     - storage
     - activeTab
     - scripting
     - host permissions for all URLs

6. **Test Extension Reload:**
   - Go to `chrome://extensions/`
   - Click the refresh icon on your extension
   - Verify that the service worker reloads and logs the "Extension installed" message

If you want to test specific functionality or need help with any particular test, let me know! I can help you create more targeted tests or debug any issues that come up. 