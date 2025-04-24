# Task Backlog & Milestones

## 🛠️ Phase 1: Scaffold & Core APIs  
- [ ] Set up repo skeleton: MV3 manifest, TS, React/Vite  
- [ ] Configure GitHub Actions (build, lint, test)  
- [ ] Implement content-script helpers:  
  - `click(selector)`  
  - `type(selector, text)`  
  - `navigate(url)`  
- [ ] Write unit tests for each helper  

## 🔗 Phase 2: LLM Integration & Intent→Plan  
- [ ] Create `LLMClient` wrapper (LangChain + OpenAI SDK)  
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