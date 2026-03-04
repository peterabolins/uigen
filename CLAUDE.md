# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Style

Use comments sparingly. Only comment complex code.

## Commands

```bash
# First-time setup (install deps, generate Prisma client, run migrations)
npm run setup

# Development server (uses Turbopack)
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Run all tests
npm test

# Run a single test file
npx vitest src/components/chat/__tests__/ChatInterface.test.tsx

# Reset database
npm run db:reset
```

Set `ANTHROPIC_API_KEY` in `.env` to use real Claude AI; without it, a mock provider returns static code instead.

## Architecture

**UIGen** is an AI-powered React component generator. Users describe a component in chat, Claude generates the code, and a live preview renders it in an iframe — all without writing files to disk.

### Data Flow

1. User sends a message via `ChatInterface` → `ChatProvider` (context)
2. `ChatProvider` POSTs to `/api/chat` with the message history and serialized virtual file system
3. The API route streams back a Vercel AI SDK response using two custom tools:
   - `str_replace_editor` — create/edit files in the virtual FS (view, create, str_replace, insert commands)
   - `file_manager` — rename/delete files
4. As tool calls stream in, `FileSystemContext.handleToolCall` applies them to the client-side `VirtualFileSystem`
5. `PreviewFrame` watches `refreshTrigger` from `FileSystemContext`, rebuilds an import map via `createImportMap`, and sets `iframe.srcdoc` to freshly generated HTML

### Virtual File System

`VirtualFileSystem` (`src/lib/file-system.ts`) is an in-memory tree that lives entirely in the browser. It serializes to/from `Record<string, FileNode>` for transport. The API route reconstructs it server-side just to run tool calls, then re-serializes and saves back to the DB.

### Preview Rendering (`src/lib/transform/jsx-transformer.ts`)

- `transformJSX`: Uses `@babel/standalone` to transpile JSX/TSX → JS in the browser
- `createImportMap`: Builds an ES module import map; maps `@/` aliases, local paths, and third-party packages (via `esm.sh`), creates blob URLs for each file
- `createPreviewHTML`: Generates a full HTML document with the import map, Tailwind CDN, and a React root
- The preview iframe gets `sandbox="allow-scripts allow-same-origin allow-forms"` (needed for blob URL imports)

### AI Generation Rules (system prompt)

The generation prompt (`src/lib/prompts/generation.tsx`) instructs Claude to:
- Always create `/App.jsx` as the entry point
- Use `@/` import aliases for all local files
- Style with Tailwind, no hardcoded styles
- No HTML files — only JSX/TSX

### Auth & Persistence

- JWT-based auth via `jose`, stored in an httpOnly cookie (`auth-token`)
- `src/lib/auth.ts` is server-only
- Prisma + SQLite (`prisma/dev.db`); the Prisma client is generated to `src/generated/prisma`
- The database schema is defined in `prisma/schema.prisma` — reference it to understand the structure of stored data
- **Project model**: stores `messages` (JSON string) and `data` (serialized VFS JSON string)
- Anonymous users get a session-storage tracker (`src/lib/anon-work-tracker.ts`) so their work can be saved on sign-up

### Routing

- `/` — anonymous users see `MainContent`; authenticated users are redirected to their latest project (or a new one is created)
- `/[projectId]` — loads the project from DB and passes it to `MainContent` with initial messages and file data

### Key Contexts

- `FileSystemProvider` wraps the app; exposes `VirtualFileSystem` operations and `handleToolCall`
- `ChatProvider` manages the `useChat` (Vercel AI SDK) state and passes the serialized FS with each request

### Testing

Tests use Vitest + jsdom + Testing Library. Test files live alongside source in `__tests__/` directories. The `vite-tsconfig-paths` plugin resolves `@/` aliases in tests.
