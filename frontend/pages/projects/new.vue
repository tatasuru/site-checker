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
const isSubmitting = ref<boolean>(false);

definePageMeta({
  middleware: "auth",
  layout: "default",
});

type formValues = {
  name: string;
  description?: string;
  crawlUrl: string;
  numberOfCrawlPage: number;
};

const stepIndex = ref<number>(1);
const steps = [
  {
    step: 1,
    title: "基本設定",
    description: "サイト名とチェック起点URLを入力してください",
    required: true,
  },
  {
    step: 2,
    title: "詳細設定",
    description: "クロールするページ数や除外URLを設定します",
    required: true,
  },
];

/************************************************
 * Form schema
 *************************************************/
const formSchema = [
  z.object({
    name: z
      .string({
        required_error: "サイト名を入力してください",
      })
      .min(1, "サイト名は1文字以上で入力してください")
      .max(100, "サイト名は100文字以下で入力してください"),
    crawlUrl: z
      .string({
        required_error: "URLを入力してください",
      })
      .url({
        message: "有効なURLを入力してください",
      }),
    description: z
      .string({
        required_error: "サイトの説明を入力してください",
      })
      .optional(),
  }),
  z.object({
    numberOfCrawlPage: z.number({
      required_error: "契約しているページ数内で入力してください",
    }),
  }),
];

/************************************************
 * Submit handler for the crawl form
 *************************************************/
