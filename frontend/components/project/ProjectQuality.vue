<script setup lang="ts">
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const props = defineProps<{
  myProject: MyProjects | null;
  myProjectSeoCheckResults: MyProjectSeoCheckResult | null;
  myProjectSeoMetaDetails: MyProjectSeoMetaDetail[] | null;
}>();

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
    size: 50,
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
      const pageUrl = row.getValue("page_url") as string;
      if (!pageUrl) return h("div", {}, "");

      return h(
        Tooltip,
        {},
        {
          default: () => [
            h(
              TooltipTrigger,
              { asChild: true },
              {
                default: () =>
                  h(
                    "div",
                    {
                      class:
                        "max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap cursor-help",
                    },
                    pageUrl,
                  ),
              },
            ),
            h(
              TooltipContent,
              { class: "max-w-[300px]" },
              {
                default: () =>
                  h(
                    "p",
                    {
                      class: "w-full break-words",
                    },
                    pageUrl,
                  ),
              },
            ),
          ],
        },
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
      const title = row.getValue("title_text") as string;
      if (!title)
        return h(
          "div",
          {
            class: "text-muted-foreground",
          },
          "no title",
        );

      return h(
        Tooltip,
        {},
        {
          default: () => [
            h(
              TooltipTrigger,
              { asChild: true },
              {
                default: () =>
                  h(
                    "div",
                    {
                      class:
                        "max-w-[250px] overflow-hidden text-ellipsis whitespace-nowrap cursor-help",
                    },
                    title,
                  ),
              },
            ),
            h(
              TooltipContent,
              { class: "max-w-[300px]" },
              {
                default: () =>
                  h(
                    "p",
                    {
                      class: "w-full break-words",
                    },
                    title,
                  ),
              },
            ),
          ],
        },
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
      const description = row.getValue("meta_description_text") as string;
      if (!description)
        return h(
          "div",
          {
            class: "text-muted-foreground",
          },
          "no description",
        );

      return h(
        Tooltip,
        {},
        {
          default: () => [
            h(
              TooltipTrigger,
              { asChild: true },
              {
                default: () =>
                  h(
                    "div",
                    {
                      class:
                        "max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap cursor-help",
                    },
                    description,
                  ),
              },
            ),
            h(
              TooltipContent,
              { class: "max-w-[300px]" },
              {
                default: () =>
                  h(
                    "p",
                    {
                      class: "w-full break-words",
                    },
                    description,
                  ),
              },
            ),
          ],
        },
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
      const canonicalUrl = row.getValue("canonical_url") as string;
      if (!canonicalUrl)
        return h(
          "div",
          {
            class: "text-muted-foreground",
          },
          "no canonical",
        );

      return h(
        Tooltip,
        {},
        {
          default: () => [
            h(
              TooltipTrigger,
              { asChild: true },
              {
                default: () =>
                  h(
                    "div",
                    {
                      class:
                        "max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap cursor-help",
                    },
                    canonicalUrl,
                  ),
              },
            ),
            h(
              TooltipContent,
              { class: "max-w-[300px]" },
              {
                default: () =>
                  h(
                    "p",
                    {
                      class: "w-full break-words",
                    },
                    canonicalUrl,
                  ),
              },
            ),
          ],
        },
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
        () => ["ステータスコード", h(ArrowUpDown, { class: "ml-2 h-4 w-4" })],
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
      const keywords = row.getValue("keywords") as string[] | null;
      if (!keywords || keywords.length === 0)
        return h(
          "div",
          {
            class: "text-muted-foreground",
          },
          "no keywords",
        );

      return h(
        Tooltip,
        {},
        {
          default: () => [
            h(
              TooltipTrigger,
              { asChild: true },
              {
                default: () =>
                  h(
                    "div",
                    {
                      class:
                        "max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap cursor-help",
                    },
                    keywords,
                  ),
              },
            ),
            h(
              TooltipContent,
              { class: "max-w-[300px]" },
              {
                default: () =>
                  h(
                    "p",
                    {
                      class: "w-full break-words",
                    },
                    keywords,
                  ),
              },
            ),
          ],
        },
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
const columnVisibility = ref<VisibilityState>({});
const rowSelection = ref({});
const expanded = ref<ExpandedState>({});
const table = useVueTable({
  data: props.myProjectSeoMetaDetails || [],
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
</script>

<template>
  <TooltipProvider>
    <div class="flex w-full flex-col gap-2">
      <div class="w-full">
        <div class="flex items-center py-4">
          <Input
            class="max-w-sm"
            placeholder="ページタイトルでフィルタリング"
            :model-value="
              table.getColumn('title_text')?.getFilterValue() as string
            "
            @update:model-value="
              table.getColumn('title_text')?.setFilterValue($event)
            "
          />
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
                  No results.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

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
                  v-for="size in [10, 20, 30, 40, 50]"
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
  </TooltipProvider>
</template>
