# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Web Scraper)
- `cd backend && npm run dev` - Run the Playwright web scraper using tsx
- `cd backend && npm run build` - Compile TypeScript to JavaScript
- `cd backend && npm run watch` - Watch for TypeScript changes and recompile
- `cd backend && npm run typecheck` - Run TypeScript type checking without emitting files

### Frontend (Nuxt.js App)
- `cd frontend && npm run dev` - Start development server on http://localhost:3000
- `cd frontend && npm run build` - Build the application for production
- `cd frontend && npm run preview` - Preview production build locally
- `cd frontend && npm run generate` - Generate static site

## Project Architecture

This is a full-stack web application consisting of a Nuxt.js frontend and a web scraping backend for site monitoring and data collection.

### Backend Architecture
- **Framework**: Crawlee with Playwright for browser automation
- **Language**: TypeScript with ESNext target
- **Entry Point**: `backend/src/index.ts` - Configures PlaywrightCrawler with route handlers
- **Route Handlers**: `backend/src/routes.ts` - Defines scraping logic with labeled routes:
  - `DETAIL` - Extracts product data (title, SKU, price, stock status)
  - `CATEGORY` - Navigates product listings and pagination
  - Default handler - Discovers category links from collection pages
- **Storage**: Crawlee automatically manages data in `backend/storage/`:
  - `datasets/` - Structured scraped data output
  - `request_queues/` - Request management and queuing
  - `key_value_stores/` - Crawler statistics and session state

### Frontend Architecture
- **Framework**: Nuxt.js 3 with Vue 3 and TypeScript
- **UI Components**: Shadcn/ui component library with Tailwind CSS v4
- **Authentication**: Supabase integration with automatic redirects
- **State Management**: Pinia stores in `frontend/stores/`
- **Styling**: Tailwind CSS with color mode support (light/dark/system)
- **Key Pages**:
  - `/` - Home page with custom layout
  - `/login` - Authentication page
  - `/dashboard` - Main application dashboard (requires auth)

### Technology Stack
- **Backend**: Node.js, TypeScript, Crawlee, Playwright
- **Frontend**: Nuxt.js 3, Vue 3, TypeScript, Tailwind CSS v4, Supabase
- **Authentication**: Supabase Auth with Google OAuth
- **Database**: Supabase (PostgreSQL)
- **Package Management**: npm (backend), npm (frontend)

### Configuration Notes
- Both projects use ES modules (`"type": "module"`)
- TypeScript configured for NodeNext module resolution
- Supabase environment variables required for frontend
- Playwright automatically downloads browser binaries on install
- Current scraper targets Shopify store with 50 request limit

### Development Workflow
1. **Backend Development**: Modify scraper logic in `backend/src/routes.ts`, test with `npm run dev`
2. **Frontend Development**: Work on Vue components, use `npm run dev` for hot reload
3. **Environment Setup**: Configure Supabase credentials in frontend environment
4. **Type Checking**: Use `npm run typecheck` in respective directories
5. **Data Inspection**: Check `backend/storage/datasets/` for scraped results

### Key Integrations
- Supabase handles authentication, redirects, and user session management
- Tailwind CSS v4 with Vite plugin for styling
- Shadcn/ui provides comprehensive component library
- Crawlee handles request queuing, retries, and browser management automatically