<script setup lang="ts">
// https://unovis.dev/docs/misc/Donut
import { VisSingleContainer, VisDonut } from "@unovis/vue";
import type { MyProjects, MyProjectSeoCheckResult } from "@/types/project";
import { getStatusColor } from "@/utils/status";

const props = defineProps<{
  myProject: MyProjects | null;
  myProjectSeoCheckResults: MyProjectSeoCheckResult | null;
  cardContents: {
    title: string;
    description: string;
    icon: string;
    buttonLabel?: string;
    buttonLink?: string;
  }[];
}>();

// for overview donut
const totalPieScores = computed(() => {
  if (!props.myProjectSeoCheckResults) return [0, 0];
  const totalScore = props.myProjectSeoCheckResults.total_score || 0;
  return [totalScore, 100 - totalScore];
});
const totalValue = (d: number) => d;
const totalColor = (d: number, i: number) => {
  if (!props.myProjectSeoCheckResults) return ["#4bba54", "#d5d8d5"][i];
  const totalScore = props.myProjectSeoCheckResults.total_score || 0;
  if (totalScore >= 80) return ["#4bba54", "#d5d8d5"][i]; // green
  if (totalScore >= 50) return ["#f0ad4e", "#d5d8d5"][i]; // yellow
  return ["#d9534f", "#d5d8d5"][i]; // red
};

// for seo check result donut
const pieScores = computed(() => {
  if (!props.myProjectSeoCheckResults) return [0, 0];
  const score = props.myProjectSeoCheckResults.meta_score || 0;
  return [score, 100 - score];
});
const value = (d: number) => d;
const color = (d: number, i: number) => {
  if (!props.myProjectSeoCheckResults) return ["#4bba54", "#d5d8d5"][i];
  const score = props.myProjectSeoCheckResults.meta_score || 0;
  if (score >= 80) return ["#4bba54", "#d5d8d5"][i]; // green
  if (score >= 50) return ["#f0ad4e", "#d5d8d5"][i]; // yellow
  return ["#d9534f", "#d5d8d5"][i]; // red
};
</script>

<template>
  <div class="flex flex-col gap-2">
    <PageTitle title="サイトクロール状況" description="" size="medium" />

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
    <PageTitle title="サイトチェック概要" description="" size="medium" />

    <div class="flex w-full gap-6">
      <div
        class="grid w-full grid-cols-[repeat(auto-fill,minmax(420px,1fr))] gap-4"
      >
        <Card class="py-4">
          <CardContent class="flex items-center gap-4 px-6">
            <VisSingleContainer
              :data="totalPieScores"
              class="small-donut !h-24 !w-24"
            >
              <VisDonut
                :value="totalValue"
                :cornerRadius="2"
                :color="totalColor"
                :arcWidth="5"
                :radius="45"
                :centralLabel="`${props.myProjectSeoCheckResults?.total_score || 0}点`"
              />
            </VisSingleContainer>

            <div class="flex flex-col items-start gap-2">
              <div class="flex flex-col gap-1">
                <p class="text-base font-semibold">総合評価</p>
                <span class="text-muted-foreground text-sm">
                  全項目の総合評価点数
                </span>
              </div>
              <Button as-child variant="link" class="text-green px-0">
                <NuxtLink to="/projects" class="flex w-fit items-center gap-2">
                  詳細を確認する
                  <Icon name="mdi-arrow-right" />
                </NuxtLink>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card class="py-4">
          <CardContent class="flex items-center gap-4 px-6">
            <VisSingleContainer
              :data="pieScores"
              class="small-donut !h-24 !w-24"
            >
              <VisDonut
                :value="value"
                :cornerRadius="2"
                :color="color"
                :arcWidth="5"
                :radius="45"
                :centralLabel="`${props.myProjectSeoCheckResults?.total_score || 0}点`"
              />
            </VisSingleContainer>

            <div class="flex flex-col items-start gap-2">
              <div class="flex flex-col gap-1">
                <p class="text-base font-semibold">SEOチェック結果</p>
                <span class="text-muted-foreground text-sm">
                  SEOに関するチェック結果の概要
                </span>
              </div>
              <Button as-child variant="link" class="text-green px-0">
                <NuxtLink to="/projects" class="flex w-fit items-center gap-2">
                  詳細を確認する
                  <Icon name="mdi-arrow-right" />
                </NuxtLink>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.large-donut {
  --vis-donut-central-label-font-size: 24px;
  --vis-donut-central-sub-label-font-size: 14px;
  /* --vis-donut-central-label-text-color: #4bba54; */
  --vis-donut-central-label-font-weight: bold;
}

.small-donut {
  --vis-donut-central-label-font-size: 14px;
  /* --vis-donut-central-label-text-color: #4bba54; */
  --vis-donut-central-label-font-weight: bold;
}
</style>
