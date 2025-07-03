<script setup lang="ts">
import { useForm } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import * as z from "zod";
import { toast } from "vue-sonner";
import type { Node, Edge } from "@vue-flow/core";
import { VueFlow } from "@vue-flow/core";

// these are our nodes
const nodes = ref<Node[]>([
  {
    id: "node-0",
    type: "default",
    position: {
      x: 0,
      y: 0,
    },
    data: {
      label: "Build your Component Library - shadcn/ui",
      url: "https://ui.shadcn.com/",
      title: "Build your Component Library - shadcn/ui",
      depth: 0,
    },
  },
  {
    id: "node-1",
    type: "default",
    position: {
      x: 600,
      y: 80,
    },
    data: {
      label: "Components - shadcn/ui",
      url: "https://ui.shadcn.com/docs/components",
      title: "Components - shadcn/ui",
      depth: 2,
    },
  },
  {
    id: "node-2",
    type: "default",
    position: {
      x: 600,
      y: 160,
    },
    data: {
      label: "Installation - shadcn/ui",
      url: "https://ui.shadcn.com/docs/installation",
      title: "Installation - shadcn/ui",
      depth: 2,
    },
  },
  {
    id: "node-3",
    type: "default",
    position: {
      x: 600,
      y: 240,
    },
    data: {
      label: "Beautiful Charts & Graphs - shadcn/ui",
      url: "https://ui.shadcn.com/charts/area",
      title: "Beautiful Charts & Graphs - shadcn/ui",
      depth: 2,
    },
  },
  {
    id: "node-4",
    type: "default",
    position: {
      x: 300,
      y: 320,
    },
    data: {
      label: "Building Blocks for the Web - shadcn/ui",
      url: "https://ui.shadcn.com/blocks",
      title: "Building Blocks for the Web - shadcn/ui",
      depth: 1,
    },
  },
  {
    id: "node-5",
    type: "default",
    position: {
      x: 300,
      y: 400,
    },
    data: {
      label: "Tailwind Colors in Every Format - shadcn/ui",
      url: "https://ui.shadcn.com/colors",
      title: "Tailwind Colors in Every Format - shadcn/ui",
      depth: 1,
    },
  },
  {
    id: "node-6",
    type: "default",
    position: {
      x: 300,
      y: 480,
    },
    data: {
      label: "Pick a Color. Make it yours. - shadcn/ui",
      url: "https://ui.shadcn.com/themes",
      title: "Pick a Color. Make it yours. - shadcn/ui",
      depth: 1,
    },
  },
  {
    id: "node-7",
    type: "default",
    position: {
      x: 600,
      y: 560,
    },
    data: {
      label: "Examples - shadcn/ui",
      url: "https://ui.shadcn.com/examples/dashboard",
      title: "Examples - shadcn/ui",
      depth: 2,
    },
  },
  {
    id: "node-8",
    type: "default",
    position: {
      x: 900,
      y: 640,
    },
    data: {
      label: "Calendar - shadcn/ui",
      url: "https://ui.shadcn.com/docs/components/calendar",
      title: "Calendar - shadcn/ui",
      depth: 3,
    },
  },
  {
    id: "node-9",
    type: "default",
    position: {
      x: 600,
      y: 720,
    },
    data: {
      label: "Tasks",
      url: "https://ui.shadcn.com/examples/tasks",
      title: "Tasks",
      depth: 2,
    },
  },
  {
    id: "node-10",
    type: "default",
    position: {
      x: 600,
      y: 800,
    },
    data: {
      label: "Playground",
      url: "https://ui.shadcn.com/examples/playground",
      title: "Playground",
      depth: 2,
    },
  },
  {
    id: "node-11",
    type: "default",
    position: {
      x: 600,
      y: 880,
    },
    data: {
      label: "Authentication",
      url: "https://ui.shadcn.com/examples/authentication",
      title: "Authentication",
      depth: 2,
    },
  },
  {
    id: "node-12",
    type: "default",
    position: {
      x: 300,
      y: 960,
    },
    data: {
      label: "Introduction - shadcn/ui",
      url: "https://ui.shadcn.com/docs",
      title: "Introduction - shadcn/ui",
      depth: 1,
    },
  },
]);

// these are our edges
const edges = ref<Edge[]>([
  {
    id: "edge-node-12-node-1",
    source: "node-12",
    target: "node-1",
    type: "default",
  },
  {
    id: "edge-node-12-node-2",
    source: "node-12",
    target: "node-2",
    type: "default",
  },
  {
    id: "edge-node-1-node-8",
    source: "node-1",
    target: "node-8",
    type: "default",
  },
]);

