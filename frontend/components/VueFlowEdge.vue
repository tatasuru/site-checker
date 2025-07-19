<script setup lang="ts">
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@vue-flow/core";

const props = defineProps<EdgeProps>();
const path = computed(() => getBezierPath(props));
</script>

<template>
  <BaseEdge :path="path[0]" />
</template>
