<script setup lang="ts">
import { ref, reactive } from "vue";
import type { Node, Edge } from "@vue-flow/core";
import type { CrawlResult, MyProjects } from "@/types/project";
import { toast } from "vue-sonner";

definePageMeta({
  middleware: "auth",
  layout: "default",
});

const nodes = ref<Node[]>([]);
const edges = ref<Edge[]>([]);
const route = useRoute();
const supabase = useSupabaseClient();
const myProject = ref<MyProjects | null>(null);
const myProjectCrawlResults = ref<CrawlResult | null>(null);
const isLoading = ref<boolean>(true);

// Canvas state
const canvas = ref<HTMLCanvasElement | null>(null);
const canvasContainer = ref<HTMLDivElement | null>(null);
const selectedNode = ref<Node | null>(null);

// Viewport state
const viewport = reactive({
  x: 0,
  y: 0,
  scale: 1,
  minScale: 0.1,
  maxScale: 3,
});

// Interaction state
const interaction = reactive({
  isDragging: false,
  isNodeDragging: false,
  dragStart: { x: 0, y: 0 },
  lastPanPoint: { x: 0, y: 0 },
  draggedNode: null as Node | null,
});

// Touch state
const touch = reactive({
  isActive: false,
  initialDistance: 0,
  initialScale: 1,
  center: { x: 0, y: 0 },
});

/**********************************
 * project helper functions
 **********************************/
async function fetchProjectDetails(id: string): Promise<MyProjects | null> {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select(
        `*,
      crawl_results (
        id,
        site_url,
        status,
        total_pages,
        successful_pages,
        failed_pages,
        started_at,
        completed_at,
        sitemap_data
      )`,
      )
      .eq("id", id)
      .eq("crawl_results.is_latest", true) // 最新のcrawl_resultsのみ
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    return data && data.length > 0 ? (data[0] as MyProjects) : null;
  } catch (error) {
    console.error("Error fetching project overview:", error);
    toast.error("プロジェクト情報の取得に失敗しました");
    return null;
  }
}

onMounted(async () => {
  const projectId = route.params.id as string;

  try {
    myProject.value = await fetchProjectDetails(projectId);
    console.log("myProject.value", myProject.value);

    if (!myProject.value) {
      toast.error("プロジェクトが見つかりません");
      return;
    }

    myProjectCrawlResults.value = myProject.value.crawl_results?.[0] || null;

    if (myProjectCrawlResults.value) {
      let parseSitemapData = null;
      parseSitemapData = JSON.parse(
        myProjectCrawlResults.value.sitemap_data || "{}",
      );

      nodes.value = parseSitemapData.nodes;
      edges.value = parseSitemapData.edges;

      // Canvas初期位置の設定
      if (nodes.value.length > 0) {
        const firstNode = nodes.value[0];
        viewport.x = -(firstNode.position.x - 400);
        viewport.y = -(firstNode.position.y - 300);
        viewport.scale = parseSitemapData.zoom || 0.8;
      }
    }

    await nextTick();
    initCanvas();
    setupEventListeners();

    isLoading.value = false;
  } catch (error) {
    console.error("Error fetching project details:", error);
    toast.error("プロジェクトの詳細情報の取得に失敗しました");
    isLoading.value = false;
    return;
  }
});

/**********************************
 * Canvas Utilities
 **********************************/
function initCanvas() {
  if (!canvas.value || !canvasContainer.value) {
    console.error("Canvas element not found");
    return;
  }

  const rect = canvasContainer.value.getBoundingClientRect();
  canvas.value.width = rect.width * window.devicePixelRatio;
  canvas.value.height = rect.height * window.devicePixelRatio;
  
  const ctx = canvas.value.getContext("2d");
  if (!ctx) {
    console.error("Failed to get canvas context");
    return;
  }

  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  canvas.value.style.width = rect.width + "px";
  canvas.value.style.height = rect.height + "px";

  drawSitemap(ctx);
}

function getWorldToScreen(worldX: number, worldY: number) {
  return {
    x: (worldX + viewport.x) * viewport.scale,
    y: (worldY + viewport.y) * viewport.scale,
  };
}

function getScreenToWorld(screenX: number, screenY: number) {
  return {
    x: screenX / viewport.scale - viewport.x,
    y: screenY / viewport.scale - viewport.y,
  };
}

