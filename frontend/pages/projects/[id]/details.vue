<script setup lang="ts">
import { toast } from "vue-sonner";
import {
  translateStatus,
  getCheckStatusIcon,
  getStatusColor,
} from "@/utils/status";
import type {
  MyProjects,
  MyProjectSeoCheckResult,
  MyProjectSeoMetaDetail,
} from "@/types/project";

definePageMeta({
  middleware: "auth",
  layout: "default",
});

const supabase = useSupabaseClient();
const user = useSupabaseUser();
const route = useRoute();
const isLoading = ref<boolean>(true);
const myProject = ref<MyProjects | null>(null);
const myProjectSeoCheckResults = ref<MyProjectSeoCheckResult | null>(null);
const myProjectSeoMetaDetails = ref<MyProjectSeoMetaDetail[] | null>(null);
const tabMenus = ref([
  {
    value: "overview",
    icon: "mdi:google-analytics",
    label: "プロジェクト概要",
  },
  {
    value: "quality",
    icon: "mdi:check-circle-outline",
    label: "サイトチェック詳細",
  },
  {
    value: "settings",
    icon: "mdi:cog-outline",
    label: "各種設定",
  },
]);

/**********************************
 * fetch project overview
 **********************************/
const cardContents = computed(() => {
  if (!myProject.value) return [];

  return [
    {
      title: "チェック対象URL",
      icon: "mdi:attachment",
      description: myProject.value.site_url || "URLが設定されていません",
    },
    {
      title: "チェックステータス",
      icon: getCheckStatusIcon(
        myProject.value.crawl_results?.[0].status || "unknown",
      ),
      description: myProject.value.crawl_results?.[0].status
        ? translateStatus(
            myProject.value.crawl_results?.[0].status || "unknown",
          )
        : "ステータスが設定されていません",
    },
    {
      title: "チェックページ数",
      icon: "mdi:book-open-page-variant",
      description: myProject.value.crawl_results?.[0].total_pages
        ? `${myProject.value.crawl_results?.[0].total_pages} ページ`
        : "チェックされたページはありません",
    },
    {
      title: "チェック開始日時",
      icon: "mdi:clock",
      description: myProject.value.crawl_results?.[0].started_at
        ? new Date(
            myProject.value.crawl_results?.[0].started_at,
          ).toLocaleString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "まだチェックが実行されていません",
    },
    {
      title: "チェック完了日時",
      icon: "mdi:clock",
      description: myProject.value.crawl_results?.[0].completed_at
        ? new Date(
            myProject.value.crawl_results?.[0].completed_at,
          ).toLocaleString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "まだチェックが実行されていません",
    },
  ];
});

/**********************************
 * project helper functions
 **********************************/
async function fetchProjectDetails(id: string): Promise<MyProjects | null> {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select(
        `*,
      crawl_results (
        id,
        site_url,
        status,
        total_pages,
        successful_pages,
        failed_pages,
        started_at,
        completed_at
      )`,
      )
      .eq("id", id)
      .eq("crawl_results.is_latest", true) // 最新のcrawl_resultsのみ
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    return data && data.length > 0 ? (data[0] as MyProjects) : null;
  } catch (error) {
    console.error("Error fetching project overview:", error);
    toast.error("プロジェクト情報の取得に失敗しました");
    return null;
  }
}

async function fetchSeoCheckResults(
  id: string,
): Promise<MyProjectSeoCheckResult | null> {
  try {
    const { data, error } = await supabase
      .from("seo_check_results")
      .select("*")
      .eq("project_id", id)
      .order("checked_at", { ascending: false });

    if (error) throw error;

    return data && data.length > 0
      ? (data[0] as MyProjectSeoCheckResult)
      : null;
  } catch (error) {
    console.error("Error fetching SEO results:", error);
    toast.error("SEO結果の取得に失敗しました");
    return null;
  }
}

