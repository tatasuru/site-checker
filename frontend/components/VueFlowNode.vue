<script setup lang="ts">
import { Position, Handle } from "@vue-flow/core";

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  data: {
    type: Object,
    required: true,
  },
  position: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <Card class="node relative w-[250px] rounded-sm py-4">
    <CardContent class="flex flex-col gap-1 px-4">
      <h3 class="text-xs">
        {{ props.data.title }}
      </h3>
      <NuxtLink
        :to="props.data.url"
        target="_blank"
        class="text-link text-xs break-words hover:underline"
      >
        {{ props.data.url }}
      </NuxtLink>
    </CardContent>
  </Card>
  <Handle id="bottom" type="source" :position="Position.Bottom" />
  <Handle id="top" type="target" :position="Position.Top" />
</template>
