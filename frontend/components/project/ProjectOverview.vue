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

const emit = defineEmits(["refreshScore", "tabChange"]);
function refreshScore() {
  emit("refreshScore");
}
function handleTabChange(value: "overview" | "quality" | "settings") {
  emit("tabChange", value);
}

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
    <PageTitle
      title="サイトクロール状況"
      description="サイトのクロール状況を確認できます。"
      size="small"
    />

    <div
      class="grid w-full grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-3"
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
          <component
            :is="card.title === 'チェック対象URL' ? 'a' : 'p'"
            :href="
              card.title === 'チェック対象URL'
                ? props.myProject?.site_url
                : undefined
            "
            :target="card.title === 'チェック対象URL' ? '_blank' : undefined"
            class="text-base font-semibold tracking-wider transition-all duration-200"
            :class="
              card.title === 'チェックステータス'
                ? getStatusColor(
                    props.myProject?.crawl_results?.[0].status || 'unknown',
                  )
                : card.title === 'チェック対象URL'
                  ? 'text-link underline hover:opacity-80'
                  : 'text-muted-foreground'
            "
          >
            {{ card.description }}
          </component>
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

  <div class="flex flex-col gap-2 pb-6">
    <div class="flex items-center justify-between">
      <PageTitle
        title="サイトチェック概要"
        description="サイトのSEOチェック結果を確認できます。"
        size="small"
      />
      <Button
        v-if="!props.myProjectSeoCheckResults?.checked_at"
        @click="refreshScore"
        variant="mainOutline"
      >
        情報を更新する
      </Button>
    </div>

    <div class="flex w-full gap-6">
      <div class="flex w-full items-start gap-4">
        <ClientOnly>
          <Card class="h-fit min-w-[420px] py-2">
            <CardContent class="flex flex-col items-center gap-4 px-8">
              <VisSingleContainer
                :data="totalPieScores"
                class="large-donut !h-64 !w-64"
              >
                <VisDonut
                  :value="totalValue"
                  :cornerRadius="5"
                  :color="totalColor"
                  :arcWidth="15"
                  :radius="100"
                  :centralLabel="`${props.myProjectSeoCheckResults?.total_score || 0}点`"
                />
              </VisSingleContainer>

              <div class="flex w-full flex-col items-start gap-2">
                <div class="flex flex-col gap-1">
                  <p class="text-base font-semibold">総合評価</p>
                  <span class="text-muted-foreground text-sm">
                    全項目のチェック結果をもとに総合的な評価を表示します。
                  </span>
                </div>
                <Button
                  @click="handleTabChange('quality')"
                  variant="link"
                  class="text-green p-0"
                >
                  詳細を確認する
                  <Icon name="mdi-arrow-right" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </ClientOnly>

        <div
          class="grid w-full grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-4"
        >
          <ClientOnly>
            <Card class="py-3">
              <CardContent class="flex items-center gap-4 px-6">
                <VisSingleContainer
                  :data="pieScores"
                  class="small-donut !h-20 !w-20"
                >
                  <VisDonut
                    :value="value"
                    :cornerRadius="2"
                    :color="color"
                    :arcWidth="5"
                    :radius="40"
                    :centralLabel="`${props.myProjectSeoCheckResults?.total_score || 0}点`"
                  />
                </VisSingleContainer>

                <div class="flex flex-col items-start gap-4">
                  <div class="flex flex-col gap-1">
                    <p class="text-sm font-semibold">SEOチェック結果</p>
                    <span class="text-muted-foreground text-xs">
                      SEOに関するチェック結果の概要
                    </span>
                  </div>
                  <Button
                    @click="handleTabChange('quality')"
                    variant="link"
                    class="text-green size-fit p-0 text-xs"
                  >
                    詳細を確認する
                    <Icon name="mdi-arrow-right" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </ClientOnly>
        </div>
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

.medium-donut {
  --vis-donut-central-label-font-size: 18px;
  --vis-donut-central-sub-label-font-size: 14px;
  /* --vis-donut-central-label-text-color: #4bba54; */
  --vis-donut-central-label-font-weight: bold;
}

.small-donut {
  --vis-donut-central-label-font-size: 14px;
  /* --vis-donut-central-label-text-color: #4bba54; */
  --vis-donut-central-label-font-weight: bold;
}

.dark .large-donut,
.dark .small-donut {
  --vis-donut-central-label-text-color: #fff;
}
</style>
