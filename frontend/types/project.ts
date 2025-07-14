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

// projects
export interface MyProjects extends BaseProject {
  id: string;
  latest_crawl_result_id?: string;
  name: string;
  created_at: string;
  updated_at: string;

  // from crawl_results
  crawl_results?: {
    id: string;
    site_url: string;
    status: "waiting" | "in_progress" | "completed" | "failed";
    total_pages: number;
    successful_pages: number;
    failed_pages: number;
    completed_at: string | null;
  }[];
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
