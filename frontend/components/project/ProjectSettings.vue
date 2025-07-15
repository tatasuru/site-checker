<script setup lang="ts">
import { toast } from "vue-sonner";
import type { MyProjects } from "@/types/project";
import BasicSetting from "@/components/project/settings/BasicSetting.vue";

const props = defineProps<{
  myProject: MyProjects | null;
}>();
const isDeleting = ref<boolean>(false);
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const route = useRoute();
const tabMenus = ref([
  {
    value: "project",
    label: "プロジェクト設定",
  },
  {
    value: "crawler",
    label: "クローラ設定",
  },
  {
    value: "seo-checker",
    label: "SEOチェック設定",
  },
  {
    value: "delete",
    label: "プロジェクト削除",
  },
]);

async function deleteProject(id: string) {
  if (!user.value) {
    console.error("ユーザーがログインしていません");
    toast.error("ユーザーがログインしていません");
    return;
  }

  try {
    isDeleting.value = true;

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id)
      .eq("user_id", user.value.id);

    if (error) throw error;

    toast.success("削除に成功しました");
    console.log("削除に成功しました");
    await navigateTo("/projects");
  } catch (error) {
    toast.error("削除に失敗しました。もう一度お試しください。");
    console.error("削除に失敗しました:", error);
  } finally {
    isDeleting.value = false;
  }
}
</script>

<template>
  <Tabs
    default-value="project"
    class="h-full flex-row gap-12"
    orientation="vertical"
  >
    <TabsList
      class="bg-background relative w-full max-w-[200px] flex-col justify-start rounded-none border-none p-0"
    >
      <TabsTrigger
        v-for="menu in tabMenus"
        :key="menu.value"
        :value="menu.value"
        class="text-green hover:bg-green/20 data-[state=active]:bg-green/20 data-[state=active]:text-green w-full flex-0 cursor-pointer justify-start rounded-[3px] bg-none shadow-none hover:shadow-none data-[state=active]:shadow-none"
      >
        {{ menu.label }}
      </TabsTrigger>
    </TabsList>
    <Separator orientation="vertical" class="border-border h-full" />
    <TabsContent value="project" class="flex flex-col gap-8">
      <BasicSetting :myProject="props.myProject" />
    </TabsContent>
    <TabsContent value="crawler" class="flex flex-col gap-8">
      <PageTitle
        title="クローラ設定"
        description="このプロジェクトのクローラ設定を行います。"
        size="medium"
      />
    </TabsContent>
    <TabsContent value="seo-checker" class="flex flex-col gap-8">
      <PageTitle
        title="SEOチェック設定"
        description="このプロジェクトのSEOチェック設定を行います。"
        size="medium"
      />
    </TabsContent>
    <TabsContent value="delete" class="flex flex-col gap-8">
      <PageTitle
        title="プロジェクト削除"
        description="このプロジェクトを削除すると、関連するすべてのデータが失われます。"
        size="medium"
      />

      <Button
        variant="destructive"
        class="w-fit"
        :disabled="isDeleting || !props.myProject"
        @click="deleteProject(route.params.id as string)"
      >
        <Icon name="mdi:delete" class="!size-4" />
        {{ isDeleting ? "削除中..." : "プロジェクトを削除" }}
      </Button>
    </TabsContent>
  </Tabs>
</template>
