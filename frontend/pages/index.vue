<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const client = useSupabaseClient();
const user = useSupabaseUser();

definePageMeta({
  middleware: "auth",
  layout: "home",
});
</script>

<template>HOME</template>