// TODO: 全件取得ではなく、ページネーションを実装する
async function fetchSeoMetaDetails(
  id: string,
): Promise<MyProjectSeoMetaDetail[] | null> {
  try {
    const allData: MyProjectSeoMetaDetail[] = [];
    const pageSize = 1000; // Supabaseの上限
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const start = page * pageSize;
      const end = start + pageSize - 1;

      const { data, error } = await supabase
        .from("seo_meta_details")
        .select("*")
        .eq("seo_check_results_id", id)
        .order("created_at", { ascending: false })
        .range(start, end);

      if (error) throw error;

      if (data && data.length > 0) {
        allData.push(...(data as MyProjectSeoMetaDetail[]));

        // 取得件数がpageSizeより少ない場合は最後のページ
        hasMore = data.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }

    return allData.length > 0 ? allData : null;
  } catch (error) {
    console.error("Error fetching SEO results:", error);
    toast.error("SEO結果の取得に失敗しました");
    return null;
  }
}

const refreshScore = async () => {
  if (myProject.value?.crawl_results?.[0].status === "in_progress") {
    toast.warning("サイトチェックが終了するまでお待ちください。");
    return;
  }

  await refresh();

  if (myProjectSeoCheckResults.value) {
    myProjectSeoMetaDetails.value = await fetchSeoMetaDetails(
      myProjectSeoCheckResults.value.id,
    );
  }

  if (myProjectSeoCheckResults.value?.total_score) {
    toast.success("SEOスコアを更新しました");
  } else {
    toast.warning("SEOチェックがまだ完了していません。");
  }
};

/************************
 * Lifecycle Hooks
 ************************/
let subscription: any = null;

// for project overview
const {
  data: projectData,
  pending: projectPending,
  refresh: refreshProject,
} = await useAsyncData(
  `project-overview-${route.params.id}`,
  async () => {
    const data = await fetchProjectDetails(route.params.id as string);
    myProject.value = data;
    return data;
  },
  {
    server: false, // only run on client side
    default: () => null,
  },
);

// for SEO check results
const {
  data: seoData,
  pending: seoPending,
  refresh,
} = await useAsyncData(
  `seo-results-${route.params.id}`,
  async () => {
    const data = await fetchSeoCheckResults(route.params.id as string);
    myProjectSeoCheckResults.value = data;
    return data;
  },
  {
    server: false, // only run on client side
    default: () => null,
  },
);

// for SEO meta details
watch(
  () => seoData.value?.id,
  async (newId) => {
    if (newId) {
      myProjectSeoMetaDetails.value = await fetchSeoMetaDetails(newId);
      return myProjectSeoMetaDetails.value;
    } else {
      myProjectSeoMetaDetails.value = null;
    }
  },
  { immediate: true },
);