function getMousePos(event: MouseEvent | Touch) {
  if (!canvas.value) return { x: 0, y: 0 };
  const rect = canvas.value.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function getNodeAtPosition(worldX: number, worldY: number): Node | null {
  for (const node of nodes.value) {
    const nodeWidth = 250;
    const nodeHeight = 80;
    
    if (
      worldX >= node.position.x &&
      worldX <= node.position.x + nodeWidth &&
      worldY >= node.position.y &&
      worldY <= node.position.y + nodeHeight
    ) {
      return node;
    }
  }
  return null;
}

function drawSitemap(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, canvas.value!.width / window.devicePixelRatio, canvas.value!.height / window.devicePixelRatio);
  
  ctx.save();
  ctx.translate(viewport.x * viewport.scale, viewport.y * viewport.scale);
  ctx.scale(viewport.scale, viewport.scale);

  // Draw edges first
  edges.value.forEach((edge) => {
    const sourceNode = nodes.value.find((n) => n.id === edge.source);
    const targetNode = nodes.value.find((n) => n.id === edge.target);

    if (sourceNode && targetNode) {
      ctx.strokeStyle = "#d1d5db";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sourceNode.position.x + 125, sourceNode.position.y + 80);
      ctx.lineTo(targetNode.position.x + 125, targetNode.position.y);
      ctx.stroke();
    }
  });

  // Draw nodes
  nodes.value.forEach((node) => {
    const nodeWidth = 250;
    const nodeHeight = 80;
    const isSelected = selectedNode.value?.id === node.id;
    const isIntermediate = node.data.isIntermediate;

    // Node background
    ctx.fillStyle = isIntermediate ? "#f3f4f6" : "#ffffff";
    ctx.strokeStyle = isSelected ? "#3b82f6" : "#e5e7eb";
    ctx.lineWidth = isSelected ? 3 : 1;
    
    ctx.fillRect(node.position.x, node.position.y, nodeWidth, nodeHeight);
    ctx.strokeRect(node.position.x, node.position.y, nodeWidth, nodeHeight);

    // Title
    ctx.fillStyle = "#1f2937";
    ctx.font = "14px system-ui, -apple-system, sans-serif";
    const title = node.data.title || node.id;
    const truncatedTitle = title.length > 30 ? title.substring(0, 30) + "..." : title;
    ctx.fillText(truncatedTitle, node.position.x + 12, node.position.y + 25);

    // URL
    ctx.fillStyle = isIntermediate ? "#9ca3af" : "#3b82f6";
    ctx.font = "12px system-ui, -apple-system, sans-serif";
    const url = node.data.url || "";
    const truncatedUrl = url.length > 35 ? url.substring(0, 35) + "..." : url;
    ctx.fillText(truncatedUrl, node.position.x + 12, node.position.y + 45);

    // Error indicator for intermediate nodes
    if (isIntermediate) {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(node.position.x + nodeWidth - 20, node.position.y + 20, 6, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px system-ui, -apple-system, sans-serif";
      ctx.fillText("!", node.position.x + nodeWidth - 24, node.position.y + 24);
    }
  });

  ctx.restore();
}

/**********************************
 * Event Handlers
 **********************************/
function setupEventListeners() {
  if (!canvas.value) return;

  // Mouse events
  canvas.value.addEventListener("mousedown", handleMouseDown);
  canvas.value.addEventListener("mousemove", handleMouseMove);
  canvas.value.addEventListener("mouseup", handleMouseUp);
  canvas.value.addEventListener("wheel", handleWheel, { passive: false });

  // Touch events
  canvas.value.addEventListener("touchstart", handleTouchStart, { passive: false });
  canvas.value.addEventListener("touchmove", handleTouchMove, { passive: false });
  canvas.value.addEventListener("touchend", handleTouchEnd, { passive: false });

  // Window resize
  window.addEventListener("resize", handleResize);
}

function handleMouseDown(event: MouseEvent) {
  event.preventDefault();
  const pos = getMousePos(event);
  const worldPos = getScreenToWorld(pos.x, pos.y);
  const node = getNodeAtPosition(worldPos.x, worldPos.y);

  if (node) {
    selectedNode.value = node;
    interaction.isNodeDragging = true;
    interaction.draggedNode = node;
  } else {
    selectedNode.value = null;
    interaction.isDragging = true;
  }

  interaction.dragStart = pos;
  interaction.lastPanPoint = { x: viewport.x, y: viewport.y };
  
  if (!canvas.value) return;
  const ctx = canvas.value.getContext("2d");
  if (ctx) drawSitemap(ctx);
}

