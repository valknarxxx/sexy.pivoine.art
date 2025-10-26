# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo for an adult content platform built with SvelteKit, Directus CMS, and hardware integration via Buttplug.io. The project uses pnpm workspaces with three main packages.

## Prerequisites

1. Install Node.js 20.19.1
2. Enable corepack: `corepack enable`
3. Install dependencies: `pnpm install`
4. Install Rust toolchain and wasm-bindgen: `cargo install wasm-bindgen-cli`

## Project Structure

### Packages

- **`packages/frontend`**: SvelteKit application (main frontend)
- **`packages/bundle`**: Directus extension bundle (custom endpoints, hooks, themes)
- **`packages/buttplug`**: Hardware control library with TypeScript/WebAssembly bindings

### Frontend (SvelteKit + Tailwind CSS 4)

- **Framework**: SvelteKit 2 with adapter-node
- **Styling**: Tailwind CSS v4 via @tailwindcss/vite
- **UI Components**: bits-ui, custom components in `src/lib/components/ui/`
- **Backend**: Directus headless CMS
- **Routes**: File-based routing in `src/routes/`
  - `+page.server.ts`: Server-side data loading
  - `+layout.server.ts`: Layout data (authentication, etc.)
- **Authentication**: Session-based via Directus SDK (cookies)
- **API Proxy**: Dev server proxies `/api` to `http://localhost:8055` (Directus)
- **i18n**: svelte-i18n for internationalization

Key files:
- `src/lib/directus.ts`: Directus client configuration
- `src/lib/types.ts`: Shared TypeScript types
- `src/hooks.server.ts`: Server-side auth middleware
- `vite.config.ts`: Dev server on port 3000 with API proxy

### Bundle (Directus Extensions)

Custom Directus extensions providing:
- **Endpoint** (`src/endpoint/index.ts`): `/sexy/stats` endpoint for platform statistics
- **Hook** (`src/hook/index.ts`):
  - Auto-generates slugs for users based on artist_name
  - Processes uploaded videos with ffmpeg to extract duration
- **Theme** (`src/theme/index.ts`): Custom Directus admin theme

### Buttplug (Hardware Control)

Hybrid TypeScript/Rust package for intimate hardware control:
- **TypeScript**: Client library, connectors (WebSocket, Browser WebSocket)
- **Rust/WASM**: Core buttplug implementation compiled to WebAssembly
- Provides browser-based Bluetooth device control via WebBluetooth API

Key concepts:
- `ButtplugClient`: Main client interface
- `ButtplugClientDevice`: Device abstraction
- `ButtplugWasmClientConnector`: WASM-based connector
- Messages defined in `src/core/Messages.ts`

## Common Commands

### Development

Start full development environment (data + Directus + frontend):
```bash
pnpm dev
```

Individual services:
```bash
pnpm dev:data                    # Start Docker Compose data services
pnpm dev:directus                # Start Directus in Docker
pnpm --filter @sexy.pivoine.art/frontend dev  # Frontend dev server only
```

### Building

Build all packages:
```bash
pnpm install  # Ensure dependencies are installed first
```

Build specific packages:
```bash
pnpm build:frontend  # Pulls git, installs, builds frontend
pnpm build:bundle    # Pulls git, installs, builds Directus extensions
```

Individual package builds:
```bash
pnpm --filter @sexy.pivoine.art/frontend build
pnpm --filter @sexy.pivoine.art/bundle build
pnpm --filter @sexy.pivoine.art/buttplug build        # TypeScript build
pnpm --filter @sexy.pivoine.art/buttplug build:wasm   # Rust WASM build
```

### Production

Start production frontend server (local):
```bash
pnpm --filter @sexy.pivoine.art/frontend start
```

Docker Compose deployment (recommended for production):
```bash
# Local development (with Postgres, Redis, Directus)
docker-compose up -d

# Production (with Traefik, external DB, Redis)
docker-compose -f compose.production.yml --env-file .env.production up -d
```

See `COMPOSE.md` for Docker Compose guide and `DOCKER.md` for standalone Docker deployment.

## Architecture Notes

### Data Flow

1. **Frontend** → `/api/*` (proxied) → **Directus CMS**
2. Directus uses **bundle extensions** for custom logic (stats, video processing, user management)
3. Frontend uses **Directus SDK** with session authentication
4. Hardware control uses **buttplug package** (TypeScript → WASM → Bluetooth)

### Authentication

- Session tokens stored in `directus_session_token` cookie
- `hooks.server.ts` validates token on every request via `isAuthenticated()`
- User roles: Model, Viewer (checked via role or policy)
- `isModel()` helper in `src/lib/directus.ts` checks user permissions

### Content Types

Core types in `packages/frontend/src/lib/types.ts`:
- **User/CurrentUser**: User profiles with roles and policies
- **Video**: Videos with models, tags, premium flag
- **Model**: Creator profiles with photos and banner
- **Article**: Magazine/blog content
- **BluetoothDevice**: Hardware device state

### Docker Environment

Development uses Docker Compose in `../compose/` directory:
- `../compose/data`: Database/storage services
- `../compose/sexy`: Directus instance (uses `.env.local`)

### Asset URLs

Assets served via Directus with transforms:
```typescript
getAssetUrl(id, "thumbnail" | "preview" | "medium" | "banner")
// Returns: ${directusApiUrl}/assets/${id}?transform=...
```

## Development Workflow

1. Ensure Docker services are running: `pnpm dev:data && pnpm dev:directus`
2. Start frontend dev server: `pnpm --filter @sexy.pivoine.art/frontend dev`
3. Access frontend at `http://localhost:3000`
4. Access Directus admin at `http://localhost:8055`

When modifying:
- **Frontend code**: Hot reload via Vite
- **Bundle extensions**: Rebuild with `pnpm --filter @sexy.pivoine.art/bundle build` and restart Directus
- **Buttplug library**: Rebuild TypeScript (`pnpm build`) and/or WASM (`pnpm build:wasm`)

## Important Notes

- This is a pnpm workspace; always use `pnpm` not `npm` or `yarn`
- Package manager is locked to `pnpm@10.17.0`
- Buttplug package requires Rust toolchain for WASM builds
- Frontend uses SvelteKit's adapter-node for production deployment
- All TypeScript packages use ES modules (`"type": "module"`)
