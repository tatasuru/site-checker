<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const client = useSupabaseClient();
const user = useSupabaseUser();

definePageMeta({
  middleware: "auth",
  layout: "default",
});

/************************
 * sign out
 *************************/
const signOutWithGoogle = async () => {
  if (user.value) {
    await client.auth.signOut();
    router.push("/login");
  } else {
    router.push("/login");
  }
};
</script>

<template></template>
