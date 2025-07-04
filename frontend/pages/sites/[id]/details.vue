<script setup lang="ts">
import { toast } from "vue-sonner";

definePageMeta({
  middleware: "auth",
  layout: "default",
});

interface MySite {
  id: string;
  job_id: string;
  user_id: string;
  site_name: string;
  site_url: string;
  crawl_data: string; // JSON string
  sitemap_data: string; // JSON string
  number_of_crawl_page: number;
  created_at: string;
  updated_at: string;
  completed_at: string; // ISO date string or null
  number_of_crawl_page_job: number;
  status: "waiting" | "processing" | "completed" | "failed";
  progress: number;
  job_result: string;
  error_message: string | null;
}

const supabase = useSupabaseClient();
const user = useSupabaseUser();
const route = useRoute();

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

async function deleteCrawlResult(id: string) {
  if (!user.value) {
    console.error("ユーザーがログインしていません");
    return;
  }

  const { error } = await supabase
    .from("crawl_results")
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

async function fetchCrawlResults(id: string) {
  const { data, error } = await supabase
    .from("crawl_results")
    .select("*")
    .eq("id", id)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error fetching crawl results:", error);
    return null;
  }

  return data && data.length > 0 ? (data[0] as MySite) : null;
}

const { data: crawlResult } = await useAsyncData<MySite | null>(
  `crawlResult-${route.params.id}`,
  async (): Promise<MySite | null> => {
    try {
      if (!user.value) {
        console.error("ユーザーがログインしていません");
        return null;
      }

      return await fetchCrawlResults(route.params.id as string);
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
        <NuxtLink to="/sites" class="flex w-fit items-center gap-2">
          <Icon name="mdi-arrow-left" />
          サイト一覧へ戻る
        </NuxtLink>
      </Button>

      <div class="flex items-center justify-between">
        <PageTitle
          :title="`${crawlResult?.site_name}`"
          :description="`${crawlResult?.site_url}`"
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

    {{ crawlResult }}
  </div>
</template>
