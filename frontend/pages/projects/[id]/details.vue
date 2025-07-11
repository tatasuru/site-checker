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
const progress = ref<number>(0);
const isLoading = ref<boolean>(true); // 初期値をtrueに
const myProject = ref<MyProjects | null>(null);
const isDeleting = ref<boolean>(false);

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

// スケルトン用のダミーカード
const skeletonCards = Array(4)
  .fill(null)
  .map((_, index) => ({
    title: "",
    icon: "mdi:help-circle",
    description: "",
    buttonLabel: "",
    buttonLink: "",
  }));

/**********************************
 * project helper functions
 **********************************/
async function deleteProject(id: string) {
  if (!user.value) {
    console.error("ユーザーがログインしていません");
    toast.error("ユーザーがログインしていません");
    return;
  }

  try {
    isDeleting.value = true;

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id)
      .eq("user_id", user.value.id);

    if (error) throw error;

    toast.success("削除に成功しました");
    console.log("削除に成功しました");
    await navigateTo("/projects");
  } catch (error) {
    toast.error("削除に失敗しました。もう一度お試しください。");
    console.error("削除に失敗しました:", error);
  } finally {
    isDeleting.value = false;
  }
}

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
          value="overview"
          class="data-[state=active]:border-b-green -mb-1 w-fit flex-0 cursor-pointer rounded-none border-t-0 border-r-0 border-b-0 border-l-0 shadow-none hover:shadow-none data-[state=active]:relative data-[state=active]:z-10 data-[state=active]:border-b-2 data-[state=active]:shadow-none"
        >
          <Icon name="mdi:google-analytics" class="!size-4" />
          プロジェクト概要
        </TabsTrigger>
        <TabsTrigger
          value="quality"
          class="data-[state=active]:border-b-green -mb-1 w-fit flex-0 cursor-pointer rounded-none border-t-0 border-r-0 border-b-0 border-l-0 shadow-none hover:shadow-none data-[state=active]:relative data-[state=active]:z-10 data-[state=active]:border-b-2 data-[state=active]:shadow-none"
        >
          <Icon name="mdi:check-circle-outline" class="!size-4" />
          サイトチェック詳細
        </TabsTrigger>
        <TabsTrigger
          value="settings"
          class="data-[state=active]:border-b-green -mb-1 w-fit flex-0 cursor-pointer rounded-none border-t-0 border-r-0 border-b-0 border-l-0 shadow-none hover:shadow-none data-[state=active]:relative data-[state=active]:z-10 data-[state=active]:border-b-2 data-[state=active]:shadow-none"
        >
          <Icon name="mdi:cog-outline" class="!size-4" />
          プロジェクト設定
        </TabsTrigger>
      </TabsList>

      <!-- プロジェクト概要 -->
      <TabsContent value="overview" class="flex w-full flex-col gap-8">
        <div class="flex flex-col gap-2">
          <PageTitle title="サイトクロール状況" description="" size="small" />

          <div
            class="grid w-full grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4"
          >
            <!-- ローディング中のスケルトンカード -->
            <template v-if="isLoading">
              <Card
                v-for="(_, index) in skeletonCards"
                :key="`skeleton-${index}`"
                class="gap-4 py-4"
              >
                <CardHeader
                  class="flex flex-row items-start justify-between px-4"
                >
                  <div class="flex flex-col gap-1">
                    <Skeleton class="h-4 w-24" />
                  </div>
                  <Skeleton class="h-5 w-5" />
                </CardHeader>
                <CardContent class="px-4">
                  <Skeleton class="mb-2 h-6 w-full" />
                  <Skeleton class="h-3 w-32" />
                </CardContent>
              </Card>
            </template>

            <!-- 実際のカードコンテンツ -->
            <template v-else>
              <Card
                v-for="(card, index) in cardContents"
                :key="`card-${index}`"
                class="gap-4 py-4 transition-all duration-200 ease-in-out"
              >
                <CardHeader
                  class="flex flex-row items-start justify-between px-4"
                >
                  <div class="flex flex-col gap-1">
                    <CardTitle class="text-muted-foreground text-sm">
                      {{ card.title }}
                    </CardTitle>
                  </div>
                  <Icon
                    :name="card.icon"
                    :class="[
                      '!size-5 transition-all duration-200',
                      card.title === 'チェックステータス'
                        ? getStatusColor(
                            myProject?.crawl_results?.[0].status || 'unknown',
                          )
                        : 'text-green',
                      {
                        'animate-spin':
                          myProject?.crawl_results?.[0].status ===
                            'in_progress' &&
                          card.title === 'チェックステータス',
                      },
                    ]"
                  />
                </CardHeader>
                <CardContent class="px-4">
                  <p
                    class="text-base font-semibold tracking-wider transition-all duration-200"
                    :class="
                      card.title === 'チェックステータス'
                        ? getStatusColor(
                            myProject?.crawl_results?.[0].status || 'unknown',
                          )
                        : 'text-green'
                    "
                  >
                    {{ card.description }}
                  </p>
                  <Button
                    v-if="card.buttonLabel"
                    as-child
                    variant="link"
                    class="text-muted-foreground h-fit w-fit p-0"
                  >
                    <NuxtLink
                      :to="card.buttonLink"
                      class="text-xs hover:underline hover:opacity-80"
                    >
                      {{ card.buttonLabel }}
                      <Icon
                        name="mdi-arrow-right"
                        class="inline-block !size-4"
                      />
                    </NuxtLink>
                  </Button>
                </CardContent>
              </Card>
            </template>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <PageTitle title="SEOチェック概要" description="" size="small" />
          グラフとかスコアとかがくる
        </div>
      </TabsContent>

      <!-- サイトチェック詳細 -->
      <TabsContent value="quality">
        <PageTitle
          title="サイトチェック詳細"
          description="サイトチェックの詳細情報を表示します。"
          size="medium"
        />
      </TabsContent>

      <!-- プロジェクト設定 -->
      <TabsContent value="settings">
        <Tabs
          default-value="crawler"
          class="h-full flex-row gap-12"
          orientation="vertical"
        >
          <TabsList
            class="bg-background relative w-full max-w-[200px] flex-col justify-start rounded-none border-none p-0"
          >
            <TabsTrigger
              value="crawler"
              class="text-green hover:bg-green/20 data-[state=active]:bg-green/20 data-[state=active]:text-green w-full flex-0 cursor-pointer justify-start rounded-[3px] bg-none shadow-none hover:shadow-none data-[state=active]:shadow-none"
            >
              クローラ設定
            </TabsTrigger>
            <TabsTrigger
              value="seo-checker"
              class="text-green hover:bg-green/20 data-[state=active]:bg-green/20 data-[state=active]:text-green w-full flex-0 cursor-pointer justify-start rounded-[3px] bg-none shadow-none hover:shadow-none data-[state=active]:shadow-none"
            >
              SEOチェック設定
            </TabsTrigger>
            <TabsTrigger
              value="delete"
              class="text-green hover:bg-green/20 data-[state=active]:bg-green/20 data-[state=active]:text-green w-full flex-0 cursor-pointer justify-start rounded-[3px] bg-none shadow-none hover:shadow-none data-[state=active]:shadow-none"
            >
              プロジェクト削除
            </TabsTrigger>
          </TabsList>
          <Separator orientation="vertical" class="border-border h-full" />
          <TabsContent value="crawler" class="flex flex-col gap-4">
            <div v-if="isLoading" class="space-y-4">
              <Skeleton class="h-6 w-32" />
              <Skeleton class="h-4 w-64" />
              <Skeleton class="h-10 w-40" />
            </div>

            <template v-else>
              <PageTitle
                title="クローラ設定"
                description="このプロジェクトのクローラ設定を行います。"
                size="medium"
              />
            </template>
          </TabsContent>
          <TabsContent value="seo-checker" class="flex flex-col gap-4">
            <div v-if="isLoading" class="space-y-4">
              <Skeleton class="h-6 w-32" />
              <Skeleton class="h-4 w-64" />
              <Skeleton class="h-10 w-40" />
            </div>

            <template v-else>
              <PageTitle
                title="SEOチェック設定"
                description="このプロジェクトのSEOチェック設定を行います。"
                size="medium"
              />
            </template>
          </TabsContent>
          <TabsContent value="delete" class="flex flex-col gap-4">
            <div v-if="isLoading" class="space-y-4">
              <Skeleton class="h-6 w-32" />
              <Skeleton class="h-4 w-64" />
              <Skeleton class="h-10 w-40" />
            </div>

            <template v-else>
              <PageTitle
                title="プロジェクト削除"
                description="このプロジェクトを削除すると、関連するすべてのデータが失われます。"
                size="medium"
              />

              <Button
                variant="destructive"
                class="w-fit"
                :disabled="isDeleting || !myProject"
                @click="deleteProject(route.params.id as string)"
              >
                <Icon name="mdi:delete" class="!size-4" />
                {{ isDeleting ? "削除中..." : "プロジェクトを削除" }}
              </Button>
            </template>
          </TabsContent>
        </Tabs>
      </TabsContent>
    </Tabs>
  </div>
</template>
