# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Crawler Backend (Site Crawler API)

- `cd crawler-backend && npm run dev` - Run the standalone Playwright crawler (testing only)
- `cd crawler-backend && npm run start` - Start the Fastify API server with job queue processing on port 8080
- `cd crawler-backend && npm run build` - Compile TypeScript to JavaScript
- `cd crawler-backend && npm run watch` - Watch for TypeScript changes and recompile
- `cd crawler-backend && npm run typecheck` - Run TypeScript type checking without emitting files

### SEO Checker Backend

- `cd seo-checker-backend && npm run start` - Start the SEO analysis API server on port 5050
- `cd seo-checker-backend && npm run build` - Compile TypeScript to JavaScript
- `cd seo-checker-backend && npm run typecheck` - Run TypeScript type checking without emitting files

### Frontend (Nuxt.js App)

- `cd frontend && npm run dev` - Start development server on http://localhost:3000
- `cd frontend && npm run build` - Build the application for production
- `cd frontend && npm run preview` - Preview production build locally
- `cd frontend && npm run generate` - Generate static site

## Project Architecture

This is a **Site Checker** - a full-stack web application that performs automated web crawling and site mapping. Users can register websites to be crawled, monitor crawl progress in real-time, and visualize site structure through an interactive dashboard.

### Backend Architecture

The backend consists of two separate services:

#### Crawler Backend (`crawler-backend/`)
- **Framework**: Fastify web server with custom Supabase-based job queue
- **Crawler Engine**: Crawlee with Playwright for browser automation
- **Language**: TypeScript with ESNext target
- **API Server**: `crawler-backend/src/server.ts` - Fastify server with CORS and job management endpoints (port 8080)
- **Crawler Logic**: `crawler-backend/src/crawler/index.ts` - Execution engine with storage management
- **Route Handlers**: `crawler-backend/src/routes.ts` - Single default handler for site mapping:
  - Extracts URL, title, depth, parent URL, path, and timestamp
  - Performs same-domain crawling with file exclusions
  - Automatic link discovery and queuing
- **Job Queue**: `crawler-backend/src/queue/supabaseQueue.ts` - Custom queue implementation:
  - Concurrent job processing (max 1 simultaneous job currently)
  - Real-time progress tracking and status updates
  - Error handling and retry mechanisms
- **Storage**: Crawlee manages data in `crawler-backend/storage/`:
  - `datasets/` - Individual page data as JSON files
  - `request_queues/` - Request management and queuing
  - `key_value_stores/` - Crawler statistics and session state
  - `merged-crawl-data.json` - Combined dataset from all crawled pages
  - `vueflow-data.json` - Visualization data for site mapping

#### SEO Checker Backend (`seo-checker-backend/`)
- **Framework**: Fastify web server for webhook processing
- **API Server**: `seo-checker-backend/src/server.ts` - Fastify server for SEO analysis (port 5050)
- **Webhook Handler**: `/completed-crawler` endpoint processes completed crawl notifications
- **Job Queue**: `seo-checker-backend/src/queue/supabaseQueue.ts` - SEO analysis job queue with duplicate detection

### Frontend Architecture

- **Framework**: Nuxt.js 3 with Vue 3 and TypeScript
- **UI Components**: Shadcn/ui component library (50+ components) with Tailwind CSS v4
- **Authentication**: Supabase Auth with middleware-based route protection
- **State Management**: Pinia stores for user profiles and sidebar state
- **Styling**: Tailwind CSS v4 with color mode support (light/dark/system)
- **Key Pages**:
  - `/` - Landing page
  - `/projects` - Project listing with real-time status updates
  - `/projects/new` - Multi-step project registration form
  - `/projects/[id]/details` - Individual project details and visualization
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
-- Project Management
projects (
  id, user_id, name, description, site_url, max_pages,
  created_at, updated_at
)

-- Job Management
crawl_jobs (
  id, user_id, project_id, crawl_results_id,
  status, progress, error_message, max_pages,
  created_at, started_at, completed_at
)

-- Results Storage
crawl_results (
  id, user_id, project_id, site_url,
  status, total_pages, successful_pages, failed_pages,
  is_latest, started_at, completed_at, created_at, updated_at
)

-- Individual Page Data
crawl_data (
  id, crawl_results_id, page_url, raw_html,
  status_code, error_message, created_at
)

-- SEO Analysis Jobs
seo_check_jobs (
  id, user_id, project_id, crawl_results_id,
  status, progress, error_message,
  created_at, started_at, completed_at
)

-- User Profiles
profiles (
  id, name, avatar_url
)
```

### Configuration Notes

- All projects use ES modules (`"type": "module"`)
- TypeScript configured for NodeNext module resolution
- Both backends require `SUPABASE_URL` and `SUPABASE_KEY` in `.env.local`
- Frontend requires Supabase credentials for auth and database access
- Crawler backend runs on port 8080 with CORS enabled for localhost:3000
- SEO checker backend runs on port 5050
- Crawler configured with 20 max requests, 2 retries, 10 max concurrency
- Currently limited to 1 concurrent crawl job to prevent resource conflicts

### Development Workflow

1. **Crawler Backend Development**: Modify crawler logic in `crawler-backend/src/routes.ts` or API in `crawler-backend/src/server.ts`
2. **SEO Backend Development**: Modify SEO analysis logic in `seo-checker-backend/src/seo-checker/index.ts` or webhook handlers
3. **Frontend Development**: Work on Vue components, use real-time features via Supabase subscriptions
4. **Environment Setup**: Configure Supabase credentials in all three directories
5. **Type Checking**: Use `npm run typecheck` in respective directories
6. **Data Inspection**: Check `crawler-backend/storage/` for crawled results and visualization data

### Key Features

- **Real-time Job Processing**: Supabase subscriptions for live status updates
- **Site Visualization**: VueFlow-based interactive site maps with hierarchical structure
- **Concurrent Crawling**: Up to 3 simultaneous crawl jobs with progress tracking
- **Form Validation**: Multi-step registration with Vee-validate and Zod schemas
- **Responsive UI**: Comprehensive component library with dark/light mode support

### Data Flow

1. User submits project via frontend registration form
2. Crawler backend creates project and crawl_results records in Supabase
3. Crawler job queue processes crawl using Playwright crawler
4. Individual page data stored in `crawl_data` table with raw HTML
5. Upon completion, webhook triggers SEO checker backend
6. SEO analysis job processes crawled data for insights
7. Results are merged and VueFlow visualization data is generated
8. Frontend displays real-time progress and final visualization with SEO insights