function handleMouseMove(event: MouseEvent) {
  if (!interaction.isDragging && !interaction.isNodeDragging) return;
  
  const pos = getMousePos(event);
  const deltaX = pos.x - interaction.dragStart.x;
  const deltaY = pos.y - interaction.dragStart.y;

  if (interaction.isNodeDragging && interaction.draggedNode) {
    const worldDelta = {
      x: deltaX / viewport.scale,
      y: deltaY / viewport.scale,
    };
    
    interaction.draggedNode.position.x += worldDelta.x;
    interaction.draggedNode.position.y += worldDelta.y;
    interaction.dragStart = pos;
  } else if (interaction.isDragging) {
    viewport.x = interaction.lastPanPoint.x + deltaX / viewport.scale;
    viewport.y = interaction.lastPanPoint.y + deltaY / viewport.scale;
  }

  if (!canvas.value) return;
  const ctx = canvas.value.getContext("2d");
  if (ctx) drawSitemap(ctx);
}

function handleMouseUp(event: MouseEvent) {
  if (interaction.isNodeDragging && selectedNode.value) {
    const pos = getMousePos(event);
    const worldPos = getScreenToWorld(pos.x, pos.y);
    
    // Check if it's a click (small movement)
    const deltaX = Math.abs(pos.x - interaction.dragStart.x);
    const deltaY = Math.abs(pos.y - interaction.dragStart.y);
    
    if (deltaX < 5 && deltaY < 5) {
      // Handle node click
      if (selectedNode.value.data.url && !selectedNode.value.data.isIntermediate) {
        window.open(selectedNode.value.data.url, "_blank");
      }
    }
  }

  interaction.isDragging = false;
  interaction.isNodeDragging = false;
  interaction.draggedNode = null;
}

function handleWheel(event: WheelEvent) {
  event.preventDefault();
  
  if (!canvas.value) return;
  
  const pos = getMousePos(event);
  const worldPosBefore = getScreenToWorld(pos.x, pos.y);
  
  const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.max(viewport.minScale, Math.min(viewport.maxScale, viewport.scale * zoomFactor));
  
  if (newScale !== viewport.scale) {
    viewport.scale = newScale;
    
    const worldPosAfter = getScreenToWorld(pos.x, pos.y);
    viewport.x += worldPosAfter.x - worldPosBefore.x;
    viewport.y += worldPosAfter.y - worldPosBefore.y;
    
    const ctx = canvas.value.getContext("2d");
    if (ctx) drawSitemap(ctx);
  }
}

