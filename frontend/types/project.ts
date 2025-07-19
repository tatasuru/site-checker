import type { Node, Edge } from "@vue-flow/core";

interface BaseProject {
  id: string;
  user_id: string;
  name: string;
  description: string;
  site_url: string;
  max_pages: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrawlResult {
  id: string;
  site_url: string;
  status: "waiting" | "in_progress" | "completed" | "failed";
  total_pages: number;
  successful_pages: number;
  failed_pages: number;
  started_at: string;
  // sitemap_data: {
  //   nodes: Node[];
  //   edges: Edge[];
  // };
  sitemap_data: string;
  completed_at: string | null;
}

// projects
export interface MyProjects extends BaseProject {
  latest_crawl_result_id?: string;
  // from crawl_results
  crawl_results?: CrawlResult[];
}

// project_overview
export interface MyProjectOverview extends BaseProject {
  project_id: string;
  project_name: string;
  project_created_at: string;
  project_updated_at: string;
  latest_crawl_id?: string;
  latest_status?: string;
  latest_page_count?: number;
  latest_completed_at?: string;
  latest_progress: number;
  total_crawls: number;
  successful_crawls: number;
  last_7_days_crawls: number;
  latest_total_issues: number;
  latest_critical_issues: number;
  latest_broken_links: number;
  latest_duplicate_titles: number;
  created_at: string;
  updated_at: string;
}

// seo_check_results
export interface MyProjectSeoCheckResult {
  id: string;
  project_id: string;
  crawl_results_id: string;
  total_score: number;
  meta_score: number;
  improvement_suggestions: string;
  checked_at: string;
}

// seo_meta_details
export interface MyProjectSeoMetaDetail {
  id: string;
  seo_check_results_id: string;
  page_url: string;
  title_text: string;
  title_length: number;
  title_has_keywords: boolean;
  meta_description_text: string;
  meta_description_length: number;
  canonical_url: string;
  og_tags: {
    og_title: string;
    og_description: string;
    og_image: string;
  };
  twitter_cards: {
    twitter_title: string;
    twitter_description: string;
    twitter_image: string;
  };
  keywords: string[];
  status_code: number | null;
  score: number;
  created_at: string;
}
