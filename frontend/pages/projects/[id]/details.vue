<script setup lang="ts">
import { toast } from "vue-sonner";
import {
  translateStatus,
  getCheckStatusIcon,
  getStatusColor,
} from "@/utils/status";
import type { MyProjects } from "@/types/project";

definePageMeta({
  middleware: "auth",
  layout: "default",
});

const supabase = useSupabaseClient();
const user = useSupabaseUser();
const route = useRoute();
const isLoading = ref<boolean>(true);
const myProject = ref<MyProjects | null>(null);
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
    label: "プロジェクト設定",
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
      buttonLabel: "サイトチェック設定へ",
      buttonLink: `/sites/${myProject.value.id}/settings`,
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
      buttonLabel: "サイトチェック設定へ",
      buttonLink: `/sites/${myProject.value.id}/settings`,
    },
    {
      title: "チェックページ数",
      icon: "mdi:book-open-page-variant",
      description: myProject.value.crawl_results?.[0].total_pages
        ? `${myProject.value.crawl_results?.[0].total_pages} ページ`
        : "チェックされたページはありません",
      buttonLabel: "サイトチェック設定へ",
      buttonLink: `/sites/${myProject.value.id}/settings`,
    },
    {
      title: "最新のチェック日時",
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
      buttonLabel: "サイトチェック設定へ",
      buttonLink: `/sites/${myProject.value.id}/settings`,
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

/************************
 * Lifecycle Hooks
 ************************/
let subscription: any = null;

onMounted(async () => {
  if (!user.value) {
    console.error("User is not authenticated");
    isLoading.value = false;
    return;
  }

  try {
    // プロジェクトデータを取得
    myProject.value = await fetchProjectDetails(route.params.id as string);

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
</script>

<template>
  <div
    id="project-detail"
    class="grid h-full w-full grid-rows-[auto_1fr] gap-4"
  >
    <!-- ヘッダー部分 -->
    <div class="flex flex-col gap-4">
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
            :to="`/sites/${route.params.id}/settings`"
            class="flex w-fit items-center gap-2"
          >
            サイトチェック設定へ
            <Icon name="mdi-arrow-right" />
          </NuxtLink>
        </Button>

        <!-- ローディング中のボタンスケルトン -->
        <Skeleton v-else-if="isLoading" class="h-10 w-40" />
      </div>
    </div>

    <!-- メインコンテンツ -->
    <Tabs default-value="overview" class="w-full gap-4">
      <TabsList
        class="bg-background border-border relative w-full justify-start rounded-none border-b p-0"
      >
        <TabsTrigger
          v-for="menu in tabMenus"
          :key="menu.value"
          :value="menu.value"
          class="data-[state=active]:border-b-green -mb-1 w-fit flex-0 cursor-pointer rounded-none border-t-0 border-r-0 border-b-0 border-l-0 shadow-none hover:shadow-none data-[state=active]:relative data-[state=active]:z-10 data-[state=active]:border-b-2 data-[state=active]:shadow-none"
        >
          <Icon :name="menu.icon" class="!size-4" />
          {{ menu.label }}
        </TabsTrigger>
      </TabsList>

      <!-- プロジェクト概要 -->
      <TabsContent value="overview" class="flex w-full flex-col gap-8">
        <!-- skeleton -->
        <div v-if="isLoading" class="flex h-fit items-center justify-center">
          <Icon
            name="mdi:loading"
            class="text-muted-foreground mx-auto my-8 !size-12 animate-spin"
          />
        </div>

        <ProjectOverview
          v-else
          :myProject="myProject"
          :cardContents="cardContents"
        />
      </TabsContent>

      <!-- サイトチェック詳細 -->
      <TabsContent value="quality">
        <ProjectQuality v-if="!isLoading && myProject" />
      </TabsContent>

      <!-- プロジェクト設定 -->
      <TabsContent value="settings">
        <ProjectSettings
          v-if="!isLoading && myProject"
          :myProject="myProject"
        />
      </TabsContent>
    </Tabs>
  </div>
</template>
