<script setup lang="ts">
const router = useRouter();
const route = useRoute();
const currentPath = computed(() => {
  return route.path;
});

const settingsMenu = [
  {
    name: "アカウント設定",
    link: "/settings/account",
    icon: "mdi:account",
  },
  {
    name: "プラン設定",
    link: "/settings/plan",
    icon: "mdi:credit-card",
  },
  {
    name: "通知設定",
    link: "/settings/notification",
    icon: "mdi:bell",
  },
  {
    name: "セキュリティ設定",
    link: "/settings/security",
    icon: "mdi:shield-check",
  },
];
</script>

<template>
  <div id="settings" class="grid w-full gap-4">
    <PageTitle
      title="各種設定"
      description="アカウントの設定や通知の管理を行います"
      size="large"
    />

    <div class="flex flex-col md:flex-row gap-12 items-start">
      <!-- left for desktop -->
      <NavigationMenu
        class="md:sticky md:top-[100px] md:w-[200px] flex-none max-w-none items-start justify-start [&>div]:w-full md:flex hidden"
      >
        <NavigationMenuList
          class="w-full overflow-auto justify-start md:flex-col"
        >
          <NavigationMenuItem
            v-for="menu in settingsMenu"
            :key="menu.name"
            class="min-w-fit md:w-full"
          >
            <NuxtLink
              :to="menu.link"
              class="w-full text-left rounded-md py-2 px-4 flex items-center gap-2 flex-row dark:text-white text-sm"
              :class="
                currentPath === menu.link
                  ? 'bg-purple/20 dark:bg-purple/40 text-purple hover:bg-purple/20 hover:text-purple focus:bg-purple/20 focus:text-purple active:bg-purple/20 active:text-purple'
                  : 'hover:bg-purple/20 hover:text-purple transition-colors active:bg-purple/20 active:text-purple focus:bg-purple/20 focus:text-purple'
              "
            >
              <Icon :name="menu.icon" class="!size-5" />
              {{ menu.name }}
            </NuxtLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>

      <!-- left for mobile -->
      <div class="md:hidden w-full max-w-none flex flex-col items-start gap-2">
        <Label class=""> メニュー </Label>
        <NavigationMenu class="w-full max-w-none [&>div]:w-full">
          <NavigationMenuList class="w-full">
            <NavigationMenuItem class="w-full">
              <NavigationMenuTrigger
                class="w-full border flex items-center justify-between"
              >
                {{
                  settingsMenu.find((menu) => menu.link === currentPath)?.name
                }}
              </NavigationMenuTrigger>
              <NavigationMenuContent class="w-full">
                <NuxtLink
                  v-for="menu in settingsMenu"
                  :key="menu.name"
                  :to="menu.link"
                  class="w-full text-left rounded-md py-2 px-4 flex items-center gap-2 flex-row dark:text-white text-sm"
                  :class="
                    currentPath === menu.link
                      ? 'bg-purple/20 dark:bg-purple/40 text-purple hover:bg-purple/20 hover:text-purple focus:bg-purple/20 focus:text-purple active:bg-purple/20 active:text-purple'
                      : 'hover:bg-purple/20 hover:text-purple transition-colors active:bg-purple/20 active:text-purple focus:bg-purple/20 focus:text-purple'
                  "
                >
                  <Icon :name="menu.icon" class="!size-5" />
                  {{ menu.name }}
                </NuxtLink>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      <Separator
        orientation="vertical"
        class="hidden md:block min-h-[calc(100vh-220px)]"
      />

      <!-- right -->
      <div class="w-full">
        <slot />
      </div>
    </div>
  </div>
</template>