const onSubmit = async (values: formValues) => {
  isSubmitting.value = true;

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
        userId: user.value?.id,
        name: values.name,
        description: values.description || "",
        siteUrl: new URL(values.crawlUrl).origin + "/",
        numberOfCrawlPage: String(values.numberOfCrawlPage),
      }),
    });

    if (!response.ok) {
      isSubmitting.value = false;
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    setTimeout(async () => {
      // Reset form
      isLoading.value = false;
      isSubmitting.value = false;

      // Show success toast
      toast.success("サイトマップ作成リクエスト成功");
      await navigateTo("/projects");
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
  <div
    id="create-project"
    class="grid h-full w-full grid-rows-[auto_1fr] gap-8"
  >
    <div class="flex items-center justify-between">
      <PageTitle
        title="新規サイト登録"
        description="品質チェックするサイトを登録します。"
        size="large"
      />

      <Button as-child variant="link">
        <NuxtLink to="/projects" class="flex items-center gap-2">
          <Icon name="mdi-arrow-left" />
          サイト一覧へ戻る
        </NuxtLink>
      </Button>
    </div>

    <div class="flex-1">
      <div class="flex h-full w-full items-start gap-12">
        <Stepper
          v-model="stepIndex"
          orientation="vertical"
          class="mx-auto flex w-fit max-w-[300px] min-w-[200px] flex-col justify-start gap-10 p-2"
        >
          <template v-for="step in steps" :key="step.step">
            <StepperItem
              v-slot="{ state }"
              class="relative flex w-full items-center gap-4"
              :step="step.step"
            >
              <StepperSeparator
                v-if="step.step !== steps[steps.length - 1].step"
                class="bg-muted group-data-[state=completed]:bg-green absolute top-[38px] left-[11px] block h-[107%] w-0.5 shrink-0 rounded-full"
              />

              <StepperTrigger as-child>
                <Button
                  :variant="
                    state === 'completed' || state === 'active'
                      ? 'main'
                      : 'outline'
                  "
                  size="icon"
                  class="z-10 size-6 shrink-0 rounded-full"
                  :class="[
                    state === 'active' &&
                      'ring-green ring-offset-background ring-2 ring-offset-2',
                  ]"
                  :disabled="state === 'inactive'"
                >
                  <Icon
                    v-if="state === 'completed'"
                    name="mdi-check"
                    class="size-4"
                  />
                  <Icon
                    v-else-if="state === 'active'"
                    name="mdi-circle"
                    class="size-4"
                  />
                  <Icon
                    v-else
                    name="mdi-circle-outline"
                    class="text-muted-foreground size-4"
                  />
                </Button>
              </StepperTrigger>

              <div class="flex shrink-0 flex-col gap-1">
                <StepperTitle
                  :class="[state === 'active' && 'text-primary']"
                  class="text-muted-foreground flex items-center gap-2 text-xs font-semibold transition lg:text-xs"
                >
                  STEP.{{ step.step }}
                  <Badge
                    v-if="!step.required"
                    variant="secondary"
                    class="rounded-full text-xs"
                  >
                    {{ !step.required && "オプション" }}
                  </Badge>
                </StepperTitle>
                <StepperDescription
                  :class="[state === 'active' && 'text-primary']"
                  class="sr-only text-sm transition md:not-sr-only lg:text-sm"
                >
                  {{ step.title }}
                </StepperDescription>
              </div>
            </StepperItem>
          </template>
        </Stepper>

        <Separator orientation="vertical" class="h-full" />

        <Form
          v-slot="{ meta, values, validate }"
          as=""
          keep-values
          :validation-schema="toTypedSchema(formSchema[stepIndex - 1])"
        >
          <form
            @submit="
              (e) => {
                e.preventDefault();
                validate();

                // console.log('Form values:', values);

                if (stepIndex === steps.length && meta.valid) {
                  console.log('Form values:', values);
                  // TODO: fix type error
                  onSubmit(values as any);
                }
              }
            "
            class="flex h-full w-full flex-col justify-between p-2"
          >
            <div class="flex flex-col gap-8">
              <PageTitle
                :title="`STEP.${stepIndex} - ${steps[stepIndex - 1].title}`"
                :description="steps[stepIndex - 1].description"
                size="small"
              />

              <template v-if="stepIndex === 1">
                <FormField v-slot="{ componentField }" name="name">
                  <FormItem>
                    <FormLabel>プロジェクト名</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="例: 自社コーポレートサイト"
                        v-bind="componentField"
                      />
                    </FormControl>
                    <FormDescription>
                      サイトを管理するためのプロジェクト名を入力してください。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                </FormField>

                <FormField v-slot="{ componentField }" name="description">
                  <FormItem>
                    <FormLabel
                      >プロジェクトの説明
                      <Badge
                        variant="secondary"
                        class="ml-1 rounded-full text-xs"
                      >
                        オプション
                      </Badge>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="例: 自社コーポレートサイトの品質チェック"
                        v-bind="componentField"
                      />
                    </FormControl>
                    <FormDescription>
                      どんなサイトをチェックするか、どんなプロジェクトかを簡単に説明してください。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                </FormField>

                <FormField v-slot="{ componentField }" name="crawlUrl">
                  <FormItem>
                    <FormLabel>チェック起点URL</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="https://example.com"
                        v-bind="componentField"
                      />
                    </FormControl>
                    <FormDescription>
                      サイトチェックを開始するURLを入力してください。例:
                      https://example.com <br />
                      その配下全てをチェックします。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </template>

              <template v-if="stepIndex === 2">
                <FormField v-slot="{ componentField }" name="numberOfCrawlPage">
                  <FormItem>
                    <FormLabel>割り当てページ数</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="10"
                        v-bind="componentField"
                      />
                    </FormControl>
                    <FormDescription>
                      チェックを行うページ数を契約しているページ数内で入力してください。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </template>
            </div>

            <div class="mt-4 flex items-center justify-between">
              <Button
                :disabled="stepIndex === 1"
                variant="outline"
                size="sm"
                @click="stepIndex--"
                class="cursor-pointer"
              >
                もどる
              </Button>
              <div class="flex items-center gap-3">
                <Button
                  v-if="stepIndex !== steps.length"
                  :type="meta.valid ? 'button' : 'submit'"
                  size="sm"
                  :variant="'main'"
                  @click="
                    () => {
                      if (meta.valid) stepIndex++;
                    }
                  "
                  class="cursor-pointer"
                >
                  次へ
                </Button>
                <Button
                  v-if="stepIndex === steps.length"
                  size="sm"
                  type="submit"
                  class="gradient-bg cursor-pointer"
                  :disabled="!meta.valid || isSubmitting"
                >
                  {{ isSubmitting ? "登録中..." : "プロジェクトを登録する" }}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  </div>
</template>
