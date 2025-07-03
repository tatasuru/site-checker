<script setup lang="ts">
import { toast } from "vue-sonner";

definePageMeta({
  middleware: "auth",
  layout: "default",
});

const supabase = useSupabaseClient();
const user = useSupabaseUser();

async function deleteCrawlResult(id: string) {
  if (!user.value) {
    console.error("ユーザーがログインしていません");
    return;
  }

  const { error } = await supabase
    .from("crawl_results")
    .delete()
    .eq("id", id)
    .eq("user_id", user.value?.id);

  if (error) {
    toast.error("削除に失敗しました。もう一度お試しください。");
    console.error("削除に失敗しました:", error);
  } else {
    toast.success("削除に成功しました");
    console.log("削除に成功しました");

    navigateTo("/sites");
  }
}
</script>

<template>
  <div id="dashboard" class="grid w-full gap-8">
    <div class="flex items-center justify-between">
      <PageTitle
        title="サイト詳細"
        description="サイトの詳細情報を表示します。"
        size="large"
      />
      <Button as-child>
        <NuxtLink to="/sites" class="flex items-center gap-2">
          <Icon name="mdi-arrow-left" />
          サイト一覧へ戻る
        </NuxtLink>
      </Button>
    </div>

    <Button
      variant="destructive"
      class="w-fit"
      @click="deleteCrawlResult($route.params.id as string)"
    >
      <Icon name="mdi-close" />
      削除する
    </Button>
  </div>
</template>
