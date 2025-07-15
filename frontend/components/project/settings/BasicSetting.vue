<script setup lang="ts">
import { toTypedSchema } from "@vee-validate/zod";
import { useForm } from "vee-validate";
import * as z from "zod";
import type { MyProjects } from "@/types/project";
import { toast } from "vue-sonner";

type FormValues = {
  name: string;
  description?: string;
};

const props = defineProps<{
  myProject: MyProjects | null;
}>();
// TODO: Supabaseのクライアントを適切にインポート
const supabase = useSupabaseClient<any>();
const isSubmitting = ref<boolean>(false);

/***************************
 * Form validation schema
 ***************************/
const formSchema = toTypedSchema(
  z.object({
    name: z
      .string({
        required_error: "サイト名を入力してください",
      })
      .min(1, "サイト名は1文字以上で入力してください")
      .max(100, "サイト名は100文字以下で入力してください"),
    description: z
      .string({
        required_error: "サイトの説明を入力してください",
      })
      .optional(),
  }),
);

const form = useForm({
  validationSchema: formSchema,
});

/***************************
 * Functions
 ***************************/
const onSubmit = form.handleSubmit(async (values) => {
  try {
    isSubmitting.value = true;

    const result = await updateProject(values);
    toast.success("プロジェクトの設定を保存しました");

    setTimeout(() => {
      isSubmitting.value = false;
    }, 1000);
  } catch (error) {
    console.error("プロジェクトの設定保存に失敗:", error);
    toast.error("プロジェクトの設定保存に失敗しました");
    isSubmitting.value = false;
  }
});

async function updateProject(values: FormValues) {
  if (!props.myProject) {
    console.error("プロジェクトが選択されていません");
    return;
  }

  const updateData = {
    name: values.name,
    description: values.description || "",
  };

  const { data, error } = await supabase
    .from("projects")
    .update(updateData)
    .eq("id", props.myProject.id)
    .select()
    .single();

  if (error) {
    console.error("プロジェクトの更新に失敗しました:", error);
  } else {
    console.log("プロジェクトの更新に成功しました:", data);
    return data;
  }
}

/***************************
 * Lifecycle hooks
 ***************************/
onMounted(() => {
  if (props.myProject) {
    form.setValues({
      name: props.myProject.name,
      description: props.myProject.description,
    });
  }
});
</script>

<template>
  <PageTitle
    title="プロジェクト設定"
    description="このプロジェクトの設定を行います。"
    size="medium"
  />

  <form @submit="onSubmit" class="flex flex-col gap-8">
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
          <Badge variant="secondary" class="ml-1 rounded-full text-xs">
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
    <Button
      type="submit"
      class="w-fit"
      variant="main"
      :class="isSubmitting ? 'cursor-not-allowed opacity-50' : ''"
      :disabled="isSubmitting"
    >
      <template v-if="isSubmitting">
        <Icon name="mdi:loading" class="!size-4 animate-spin" />
        保存中...
      </template>
      <span v-else>保存する</span></Button
    >
  </form>
</template>
