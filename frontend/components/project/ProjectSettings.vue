<script setup lang="ts">
import { toast } from "vue-sonner";
import type { MyProjects } from "@/types/project";
import BasicSetting from "@/components/project/settings/BasicSetting.vue";

const props = defineProps<{
  myProject: MyProjects | null;
}>();
const isDeleting = ref<boolean>(false);
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const route = useRoute();
const tabMenus = ref([
  {
    value: "project",
    label: "プロジェクト設定",
  },
  {
    value: "crawler",
    label: "クローラ設定",
  },
  {
    value: "seo-checker",
    label: "SEOチェック設定",
  },
  {
    value: "delete",
    label: "プロジェクト削除",
  },
]);

async function deleteProject(id: string) {
  if (!user.value) {
    console.error("ユーザーがログインしていません");
    toast.error("ユーザーがログインしていません");
    return;
  }

  try {
    isDeleting.value = true;

    // 段階的削除: 1. crawl_dataを分割して削除
    console.log("crawl_dataの削除を開始します...");
    await deleteCrawlDataInBatches(id);

    // 2. 関連テーブルを削除
    console.log("関連データの削除を開始します...");
    await deleteRelatedData(id);

    // 3. 最後にprojectsテーブルから削除
    console.log("プロジェクトの削除を開始します...");
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

async function deleteCrawlDataInBatches(projectId: string) {
  const batchSize = 100;
  let deletedCount = 0;

  while (true) {
    // プロジェクトに紐づくcrawl_results_idを取得
    const { data: crawlResults, error: crawlResultsError } = await supabase
      .from("crawl_results")
      .select("id")
      .eq("project_id", projectId);

    if (crawlResultsError) throw crawlResultsError;
    if (!crawlResults || crawlResults.length === 0) break;

    const crawlResultIds = crawlResults.map((r: any) => r.id);

    // crawl_dataをバッチ削除
    const { data: crawlDataBatch, error: fetchError } = await supabase
      .from("crawl_data")
      .select("id")
      .in("crawl_results_id", crawlResultIds)
      .limit(batchSize);

    if (fetchError) throw fetchError;
    if (!crawlDataBatch || crawlDataBatch.length === 0) break;

    const idsToDelete = crawlDataBatch.map((item: any) => item.id);
    const { error: deleteError } = await supabase
      .from("crawl_data")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) throw deleteError;

    deletedCount += crawlDataBatch.length;
    console.log(`crawl_data ${deletedCount}件削除完了`);

    // APIレート制限対策
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async function deleteRelatedData(projectId: string) {
  // seo_check_jobsを削除
  const { error: seoJobsError } = await supabase
    .from("seo_check_jobs")
    .delete()
    .eq("project_id", projectId);

  if (seoJobsError) throw seoJobsError;

  // crawl_jobsを削除
  const { error: crawlJobsError } = await supabase
    .from("crawl_jobs")
    .delete()
    .eq("project_id", projectId);

  if (crawlJobsError) throw crawlJobsError;

  // crawl_resultsを削除
  const { error: crawlResultsError } = await supabase
    .from("crawl_results")
    .delete()
    .eq("project_id", projectId);

  if (crawlResultsError) throw crawlResultsError;
}
</script>

<template>
  <Tabs
    default-value="project"
    class="h-full flex-row gap-12"
    orientation="vertical"
  >
    <TabsList
      class="bg-background relative w-full max-w-[200px] flex-col justify-start rounded-none border-none p-0"
    >
      <TabsTrigger
        v-for="menu in tabMenus"
        :key="menu.value"
        :value="menu.value"
        class="text-green hover:bg-green/20 data-[state=active]:bg-green/20 data-[state=active]:text-green w-full flex-0 cursor-pointer justify-start rounded-[3px] bg-none shadow-none hover:shadow-none data-[state=active]:shadow-none"
      >
        {{ menu.label }}
      </TabsTrigger>
    </TabsList>
    <Separator orientation="vertical" class="border-border h-full" />
    <TabsContent value="project" class="flex flex-col gap-8">
      <BasicSetting :myProject="props.myProject" />
    </TabsContent>
    <TabsContent value="crawler" class="flex flex-col gap-8">
      <PageTitle
        title="クローラ設定"
        description="このプロジェクトのクローラ設定を行います。"
        size="medium"
      />
    </TabsContent>
    <TabsContent value="seo-checker" class="flex flex-col gap-8">
      <PageTitle
        title="SEOチェック設定"
        description="このプロジェクトのSEOチェック設定を行います。"
        size="medium"
      />
    </TabsContent>
    <TabsContent value="delete" class="flex flex-col gap-8">
      <PageTitle
        title="プロジェクト削除"
        description="このプロジェクトを削除すると、関連するすべてのデータが失われます。"
        size="medium"
      />

      <Button
        variant="destructive"
        class="w-fit"
        :disabled="isDeleting || !props.myProject"
        @click="deleteProject(route.params.id as string)"
      >
        <Icon name="mdi:delete" class="!size-4" />
        {{ isDeleting ? "削除中..." : "プロジェクトを削除" }}
      </Button>
    </TabsContent>
  </Tabs>
</template>
