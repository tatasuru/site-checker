export interface CrawlJob {
  id: string;
  user_id: string;
  site_name: string;
  site_url: string;
  number_of_crawl_page?: string;
  status: "waiting" | "in_progress" | "completed" | "failed";
  progress: number;
  result?: any;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}
