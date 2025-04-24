# Chrome Extension Automation Project

## 1. Purpose & Vision

Build a Chrome MV3 extension that turns natural‑language prompts into reliable, multi‑step web automations via a JSON/YAML DSL.

Adaptive Learning: Record successful runs and user "watch mode" demonstrations to optimize future executions.

AI‑Driven Code: Use Archon MCP for code generation, refinement, and CI feedback loops.

## 2. Success Criteria

- ≥ 95% first‑pass success rate on core workflows.
- Automatic skipping of known‑bad selectors based on run history.
- Auto‑save DSL recipes after 100% successful runs.
- Valid DSL generated from user "watch & learn" demos.

## 3. Tech Stack

- Extension Platform: Chrome Extension MV3, TypeScript
- UI Framework: React + Vite (Popup & Options pages)
- LLM Orchestration: LangChain JS + OpenAI Node SDK (GPT‑4.1 family & o4‑mini)
- AI‑Coder Backend: Archon MCP Server (Docker v6)
- Workflow DSL: JSON/YAML declarative schema + optional jsHatch snippets
- Persistence: chrome.storage for credentials, run history, and recipes
- Monitoring & Logging: Sentry (extension) + Winston/Bunyan (backend)
- Testing: Jest (unit) + Playwright (E2E)
- CI/CD: GitHub Actions → lint, test, build, publish

## 4. High‑Level Architecture

```
[Popup UI (React)] ⇄ [Background Service Worker]
       ↓                       ↓
 [DSL Executor]           [AI‑Coder Client]
       ↓                       ↓
 [Content Scripts]       [Archon MCP Server]
```

- Popup UI: Receive NL prompts and display status.
- Background Worker: Manage state, credentials, and LLM calls.
- DSL Executor: Parse & execute DSL steps via content scripts.
- AI‑Coder Client: Communicate with Archon MCP to generate/refine TS modules.

## 5. Key Components

- Content‑Script API: Core browser actions (click, type, navigate, etc.)
- Intent Parser: GPT‑4.1 nano → discrete action plan.
- DSL Engine: Schema validator and executor for JSON/YAML workflows.
- Session & Auth: Credential vault + 2FA prompt hooks.
- Retry Learning: Run history store + selector preference logic.
- Watch & Learn: Capture user events → draft DSL recipes.
- Plugin System: Site adapters and network interception hooks.
- Logging & Monitoring: Step logs, screenshots on error, and Sentry integration.

## 6. Constraints & Notes

- No file exceeds 500 lines; split into modules when necessary.
- All credentials must be encrypted; never hard‑code secrets.
- Validate DSL against schema before execution; freeform JS only in jsHatch.
- Prompt the user for manual challenges (CAPTCHA, MFA) when encountered. 