const config = useRuntimeConfig();
const route = useRoute();
const router = useRouter();
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const errorMessage = ref<string | null>(null);
const isLoading = ref<boolean>(false);
const CRAWL_API_URL = config.public.crawlApiUrl || "http://localhost:8080";
const crawlResult = ref<any>(null);

definePageMeta({
  middleware: "auth",
  layout: "default",
});

/************************************************
 * Form schema
 *************************************************/
const formSchema = toTypedSchema(
  z.object({
    crawlUrl: z
      .string({
        required_error: "URLを入力してください",
      })
      .url({
        message: "有効なURLを入力してください",
      }),
    numberOfCrawlPage: z
      .number({
        required_error: "クロール数を入力してください",
        invalid_type_error: "数値を入力してください",
      })
      .min(1, "1以上の数値を入力してください"),
  }),
);

const form = useForm({
  validationSchema: formSchema,
});

/************************************************
 * Submit handler for the crawl form
 *************************************************/
const onSubmit = form.handleSubmit(async (values) => {
  if (!user.value?.id) {
    errorMessage.value = "User not authenticated";
    return;
  }

  isLoading.value = true;
  errorMessage.value = null;

  try {
    const response = await fetch(`${CRAWL_API_URL}/create-crawl-data`, {
      method: "POST",
      credentials: "include",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        siteUrl: new URL(values.crawlUrl).origin + "/",
        userId: user.value?.id,
        numberOfCrawlPage: String(values.numberOfCrawlPage),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    setTimeout(async () => {
      // Reset form
      isLoading.value = false;

      // Show success toast
      toast.success("サイトマップ作成リクエスト成功");

      crawlResult.value = await response.json();
    }, 2000);
  } catch (error) {
    console.error("Crawling failed:", error);
    errorMessage.value =
      error instanceof Error ? error.message : "An unknown error occurred";

    // Reset form
    isLoading.value = false;
    toast.error(
      "サイトマップ作成リクエストに失敗しました。再度お試しください。",
    );
  }
});
</script>

<template>
  <div id="dashboard" class="grid w-full gap-8">
    <PageTitle
      title="ダッシュボード"
      description="サイトマップを作成するためのフォームです。"
      size="large"
    />

    <div class="grid w-full grid-cols-2 gap-8">
      <form @submit="onSubmit" class="w-full space-y-8">
        <FormField v-slot="{ componentField }" name="crawlUrl">
          <FormItem>
            <FormLabel>サイトURL</FormLabel>
            <FormControl>
              <Input
                type="text"
                placeholder="https://example.com"
                v-bind="componentField"
              />
            </FormControl>
            <FormDescription>
              クロールしたいサイトのURLを入力してください。例:
              https://example.com
            </FormDescription>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="numberOfCrawlPage">
          <FormItem>
            <FormLabel>クロール数</FormLabel>
            <FormControl>
              <Input type="number" placeholder="10" v-bind="componentField" />
            </FormControl>
            <FormDescription>
              クロールするページ数を入力してください。例: 10
            </FormDescription>
            <FormMessage />
          </FormItem>
        </FormField>

        <Button type="submit">
          <span v-if="isLoading">クロール中...</span>
          <span v-else>サイトマップ作成リクエスト</span>
        </Button>
      </form>

      <VueFlow :nodes="nodes" :edges="edges" class="h-full">
        <!-- bind your custom node type to a component by using slots, slot names are always `node-<type>` -->
        <template #node-special="specialNodeProps">
          <SpecialNode v-bind="specialNodeProps" />
        </template>

        <!-- bind your custom edge type to a component by using slots, slot names are always `edge-<type>` -->
        <template #edge-special="specialEdgeProps">
          <SpecialEdge v-bind="specialEdgeProps" />
        </template>
      </VueFlow>

      <div class="w-full rounded-lg border bg-gray-50 p-4">
        <pre v-if="crawlResult">
          {{ JSON.stringify(crawlResult, null, 2) }}
        </pre>
        <p v-else>クロール結果はここに表示されます。</p>
        <span v-if="errorMessage" class="text-red-500">
          {{ errorMessage }}
        </span>
      </div>
    </div>
  </div>
</template>

<style>
/* import the necessary styles for Vue Flow to work */
@import "@vue-flow/core/dist/style.css";

/* import the default theme, this is optional but generally recommended */
@import "@vue-flow/core/dist/theme-default.css";
</style>
