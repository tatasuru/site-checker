<script setup lang="ts">
import { toast } from "vue-sonner";

definePageMeta({
  middleware: "auth",
  layout: "default",
});

interface MyProject {
  project_id: string;
  user_id: string;
  project_name: string;
  site_url: string;
  description?: string;
  crawl_frequency: "manual" | "daily" | "weekly" | "monthly";
  max_pages: number;
  is_active: boolean;
  project_created_at: string;
  project_updated_at: string;
  latest_crawl_id?: string;
  latest_status?: string;
  latest_page_count?: number;
  latest_completed_at?: string;
  latest_progress: number;
  total_crawls: number;
  successful_crawls: number;
  last_7_days_crawls: number;
  latest_total_issues: number;
  latest_critical_issues: number;
  latest_broken_links: number;
  latest_duplicate_titles: number;
  created_at: string;
  updated_at: string;
}

const supabase = useSupabaseClient();
const user = useSupabaseUser();
const route = useRoute();
const progress = ref<number>(0);
const isLoading = ref<boolean>(false);
const myProject = ref<MyProject | null>(null);

/**********************************
 * fetch project overview
 **********************************/
const cardContents = computed(() => [
  {
    title: "チェック対象URL",
    icon: "mdi:attachment",
    description: myProject.value?.site_url || "URLが設定されていません",
    buttonLabel: "サイトチェック設定へ",
    buttonLink: `/sites/${myProject.value?.project_id}/settings`,
  },
  {
    title: "チェックステータス",
    icon: getCheckStatusIcon(myProject.value?.latest_status || "unknown"),
    description: myProject.value?.latest_status
      ? translateStatus(myProject.value.latest_status)
      : "ステータスが設定されていません",
    buttonLabel: "サイトチェック設定へ",
    buttonLink: `/sites/${myProject.value?.project_id}/settings`,
  },
  {
    title: "チェックページ数",
    icon: "mdi:book-open-page-variant",
    description: myProject.value?.latest_page_count
      ? `${myProject.value.latest_page_count} ページ`
      : "ページ数が設定されていません",
    buttonLabel: "サイトチェック設定へ",
    buttonLink: `/sites/${myProject.value?.project_id}/settings`,
  },
  {
    title: "最新のチェック日時",
    icon: "mdi:clock",
    description: myProject.value?.latest_completed_at
      ? new Date(myProject.value.latest_completed_at).toLocaleString("ja-JP", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "まだチェックが実行されていません",
    buttonLabel: "サイトチェック設定へ",
    buttonLink: `/sites/${myProject.value?.project_id}/settings`,
  },
]);

/**********************************
 * utility functions
 **********************************/
function translateStatus(status: string): string {
  switch (status) {
    case "waiting":
      return "待機中";
    case "processing":
      return "処理中";
    case "completed":
      return "正常終了";
    case "failed":
      return "失敗";
    default:
      return "不明";
  }
}

function getCheckStatusIcon(status: string): string {
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

/**********************************
 * project helper functions
 **********************************/
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

    navigateTo("/projects");
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

  return data && data.length > 0 ? (data[0] as MyProject) : null;
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
  myProject.value = await fetchProjectOverview(route.params.id as string);
  isLoading.value = false;

  // Set up subscription after user is confirmed
  subscription = supabase
    .channel("custom-update-channel")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "project_overview",
        filter: `project_id=eq.${route.params.id}`,
      },
      async (payload) => {
        if (user.value) {
          myProject.value = await fetchProjectOverview(
            route.params.id as string,
          );
          console.log("Project overview updated:", payload);
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
  <div id="project-detail" class="grid w-full gap-8">
    <div class="flex flex-col gap-4">
      <Button as-child variant="link" class="px-0">
        <NuxtLink to="/projects" class="flex w-fit items-center gap-2">
          <Icon name="mdi-arrow-left" />
          サイト一覧へ戻る
        </NuxtLink>
      </Button>

      <div class="flex items-start justify-between">
        <PageTitle
          :title="`${myProject?.project_name || '読み込み中...'}`"
          :description="`${myProject?.description || 'サイトの説明がありません。'}`"
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

    <Tabs default-value="overview" class="w-full gap-4">
      <TabsList
        class="bg-background border-border relative w-full justify-start rounded-none border-b p-0"
      >
        <TabsTrigger
          value="overview"
          class="data-[state=active]:border-b-green -mb-1 w-fit flex-0 cursor-pointer rounded-none border-t-0 border-r-0 border-b-0 border-l-0 shadow-none hover:shadow-none data-[state=active]:relative data-[state=active]:z-10 data-[state=active]:border-b-2 data-[state=active]:shadow-none"
        >
          <Icon name="mdi:information-outline" class="!size-4" />
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
      <TabsContent value="overview" class="w-full">
        <div
          class="grid w-full grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4"
        >
          <Card
            v-for="(card, index) in cardContents"
            :key="index"
            class="gap-4 py-4"
          >
            <CardHeader class="flex flex-row items-start justify-between px-4">
              <div class="flex flex-col gap-1">
                <CardTitle class="text-muted-foreground text-sm">
                  {{ card.title }}
                </CardTitle>
              </div>
              <Icon
                :name="card.icon"
                :class="[
                  '!size-5',
                  getStatusColor(myProject?.latest_status || 'unknown'),
                  {
                    'animate-spin':
                      myProject?.latest_status === 'processing' &&
                      card.title === 'チェックステータス',
                  },
                ]"
              />
            </CardHeader>
            <CardContent class="px-4">
              <p class="text-green text-base font-semibold tracking-wider">
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
                  <Icon name="mdi-arrow-right" class="inline-block !size-4" />
                </NuxtLink>
              </Button>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
      <TabsContent value="quality"> Change your password here. </TabsContent>
      <TabsContent value="settings">
        <Button
          variant="destructive"
          class="w-fit"
          @click="deleteProject(myProject?.project_id || '')"
        >
          プロジェクトを削除
        </Button>
      </TabsContent>
    </Tabs>
  </div>
</template>
