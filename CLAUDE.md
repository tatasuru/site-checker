# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Site Crawler API)
- `cd backend && npm run dev` - Run the standalone Playwright crawler (testing only)
- `cd backend && npm run start` - Start the Fastify API server with job queue processing
- `cd backend && npm run build` - Compile TypeScript to JavaScript
- `cd backend && npm run watch` - Watch for TypeScript changes and recompile
- `cd backend && npm run typecheck` - Run TypeScript type checking without emitting files

### Frontend (Nuxt.js App)
- `cd frontend && npm run dev` - Start development server on http://localhost:3000
- `cd frontend && npm run build` - Build the application for production
- `cd frontend && npm run preview` - Preview production build locally
- `cd frontend && npm run generate` - Generate static site

## Project Architecture

This is a **Site Checker** - a full-stack web application that performs automated web crawling and site mapping. Users can register websites to be crawled, monitor crawl progress in real-time, and visualize site structure through an interactive dashboard.

### Backend Architecture

- **Framework**: Fastify web server with custom Supabase-based job queue
- **Crawler Engine**: Crawlee with Playwright for browser automation
- **Language**: TypeScript with ESNext target
- **API Server**: `backend/src/server.ts` - Fastify server with CORS and job management endpoints
- **Crawler Logic**: `backend/src/crawler/index.ts` - Execution engine with storage management
- **Route Handlers**: `backend/src/routes.ts` - Single default handler for site mapping:
  - Extracts URL, title, depth, parent URL, path, and timestamp
  - Performs same-domain crawling with file exclusions
  - Automatic link discovery and queuing
- **Job Queue**: `backend/src/queue/supabaseQueue.ts` - Custom queue implementation:
  - Concurrent job processing (max 3 simultaneous jobs)
  - Real-time progress tracking and status updates
  - Error handling and retry mechanisms
- **Storage**: Crawlee manages data in `backend/storage/`:
  - `datasets/` - Individual page data as JSON files
  - `request_queues/` - Request management and queuing
  - `key_value_stores/` - Crawler statistics and session state
  - `merged-crawl-data.json` - Combined dataset from all crawled pages
  - `vueflow-data.json` - Visualization data for site mapping

### Frontend Architecture

- **Framework**: Nuxt.js 3 with Vue 3 and TypeScript
- **UI Components**: Shadcn/ui component library (50+ components) with Tailwind CSS v4
- **Authentication**: Supabase Auth with middleware-based route protection
- **State Management**: Pinia stores for user profiles and sidebar state
- **Styling**: Tailwind CSS v4 with color mode support (light/dark/system)
- **Key Pages**:
  - `/dashboard` - Main dashboard with site overview
  - `/sites` - Site listing with real-time status updates
  - `/sites/new` - Multi-step site registration form
  - `/sites/[id]/details` - Individual site details and visualization
  - `/login` - Authentication page

### Technology Stack

- **Backend**: Node.js, TypeScript, Fastify, Crawlee, Playwright, Supabase
- **Frontend**: Nuxt.js 3, Vue 3, TypeScript, Tailwind CSS v4, Shadcn/ui, Vue Flow
- **Authentication**: Supabase Auth with Google OAuth
- **Database**: Supabase (PostgreSQL)
- **Job Queue**: Custom Supabase-based implementation with EventEmitter
- **Visualization**: Vue Flow for interactive site mapping

### Database Schema

```sql
-- Job Management
crawl_jobs (
  id, user_id, site_name, site_url, number_of_crawl_page,
  status, progress, result, error_message,
  created_at, started_at, completed_at
)

-- Results Storage  
crawl_results (
  id, job_id, user_id, site_name, site_url,
  crawl_data, sitemap_data, number_of_crawl_page,
  created_at, updated_at, completed_at
)

-- User Profiles
profiles (
  id, name, avatar_url
)
```

### Configuration Notes

- Both projects use ES modules (`"type": "module"`)
- TypeScript configured for NodeNext module resolution
- Backend requires `SUPABASE_URL` and `SUPABASE_KEY` in `.env.local`
- Frontend requires Supabase credentials for auth and database access
- API server runs on port 8080 with CORS enabled for localhost:3000
- Crawler configured with 20 max requests, 2 retries, 10 max concurrency

### Development Workflow

1. **Backend Development**: Modify crawler logic in `backend/src/routes.ts` or API in `backend/src/server.ts`
2. **Frontend Development**: Work on Vue components, use real-time features via Supabase subscriptions
3. **Environment Setup**: Configure Supabase credentials in both backend and frontend
4. **Type Checking**: Use `npm run typecheck` in respective directories
5. **Data Inspection**: Check `backend/storage/` for crawled results and visualization data

### Key Features

- **Real-time Job Processing**: Supabase subscriptions for live status updates
- **Site Visualization**: VueFlow-based interactive site maps with hierarchical structure
- **Concurrent Crawling**: Up to 3 simultaneous crawl jobs with progress tracking
- **Form Validation**: Multi-step registration with Vee-validate and Zod schemas
- **Responsive UI**: Comprehensive component library with dark/light mode support

### Data Flow

1. User submits site via frontend registration form
2. Backend creates job in Supabase `crawl_jobs` table
3. Job queue processes crawl using Playwright crawler
4. Results are merged and VueFlow visualization data is generated
5. Data is uploaded to Supabase `crawl_results` table
6. Frontend displays real-time progress and final visualization
