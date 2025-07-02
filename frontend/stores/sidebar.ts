import { defineStore } from "pinia";

export const useSidebarStore = defineStore("sidebar", () => {
  const isSidebarOpen = ref<boolean>(true);

  const toggleSidebar = () => {
    isSidebarOpen.value = !isSidebarOpen.value;
    localStorage.setItem("sidebarOpen", JSON.stringify(isSidebarOpen.value));
  };

  const setSidebarOpen = (open: boolean) => {
    isSidebarOpen.value = open;
  };

  return { isSidebarOpen, toggleSidebar, setSidebarOpen };
});
