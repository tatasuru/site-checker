<script setup lang="ts">
import { ref } from "vue";
import type { Node, Edge } from "@vue-flow/core";
import { VueFlow, Panel, useVueFlow } from "@vue-flow/core";
import { MiniMap } from "@vue-flow/minimap";
import { Background } from "@vue-flow/background";
import type { CrawlResult, MyProjects } from "@/types/project";
import { toast } from "vue-sonner";

definePageMeta({
  middleware: "auth",
  layout: "default",
});

const nodes = ref<Node[]>([]);
const edges = ref<Edge[]>([]);
const route = useRoute();
const supabase = useSupabaseClient();
const myProject = ref<MyProjects | null>(null);
const myProjectCrawlResults = ref<CrawlResult | null>(null);
const { setCenter } = useVueFlow();
const isLoading = ref<boolean>(true);

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
        completed_at,
        sitemap_data
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

onMounted(async () => {
  // 1. fetch ProjectCrawlResults
  const projectId = route.params.id as string;

  try {
    myProject.value = await fetchProjectDetails(projectId);
    console.log("myProject.value", myProject.value);

    if (!myProject.value) {
      toast.error("プロジェクトが見つかりません");
      return;
    }

    myProjectCrawlResults.value = myProject.value.crawl_results?.[0] || null;

    if (myProjectCrawlResults.value) {
      // 1.json 形式のsitemap_dataをパース
      let parseSitemapData = null;
      parseSitemapData = JSON.parse(
        myProjectCrawlResults.value.sitemap_data || "{}",
      );

      // 2. VueFlowのノードとエッジを設定
      nodes.value = parseSitemapData.nodes;
      edges.value = parseSitemapData.edges;

      // 3. VueFlowの初期化
      setCenter(
        parseSitemapData.nodes[0].position.x + 125 || 0,
        parseSitemapData.nodes[0].position.y + 225 || 0,
        {
          zoom: parseSitemapData.zoom || 1,
          duration: 1000,
        },
      );
    }

    isLoading.value = false;
  } catch (error) {
    console.error("Error fetching project details:", error);
    toast.error("プロジェクトの詳細情報の取得に失敗しました");
    isLoading.value = false;
    return;
  }
});
</script>

<template>
  <div class="flex h-full w-full flex-col gap-4">
    <Button as-child variant="link" class="px-0">
      <NuxtLink
        :to="`/projects/${route.params.id}/details`"
        class="flex w-fit items-center gap-2"
      >
        <Icon name="mdi-arrow-left" />
        プロジェクト詳細へ戻る
      </NuxtLink>
    </Button>

    <!--  TODO: Canvasでやってみるのはいかが？ -->
    <ClientOnly>
      <VueFlow
        :nodes="nodes"
        :edges="edges"
        class="border-border rounded-lg border-1 border-dashed"
      >
        <template #node-custom="customNodeProps">
          <VueFlowNode
            :id="customNodeProps.id"
            :data="customNodeProps.data"
            :position="customNodeProps.position"
          />
        </template>

        <template #edge-custom="customEdgeProps">
          <VueFlowEdge v-bind="customEdgeProps" />
        </template>

        <Background pattern-color="#aaa" :gap="16" />
        <Panel
          position="top-left"
          class="rounded-md bg-gradient-to-tr from-gray-100/50 to-gray-200/50 px-6 py-4 dark:from-gray-900/50 dark:to-transparent"
        >
          <div v-if="isLoading" class="flex flex-col gap-2">
            <Skeleton class="h-6 w-64" />
            <Skeleton class="h-3 w-48" />
          </div>
          <PageTitle
            v-else
            :title="myProject?.name || 'プロジェクトが見つかりません'"
            :description="
              myProject?.description || 'プロジェクトの説明がありません'
            "
            size="small"
          />
        </Panel>
        <MiniMap />
      </VueFlow>
    </ClientOnly>
  </div>
</template>

<style>
/* import the necessary styles for Vue Flow to work */
@import "@vue-flow/core/dist/style.css";

/* import the default theme, this is optional but generally recommended */
@import "@vue-flow/core/dist/theme-default.css";
</style>
