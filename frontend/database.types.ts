export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)";
  };
  public: {
    Tables: {
      crawl_data: {
        Row: {
          crawl_results_id: string;
          created_at: string | null;
          error_message: string | null;
          id: string;
          page_url: string;
          raw_html: string | null;
          status_code: number | null;
        };
        Insert: {
          crawl_results_id: string;
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          page_url: string;
          raw_html?: string | null;
          status_code?: number | null;
        };
        Update: {
          crawl_results_id?: string;
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          page_url?: string;
          raw_html?: string | null;
          status_code?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "crawl_data_crawl_results_id_fkey";
            columns: ["crawl_results_id"];
            isOneToOne: false;
            referencedRelation: "crawl_results";
            referencedColumns: ["id"];
          },
        ];
      };
      crawl_jobs: {
        Row: {
          completed_at: string | null;
          crawl_results_id: string | null;
          created_at: string | null;
          error_message: string | null;
          id: string;
          max_pages: number | null;
          progress: number | null;
          project_id: string;
          started_at: string | null;
          status: string | null;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          crawl_results_id?: string | null;
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          max_pages?: number | null;
          progress?: number | null;
          project_id: string;
          started_at?: string | null;
          status?: string | null;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          crawl_results_id?: string | null;
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          max_pages?: number | null;
          progress?: number | null;
          project_id?: string;
          started_at?: string | null;
          status?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crawl_jobs_crawl_results_id_fkey";
            columns: ["crawl_results_id"];
            isOneToOne: false;
            referencedRelation: "crawl_results";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crawl_jobs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crawl_jobs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      crawl_results: {
        Row: {
          completed_at: string | null;
          created_at: string | null;
          failed_pages: number | null;
          id: string;
          is_latest: boolean | null;
          project_id: string;
          site_url: string;
          started_at: string | null;
          status: string | null;
          successful_pages: number | null;
          total_pages: number | null;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string | null;
          failed_pages?: number | null;
          id?: string;
          is_latest?: boolean | null;
          project_id: string;
          site_url: string;
          started_at?: string | null;
          status?: string | null;
          successful_pages?: number | null;
          total_pages?: number | null;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string | null;
          failed_pages?: number | null;
          id?: string;
          is_latest?: boolean | null;
          project_id?: string;
          site_url?: string;
          started_at?: string | null;
          status?: string | null;
          successful_pages?: number | null;
          total_pages?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crawl_results_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crawl_results_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      crawler_configs: {
        Row: {
          created_at: string | null;
          delay_between_requests: number | null;
          exclude_patterns: string[] | null;
          follow_external_links: boolean | null;
          id: string;
          include_patterns: string[] | null;
          max_depth: number | null;
          max_pages: number | null;
          project_id: string;
          respect_robots_txt: boolean | null;
          updated_at: string | null;
          user_agent: string | null;
        };
        Insert: {
          created_at?: string | null;
          delay_between_requests?: number | null;
          exclude_patterns?: string[] | null;
          follow_external_links?: boolean | null;
          id?: string;
          include_patterns?: string[] | null;
          max_depth?: number | null;
          max_pages?: number | null;
          project_id: string;
          respect_robots_txt?: boolean | null;
          updated_at?: string | null;
          user_agent?: string | null;
        };
        Update: {
          created_at?: string | null;
          delay_between_requests?: number | null;
          exclude_patterns?: string[] | null;
          follow_external_links?: boolean | null;
          id?: string;
          include_patterns?: string[] | null;
          max_depth?: number | null;
          max_pages?: number | null;
          project_id?: string;
          respect_robots_txt?: boolean | null;
          updated_at?: string | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "crawler_configs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          id: string;
          name: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          id: string;
          name?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          id?: string;
          name?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          is_active: boolean | null;
          max_pages: number | null;
          name: string;
          site_url: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          max_pages?: number | null;
          name: string;
          site_url: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          max_pages?: number | null;
          name?: string;
          site_url?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      seo_check_configs: {
        Row: {
          check_meta: boolean | null;
          created_at: string | null;
          description_max_length: number | null;
          description_min_length: number | null;
          id: string;
          project_id: string;
          title_max_length: number | null;
          title_min_length: number | null;
          updated_at: string | null;
        };
        Insert: {
          check_meta?: boolean | null;
          created_at?: string | null;
          description_max_length?: number | null;
          description_min_length?: number | null;
          id?: string;
          project_id: string;
          title_max_length?: number | null;
          title_min_length?: number | null;
          updated_at?: string | null;
        };
        Update: {
          check_meta?: boolean | null;
          created_at?: string | null;
          description_max_length?: number | null;
          description_min_length?: number | null;
          id?: string;
          project_id?: string;
          title_max_length?: number | null;
          title_min_length?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "seo_check_configs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      seo_check_jobs: {
        Row: {
          completed_at: string | null;
          crawl_results_id: string | null;
          created_at: string;
          error_message: string | null;
          id: string;
          progress: number | null;
          project_id: string;
          seo_check_results_id: string | null;
          started_at: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          crawl_results_id?: string | null;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          progress?: number | null;
          project_id: string;
          seo_check_results_id?: string | null;
          started_at?: string | null;
          status?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          crawl_results_id?: string | null;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          progress?: number | null;
          project_id?: string;
          seo_check_results_id?: string | null;
          started_at?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seo_check_jobs_seo_check_results_id_fkey";
            columns: ["seo_check_results_id"];
            isOneToOne: false;
            referencedRelation: "seo_check_results";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_check_jobs_crawl_results_id_fkey";
            columns: ["crawl_results_id"];
            isOneToOne: true;
            referencedRelation: "crawl_results";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_check_jobs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_check_jobs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      seo_check_results: {
        Row: {
          checked_at: string | null;
          crawl_results_id: string;
          id: string;
          improvement_suggestions: string | null;
          meta_score: number | null;
          project_id: string;
          total_score: number | null;
        };
        Insert: {
          checked_at?: string | null;
          crawl_results_id: string;
          id?: string;
          improvement_suggestions?: string | null;
          meta_score?: number | null;
          project_id: string;
          total_score?: number | null;
        };
        Update: {
          checked_at?: string | null;
          crawl_results_id?: string;
          id?: string;
          improvement_suggestions?: string | null;
          meta_score?: number | null;
          project_id?: string;
          total_score?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "seo_check_results_crawl_results_id_fkey";
            columns: ["crawl_results_id"];
            isOneToOne: false;
            referencedRelation: "crawl_results";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seo_check_results_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      seo_meta_details: {
        Row: {
          canonical_url: string | null;
          created_at: string | null;
          id: string;
          keywords: string[] | null;
          meta_description_length: number | null;
          meta_description_text: string | null;
          og_tags: Json | null;
          page_url: string;
          score: number | null;
          seo_check_results_id: string;
          status_code: number | null;
          title_has_keywords: boolean | null;
          title_length: number | null;
          title_text: string | null;
          twitter_cards: Json | null;
        };
        Insert: {
          canonical_url?: string | null;
          created_at?: string | null;
          id?: string;
          keywords?: string[] | null;
          meta_description_length?: number | null;
          meta_description_text?: string | null;
          og_tags?: Json | null;
          page_url: string;
          score?: number | null;
          seo_check_results_id: string;
          status_code?: number | null;
          title_has_keywords?: boolean | null;
          title_length?: number | null;
          title_text?: string | null;
          twitter_cards?: Json | null;
        };
        Update: {
          canonical_url?: string | null;
          created_at?: string | null;
          id?: string;
          keywords?: string[] | null;
          meta_description_length?: number | null;
          meta_description_text?: string | null;
          og_tags?: Json | null;
          page_url?: string;
          score?: number | null;
          seo_check_results_id?: string;
          status_code?: number | null;
          title_has_keywords?: boolean | null;
          title_length?: number | null;
          title_text?: string | null;
          twitter_cards?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "seo_meta_details_seo_check_results_id_fkey";
            columns: ["seo_check_results_id"];
            isOneToOne: false;
            referencedRelation: "seo_check_results";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      sync_project_overview_stats: {
        Args: { target_project_id?: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
