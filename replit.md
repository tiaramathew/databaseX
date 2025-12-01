# VectorHub - Replit Project

## Overview

VectorHub is a modern, production-ready vector database management interface built with Next.js 14. It provides a unified UI for managing, searching, and analyzing vector databases with support for multiple database providers including ChromaDB, Pinecone, Qdrant, Weaviate, MongoDB Atlas, Supabase, Redis, and Upstash.

**Current State**: The project has been successfully imported and configured to run in the Replit environment. The development server is running on port 5000 with proper proxy configuration.

## Recent Changes

**December 1, 2025 - Initial Replit Setup**
- Installed Node.js 20 and all npm dependencies
- Configured Next.js dev server to bind to 0.0.0.0:5000 for Replit compatibility
- Set up workflow "VectorHub Dev Server" for automatic server management
- Added comprehensive .gitignore for Next.js/Node.js
- Configured deployment settings for production (autoscale)

## Project Architecture

### Tech Stack
- **Framework**: Next.js 14.2.16 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives with shadcn/ui
- **Animations**: Framer Motion
- **State Management**: Zustand with localStorage persistence
- **Validation**: Zod schemas
- **Fonts**: Outfit (sans) + JetBrains Mono (mono)

### Project Structure

```
vectorhub/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # Dashboard routes (Collections, Connections, Documents, Search, Settings, Upload)
│   │   └── api/                # API routes (health, collections, documents, search)
│   ├── components/             # React components
│   │   ├── ui/                 # Base UI components (Radix UI + Tailwind)
│   │   ├── collections/        # Collection management components
│   │   ├── connections/        # Database connection components
│   │   ├── documents/          # Document viewer components
│   │   ├── search/             # Search interface components
│   │   └── layout/             # Layout components (Header, Sidebar)
│   ├── lib/                    # Utilities and services
│   │   ├── api/                # API client functions
│   │   ├── db/                 # Database adapters
│   │   │   └── adapters/       # VectorDBAdapter interface & MockAdapter implementation
│   │   └── validations/        # Zod schemas
│   ├── store/                  # Zustand store with slices
│   └── types/                  # TypeScript type definitions
├── package.json
├── next.config.mjs
├── tsconfig.json
└── tailwind.config.ts
```

### Key Design Patterns

- **Adapter Pattern**: Database implementations extend `VectorDBAdapter` interface for pluggable database support
- **Slice Pattern**: Zustand store modularized into independent slices (connections, collections, documents)
- **Component Architecture**: Radix UI for accessible, unstyled primitives with Tailwind for styling
- **Type Safety**: Strict TypeScript with path alias `@/*` → `src/`

### Data Flow

1. UI components dispatch actions to Zustand store slices
2. Store persists state to localStorage (key: `vectorhub-storage`)
3. Database adapters execute operations against connected vector databases
4. Results flow back to UI components for display

### Database Support

Currently using MockAdapter for development. Production supports:
- ChromaDB
- MongoDB Atlas  
- Supabase
- Weaviate
- Pinecone
- Qdrant
- Redis
- Upstash

## Development Commands

All commands run from the `vectorhub/` directory:

- `npm install` - Install dependencies
- `npm run dev` - Start development server (configured for 0.0.0.0:5000)
- `npm run build` - Build for production
- `npm run start` - Start production server (configured for 0.0.0.0:5000)
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Replit Configuration

### Workflow
- **Name**: VectorHub Dev Server
- **Command**: `cd vectorhub && npm run dev`
- **Port**: 5000 (webview)
- **Host**: 0.0.0.0 (required for Replit proxy)

### Deployment
- **Type**: Autoscale (stateless web application)
- **Build**: `cd vectorhub && npm run build`
- **Run**: `cd vectorhub && npm run start`

## Environment Variables

Optional environment variables (with defaults):

```env
# Application
NEXT_PUBLIC_APP_NAME=VectorHub
NEXT_PUBLIC_APP_URL=http://localhost:3000

# API Configuration
API_TIMEOUT=30000
API_MAX_RETRIES=3

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_DEBUG_MODE=false
```

Note: The app currently uses a MockAdapter and doesn't require database connections for development.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check with system status |
| `/api/collections` | GET, POST | List or create collections |
| `/api/collections/[name]` | DELETE | Delete a collection |
| `/api/collections/[name]/stats` | GET | Get collection statistics |
| `/api/documents` | POST, DELETE | Add or delete documents |
| `/api/search` | POST | Perform semantic search |

## User Preferences

None recorded yet.

## Notes

- The application is currently using MockAdapter for database operations (in-memory storage)
- No external database connections are required for development
- State persists in browser localStorage
- Security headers are configured in next.config.mjs
- Next.js telemetry is enabled by default (can be disabled with `npx next telemetry disable`)
