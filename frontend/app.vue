<script setup lang="ts">
const route = useRoute();
const config = useRuntimeConfig();

/************************
 * SEO
 *************************/
watchEffect(() => {
  const baseUrl = config.public.baseUrl;
  const ogImage = `${baseUrl}/logo.png`;
  const twitterImage = `${baseUrl}/summary-image.png`;

  useHead({
    title: route.meta.title
      ? `${route.meta.title} - Site Checker`
      : "Site Checker",
    meta: [
      {
        name: "description",
        content: String(route.meta.description ?? "Site Checkerのページです"),
      },
      {
        property: "og:title",
        content: String(route.meta.ogTitle ?? "Site Checker"),
      },
      {
        property: "og:description",
        content: String(route.meta.ogDescription ?? "Site Checkerのページです"),
      },
      {
        property: "og:image",
        content: String(twitterImage),
      },
      {
        name: "twitter:card",
        content: String(route.meta.twitterCard ?? "summary_large_image"),
      },
      {
        name: "twitter:image",
        content: String(twitterImage),
      },
      {
        name: "twitter:title",
        content: String(route.meta.ogTitle ?? "Site Checker"),
      },
      {
        name: "twitter:description",
        content: String(route.meta.ogDescription ?? "Site Checkerのページです"),
      },
    ],
  });
});
</script>

<template>
  <NuxtLayout>
    <NuxtLoadingIndicator
      :color="'#7C3AED'"
      :height="4"
      :duration="5000"
      :throttle="0"
    />
    <NuxtPage />
  </NuxtLayout>

  <ClientOnly>
    <Toaster richColors />
  </ClientOnly>
</template>
