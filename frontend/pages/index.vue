<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const client = useSupabaseClient();
const user = useSupabaseUser();

definePageMeta({
  middleware: "auth",
  layout: "home",
});

const login = async (providerName: "google" | "github") => {
  try {
    await client.auth.signInWithOAuth({
      provider: providerName,
      options: {
        redirectTo: `${window.location.origin}/projects`,
      },
    });
  } catch (error) {
    console.error(error);
  }
};
</script>

<template>
  <div class="flex h-[calc(100vh-4rem)] items-center justify-center">
    <Card class="w-full md:max-w-xl">
      <CardHeader>
        <CardTitle>SITE CHECKER</CardTitle>
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
