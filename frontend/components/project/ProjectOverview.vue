<script setup lang="ts">
import type { MyProjects } from "@/types/project";
import { getStatusColor } from "@/utils/status";

const props = defineProps<{
  myProject: MyProjects | null;
  cardContents: {
    title: string;
    description: string;
    icon: string;
    buttonLabel?: string;
    buttonLink?: string;
  }[];
}>();
</script>

<template>
  <div class="flex flex-col gap-2">
    <PageTitle title="サイトクロール状況" description="" size="small" />

    <div
      class="grid w-full grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4"
    >
      <Card
        v-for="(card, index) in props.cardContents"
        :key="`card-${index}`"
        class="gap-4 py-4 transition-all duration-200 ease-in-out"
      >
        <CardHeader class="flex flex-row items-start justify-between px-4">
          <div class="flex flex-col gap-1">
            <CardTitle class="text-muted-foreground text-sm">
              {{ card.title }}
            </CardTitle>
          </div>
          <Icon
            :name="card.icon"
            :class="[
              '!size-5 transition-all duration-200',
              card.title === 'チェックステータス'
                ? getStatusColor(
                    props.myProject?.crawl_results?.[0].status || 'unknown',
                  )
                : 'text-green',
              {
                'animate-spin':
                  props.myProject?.crawl_results?.[0].status ===
                    'in_progress' && card.title === 'チェックステータス',
              },
            ]"
          />
        </CardHeader>
        <CardContent class="px-4">
          <p
            class="text-base font-semibold tracking-wider transition-all duration-200"
            :class="
              card.title === 'チェックステータス'
                ? getStatusColor(
                    props.myProject?.crawl_results?.[0].status || 'unknown',
                  )
                : 'text-green'
            "
          >
            {{ card.description }}
          </p>
          <Button
            v-if="card.buttonLabel"
            as-child
            variant="link"
            class="text-muted-foreground h-fit w-fit p-0"
          >
            <NuxtLink
              :to="card.buttonLink"
              class="text-xs hover:underline hover:opacity-80"
            >
              {{ card.buttonLabel }}
              <Icon name="mdi-arrow-right" class="inline-block !size-4" />
            </NuxtLink>
          </Button>
        </CardContent>
      </Card>
    </div>
  </div>

  <div class="flex flex-col gap-2">
    <PageTitle title="SEOチェック概要" description="" size="small" />
    グラフとかスコアとかがくる
  </div>
</template>
