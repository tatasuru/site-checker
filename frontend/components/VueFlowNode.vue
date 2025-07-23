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
  <Card
    class="node relative w-[250px] rounded-sm py-4"
    :class="props.data.isIntermediate && 'bg-muted'"
  >
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          as-child
          class="absolute top-2 right-2 z-10 flex size-fit cursor-pointer"
        >
          <Icon
            v-if="props.data.isIntermediate"
            name="mdi-close-circle"
            class="text-destructive !size-4 shrink-0"
          />
        </TooltipTrigger>
        <TooltipContent>
          <p class="text-xs">このページは存在しません。</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <CardContent class="flex flex-col gap-1 px-4">
      <h3 class="text-xs">
        {{ props.data.title }}
      </h3>
      <NuxtLink
        :to="props.data.url"
        target="_blank"
        class="text-xs break-words hover:underline"
        :class="
          props.data.isIntermediate
            ? 'text-muted-foreground pointer-events-none'
            : 'text-link'
        "
      >
        {{ props.data.url }}
      </NuxtLink>
    </CardContent>
  </Card>
  <Handle id="bottom" type="source" :position="Position.Bottom" />
  <Handle id="top" type="target" :position="Position.Top" />
</template>
