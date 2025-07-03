<script setup lang="ts">
const isLoading = ref<boolean>(false);
const supabase = useSupabaseClient();
const user = useSupabaseUser();

interface MySite {
  id: string;
  user_id: string;
  site_name: string;
  site_url: string;
  crawl_data: string; // JSON string
  sitemap_data: string; // JSON string
  number_of_crawl_page: number;
  created_at: string;
}

definePageMeta({
  middleware: "auth",
  layout: "default",
});

const { data: mySiteList } = await useAsyncData<MySite[]>(
  "mySiteList",
  async () => {
    if (!user.value?.id) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("crawl_results")
        .select("*")
        .eq("user_id", user.value?.id)
        .limit(100);

      if (error) throw new Error(error.message);
      return data;
    } catch (error) {
      console.error("Error fetching form templates:", error);
      return [];
    }
  },
);
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

    <div class="grid grid-cols-[repeat(auto-fill,minmax(400px,1fr))] gap-6">
      <Card v-for="site in mySiteList" :key="site.id" class="gap-2 py-4">
        <CardHeader class="px-4">
          <CardTitle class="flex items-center justify-between">
            <NuxtLink
              :to="`/sites/${site.id}/details`"
              class="w-full hover:underline hover:opacity-80"
            >
              {{ site.site_name }}
            </NuxtLink>
            <Badge
              v-if="site.crawl_data"
              variant="outline"
              class="gap-1 rounded-full"
            >
              <Icon name="mdi:globe" class="!size-3" />
              チェック完了
            </Badge>
          </CardTitle>
          <CardDescription>
            <NuxtLink
              :to="site.site_url"
              target="_blank"
              class="hover:underline hover:opacity-80"
            >
              {{ site.site_url }}
            </NuxtLink>
          </CardDescription>
        </CardHeader>
        <CardFooter class="flex-col gap-4 px-4">
          <div class="flex w-full items-center gap-4">
            <div class="flex items-center gap-1">
              <Icon
                name="mdi:clock-outline"
                class="text-muted-foreground !size-4"
              />
              <span class="text-muted-foreground text-sm">
                最終チェック:
                {{ new Date(site.created_at).toLocaleDateString() }}
              </span>
            </div>
            <div class="flex items-center gap-1">
              <Icon
                name="mdi:file-document-outline"
                class="text-muted-foreground !size-4"
              />
              <span class="text-muted-foreground text-sm">
                ページ数: {{ site.number_of_crawl_page }}
              </span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
