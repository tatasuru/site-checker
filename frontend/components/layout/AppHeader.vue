<script setup lang="ts">
import { useSidebarStore } from "@/stores/sidebar";

const colorMode = useColorMode();
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const store = useStore();
const sidebarStore = useSidebarStore();
const route = useRoute();

interface Profile {
  id: string;
  name: string;
  avatar_url: string;
}

/************************
 * sign out
 *************************/
const signOutWithGoogle = async () => {
  if (user.value) {
    store.clearProfile();
    await supabase.auth.signOut();
    return await navigateTo("/login");
  } else {
    return await navigateTo("/dashboard");
  }
};

// sidebar toggle
const toggleSidebar = () => {
  sidebarStore.toggleSidebar();
};

// for initializing store on mount with user profile
onMounted(async () => {
  if (user.value && !store.profile.name) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.value?.id)
      .single();

    if (error || !data) {
      console.error("Error fetching profile:", error);
      return await navigateTo("/login");
    }

    const profile = data as Profile;
    store.setProfile(profile);
  }
});
</script>

<template>
  <header
    class="flex w-full items-center justify-between p-4 px-6"
    :class="{
      'bg-background fixed top-0 z-10 w-full border-b p-2 px-4 shadow-md md:p-4':
        route.path === '/',
    }"
  >
    <!-- loading bar -->
    <NuxtLoadingIndicator
      :color="'#8658e1'"
      :height="4"
      :duration="5000"
      :throttle="0"
    />

    <NuxtLink v-if="route.path === '/'" to="/">
      <h1 class="gradient-text text-xl font-bold md:text-2xl">SITE CHECKER</h1>
    </NuxtLink>

    <!-- left -->
    <div class="flex items-center gap-4">
      <!-- sidebar trigger -->
      <SidebarTrigger
        v-if="route.path !== '/'"
        class="cursor-pointer"
        @click="toggleSidebar"
      />

      <!-- search input -->
      <Input
        v-if="route.path !== '/'"
        id="search"
        type="text"
        placeholder="検索..."
        class="w-[300px]"
      />
    </div>

    <!-- right menu -->
    <div class="flex items-center gap-1 md:gap-2">
      <!-- avatar menu -->
      <DropdownMenu v-if="user">
        <DropdownMenuTrigger as-child>
          <Avatar :size="'sm'" class="cursor-pointer">
            <AvatarImage :src="store.profile.avatar_url || ''" alt="avatar" />
            <AvatarFallback>
              {{ store.profile.name?.charAt(0)?.toUpperCase() || "U" }}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="end"
          :side-offset="4"
          :align-offset="0"
          class="min-w-56"
        >
          <div class="flex flex-col gap-1 p-2">
            <p class="text-sm">
              {{ store.profile.name || "ユーザー" }}
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            v-if="colorMode.preference === 'light'"
            @click="colorMode.preference = 'dark'"
            class="cursor-pointer"
          >
            <Icon name="radix-icons:moon" class="size-4" />
            Dark mode
          </DropdownMenuItem>
          <DropdownMenuItem
            v-else-if="colorMode.preference === 'dark'"
            @click="colorMode.preference = 'light'"
            class="cursor-pointer"
          >
            <Icon name="radix-icons:sun" class="size-4" />
            light mode
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            class="text-destructive-foreground hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive-foreground cursor-pointer"
            @click="signOutWithGoogle"
          >
            <Icon name="mdi:logout" class="size-4" />
            ログアウト
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <!-- signIn and login buttons  -->
      <div v-if="!user" class="flex items-center gap-2 md:gap-6">
        <Button
          :variant="'ghost'"
          class="h-fit cursor-pointer p-2"
          @click="
            colorMode.preference =
              colorMode.preference === 'dark' ? 'light' : 'dark'
          "
        >
          <Icon
            v-if="colorMode.preference === 'dark'"
            name="solar:sun-bold-duotone"
            class="flex !size-5 text-black md:hidden dark:text-white"
          />
          <Icon
            v-else-if="colorMode.preference === 'light'"
            name="solar:moon-bold-duotone"
            class="hidden !size-5 text-black md:flex dark:text-white"
          />
        </Button>
        <div class="flex items-center gap-2">
          <Button class="h-fit rounded-sm py-1 md:h-9 md:py-4" as-child>
            <NuxtLink
              :to="{
                name: 'login',
                query: {
                  tab: 'signup',
                },
              }"
            >
              新規登録
            </NuxtLink>
          </Button>
          <Button
            class="hidden h-fit rounded-sm py-1 md:flex md:h-9 md:py-4"
            as-child
          >
            <NuxtLink
              :to="{
                name: 'login',
                query: {
                  tab: 'signin',
                },
              }"
            >
              ログイン
            </NuxtLink>
          </Button>
        </div>
      </div>
    </div>
  </header>
</template>
