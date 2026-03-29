# KnowledgeFlow – LLM Integration

## Current State
- Users can log in with Internet Identity
- Projects dashboard: create/delete projects (name + description)
- Project view: sidebar with notes list, note editor (plain textarea, body stored as Text in canister)
- UserProfile stores only `name: Text`
- No LLM integration exists

## Requested Changes (Diff)

### Add
- `UserLLMSettings` type in backend: `apiKey: Text`, `model: Text` (e.g. "glm-4")
- `saveLLMSettings(apiKey, model)` backend function (tied to caller principal)
- `getLLMSettings()` backend query (returns settings for caller)
- `callLLM(messages, contextNoteIds)` backend function: makes HTTP outcall to GLM API (`https://open.bigmodel.cn/api/paas/v4/chat/completions`), injects selected note contents as system context, returns the assistant response text
- Notebook-style note editor in `ProjectView.tsx`: note body is stored as JSON array of cells
  - Cell types: `{ type: "markdown", content: string }` and `{ type: "chat", prompt: string, response: string, contextNoteIds: string[] }`
  - Add/remove cells, reorder not required initially
  - Markdown cells: plain textarea
  - Chat cells: prompt input, context note picker (multi-select from project notes), send button, response display
- Settings modal (gear icon in header) to configure GLM API key and model name

### Modify
- `UserProfile` in backend: keep existing `name` field, add separate `saveLLMSettings`/`getLLMSettings` rather than modifying profile type
- `ProjectView.tsx`: replace single textarea editor with cell-based notebook renderer
- Note body serialization: store cells as JSON string in existing `body: Text` field (no schema change needed)

### Remove
- Nothing removed

## Implementation Plan
1. Add `UserLLMSettings` stable map in backend, add `saveLLMSettings` and `getLLMSettings` functions
2. Add `callLLM` function using HTTP outcalls to GLM API (OpenAI-compatible format); fetch caller's API key from canister state; fetch requested note bodies for context injection
3. Frontend: add `SettingsModal` component for API key + model config
4. Frontend: replace `ProjectView` textarea with `NotebookEditor` supporting markdown and chat cells
5. Frontend: implement context picker in chat cells (checkbox list of project notes)
6. Wire everything: on chat cell send, call `actor.callLLM(messages, contextNoteIds)`, display response
