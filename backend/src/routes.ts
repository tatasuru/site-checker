import { createPlaywrightRouter, Dataset } from "crawlee";
import path from "path";

// createPlaywrightRouter() is only a helper to get better
// intellisense and typings. You can use Router.create() too.
export const router = createPlaywrightRouter();

// This replaces the request.label === DETAIL branch of the if clause.
router.addHandler("DETAIL", async ({ request, page, log }) => {
  log.debug(`Extracting data: ${request.url}`);
  const urlPart = request.url.split("/").slice(-1); // ['sennheiser-mke-440-professional-stereo-shotgun-microphone-mke-440']
  const manufacturer = urlPart[0].split("-")[0]; // 'sennheiser'

  const title = await page.locator(".product-meta h1").textContent();
  const sku = await page.locator("span.product-meta__sku-number").textContent();

  const priceElement = page
    .locator("span.price")
    .filter({
      hasText: /¥|€|\$/,
    })
    .first();

  const currentPriceString = await priceElement.textContent();
  const rawPrice = currentPriceString?.split("$")[1];
  const price = Number(rawPrice?.replaceAll(",", ""));

  const inStockElement = page
    .locator("span.product-form__inventory")
    .filter({
      hasText: "In stock",
    })
    .first();

  const inStock = (await inStockElement.count()) > 0;

  // TODO: スクリーンショットを取得する
  // const imageElement = await page.$(".aspect-ratio img");
  // let imageUrl = null;
  // if (imageElement) {
  //   imageUrl = await imageElement.getAttribute("src");

  //   // もしも imageUrl が相対パスであれば、絶対パスに変換する
  //   if (imageUrl && !imageUrl.startsWith("http")) {
  //     const baseUrl = new URL(request.loadedUrl);
  //     imageUrl = new URL(imageUrl, baseUrl).href;
  //   }
  // }

  const results = {
    url: request.url,
    manufacturer,
    title,
    sku,
    currentPrice: price,
    availableInStock: inStock,
    // image: imageUrl,
  };

  log.debug(`Data: ${request}`);
  await Dataset.pushData(results);
});

router.addHandler("CATEGORY", async ({ page, enqueueLinks, request, log }) => {
  log.debug(`CATEGORY: ${request.url}`);
  await page.waitForSelector(".product-item > a");
  await enqueueLinks({
    selector: ".product-item > a",
    label: "DETAIL", // <= note the different label
  });

  const nextButton = await page.$("a.pagination__next");
  if (nextButton) {
    await enqueueLinks({
      selector: "a.pagination__next",
      label: "CATEGORY",
    });
  }
});

// This is a fallback route which will handle the start URL
// as well as the LIST labeled URLs.
router.addDefaultHandler(async ({ request, page, enqueueLinks, log }) => {
  log.debug(`Enqueueing categories from page: ${request.url}`);
  await page.waitForSelector(".collection-block-item");
  await enqueueLinks({
    selector: ".collection-block-item",
    label: "CATEGORY",
  });

  log.debug(`ALL: ${request.url}`);
});
