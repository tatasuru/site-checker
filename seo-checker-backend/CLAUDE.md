# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Run the web scraper directly using tsx
- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch for TypeScript changes and recompile
- `npm run typecheck` - Run TypeScript type checking without emitting files
- No test framework is currently configured (test script exits with error)

## Project Architecture

This is a web scraping project built with TypeScript and the Crawlee framework using Cheerio for HTML parsing.

### Core Components

- **Main Entry Point**: `src/index.ts` - Contains the CheerioCrawler configuration and execution
- **Web Scraping Framework**: Uses Crawlee's CheerioCrawler for web scraping with jQuery-like syntax
- **Storage System**: Crawlee automatically manages storage in the `storage/` directory:
  - `datasets/` - For structured data output
  - `key_value_stores/` - For crawler statistics and session state
  - `request_queues/` - For managing crawl requests

### Technology Stack

- **Runtime**: Node.js with ESM modules
- **Language**: TypeScript with strict type checking
- **Web Scraping**: Crawlee framework with Cheerio selector engine
- **Browser Automation**: Playwright (installed as dependency)
- **Development**: tsx for direct TypeScript execution

### Configuration Notes

- TypeScript is configured for modern ESNext target with NodeNext module resolution
- Project uses ES modules (`"type": "module"` in package.json)
- No emit mode is enabled in TypeScript config - files are executed directly via tsx
- Crawlee automatically handles request queuing, retries, and data storage
- Current crawler is limited to 20 requests per crawl for safety

### Storage Structure

The `storage/` directory is automatically managed by Crawlee and contains:
- Crawler statistics and performance metrics
- Session pool state for managing concurrent requests
- Request queue data for tracking crawl progress

### Development Workflow

1. Modify the crawler configuration in `src/index.ts`
2. Use `npm run dev` to test changes immediately
3. Use `npm run typecheck` to validate TypeScript types
4. Storage data persists between runs and can be inspected for debugging