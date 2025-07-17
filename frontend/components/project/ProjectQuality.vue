<script setup lang="ts">
import { VisSingleContainer, VisDonut } from "@unovis/vue";
import type {
  MyProjects,
  MyProjectSeoCheckResult,
  MyProjectSeoMetaDetail,
} from "@/types/project";
import type {
  ColumnDef,
  ColumnFiltersState,
  ExpandedState,
  SortingState,
  VisibilityState,
} from "@tanstack/vue-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  FlexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
} from "@tanstack/vue-table";
import { ArrowUpDown, ChevronDown } from "lucide-vue-next";
import { valueUpdater } from "@/components/ui/table/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { h, ref, computed } from "vue";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Card, CardHeader, CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const props = defineProps<{
  myProject: MyProjects | null;
  myProjectSeoCheckResults: MyProjectSeoCheckResult | null;
  myProjectSeoMetaDetails: MyProjectSeoMetaDetail[] | null;
}>();

const emit = defineEmits(["refreshScore"]);
function refreshScore() {
  emit("refreshScore");
}

const columns: ColumnDef<MyProjectSeoMetaDetail>[] = [
  {
    id: "select",
    header: ({ table }) =>
      h(Checkbox, {
        modelValue:
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate"),
        "onUpdate:modelValue": (value) =>
          table.toggleAllPageRowsSelected(!!value),
        ariaLabel: "Select all",
        class:
          "cursor-pointer data-[state=checked]:bg-green data-[state=checked]:border-green data-[state=indeterminate]:bg-green data-[state=indeterminate]:border-green text-white",
      }),
    cell: ({ row }) =>
      h(Checkbox, {
        modelValue: row.getIsSelected(),
        "onUpdate:modelValue": (value) => row.toggleSelected(!!value),
        ariaLabel: "Select row",
        class:
          "cursor-pointer data-[state=checked]:bg-green data-[state=checked]:border-green data-[state=indeterminate]:bg-green text-white",
      }),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => row.getValue("id"),
    enableHiding: true, // 非表示にできるようにする
  },
  {
    accessorKey: "page_url",
    header: ({ column }) => {
      return h(
        Button,
        {
          variant: "ghost",
          onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
          class: "cursor-pointer",
        },
        () => ["ページURL", h(ArrowUpDown, { class: "ml-2 h-4 w-4" })],
      );
    },
    cell: ({ row }) => {
      return h(
        Button,
        {
          variant: "link",
          onClick: () => selectDialogContent(row.getValue("id") as string),
          class: "text-link hover:underline",
        },
        () => row.getValue("page_url") as string,
      );
    },
    size: 300,
  },
  {
    accessorKey: "title_text",
    header: ({ column }) => {
      return h(
        Button,
        {
          variant: "ghost",
          onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
          class: "cursor-pointer",
        },
        () => ["ページタイトル", h(ArrowUpDown, { class: "ml-2 h-4 w-4" })],
      );
    },
    cell: ({ row }) => {
      return h(
        "div",
        {
          class: row.getValue("title_text")
            ? "text-ellipsis overflow-hidden whitespace-nowrap"
            : "text-muted-foreground",
        },

        (row.getValue("title_text") as string) || "no title",
      );
    },
    size: 250,
  },
  {
    accessorKey: "meta_description_text",
    header: ({ column }) => {
      return h(
        Button,
        {
          variant: "ghost",
          onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
          class: "cursor-pointer",
        },
        () => ["デスクリプション", h(ArrowUpDown, { class: "ml-2 h-4 w-4" })],
      );
    },
    cell: ({ row }) => {
      return h(
        "div",
        {
          class: row.getValue("meta_description_text")
            ? "text-ellipsis overflow-hidden whitespace-nowrap"
            : "text-muted-foreground",
        },
        (row.getValue("meta_description_text") as string) || "no description",
      );
    },
    size: 200,
  },
  {
    accessorKey: "canonical_url",
    header: ({ column }) => {
      return h(
        Button,
        {
          variant: "ghost",
          onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
          class: "cursor-pointer",
        },
        () => ["Canonical URL", h(ArrowUpDown, { class: "ml-2 h-4 w-4" })],
      );
    },
    cell: ({ row }) => {
      return h(
        "div",
        {
          class: row.getValue("canonical_url")
            ? "text-ellipsis overflow-hidden whitespace-nowrap"
            : "text-muted-foreground",
        },
        (row.getValue("canonical_url") as string) || "no canonical URL",
      );
    },
    size: 150,
  },
  {
    accessorKey: "status_code",
    header: ({ column }) => {
      return h(
        Button,
        {
          variant: "ghost",
          onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
          class: "cursor-pointer",
        },
        () => ["ステータス", h(ArrowUpDown, { class: "ml-2 h-4 w-4" })],
      );
    },
    cell: ({ row }) => {
      const statusCode = row.getValue("status_code") as number;
      return h("div", {}, statusCode);
    },
    size: 80,
  },
  {
    accessorKey: "keywords",
    header: ({ column }) => {
      return h(
        Button,
        {
          variant: "ghost",
          onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
          class: "cursor-pointer",
        },
        () => ["キーワード", h(ArrowUpDown, { class: "ml-2 h-4 w-4" })],
      );
    },
    cell: ({ row }) => {
      return h(
        "div",
        {
          class: "",
        },
        (row.getValue("keywords") as string[])?.join(", ") || "no keywords",
      );
    },
    size: 120,
  },
  {
    accessorKey: "score",
    header: ({ column }) => {
      return h(
        Button,
        {
          variant: "ghost",
          onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
          class: "cursor-pointer",
        },
        () => ["スコア", h(ArrowUpDown, { class: "ml-2 h-4 w-4" })],
      );
    },
    cell: ({ row }) => {
      const score = row.getValue("score") as number;
      const scoreColor =
        score >= 80
          ? "text-green-600"
          : score >= 60
            ? "text-yellow-600"
            : "text-red-600";
      return h("div", { class: `px-3 font-medium ${scoreColor}` }, score);
    },
    size: 80,
  },
];
const sorting = ref<SortingState>([]);
const columnFilters = ref<ColumnFiltersState>([]);
const columnVisibility = ref<VisibilityState>({
  id: false,
  canonical_url: false,
  status_code: false,
  keywords: false,
});
const rowSelection = ref({});
const expanded = ref<ExpandedState>({});
const table = useVueTable({
  get data() {
    return props.myProjectSeoMetaDetails || [];
  },
  columns,
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
  onSortingChange: (updaterOrValue) => valueUpdater(updaterOrValue, sorting),
  onColumnFiltersChange: (updaterOrValue) =>
    valueUpdater(updaterOrValue, columnFilters),
  onColumnVisibilityChange: (updaterOrValue) =>
    valueUpdater(updaterOrValue, columnVisibility),
  onRowSelectionChange: (updaterOrValue) =>
    valueUpdater(updaterOrValue, rowSelection),
  onExpandedChange: (updaterOrValue) => valueUpdater(updaterOrValue, expanded),
  state: {
    get sorting() {
      return sorting.value;
    },
    get columnFilters() {
      return columnFilters.value;
    },
    get columnVisibility() {
      return columnVisibility.value;
    },
    get rowSelection() {
      return rowSelection.value;
    },
    get expanded() {
      return expanded.value;
    },
  },
});

