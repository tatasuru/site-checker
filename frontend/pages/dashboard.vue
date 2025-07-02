<script setup lang="ts">
import { useForm } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import * as z from "zod";
import { toast } from "vue-sonner";

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
