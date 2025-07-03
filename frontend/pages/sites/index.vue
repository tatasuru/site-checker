<script setup lang="ts">
const isLoading = ref<boolean>(false);
const supabase = useSupabaseClient();
const user = useSupabaseUser();

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
  completed_at: string | null; // ISO date string or null
  number_of_crawl_page_job: number;
  status: "waiting" | "processing" | "completed" | "failed";
  progress: number;
  job_result: string;
  error_message: string | null;
}

const myCrawlResults = ref<MySite[]>([]);

definePageMeta({
  middleware: "auth",
  layout: "default",
});

// get crawl results for the authenticated user
async function fetchCrawlResults(userId: string) {
  const { data, error } = await supabase
    .from("crawl_results")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching crawl results:", error);
    return [];
  }

  return data as MySite[];
}

onMounted(async () => {
  if (!user.value) {
    console.error("User is not authenticated");
    return;
  }

  isLoading.value = true;
  myCrawlResults.value = await fetchCrawlResults(user.value.id);
  isLoading.value = false;
});

supabase
  .channel("custom-update-channel")
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "crawl_results",
      filter: `user_id=eq.${user.value?.id}`,
    },
    async (payload) => {
      myCrawlResults.value = await fetchCrawlResults(user.value?.id || "");
      console.log("New crawl result inserted:", myCrawlResults.value);
    },
  )
  .subscribe();
</script>

<template>
  <div id="dashboard" class="grid w-full gap-8">
    <div class="flex items-center justify-between">
      <PageTitle
        title="サイト一覧"
        description="登録したサイトの情報を表示します。"
        size="large"
      />
      <Button as-child>
        <NuxtLink to="/sites/new" class="flex items-center gap-2">
          <Icon name="mdi-plus" />
          新規登録
        </NuxtLink>
      </Button>
    </div>

    <!-- <div
      v-if="isLoading && myCrawlResults.length === 0"
      class="text-muted-foreground flex"
    >
      <Icon name="mdi:loading" class="!size-5 animate-spin" />
      <span class="ml-2">読み込み中...</span>
    </div> -->

    <div class="grid grid-cols-[repeat(auto-fill,minmax(400px,1fr))] gap-6">
      <Card v-for="site in myCrawlResults" :key="site.id" class="gap-2 py-4">
        <CardHeader class="px-4">
          <CardTitle class="flex items-center justify-between">
            <NuxtLink
              :to="`/sites/${site.id}/details`"
              class="w-full hover:underline hover:opacity-80"
            >
              {{ site.site_name }}
            </NuxtLink>
            <Badge variant="outline" class="items-center gap-1 rounded-full">
              <Icon
                v-if="site.status === 'waiting'"
                name="mdi:timer-sand"
                class="!size-3"
              />
              <Icon
                v-else-if="site.status === 'processing'"
                name="mdi:sync"
                class="!size-3 animate-spin"
              />
              <Icon
                v-else-if="site.status === 'completed'"
                name="mdi:check-circle"
                class="!size-3"
              />
              <Icon
                v-else-if="site.status === 'failed'"
                name="mdi:alert-circle"
                class="!size-3"
              />
              {{ site.status }}
            </Badge>
          </CardTitle>
          <CardDescription>
            <NuxtLink
              :to="site.site_url"
              target="_blank"
              class="hover:underline hover:opacity-80"
            >
              {{ site.site_url }}
            </NuxtLink>
          </CardDescription>
        </CardHeader>
        <CardFooter class="flex-col gap-4 px-4">
          <div class="flex w-full items-center gap-4">
            <div class="flex items-center gap-1">
              <Icon
                name="mdi:clock-outline"
                class="text-muted-foreground !size-4"
              />
              <span
                v-if="site.completed_at"
                class="text-muted-foreground text-sm"
              >
                最終チェック:
                {{
                  new Date(site.completed_at).toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }}
              </span>
              <span v-else class="text-muted-foreground text-sm">
                チェック中...
              </span>
            </div>
            <div class="flex items-center gap-1">
              <Icon
                name="mdi:file-document-outline"
                class="text-muted-foreground !size-4"
              />
              <span
                v-if="site.completed_at"
                class="text-muted-foreground text-sm"
              >
                ページ数: {{ site.number_of_crawl_page }}
              </span>
              <span v-else class="text-muted-foreground text-sm">
                チェック予定ページ数: {{ site.number_of_crawl_page_job }}
              </span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