onMounted(async () => {
  if (!user.value) {
    console.error("User is not authenticated");
    isLoading.value = false;
    return;
  }

  try {
    // リアルタイム監視を設定
    subscription = supabase
      .channel(`project-${route.params.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "projects",
          filter: `id=eq.${route.params.id}`,
        },
        async (payload) => {
          if (user.value) {
            const updatedProject = await fetchProjectDetails(
              route.params.id as string,
            );
            if (updatedProject) {
              myProject.value = updatedProject;
              console.log("Project overview updated:", payload);
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crawl_results",
        },
        async (payload: { new?: { project_id?: string } }) => {
          console.log("Crawl results updated:", payload);
          // If the project_id in the new crawl result matches any of the user's projects, refresh the projects
          if (
            user.value &&
            myProject.value &&
            myProject.value.id === payload.new?.project_id
          ) {
            myProject.value = await fetchProjectDetails(
              route.params.id as string,
            );
          }
        },
      )
      .subscribe();
  } catch (error) {
    console.error("初期化エラー:", error);
  } finally {
    // 最小表示時間を設けてちらつきを防ぐ
    setTimeout(() => {
      isLoading.value = false;
    }, 300);
  }
});

onBeforeUnmount(() => {
  if (subscription) {
    supabase.removeChannel(subscription);
    subscription = null;
  }
});

/************************
 * helper functions
 ************************/
// when tab changes, reset scroll position and update URL
const currentTab = ref<"overview" | "quality" | "settings">(
  (route.query.tab as "overview" | "quality" | "settings") || "overview",
);
const router = useRouter();
function handleTabChange(value: "overview" | "quality" | "settings") {
  currentTab.value = value;
  // when tab changes, scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" });
  // update URL query parameter
  const query = { ...route.query, tab: value };
  // router.push({ path: route.path, query });
  // do not use push, use replace to avoid adding history entry
  router.replace({ path: route.path, query });
}
</script>

<template>
  <div id="project-detail" class="flex h-full w-full flex-col gap-4">
    <!-- ヘッダー部分 -->
    <div class="flex w-full flex-col gap-4">
      <Button as-child variant="link" class="px-0">
        <NuxtLink to="/projects" class="flex w-fit items-center gap-2">
          <Icon name="mdi-arrow-left" />
          プロジェクト一覧へ戻る
        </NuxtLink>
      </Button>

      <div class="flex items-start justify-between">
        <!-- ローディング中はスケルトンを表示 -->
        <div v-if="isLoading" class="flex flex-col gap-2">
          <Skeleton class="h-8 w-64" />
          <Skeleton class="h-4 w-48" />
        </div>

        <!-- データ読み込み完了後 -->
        <PageTitle
          v-else
          :title="myProject?.name || 'プロジェクトが見つかりません'"
          :description="
            myProject?.description || 'プロジェクトの説明がありません'
          "
          size="large"
        />

        <!-- ボタンも条件付きで表示 -->
        <Button v-if="!isLoading && myProject" as-child variant="main">
          <NuxtLink
            :to="`/projects/${route.params.id}/sitemap`"
            class="flex w-fit items-center gap-2"
          >
            サイトマップを見る
            <Icon name="mdi-arrow-right" />
          </NuxtLink>
        </Button>

        <!-- ローディング中のボタンスケルトン -->
        <Skeleton v-else-if="isLoading" class="h-10 w-40" />
      </div>
    </div>

    <!-- メインコンテンツ -->
    <Tabs
      v-model="currentTab"
      @update:model-value="
        handleTabChange($event as 'overview' | 'quality' | 'settings')
      "
      class="w-full flex-1 gap-4"
    >
      <TabsList
        class="bg-background border-border sticky top-0 z-10 w-full justify-start rounded-none border-b p-0"
      >
        <TabsTrigger
          v-for="menu in tabMenus"
          :key="menu.value"
          :value="menu.value"
          class="data-[state=active]:border-b-green data-[state=active]:dark:border-b-green -mb-1 w-fit flex-0 cursor-pointer rounded-none border-t-0 border-r-0 border-b-0 border-l-0 shadow-none hover:shadow-none data-[state=active]:relative data-[state=active]:z-10 data-[state=active]:border-b-2 data-[state=active]:shadow-none"
        >
          <Icon :name="menu.icon" class="!size-4" />
          {{ menu.label }}
        </TabsTrigger>
      </TabsList>

      <!-- プロジェクト概要 -->
      <TabsContent value="overview" class="flex w-full flex-col gap-8">
        <div v-if="isLoading" class="flex h-fit items-center justify-center">
          <Icon
            name="mdi:loading"
            class="text-muted-foreground mx-auto my-8 !size-12 animate-spin"
          />
        </div>

        <ProjectOverview
          v-else
          :myProject="myProject"
          :myProjectSeoCheckResults="myProjectSeoCheckResults"
          :cardContents="cardContents"
          @refreshScore="refreshScore"
          @tabChange="handleTabChange"
        />
      </TabsContent>

      <!-- サイトチェック詳細 -->
      <TabsContent value="quality">
        <div v-if="isLoading" class="flex h-fit items-center justify-center">
          <Icon
            name="mdi:loading"
            class="text-muted-foreground mx-auto my-8 !size-12 animate-spin"
          />
        </div>

        <ProjectQuality
          v-else
          :myProject="myProject"
          :myProjectSeoCheckResults="myProjectSeoCheckResults"
          :myProjectSeoMetaDetails="myProjectSeoMetaDetails"
          @refreshScore="refreshScore"
        />
      </TabsContent>

      <!-- プロジェクト設定 -->
      <TabsContent value="settings">
        <div v-if="isLoading" class="flex h-fit items-center justify-center">
          <Icon
            name="mdi:loading"
            class="text-muted-foreground mx-auto my-8 !size-12 animate-spin"
          />
        </div>

        <ProjectSettings v-else :myProject="myProject" />
      </TabsContent>
    </Tabs>
  </div>
</template>
