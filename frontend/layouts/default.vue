<script setup lang="ts">
import { useSidebarStore } from "@/stores/sidebar";
import AppSidebar from "@/components/layout/AppSidebar.vue";
import AppHeader from "@/components/layout/AppHeader.vue";

const sidebarStore = useSidebarStore();

onMounted(() => {
  const sidebarOpen = localStorage.getItem("sidebarOpen");

  if (sidebarOpen) {
    sidebarStore.setSidebarOpen(sidebarOpen === "true");
  } else {
    sidebarStore.setSidebarOpen(true);
    localStorage.setItem("sidebarOpen", "true");
  }
});
</script>

<template>
  <SidebarProvider :open="sidebarStore.isSidebarOpen">
    <AppSidebar />
    <main class="flex flex-1 flex-col">
      <AppHeader />
      <div class="min-h-[calc(100svh-64px)] px-6 py-2">
        <slot />
      </div>
    </main>
  </SidebarProvider>
</template>
