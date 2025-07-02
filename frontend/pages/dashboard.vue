<script setup lang="ts">
import { toTypedSchema } from "@vee-validate/zod";
import * as z from "zod";
import { toast } from "vue-sonner";

const config = useRuntimeConfig();
const route = useRoute();
const router = useRouter();
const client = useSupabaseClient();
const user = useSupabaseUser();
const siteUrl = ref<string>("");
const numberOfCrawlPage = ref<number>(10);
const errorMessage = ref<string | null>(null);
const isLoading = ref<boolean>(false);
const CRAWL_API_URL = config.public.crawlApiUrl || "http://localhost:8080";

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
      .min(1, "0以上の数値を入力してください"),
  }),
);

const onCrawlSubmit = async () => {
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
      // body: JSON.stringify({
      //   siteUrl: new URL(siteUrl.value).origin + "/",
      //   userId: user.value.id,
      //   numberOfCrawlPage: String(numberOfCrawlPage.value),
      // }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    setTimeout(async () => {
      // Reset form
      isLoading.value = false;
      siteUrl.value = "";
      // await getDataFromSupabase();

      // Show success toast
      toast({
        title: "サイトマップ作成リクエスト",
        description: "サイトマップ作成リクエストを受け付けました。",
        variant: "success",
      });
    }, 2000);
  } catch (error) {
    console.error("Crawling failed:", error);
    errorMessage.value =
      error instanceof Error ? error.message : "An unknown error occurred";

    // Reset form
    isLoading.value = false;

    toast({
      title: "サイトマップ作成リクエスト",
      description:
        "サイトマップ作成リクエストに失敗しました。再度お試しください。",
      variant: "destructive",
    });
  }
};

const requestCrawl = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  console.log(CRAWL_API_URL + "/create-crawl-data");

  // const { data, error } = await useFetch(`/api/request-crawl`);

  // if (error.value) {
  //   console.error("Crawl request failed:", error.value);
  //   errorMessage.value = error.value.message || "An unknown error occurred";
  //   isLoading.value = false;
  //   toast.error("サイトマップ作成リクエスト");
  //   return;
  // }

  // console.log("Crawl request successful:", data.value);
  // toast.success("サイトマップ作成リクエストを受け付けました。");

  try {
    const response = await fetch(`${CRAWL_API_URL}/create-crawl-data`, {
      method: "POST",
      credentials: "include",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      // body: JSON.stringify({
      //   siteUrl: new URL(siteUrl.value).origin + "/",
      //   userId: user.value.id,
      //   numberOfCrawlPage: String(numberOfCrawlPage.value),
      // }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    setTimeout(async () => {
      // Reset form
      isLoading.value = false;
      siteUrl.value = "";
      // await getDataFromSupabase();

      // Show success toast
      toast.success("サイトマップ作成リクエスト成功");
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
};
</script>

<template>
  <Button @click="requestCrawl"> クロール実行 </Button>

  <!-- <Form
    class="mx-auto flex max-w-md flex-col gap-8"
    :validation-schema="formSchema"
    @submit="onCrawlSubmit"
  >
    <FormField v-slot="{ componentField }" name="crawlUrl">
      <FormItem>
        <FormLabel>クロール対象URL</FormLabel>
        <FormControl>
          <Input
            v-bind="componentField"
            v-model="siteUrl"
            type="text"
            placeholder="https://example.com"
          />
        </FormControl>
        <FormDescription class="dark:text-white">
          サイトマップを作成するためのURLを入力してください。<br />
          <span class="text-[0.8rem]"
            >※クロール対象URLは同じURLが既にクロールされていないか確認してください。</span
          ><br />
          <span class="text-[0.8rem]"
            >※クロールは入力していただいたURLのトップページから開始いたします。</span
          >
        </FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="numberOfCrawlPage">
      <FormItem>
        <FormLabel>クロール数</FormLabel>
        <FormControl>
          <NumberField
            v-bind="componentField"
            v-model:model-value="numberOfCrawlPage"
            :default-value="numberOfCrawlPage"
            :min="0"
          >
            <NumberFieldContent>
              <NumberFieldDecrement />
              <NumberFieldInput />
              <NumberFieldIncrement />
            </NumberFieldContent>
          </NumberField>
        </FormControl>
        <FormDescription class="dark:text-white">
          クロールするページ数を入力してください。
        </FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>

    <Button type="submit">
      {{ isLoading ? "リクエスト中..." : "サイトマップ作成" }}
    </Button>
  </Form> -->
</template>