/***************************
 * for seo check result donut
 ****************************/
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
const pieSubLabel = computed(() => {
  if (!props.myProjectSeoCheckResults) return "全体のスコア";
  const score = props.myProjectSeoCheckResults.meta_score || 0;

  if (score >= 80) return "素晴らしい！";
  if (score >= 50) return "注意が必要";
  return "改善が必要";
});

/***************************
 * for accordion items
 ****************************/
const noTitleLength = props.myProjectSeoMetaDetails?.filter(
  (item) => !item.title_text || item.title_text.trim() === "",
).length;
const noMetaDescriptionLength = props.myProjectSeoMetaDetails?.filter(
  (item) =>
    !item.meta_description_text || item.meta_description_text.trim() === "",
).length;
const noCanonicalUrlLength = props.myProjectSeoMetaDetails?.filter(
  (item) => !item.canonical_url || item.canonical_url.trim() === "",
).length;
const noKeywordsLength = props.myProjectSeoMetaDetails?.filter(
  (item) => !item.keywords || item.keywords.length === 0,
).length;
const errorStatusLength = props.myProjectSeoMetaDetails?.filter(
  (item) => item.status_code !== 200,
).length;
const lowPointPagesLength = props.myProjectSeoMetaDetails?.filter(
  (item) => item.score < 60,
).length;

