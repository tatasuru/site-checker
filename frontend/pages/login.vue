<script setup lang="ts">
// use supabase client
const client = useSupabaseClient();
const router = useRouter();
const user = useSupabaseUser();

definePageMeta({
  middleware: "auth",
  layout: "custom",
});

const authInitialized = ref(false);

onMounted(async () => {
  await nextTick();
  authInitialized.value = true;

  // Redirect to dashboard if already logged in
  if (user.value) {
    router.push("/dashboard");
  }
});

const login = async (providerName: "google" | "github") => {
  try {
    await client.auth.signInWithOAuth({
      provider: providerName,
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
  } catch (error) {
    console.error(error);
  }
};
</script>

<template>
  <div class="flex h-screen items-center justify-center">
    <Card class="w-full md:max-w-xl">
      <CardHeader>
        <CardTitle>Site Checker</CardTitle>
        <CardDescription>ログインしてください</CardDescription>
      </CardHeader>
      <CardContent>
        <Button class="w-full" @click="login('google')" variant="outline">
          Login with Google
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
