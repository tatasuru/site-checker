<script setup lang="ts">
const isLoading = ref<boolean>(false);
const supabase = useSupabaseClient();
const user = useSupabaseUser();

interface MyProjects {
  id: string;
  user_id: string;
  latest_crawl_result_id: string;
  name: string;
  description: string;
  site_url: string;
  crawl_frequency: string;
  max_pages: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // from crawl_results
  latest_crawl_result?: {
    status: string;
    error_message?: string;
    completed_at?: string;
  };
}

const myProjects = ref<MyProjects[]>([]);

definePageMeta({
  middleware: "auth",
  layout: "default",
});

/************************
 * Functions
 ************************/
// get crawl results for the authenticated user
async function fetchSiteProjects(userId: string) {
  const { data, error } = await supabase
    .from("site_projects")
    .select(
      `
      *,
      latest_crawl_result:crawl_results!latest_crawl_result_id (
        status,
        error_message,
        completed_at
      )
    `,
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching crawl results:", error);
    return [];
  }

  return data as MyProjects[];
}

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

/************************
 * Lifecycle Hooks
 ************************/
let subscription: any = null;
onMounted(async () => {
  if (!user.value) {
    console.error("User is not authenticated");
    return;
  }

  isLoading.value = true;
  myProjects.value = await fetchSiteProjects(user.value.id);
  isLoading.value = false;

  // Set up subscription after user is confirmed
  subscription = supabase
    .channel("custom-update-channel")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "site_projects",
        filter: `user_id=eq.${user.value.id}`,
      },
      async (payload) => {
        if (user.value) {
          myProjects.value = await fetchSiteProjects(user.value.id);
          console.log("Crawl results updated:", payload);
        }
      },
    )
    .subscribe();
});

onBeforeUnmount(() => {
  if (subscription) {
    subscription.unsubscribe();
  }
});
</script>

<template>
  <div id="dashboard" class="grid w-full gap-8">
    <div class="flex items-center justify-between">
      <PageTitle
        title="サイト一覧"
        description="登録したサイトの情報を表示します。"
        size="large"
      />
      <Button as-child variant="main">
        <NuxtLink to="/sites/new" class="flex items-center gap-2">
          <Icon name="mdi-plus" />
          新規登録
        </NuxtLink>
      </Button>
    </div>

    <div class="grid grid-cols-[repeat(auto-fill,minmax(400px,1fr))] gap-6">
      <Card v-for="site in myProjects" :key="site.id" class="gap-2 py-4">
        <CardHeader class="px-4">
          <CardTitle class="flex items-center justify-between">
            <NuxtLink
              :to="`/sites/${site.id}/details`"
              class="w-full hover:underline hover:opacity-80"
            >
              {{ site.name }}
            </NuxtLink>
            <Badge
              variant="outline"
              class="items-center gap-1 rounded-full"
              :class="
                getStatusColor(site.latest_crawl_result?.status || 'unknown')
              "
            >
              <Icon
                :name="
                  getIconName(site.latest_crawl_result?.status || 'unknown')
                "
                class="!size-3"
                :class="
                  site.latest_crawl_result?.status === 'processing' &&
                  'animate-spin'
                "
              />
              {{ site.latest_crawl_result?.status || "unknown" }}
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
              <span class="text-muted-foreground text-sm">
                作成日時:
                {{
                  new Date(site.created_at).toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }}
              </span>
            </div>
            <div class="flex items-center gap-1">
              <Icon
                name="mdi:file-document-outline"
                class="text-muted-foreground !size-4"
              />
              <span class="text-muted-foreground text-sm">
                ページ数: {{ site.max_pages }}
              </span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
