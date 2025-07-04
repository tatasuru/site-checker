<script setup lang="ts">
import { useSidebarStore } from "@/stores/sidebar";
const sidebarStore = useSidebarStore();

// Menu items.
const items = [
  {
    title: "プロジェクト一覧",
    url: "/projects",
    icon: "mdi:view-list",
  },
];

const actions = [
  {
    title: "新規プロジェクトを作成",
    url: "/projects/new",
    icon: "mdi:plus",
  },
];

const route = useRoute();
const isActive = (url: string) => {
  return (
    route.path.includes(url) ||
    (url === "/" && route.path === "/dashboard") ||
    (url.includes("/settings") && route.path.startsWith("/settings"))
  );
};
</script>

<template>
  <Sidebar collapsible="icon" :open="sidebarStore.isSidebarOpen">
    <SidebarHeader
      class="flex flex-row items-center gap-2"
      data-slot="sidebar-header"
      data-sidebar="header"
    >
      <div
        class="border-purple gradient-bg flex size-7 shrink-0 items-center justify-between rounded-full text-white"
      >
        <span class="w-full text-center text-[10px]">SC</span>
      </div>
      <span
        v-if="sidebarStore.isSidebarOpen"
        class="gradient-text overflow-hidden text-2xl font-bold whitespace-nowrap"
      >
        SITE CHECKER
      </span>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>メニュー</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in items" :key="item.title">
              <SidebarMenuButton
                asChild
                class="hover:bg-green/20 hover:text-green focus:bg-green/20 focus:text-green active:bg-green/20 active:text-green"
                :class="{
                  'bg-green/20 text-green': isActive(item.url),
                }"
              >
                <NuxtLink :to="item.url">
                  <Icon :name="item.icon" />
                  <span v-if="sidebarStore.isSidebarOpen">
                    {{ item.title }}
                  </span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <Separator />

      <SidebarGroup>
        <SidebarGroupLabel v-if="sidebarStore.isSidebarOpen">
          アクション
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="action in actions" :key="action.title">
              <SidebarMenuButton
                asChild
                class="hover:bg-green/20 hover:text-green focus:bg-green/20 focus:text-green active:bg-green/20 active:text-green"
              >
                <NuxtLink :to="action.url">
                  <Icon :name="action.icon" />
                  <span v-if="sidebarStore.isSidebarOpen">
                    {{ action.title }}
                  </span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>
</template>
