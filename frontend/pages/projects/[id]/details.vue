<script setup lang="ts">
import { toast } from "vue-sonner";

definePageMeta({
  middleware: "auth",
  layout: "default",
});

interface ProjectOverview {
  // プロジェクト基本情報
  project_id: string;
  user_id: string;
  project_name: string;
  site_url: string;
  description: string;
  crawl_frequency: "manual" | "daily" | "weekly" | "monthly";
  max_pages: number;
  is_active: boolean;
  project_created_at: string; // ISO 8601 format
  project_updated_at: string; // ISO 8601 format

  // 最新クロール結果
  latest_crawl_id: string | null;
  latest_status: "waiting" | "processing" | "completed" | "failed" | null;
  latest_page_count: number | null;
  latest_completed_at: string | null; // ISO 8601 format
  latest_progress: number | null; // 0-100

  // クロール統計
  total_crawls: number;
  successful_crawls: number;
  last_7_days_crawls: number;

  // 最新の品質問題統計
  latest_total_issues: number;
  latest_critical_issues: number;
  latest_broken_links: number;
  latest_duplicate_titles: number;
}

const supabase = useSupabaseClient();
const user = useSupabaseUser();
const route = useRoute();
const progress = ref<number>(0);

function getIconName(status: string): string {
  switch (status) {
    case "waiting":
      return "mdi:timer-sand";
    case "processing":
      return "mdi:sync";
    case "completed":
      return "mdi:check-circle";
    case "failed":
      return "mdi:alert-circle";
    default:
      return "mdi:help-circle";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "waiting":
      return "text-yellow-500";
    case "processing":
      return "text-blue-500";
    case "completed":
      return "text-green-500";
    case "failed":
      return "text-red-500";
    default:
      return "text-gray-500";
  }
}

async function deleteProject(id: string) {
  if (!user.value) {
    console.error("ユーザーがログインしていません");
    return;
  }

  const { error } = await supabase
    .from("site_projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.value?.id);

  if (error) {
    toast.error("削除に失敗しました。もう一度お試しください。");
    console.error("削除に失敗しました:", error);
  } else {
    toast.success("削除に成功しました");
    console.log("削除に成功しました");

    navigateTo("/sites");
  }
}

async function fetchProjectOverview(id: string) {
  const { data, error } = await supabase
    .from("project_overview")
    .select("*")
    .eq("project_id", id)
    .limit(1);

  if (error) {
    console.error("Error fetching crawl results:", error);
    return null;
  }

  return data && data.length > 0 ? (data[0] as ProjectOverview) : null;
}

const { data: projectOverview } = await useAsyncData<ProjectOverview | null>(
  `projectOverview-${route.params.id}`,
  async (): Promise<ProjectOverview | null> => {
    try {
      if (!user.value) {
        console.error("ユーザーがログインしていません");
        return null;
      }

      return await fetchProjectOverview(route.params.id as string);
    } catch (error) {
      console.error("Error fetching crawl results:", error);
      return null;
    }
  },
);
</script>

<template>
  <div id="dashboard" class="grid w-full gap-8">
    <div class="flex flex-col gap-4">
      <Button as-child variant="link" class="px-0">
        <NuxtLink to="/projects" class="flex w-fit items-center gap-2">
          <Icon name="mdi-arrow-left" />
          サイト一覧へ戻る
        </NuxtLink>
      </Button>

      <div class="flex items-start justify-between">
        <PageTitle
          :title="`${projectOverview?.project_name}`"
          :description="`${projectOverview?.description}`"
          size="large"
        />
        <Button as-child variant="main">
          <NuxtLink
            :to="`/sites/${route.params.id}/settings`"
            class="flex w-fit items-center gap-2"
          >
            サイトチェック設定へ
            <Icon name="mdi-arrow-right" />
          </NuxtLink>
        </Button>
      </div>
    </div>

    <!-- <Button
      variant="destructive"
      class="w-fit"
      @click="deleteCrawlResult($route.params.id as string)"
    >
      <Icon name="mdi-close" />
      削除する
    </Button> -->
    <div class="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
      <Card class="gap-2 py-4">
        <CardHeader class="flex flex-row items-start justify-between px-4">
          <div class="flex flex-col gap-1">
            <CardTitle class="text-muted-foreground text-sm">
              チェック対象URL
            </CardTitle>
          </div>
          <Icon name="mdi:attachment" class="text-green !size-6" />
        </CardHeader>
        <CardContent class="px-4">
          <NuxtLink
            :to="`/sites/${projectOverview?.site_url}/sitemap`"
            target="_blank"
            class="text-green text-base font-medium hover:underline hover:opacity-80"
          >
            {{ projectOverview?.site_url }}
          </NuxtLink>
        </CardContent>
        <CardFooter class="px-4">
          <Button
            as-child
            variant="link"
            class="text-muted-foreground h-fit w-fit p-0"
          >
            <NuxtLink
              :to="`/sites/${projectOverview?.project_id}/settings`"
              class="text-xs hover:underline hover:opacity-80"
            >
              リンク設定へ
              <Icon name="mdi-arrow-right" class="inline-block !size-4" />
            </NuxtLink>
          </Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
