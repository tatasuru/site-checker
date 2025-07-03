<script setup lang="ts">
const isLoading = ref<boolean>(false);

definePageMeta({
  middleware: "auth",
  layout: "default",
});
</script>

<template>
  <div id="dashboard" class="grid w-full gap-8">
    <div class="flex items-center justify-between">
      <PageTitle
        title="サイト一覧"
        description="登録したサイトの情報を表示します。"
        size="large"
      />
      <Button as-child>
        <NuxtLink to="/sites/new" class="flex items-center gap-2">
          <Icon name="mdi-plus" />
          新規登録
        </NuxtLink>
      </Button>
    </div>

    <div class="grid w-full grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
      <Card class="pt-0">
        <div class="relative h-56 w-full rounded-xl">
          <NuxtImg
            src="/dummy-image.png"
            alt="サイトチェック"
            class="h-full w-full rounded-t-xl"
          />
        </div>
        <CardHeader class="px-4">
          <CardTitle>サイトのプロジェクト名</CardTitle>
          <CardDescription> https://example.com </CardDescription>
        </CardHeader>
        <CardFooter class="flex-col gap-4 px-4">
          <div class="flex w-full items-center gap-4">
            <div class="flex items-center gap-1">
              <Icon
                name="mdi:clock-outline"
                class="text-muted-foreground !size-4"
              />
              <span class="text-muted-foreground text-sm">
                最終チェック: 2025年1月1日
              </span>
            </div>
            <div class="flex items-center gap-1">
              <Icon
                name="mdi:file-document-outline"
                class="text-muted-foreground !size-4"
              />
              <span class="text-muted-foreground text-sm"> ページ数: 100 </span>
            </div>
          </div>

          <Button class="w-full" :loading="isLoading" as-child>
            <NuxtLink to="/sites/1/details" class="w-full">
              詳細を見る
            </NuxtLink>
          </Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
