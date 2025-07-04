interface BaseProject {
  user_id: string;
  site_url: string;
  description?: string;
  crawl_frequency: "manual" | "daily" | "weekly" | "monthly";
  max_pages: number;
  is_active: boolean;
}

// site_projects
export interface MyProjects extends BaseProject {
  id: string;
  latest_crawl_result_id?: string;
  name: string;
  created_at: string;
  updated_at: string;

  // from crawl_results
  latest_crawl_result?: {
    status: string;
    error_message?: string;
    completed_at?: string;
  };
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
