<script setup lang="ts">
const props = defineProps<{
  title: string;
  description?: string;
  size?: "large" | "medium" | "small";
}>();

const titleSize = computed(() => {
  switch (props.size) {
    case "large":
      return "md:text-2xl text-2xl";
    case "medium":
      return "md:text-xl text-xl";
    case "small":
      return "md:text-base text-base";
    default:
      return "md:text-2xl text-xl";
  }
});

const descriptionSize = computed(() => {
  switch (props.size) {
    case "large":
      return "md:text-sm text-sm";
    case "medium":
      return "md:text-sm text-sm";
    case "small":
      return "md:text-xs text-xs";
    default:
      return "md:text-sm text-sm";
  }
});

const tag = computed(() => {
  return props.size === "small" ? "h2" : "h1";
});
</script>

<template>
  <div
    class="inline-flex flex-col gap-1"
    :class="{
      'border-l-green border-l-2 pl-2': props.size === 'small',
    }"
  >
    <component
      v-if="props.title"
      :is="tag"
      class="font-bold"
      :class="titleSize"
    >
      {{ props.title }}
    </component>
    <p
      v-if="props.description"
      class="text-muted-foreground"
      :class="descriptionSize"
    >
      {{ props.description }}
    </p>
  </div>
</template>
