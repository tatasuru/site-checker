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
    <main
      class="flex h-svh min-h-screen w-full max-w-full flex-col group-data-[scroll-locked=1]/body:h-full peer-data-[state=collapsed]:w-[calc(100%-var(--sidebar-width-icon))] peer-data-[state=expanded]:w-[calc(100%-var(--sidebar-width))] has-[main.fixed-main]:group-data-[scroll-locked=1]/body:h-svh sm:transition-[width] sm:duration-200 sm:ease-linear"
    >
      <AppHeader />
      <div class="min-h-[calc(100svh-64px)] px-6 py-2">
        <slot />
      </div>
    </main>
  </SidebarProvider>
</template>
