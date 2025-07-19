<script setup lang="ts">
import { ref } from "vue";
import type { Node, Edge } from "@vue-flow/core";
import { VueFlow, Panel } from "@vue-flow/core";
import { MiniMap } from "@vue-flow/minimap";
import { Background } from "@vue-flow/background";
import type { CrawlResult } from "@/types/project";
import { toast } from "vue-sonner";

definePageMeta({
  middleware: "auth",
  layout: "default",
});

const nodes = ref<Node[]>([]);
const edges = ref<Edge[]>([]);
const route = useRoute();
const supabase = useSupabaseClient();
const myProjectCrawlResults = ref<CrawlResult | null>(null);

/**********************************
 * project helper functions
 **********************************/
async function fetchProjectDetails(id: string): Promise<CrawlResult | null> {
  try {
    const { data, error } = await supabase
      .from("crawl_results")
      .select("*")
      .eq("project_id", id)
      .eq("is_latest", true) // 最新のcrawl_resultsのみ
      .order("completed_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    return data && data.length > 0 ? (data[0] as CrawlResult) : null;
  } catch (error) {
    console.error("Error fetching project overview:", error);
    toast.error("プロジェクト情報の取得に失敗しました");
    return null;
  }
}

onMounted(async () => {
  // 1. fetch ProjectDetails
  const projectId = route.params.id as string;

  try {
    myProjectCrawlResults.value = await fetchProjectDetails(projectId);

    if (myProjectCrawlResults.value) {
      // json 形式のsitemap_dataをパース
      let parseSitemapData = null;

      parseSitemapData = JSON.parse(
        myProjectCrawlResults.value.sitemap_data || "{}",
      );

      // Initialize nodes and edges based on the crawl results
      nodes.value = parseSitemapData.nodes;
      edges.value = parseSitemapData.edges;
      console.log("nodes", nodes.value);
      console.log("edges", edges.value);
    }
  } catch (error) {
    console.error("Error fetching project details:", error);
    toast.error("プロジェクトの詳細情報の取得に失敗しました");
    return;
  }
});
</script>

<template>
  <ClientOnly>
    <VueFlow :nodes="nodes" :edges="edges">
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
      <Panel position="top-left"> </Panel>
      <MiniMap />
    </VueFlow>
  </ClientOnly>
</template>

<style>
/* import the necessary styles for Vue Flow to work */
@import "@vue-flow/core/dist/style.css";

/* import the default theme, this is optional but generally recommended */
@import "@vue-flow/core/dist/theme-default.css";
</style>
