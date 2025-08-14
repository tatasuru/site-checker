<script setup lang="ts">
// https://developer.mozilla.org/ja/docs/Web/API/Window/requestAnimationFrame ⇦ パフォーマンス向上のためにrequestAnimationFrameを使用
// 表示領域だけを描画することでパフォーマンスを向上させる
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
const store = useSidebarStore();

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

// Performance optimization state
const nodeMap = ref<Map<string, Node>>(new Map());
let animationId: number | null = null;

// Interaction state
const interaction = reactive({
  isDragging: false,
  isNodeDragging: false,
  dragStart: { x: 0, y: 0 },
  lastPanPoint: { x: 0, y: 0 },
  draggedNode: null as Node | null,
  hasActuallyDragged: false,
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

      nodes.value = parseSitemapData.nodes || [];
      edges.value = parseSitemapData.edges || [];

      console.log('Loaded nodes:', nodes.value.length, 'edges:', edges.value.length);

      // Create nodeMap for O(1) lookups
      nodeMap.value = new Map(nodes.value.map((node) => [node.id, node]));

      // Canvas初期位置の設定
      if (nodes.value.length > 0) {
        const firstNode = nodes.value[0];
        const canvasWidth = canvasContainer.value?.clientWidth || 800;
        viewport.x = -firstNode.position.x + canvasWidth / 2;
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
    const nodeHeight = 50;

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

function isInViewport(
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  if (!canvas.value) return true;

  // Get canvas dimensions
  const canvasWidth = canvas.value.width / window.devicePixelRatio;
  const canvasHeight = canvas.value.height / window.devicePixelRatio;

  // Convert world coordinates to screen coordinates
  const screenX = (x + viewport.x) * viewport.scale;
  const screenY = (y + viewport.y) * viewport.scale;
  const screenWidth = width * viewport.scale;
  const screenHeight = height * viewport.scale;

  // Check if element is within viewport bounds (with small margin for smooth transitions)
  const margin = 50;
  return (
    screenX + screenWidth >= -margin &&
    screenX <= canvasWidth + margin &&
    screenY + screenHeight >= -margin &&
    screenY <= canvasHeight + margin
  );
}

// Performance optimized drawing with requestAnimationFrame
function scheduleRedraw() {
  if (animationId !== null) return;
  animationId = requestAnimationFrame(() => {
    if (!canvas.value) return;
    const ctx = canvas.value.getContext("2d");
    if (ctx) drawSitemap(ctx);
    animationId = null;
  });
}

function drawSitemap(ctx: CanvasRenderingContext2D) {
  console.log('Drawing sitemap - nodes:', nodes.value.length, 'edges:', edges.value.length, 'viewport:', viewport);
  
  ctx.clearRect(
    0,
    0,
    canvas.value!.width / window.devicePixelRatio,
    canvas.value!.height / window.devicePixelRatio,
  );

  ctx.save();
  ctx.translate(viewport.x * viewport.scale, viewport.y * viewport.scale);
  ctx.scale(viewport.scale, viewport.scale);

  // Draw edges first - optimized with viewport filtering and fast lookups
  const visibleEdges = edges.value.filter((edge) => {
    const sourceNode = nodeMap.value.get(edge.source);
    const targetNode = nodeMap.value.get(edge.target);

    if (!sourceNode || !targetNode) return false;

    // Calculate edge bounds for viewport culling
    const minX = Math.min(sourceNode.position.x, targetNode.position.x);
    const maxX = Math.max(
      sourceNode.position.x + 250,
      targetNode.position.x + 250,
    );
    const minY = Math.min(sourceNode.position.y, targetNode.position.y);
    const maxY = Math.max(
      sourceNode.position.y + 50,
      targetNode.position.y + 50,
    );

    return isInViewport(minX, minY, maxX - minX, maxY - minY);
  });

  visibleEdges.forEach((edge) => {
    const sourceNode = nodeMap.value.get(edge.source)!;
    const targetNode = nodeMap.value.get(edge.target)!;

    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 1;
    ctx.beginPath();

    const startX = sourceNode.position.x + 125;
    const startY = sourceNode.position.y + 50;
    const endX = targetNode.position.x + 125;
    const endY = targetNode.position.y;

    // LOD: Use simple lines for small scale, bezier curves for larger scale
    if (viewport.scale < 0.5) {
      // Simple line for better performance at small scales
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
    } else {
      // Smooth bezier curve for detailed view
      const distance = Math.abs(endY - startY);
      const controlOffset = Math.min(distance * 0.6, 80);
      const controlY1 = startY + controlOffset;
      const controlY2 = endY - controlOffset;

      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(startX, controlY1, endX, controlY2, endX, endY);
    }

    ctx.stroke();
  });

  // Draw nodes
  nodes.value.forEach((node) => {
    const nodeWidth = 250;
    const nodeHeight = 50;

    // Skip rendering if node is outside viewport
    if (
      !isInViewport(node.position.x, node.position.y, nodeWidth, nodeHeight)
    ) {
      return;
    }
    const isSelected = selectedNode.value?.id === node.id;
    const isIntermediate = node.data.isIntermediate;

    // Node background
    ctx.fillStyle = isIntermediate ? "#f3f4f6" : "#ffffff";
    ctx.strokeStyle = isSelected ? "#4bba54" : "#e5e7eb";
    ctx.lineWidth = isSelected ? 3 : 1;

    // Draw rounded rectangle for node background
    const borderRadius = 6;
    ctx.beginPath();
    ctx.roundRect(
      node.position.x,
      node.position.y,
      nodeWidth,
      nodeHeight,
      borderRadius,
    );
    ctx.fill();
    ctx.stroke();

    // Title
    ctx.fillStyle = "#1f2937";
    ctx.font = "14px system-ui, -apple-system, sans-serif";
    const title = node.data.title || node.id;
    const maxWidth = nodeWidth - 24; // 12px padding on each side

    // Measure text width and truncate if necessary
    let truncatedTitle = title;
    if (ctx.measureText(title).width > maxWidth) {
      // Binary search for optimal truncation point
      let start = 0;
      let end = title.length;

      while (start < end) {
        const mid = Math.floor((start + end + 1) / 2);
        const testText = title.substring(0, mid) + "...";

        if (ctx.measureText(testText).width <= maxWidth) {
          start = mid;
        } else {
          end = mid - 1;
        }
      }

      truncatedTitle = title.substring(0, start) + "...";
    }

    ctx.fillText(truncatedTitle, node.position.x + 12, node.position.y + 20);

    // URL
    ctx.fillStyle = isIntermediate ? "#9ca3af" : "#3b82f6";
    ctx.font = "12px system-ui, -apple-system, sans-serif";
    const url = node.data.url || "";
    const urlMaxWidth = nodeWidth - 24; // 12px padding on each side

    // Measure URL width and truncate if necessary
    let truncatedUrl = url;
    if (ctx.measureText(url).width > urlMaxWidth) {
      // Binary search for optimal truncation point
      let start = 0;
      let end = url.length;

      while (start < end) {
        const mid = Math.floor((start + end + 1) / 2);
        const testText = url.substring(0, mid) + "...";

        if (ctx.measureText(testText).width <= urlMaxWidth) {
          start = mid;
        } else {
          end = mid - 1;
        }
      }

      truncatedUrl = url.substring(0, start) + "...";
    }

    ctx.fillText(truncatedUrl, node.position.x + 12, node.position.y + 38);

    // Error indicator for intermediate nodes
    if (isIntermediate) {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(
        node.position.x + nodeWidth - 20,
        node.position.y + 15,
        7,
        0,
        2 * Math.PI,
      );
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "12px system-ui, -apple-system, sans-serif";
      ctx.fillText(
        "!",
        node.position.x + nodeWidth - 22,
        node.position.y + 19.5,
      );
    }
  });

  // Draw connection dots
  nodes.value.forEach((node) => {
    const nodeWidth = 250;
    const nodeHeight = 50;

    // Skip rendering if node is outside viewport
    if (
      !isInViewport(node.position.x, node.position.y, nodeWidth, nodeHeight)
    ) {
      return;
    }

    // Check if node has outgoing edges (source)
    const hasOutgoingEdge = edges.value.some((edge) => edge.source === node.id);

    // Check if node has incoming edges (target)
    const hasIncomingEdge = edges.value.some((edge) => edge.target === node.id);

    // Draw bottom dot for outgoing edges
    if (hasOutgoingEdge) {
      ctx.fillStyle = "#6b7280";
      ctx.beginPath();
      ctx.arc(
        node.position.x + nodeWidth / 2,
        node.position.y + nodeHeight,
        4,
        0,
        2 * Math.PI,
      );
      ctx.fill();

      // Add white border
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw top dot for incoming edges
    if (hasIncomingEdge) {
      ctx.fillStyle = "#6b7280";
      ctx.beginPath();
      ctx.arc(
        node.position.x + nodeWidth / 2,
        node.position.y,
        4,
        0,
        2 * Math.PI,
      );
      ctx.fill();

      // Add white border
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
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
  canvas.value.addEventListener("touchstart", handleTouchStart, {
    passive: false,
  });
  canvas.value.addEventListener("touchmove", handleTouchMove, {
    passive: false,
  });
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
  interaction.hasActuallyDragged = false;

  if (!canvas.value) return;
  scheduleRedraw();
}

function handleMouseMove(event: MouseEvent) {
  if (!interaction.isDragging && !interaction.isNodeDragging) return;

  const pos = getMousePos(event);
  const deltaX = pos.x - interaction.dragStart.x;
  const deltaY = pos.y - interaction.dragStart.y;

  // Mark that actual dragging has occurred
  if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
    interaction.hasActuallyDragged = true;
  }

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
  scheduleRedraw();
}

function handleMouseUp() {
  if (interaction.isNodeDragging && selectedNode.value) {
    // Node selection (no URL navigation)
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
  const newScale = Math.max(
    viewport.minScale,
    Math.min(viewport.maxScale, viewport.scale * zoomFactor),
  );

  if (newScale !== viewport.scale) {
    viewport.scale = newScale;

    const worldPosAfter = getScreenToWorld(pos.x, pos.y);
    viewport.x += worldPosAfter.x - worldPosBefore.x;
    viewport.y += worldPosAfter.y - worldPosBefore.y;

    scheduleRedraw();
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
  let x = 0,
    y = 0;
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
  scheduleRedraw();
}

function handleTouchMove(event: TouchEvent) {
  event.preventDefault();

  if (
    event.touches.length === 1 &&
    (interaction.isDragging || interaction.isNodeDragging)
  ) {
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
      const newScale = Math.max(
        viewport.minScale,
        Math.min(viewport.maxScale, touch.initialScale * scaleChange),
      );

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
  scheduleRedraw();
}

function handleTouchEnd(event: TouchEvent) {
  if (event.touches.length === 0) {
    if (
      interaction.isNodeDragging &&
      selectedNode.value &&
      event.changedTouches.length === 1
    ) {
      // Handle tap on node (no URL navigation)
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

  scheduleRedraw();
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

    scheduleRedraw();
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

    scheduleRedraw();
  }
}

function resetView() {
  if (!canvas.value || nodes.value.length === 0) return;

  const firstNode = nodes.value[0];
  const canvasWidth = canvasContainer.value?.clientWidth || 800;
  viewport.x = -firstNode.position.x + canvasWidth / 2;
  viewport.y = -(firstNode.position.y - 300);
  viewport.scale = 0.8;

  scheduleRedraw();
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
      class="border-border relative w-full flex-1 overflow-hidden rounded-lg border border-dashed"
    >
      <!-- Loading state -->
      <div
        v-if="isLoading"
        class="bg-background/80 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm"
      >
        <div class="flex flex-col items-center gap-4">
          <div
            class="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          ></div>
          <p class="text-muted-foreground text-sm">
            サイトマップを読み込み中...
          </p>
        </div>
      </div>

      <!-- Canvas -->
      <canvas
        ref="canvas"
        class="h-full w-full cursor-grab active:cursor-grabbing"
        :class="{
          'cursor-pointer': selectedNode,
          'cursor-grabbing':
            interaction.isDragging || interaction.isNodeDragging,
        }"
      />

      <!-- Controls Panel -->
      <div
        class="bg-background/90 border-border absolute top-4 left-4 rounded-lg border p-4 shadow-lg backdrop-blur-sm"
      >
        <div v-if="isLoading" class="flex flex-col gap-2">
          <Skeleton class="h-6 w-64" />
          <Skeleton class="h-3 w-48" />
        </div>
        <div v-else class="flex flex-col gap-2">
          <h3 class="text-lg font-semibold">
            {{ myProject?.name || "プロジェクトが見つかりません" }}
          </h3>
          <p class="text-muted-foreground text-sm">
            {{ myProject?.description || "プロジェクトの説明がありません" }}
          </p>
          <div
            class="text-muted-foreground mt-2 flex items-center gap-2 text-xs"
          >
            <span>ページ数: {{ nodes.length }}</span>
            <span>•</span>
            <span>ズーム: {{ Math.round(viewport.scale * 100) }}%</span>
          </div>
        </div>
      </div>

      <!-- Zoom Controls -->
      <div class="absolute right-4 bottom-4 flex flex-col gap-2">
        <Button
          size="sm"
          variant="outline"
          class="bg-background/90 h-10 w-10 p-0 backdrop-blur-sm"
          @click="zoomIn"
          :disabled="viewport.scale >= viewport.maxScale"
        >
          <Icon name="mdi-plus" class="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          class="bg-background/90 h-10 w-10 p-0 backdrop-blur-sm"
          @click="zoomOut"
          :disabled="viewport.scale <= viewport.minScale"
        >
          <Icon name="mdi-minus" class="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          class="bg-background/90 h-10 w-10 p-0 backdrop-blur-sm"
          @click="resetView"
        >
          <Icon name="mdi-fit-to-page-outline" class="h-4 w-4" />
        </Button>
      </div>

      <!-- Selected Node Info -->
      <div
        v-if="selectedNode"
        class="bg-background/95 border-border absolute top-4 right-4 flex w-fit min-w-[300px] items-start justify-between gap-4 rounded-lg border p-4 shadow-lg backdrop-blur-sm"
      >
        <div class="w-full">
          <h4 class="text-sm font-medium">
            {{ selectedNode.data.title || selectedNode.id }}
          </h4>
          <NuxtLink
            v-if="!selectedNode.data.isIntermediate"
            :to="selectedNode.data.url"
            target="_blank"
            class="text-link text-xs break-all"
          >
            {{ selectedNode.data.url }}
          </NuxtLink>
          <div
            v-if="selectedNode.data.isIntermediate"
            class="mt-2 flex items-center gap-1"
          >
            <Icon name="mdi-alert-circle" class="text-destructive h-3 w-3" />
            <span class="text-destructive text-xs">
              このページは存在しません
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          class="relative -top-3 -right-3 h-6 w-6 shrink-0 p-0"
          @click="selectedNode = null"
        >
          <Icon name="mdi-close" class="h-3 w-3" />
        </Button>
      </div>

      <!-- Instructions -->
      <div
        class="bg-background/90 border-border text-muted-foreground absolute bottom-4 left-4 rounded-lg border p-3 text-xs backdrop-blur-sm"
      >
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <Icon name="mdi-mouse" class="h-3 w-3" />
            <span>ドラッグして移動、ホイールでズーム</span>
          </div>
          <div class="flex items-center gap-2">
            <Icon name="mdi-gesture-tap" class="h-3 w-3" />
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
