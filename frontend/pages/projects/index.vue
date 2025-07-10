<script setup lang="ts">
const isLoading = ref<boolean>(false);
const supabase = useSupabaseClient();
const user = useSupabaseUser();
import {
  getCheckStatusIcon,
  getStatusColor,
  translateStatus,
} from "@/utils/status";
import type { MyProjects } from "@/types/project";

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
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching crawl results:", error);
    return [];
  }

  return data as MyProjects[];
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

  // TODO:Set up subscription after user is confirmed
  //   subscription = supabase
  //     .channel("custom-update-channel")
  //     .on(
  //       "postgres_changes",
  //       {
  //         event: "UPDATE",
  //         schema: "public",
  //         table: "projects",
  //         filter: `user_id=eq.${user.value.id}`,
  //       },
  //       async (payload) => {
  //         if (user.value) {
  //           myProjects.value = await fetchSiteProjects(user.value.id);
  //           console.log("Crawl results updated:", payload);
  //         }
  //       },
  //     )
  //     .subscribe();
});

onBeforeUnmount(() => {
  if (subscription) {
    subscription.unsubscribe();
  }
});
</script>

<template>
  <div id="projects" class="grid w-full gap-8">
    <div class="flex items-center justify-between">
      <PageTitle
        title="プロジェクト一覧"
        description="サイトのプロジェクトを管理します。"
        size="large"
      />
      <Button as-child variant="main">
        <NuxtLink to="/projects/new" class="flex items-center gap-2">
          <Icon name="mdi-plus" />
          新規プロジェクトを作成
        </NuxtLink>
      </Button>
    </div>

    <div class="grid grid-cols-[repeat(auto-fill,minmax(400px,1fr))] gap-6">
      <Card v-for="site in myProjects" :key="site.id" class="gap-2 py-4">
        <CardHeader class="gap-1 px-4">
          <CardTitle class="flex items-center justify-between">
            <NuxtLink
              :to="`/projects/${site.id}/details`"
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
                  getCheckStatusIcon(
                    site.latest_crawl_result?.status || 'unknown',
                  )
                "
                class="!size-3"
                :class="
                  site.latest_crawl_result?.status === 'processing' &&
                  'animate-spin'
                "
              />
              {{
                site.latest_crawl_result?.status
                  ? translateStatus(site.latest_crawl_result?.status)
                  : "未チェック"
              }}
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