// Touch event handlers
function getTouchDistance(touches: TouchList) {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getTouchCenter(touches: TouchList) {
  let x = 0, y = 0;
  for (let i = 0; i < touches.length; i++) {
    x += touches[i].clientX;
    y += touches[i].clientY;
  }
  return { x: x / touches.length, y: y / touches.length };
}

function handleTouchStart(event: TouchEvent) {
  event.preventDefault();
  
  if (event.touches.length === 1) {
    const pos = getMousePos(event.touches[0]);
    const worldPos = getScreenToWorld(pos.x, pos.y);
    const node = getNodeAtPosition(worldPos.x, worldPos.y);

    if (node) {
      selectedNode.value = node;
      interaction.isNodeDragging = true;
      interaction.draggedNode = node;
    } else {
      selectedNode.value = null;
      interaction.isDragging = true;
    }

    interaction.dragStart = pos;
    interaction.lastPanPoint = { x: viewport.x, y: viewport.y };
  } else if (event.touches.length === 2) {
    // Pinch zoom
    touch.isActive = true;
    touch.initialDistance = getTouchDistance(event.touches);
    touch.initialScale = viewport.scale;
    touch.center = getTouchCenter(event.touches);
    
    interaction.isDragging = false;
    interaction.isNodeDragging = false;
  }
  
  if (!canvas.value) return;
  const ctx = canvas.value.getContext("2d");
  if (ctx) drawSitemap(ctx);
}

function handleTouchMove(event: TouchEvent) {
  event.preventDefault();
  
  if (event.touches.length === 1 && (interaction.isDragging || interaction.isNodeDragging)) {
    const pos = getMousePos(event.touches[0]);
    const deltaX = pos.x - interaction.dragStart.x;
    const deltaY = pos.y - interaction.dragStart.y;

    if (interaction.isNodeDragging && interaction.draggedNode) {
      const worldDelta = {
        x: deltaX / viewport.scale,
        y: deltaY / viewport.scale,
      };
      
      interaction.draggedNode.position.x += worldDelta.x;
      interaction.draggedNode.position.y += worldDelta.y;
      interaction.dragStart = pos;
    } else if (interaction.isDragging) {
      viewport.x = interaction.lastPanPoint.x + deltaX / viewport.scale;
      viewport.y = interaction.lastPanPoint.y + deltaY / viewport.scale;
    }
  } else if (event.touches.length === 2 && touch.isActive) {
    // Pinch zoom
    const currentDistance = getTouchDistance(event.touches);
    const currentCenter = getTouchCenter(event.touches);
    
    if (touch.initialDistance > 0) {
      const scaleChange = currentDistance / touch.initialDistance;
      const newScale = Math.max(viewport.minScale, Math.min(viewport.maxScale, touch.initialScale * scaleChange));
      
      if (newScale !== viewport.scale) {
        const canvasRect = canvas.value?.getBoundingClientRect();
        if (canvasRect) {
          const centerX = currentCenter.x - canvasRect.left;
          const centerY = currentCenter.y - canvasRect.top;
          
          const worldPosBefore = getScreenToWorld(centerX, centerY);
          viewport.scale = newScale;
          const worldPosAfter = getScreenToWorld(centerX, centerY);
          
          viewport.x += worldPosAfter.x - worldPosBefore.x;
          viewport.y += worldPosAfter.y - worldPosBefore.y;
        }
      }
    }
  }

  if (!canvas.value) return;
  const ctx = canvas.value.getContext("2d");
  if (ctx) drawSitemap(ctx);
}

function handleTouchEnd(event: TouchEvent) {
  if (event.touches.length === 0) {
    if (interaction.isNodeDragging && selectedNode.value && event.changedTouches.length === 1) {
      // Handle tap on node
      if (selectedNode.value.data.url && !selectedNode.value.data.isIntermediate) {
        window.open(selectedNode.value.data.url, "_blank");
      }
    }
    
    interaction.isDragging = false;
    interaction.isNodeDragging = false;
    interaction.draggedNode = null;
    touch.isActive = false;
  } else if (event.touches.length === 1) {
    touch.isActive = false;
  }
}

function handleResize() {
  if (!canvas.value || !canvasContainer.value) return;
  
  const rect = canvasContainer.value.getBoundingClientRect();
  canvas.value.width = rect.width * window.devicePixelRatio;
  canvas.value.height = rect.height * window.devicePixelRatio;
  
  const ctx = canvas.value.getContext("2d");
  if (!ctx) return;
  
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  canvas.value.style.width = rect.width + "px";
  canvas.value.style.height = rect.height + "px";
  
  drawSitemap(ctx);
}

// Zoom control functions
function zoomIn() {
  if (!canvas.value) return;
  
  const centerX = canvas.value.width / (2 * window.devicePixelRatio);
  const centerY = canvas.value.height / (2 * window.devicePixelRatio);
  const worldPosBefore = getScreenToWorld(centerX, centerY);
  
  const newScale = Math.min(viewport.maxScale, viewport.scale * 1.2);
  if (newScale !== viewport.scale) {
    viewport.scale = newScale;
    const worldPosAfter = getScreenToWorld(centerX, centerY);
    viewport.x += worldPosAfter.x - worldPosBefore.x;
    viewport.y += worldPosAfter.y - worldPosBefore.y;
    
    const ctx = canvas.value.getContext("2d");
    if (ctx) drawSitemap(ctx);
  }
}

function zoomOut() {
  if (!canvas.value) return;
  
  const centerX = canvas.value.width / (2 * window.devicePixelRatio);
  const centerY = canvas.value.height / (2 * window.devicePixelRatio);
  const worldPosBefore = getScreenToWorld(centerX, centerY);
  
  const newScale = Math.max(viewport.minScale, viewport.scale / 1.2);
  if (newScale !== viewport.scale) {
    viewport.scale = newScale;
    const worldPosAfter = getScreenToWorld(centerX, centerY);
    viewport.x += worldPosAfter.x - worldPosBefore.x;
    viewport.y += worldPosAfter.y - worldPosBefore.y;
    
    const ctx = canvas.value.getContext("2d");
    if (ctx) drawSitemap(ctx);
  }
}

function resetView() {
  if (!canvas.value || nodes.value.length === 0) return;
  
  const firstNode = nodes.value[0];
  viewport.x = -(firstNode.position.x - 400);
  viewport.y = -(firstNode.position.y - 300);
  viewport.scale = 0.8;
  
  const ctx = canvas.value.getContext("2d");
  if (ctx) drawSitemap(ctx);
}

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});
</script>