const leftAccordionItems = [
  {
    value: "title",
    title: "ページタイトル",
    content: noTitleLength
      ? `${noTitleLength}件のページでページタイトルが設定されていません。`
      : "すべてのページでページタイトルが設定されています。",
    icon: noTitleLength && noTitleLength > 0 ? "mdi:alert" : "mdi:check",
    color: noTitleLength && noTitleLength > 0 ? "text-warning" : "text-green",
  },
  {
    value: "meta-description",
    title: "メタディスクリプション",
    content: noMetaDescriptionLength
      ? `${noMetaDescriptionLength}件のページでメタディスクリプションが設定されていません。`
      : "すべてのページでメタディスクリプションが設定されています。",
    icon:
      noMetaDescriptionLength && noMetaDescriptionLength > 0
        ? "mdi:alert"
        : "mdi:check",
    color:
      noMetaDescriptionLength && noMetaDescriptionLength > 0
        ? "text-warning"
        : "text-green",
  },
  {
    value: "canonical-url",
    title: "Canonical URL",
    content: noCanonicalUrlLength
      ? `${noCanonicalUrlLength}件のページでCanonical URLが設定されていません。`
      : "すべてのページでCanonical URLが設定されています。",
    icon:
      noCanonicalUrlLength && noCanonicalUrlLength > 0
        ? "mdi:alert"
        : "mdi:check",
    color:
      noCanonicalUrlLength && noCanonicalUrlLength > 0
        ? "text-warning"
        : "text-green",
  },
];

const rightAccordionItems = [
  {
    value: "error-status",
    title: "HTTPエラー",
    content: errorStatusLength
      ? `${errorStatusLength}件のページでHTTPエラーが発生しています。`
      : "すべてのページでHTTPステータスは200です。",
    icon:
      errorStatusLength && errorStatusLength > 0 ? "mdi:alert" : "mdi:check",
    color:
      errorStatusLength && errorStatusLength > 0
        ? "text-warning"
        : "text-green",
  },
  {
    value: "keywords",
    title: "キーワード",
    content: noKeywordsLength
      ? `${noKeywordsLength}件のページでキーワードが設定されていません。`
      : "すべてのページでキーワードが設定されています。",
    icon: noKeywordsLength && noKeywordsLength > 0 ? "mdi:alert" : "mdi:check",
    color:
      noKeywordsLength && noKeywordsLength > 0 ? "text-warning" : "text-green",
  },
  {
    value: "low-score",
    title: "スコアが低いページ",
    content: lowPointPagesLength
      ? `${lowPointPagesLength}件のページでスコアが60点未満です。`
      : "すべてのページでスコアは60点以上です。",
    icon:
      lowPointPagesLength && lowPointPagesLength > 0
        ? "mdi:alert"
        : "mdi:check",
    color:
      lowPointPagesLength && lowPointPagesLength > 0
        ? "text-warning"
        : "text-green",
  },
];

/***************************
 * for dialog
 ****************************/
const isDialogOpen = ref<boolean>(false);
const dialogContents = ref<
  {
    title: string;
    content: MyProjectSeoMetaDetail | undefined;
    icon: string;
    color: string;
    pageUrl: string;
  }[]
>();

function selectDialogContent(id: string) {
  const selectedContent = props.myProjectSeoMetaDetails?.find(
    (item) => item.id === id,
  );

  console.log("Selected Content:", selectedContent);

  isDialogOpen.value = true;

  dialogContents.value = [
    {
      title: "Twitter OGP",
      content: selectedContent,
      icon: "mdi:twitter",
      color: "text-green",
      pageUrl: selectedContent?.page_url || "",
    },
    {
      title: "Facebook OGP",
      content: selectedContent,
      icon: "mdi:facebook",
      color: "text-green",
      pageUrl: selectedContent?.page_url || "",
    },
  ];
}
</script>

