<script setup lang="ts">
import { useForm } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import * as z from "zod";
import { toast } from "vue-sonner";
import type { Node, Edge } from "@vue-flow/core";
import { VueFlow } from "@vue-flow/core";

const config = useRuntimeConfig();
const route = useRoute();
const router = useRouter();
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const errorMessage = ref<string | null>(null);
const isLoading = ref<boolean>(false);
const CRAWL_API_URL = config.public.crawlApiUrl || "http://localhost:8080";
const crawlResult = ref<any>(null);

definePageMeta({
  middleware: "auth",
  layout: "default",
});
</script>

<template>
  <div id="dashboard" class="grid w-full gap-8">
    <PageTitle
      title="ダッシュボード"
      description="サイトマップを作成するためのフォームです。"
      size="large"
    />
  </div>
</template>
