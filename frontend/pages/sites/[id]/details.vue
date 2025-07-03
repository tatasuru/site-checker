<script setup lang="ts">
definePageMeta({
  middleware: "auth",
  layout: "default",
});
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
  </div>
</template>
