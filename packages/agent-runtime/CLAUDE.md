# packages/agent-runtime

Agent execution runtime: LangGraph workflows, AG-UI/A2UI protocols, MCP server.

> **Phase 0 status: STUB.** This package contains only a package.json.
> Full implementation begins in Phase 3. The content below describes the target architecture
> so that agents understand the intent when referenced from other packages.

## Stack (Phase 3+)
- LangGraph (agent workflow orchestration)
- AG-UI protocol (agent-generated UI streaming)
- A2UI protocol (agent-to-UI component rendering)
- MCP SDK (Model Context Protocol server for external agent access)
- BullMQ + Redis (background job queue for long-running agent tasks)

## Target architecture (Phase 3+)
```
External agents (via MCP)
        │
        ▼
┌─ MCP Server ────────┐
│  Tool definitions    │──→ Same API surface as UI actions
│  State read/write    │
└──────────────────────┘
        │
        ▼
┌─ LangGraph Runtime ─┐
│  Workflow definitions│──→ React Flow canvas defines these
│  Node execution      │
│  State persistence   │
└──────────────────────┘
        │
        ▼
┌─ AG-UI / A2UI ──────┐
│  Stream UI updates   │──→ Rendered in workspace panels
│  Component protocol  │
└──────────────────────┘
```

## MCP design principle (P09: Agent-native)
Every user-facing interaction in Vastu must have an MCP tool equivalent. When developers in other packages add a new UI action, they should also define the corresponding MCP tool in this package. The MCP server and the UI share the same underlying service layer.

## Phase 0: what exists now
- `package.json` with name `@vastu/agent-runtime`
- Empty `src/index.ts`