<template>
  <div class="flex h-full w-full flex-col gap-4">
    <Button as-child variant="link" class="px-0">
      <NuxtLink
        :to="`/projects/${route.params.id}/details`"
        class="flex w-fit items-center gap-2"
      >
        <Icon name="mdi-arrow-left" />
        プロジェクト詳細へ戻る
      </NuxtLink>
    </Button>

    <div
      ref="canvasContainer"
      class="relative w-full flex-1 rounded-lg border border-border border-dashed overflow-hidden"
    >
      <!-- Loading state -->
      <div
        v-if="isLoading"
        class="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10"
      >
        <div class="flex flex-col items-center gap-4">
          <div class="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
          <p class="text-sm text-muted-foreground">サイトマップを読み込み中...</p>
        </div>
      </div>

      <!-- Canvas -->
      <canvas
        ref="canvas"
        class="w-full h-full cursor-grab active:cursor-grabbing"
        :class="{ 
          'cursor-pointer': selectedNode,
          'cursor-grabbing': interaction.isDragging || interaction.isNodeDragging 
        }"
      />

      <!-- Controls Panel -->
      <div class="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg border border-border p-4 shadow-lg">
        <div v-if="isLoading" class="flex flex-col gap-2">
          <Skeleton class="h-6 w-64" />
          <Skeleton class="h-3 w-48" />
        </div>
        <div v-else class="flex flex-col gap-2">
          <h3 class="font-semibold text-lg">
            {{ myProject?.name || 'プロジェクトが見つかりません' }}
          </h3>
          <p class="text-sm text-muted-foreground">
            {{ myProject?.description || 'プロジェクトの説明がありません' }}
          </p>
          <div class="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <span>ノード数: {{ nodes.length }}</span>
            <span>•</span>
            <span>ズーム: {{ Math.round(viewport.scale * 100) }}%</span>
          </div>
        </div>
      </div>

      <!-- Zoom Controls -->
      <div class="absolute bottom-4 right-4 flex flex-col gap-2">
        <Button
          size="sm"
          variant="outline"
          class="w-10 h-10 p-0 bg-background/90 backdrop-blur-sm"
          @click="zoomIn"
          :disabled="viewport.scale >= viewport.maxScale"
        >
          <Icon name="mdi-plus" class="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          class="w-10 h-10 p-0 bg-background/90 backdrop-blur-sm"
          @click="zoomOut"
          :disabled="viewport.scale <= viewport.minScale"
        >
          <Icon name="mdi-minus" class="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          class="w-10 h-10 p-0 bg-background/90 backdrop-blur-sm"
          @click="resetView"
        >
          <Icon name="mdi-fit-to-page-outline" class="w-4 h-4" />
        </Button>
      </div>

      <!-- Selected Node Info -->
      <div
        v-if="selectedNode"
        class="absolute top-4 right-4 bg-background/95 backdrop-blur-sm rounded-lg border border-border p-4 shadow-lg max-w-xs"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <h4 class="font-medium text-sm mb-1 truncate">
              {{ selectedNode.data.title || selectedNode.id }}
            </h4>
            <p class="text-xs text-muted-foreground break-all">
              {{ selectedNode.data.url }}
            </p>
            <div v-if="selectedNode.data.isIntermediate" class="flex items-center gap-1 mt-2">
              <Icon name="mdi-alert-circle" class="w-3 h-3 text-destructive" />
              <span class="text-xs text-destructive">このページは存在しません</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            class="w-6 h-6 p-0 shrink-0"
            @click="selectedNode = null"
          >
            <Icon name="mdi-close" class="w-3 h-3" />
          </Button>
        </div>
      </div>

      <!-- Instructions -->
      <div class="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg border border-border p-3 text-xs text-muted-foreground">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <Icon name="mdi-mouse" class="w-3 h-3" />
            <span>ドラッグして移動、ホイールでズーム</span>
          </div>
          <div class="flex items-center gap-2">
            <Icon name="mdi-gesture-tap" class="w-3 h-3" />
            <span>ピンチでズーム、タップで選択</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
canvas {
  touch-action: none;
  user-select: none;
}

.cursor-grab {
  cursor: grab;
}

.cursor-grabbing {
  cursor: grabbing;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