<template>
  <div class="flex w-full flex-col gap-12">
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <PageTitle
          title="チェック結果"
          description="サイトのSEOメタ情報を確認できます。"
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

      <div class="flex items-center gap-12">
        <ClientOnly>
          <VisSingleContainer
            :data="pieScores"
            class="medium-donut !h-56 !w-56"
          >
            <VisDonut
              :value="value"
              :cornerRadius="5"
              :color="color"
              :arcWidth="12"
              :radius="95"
              :centralLabel="`${props.myProjectSeoCheckResults?.total_score || 0}点`"
              :centralSubLabel="pieSubLabel"
            />
          </VisSingleContainer>
        </ClientOnly>

        <div class="flex w-full items-center gap-8">
          <Accordion type="single" class="w-full" collapsible>
            <AccordionItem
              v-for="item in leftAccordionItems"
              :key="item.value"
              :value="item.value"
            >
              <AccordionTrigger class="cursor-pointer">
                <div class="flex items-center gap-2 text-base font-semibold">
                  <Icon :name="item.icon" class="!size-4" :class="item.color" />
                  {{ item.title }}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {{ item.content }}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <Accordion type="single" class="w-full" collapsible>
            <AccordionItem
              v-for="item in rightAccordionItems"
              :key="item.value"
              :value="item.value"
            >
              <AccordionTrigger class="cursor-pointer">
                <div class="flex items-center gap-2 text-base font-semibold">
                  <Icon :name="item.icon" class="!size-4" :class="item.color" />
                  {{ item.title }}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {{ item.content }}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <PageTitle
          title="ページごとのSEOメタ情報"
          description="サイト内の各ページのSEOメタ情報を確認できます。"
          size="small"
        />
        <!-- filter and search -->
        <div class="flex items-center gap-2">
          <div class="relative flex items-center gap-2">
            <Icon
              name="solar:magnifer-linear"
              class="text-muted-foreground absolute top-[50%] left-2 !size-4 -translate-y-1/2"
            />
            <Input
              class="w-64 pl-8"
              placeholder="ページタイトルで検索"
              :model-value="
                table.getColumn('title_text')?.getFilterValue() as string
              "
              @update:model-value="
                table.getColumn('title_text')?.setFilterValue($event)
              "
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="outline" class="ml-auto">
                表示切り替え <ChevronDown class="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                v-for="column in table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())"
                :key="column.id"
                class="capitalize"
                :model-value="column.getIsVisible()"
                @update:model-value="
                  (value) => {
                    column.toggleVisibility(!!value);
                  }
                "
              >
                {{ column.id }}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog
        v-model:open="isDialogOpen"
        :defaultOpen="false"
        :onOpenChange="(open: boolean) => (isDialogOpen = open)"
        class="w-full"
      >
        <DialogContent class="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>OGP確認</DialogTitle>
            <DialogDescription>
              <span class="text-link">
                {{ dialogContents?.[0]?.pageUrl || "" }}
              </span>
              のSNSシェア時のOGP画像・タイトル・説明文のサイズ・見え方を確認できます。
            </DialogDescription>
          </DialogHeader>
          <Accordion
            default-value="Twitter OGP"
            type="single"
            class="w-full"
            collapsible
          >
            <AccordionItem
              v-for="item in dialogContents"
              :key="item.title"
              :value="item.title"
            >
              <AccordionTrigger class="cursor-pointer">
                <div class="flex items-center gap-2 text-base font-semibold">
                  <Icon :name="item.icon" class="!size-6" :class="item.color" />
                  {{ item.title }}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Card v-if="item.title === 'Twitter OGP'" class="gap-0 p-0">
                  <CardHeader
                    class="relative flex flex-col gap-0 rounded-xl px-0"
                  >
                    <NuxtImg
                      v-if="item.content?.twitter_cards"
                      :src="
                        item.content.twitter_cards.twitter_image ||
                        item.content.og_tags.og_image
                      "
                      class="h-[370px] w-full rounded-xl object-cover"
                      alt="OGP Image"
                    />

                    <Badge
                      class="bg-primary/50 absolute bottom-4 left-4 rounded-xs text-white"
                    >
                      {{ item.pageUrl }}
                    </Badge>
                  </CardHeader>
                </Card>
                <Card
                  v-else-if="item.title === 'Facebook OGP'"
                  class="gap-0 p-0"
                >
                  <CardHeader
                    class="relative flex flex-col gap-0 rounded-t-xl px-0"
                  >
                    <NuxtImg
                      v-if="item.content?.og_tags"
                      :src="
                        item.content.og_tags.og_image ||
                        item.content.twitter_cards.twitter_image
                      "
                      class="h-[370px] w-full rounded-t-xl object-cover"
                      alt="OGP Image"
                    />
                  </CardHeader>
                  <CardFooter class="flex flex-col items-start gap-1 py-4">
                    <p class="text-base font-semibold">
                      {{ item.content?.og_tags.og_title }}
                    </p>
                    <p class="text-muted-foreground text-sm">
                      {{ item.content?.og_tags.og_description }}
                    </p>
                  </CardFooter>
                </Card>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <DialogFooter>
            <DialogClose as-child>
              <Button type="button" variant="secondary"> 閉じる </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div class="w-full">
        <!-- table -->
        <div class="rounded-md border">
          <Table class="w-full">
            <TableHeader>
              <TableRow
                v-for="headerGroup in table.getHeaderGroups()"
                :key="headerGroup.id"
              >
                <TableHead
                  v-for="header in headerGroup.headers"
                  :key="header.id"
                >
                  <FlexRender
                    v-if="!header.isPlaceholder"
                    :render="header.column.columnDef.header"
                    :props="header.getContext()"
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-if="table.getRowModel().rows?.length">
                <template v-for="row in table.getRowModel().rows" :key="row.id">
                  <TableRow :data-state="row.getIsSelected() && 'selected'">
                    <TableCell
                      v-for="cell in row.getVisibleCells()"
                      :key="cell.id"
                    >
                      <FlexRender
                        :render="cell.column.columnDef.cell"
                        :props="cell.getContext()"
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow v-if="row.getIsExpanded()">
                    <TableCell :colspan="row.getAllCells().length">
                      {{ JSON.stringify(row.original) }}
                    </TableCell>
                  </TableRow>
                </template>
              </template>

              <TableRow v-else>
                <TableCell :colspan="columns.length" class="h-24 text-center">
                  データがありません
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <!-- pagination -->
        <div class="flex items-center justify-end space-x-2 py-4">
          <div class="text-muted-foreground flex-1 text-sm">
            {{ table.getFilteredSelectedRowModel().rows.length }} /
            {{ table.getFilteredRowModel().rows.length }} 件選択
          </div>

          <Select
            :model-value="table.getState().pagination.pageSize"
            @update:model-value="
              (val) => {
                if (val !== null) table.setPageSize(Number(val));
              }
            "
            class="w-[180px]"
          >
            <SelectTrigger class="cursor-pointer">
              <SelectValue
                :placeholder="`${table.getState().pagination.pageSize}`"
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem
                  v-for="size in [10, 20, 30, 40, 50, 100]"
                  :key="size"
                  :value="size"
                >
                  {{ size }} 件
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <div class="flex items-center space-x-2">
            <Button
              variant="outline"
              :disabled="!table.getCanPreviousPage()"
              @click="table.previousPage()"
              class="cursor-pointer"
            >
              <Icon name="mdi:chevron-left" />
              前へ
            </Button>
            <Button
              variant="outline"
              :disabled="!table.getCanNextPage()"
              @click="table.nextPage()"
              class="cursor-pointer"
            >
              次へ
              <Icon name="mdi:chevron-right" />
            </Button>
          </div>
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
  --vis-donut-central-label-font-size: 20px;
  --vis-donut-central-sub-label-font-size: 12px;
  /* --vis-donut-central-label-text-color: #4bba54; */
  --vis-donut-central-label-font-weight: bold;
  position: relative;
}

.medium-donut :deep(text:nth-of-type(2)) {
  dominant-baseline: hanging;
  text-anchor: middle;
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
