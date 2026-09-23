import { expect, test } from "@playwright/test";
import { installApiMocks, service } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
  await installApiMocks(page, { user: null });
  await page.route("**/api/v1/services/popular*", (route) =>
    route.fulfill({
      json: { data: [{ category: "MATHEMATICS", services: [service] }] },
    }),
  );
});

test("наклон следует за курсором, сбрасывается и не мешает переходу", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const card = page.locator(".home-service-perspective").first();
  const surface = card.locator(".home-service-surface");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveCSS("opacity", "1");
  await expect(card).toHaveCSS("transform", "none");
  await card.hover({ position: { x: 45, y: 45 } });
  await expect
    .poll(() =>
      surface.evaluate(
        (element) => new DOMMatrix(getComputedStyle(element).transform).m13,
      ),
    )
    .toBeGreaterThan(0.015);
  const box = await card.boundingBox();
  if (!box) throw new Error("Card not rendered");
  await card.hover({ position: { x: box.width - 45, y: box.height - 45 } });
  await expect
    .poll(() =>
      surface.evaluate(
        (element) => new DOMMatrix(getComputedStyle(element).transform).m13,
      ),
    )
    .toBeLessThan(-0.015);
  await expect
    .poll(() =>
      surface.evaluate((element) =>
        getComputedStyle(element)
          .getPropertyValue("--card-light-opacity")
          .trim(),
      ),
    )
    .toBe("1");
  await page.mouse.move(0, 0);
  await expect(surface).toHaveCSS("transform", "none");
  await expect
    .poll(() =>
      surface.evaluate((element) =>
        getComputedStyle(element)
          .getPropertyValue("--card-light-opacity")
          .trim(),
      ),
    )
    .toBe("0");
  await card.getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(`/services/${service.id}$`));
});

test("текст появляется при скролле, иконки реагируют, reduced motion отключает эффекты", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const heading = page.getByRole("heading", {
    name: "Как это работает",
    exact: true,
  });
  await expect(heading).toHaveCSS("opacity", "0");
  await heading.scrollIntoViewIfNeeded();
  await expect(heading).toHaveCSS("opacity", "1");
  const category = page.locator(".home-category").first();
  await category.scrollIntoViewIfNeeded();
  await category.hover();
  await expect(category.locator(".home-category-icon svg")).toHaveCSS(
    "animation-name",
    "home-icon-wiggle",
  );
  const card = page.locator(".home-service-perspective").first();
  await card.scrollIntoViewIfNeeded();
  await card.hover({ position: { x: 40, y: 40 } });
  const surface = card.locator(".home-service-surface");
  await expect(surface).not.toHaveCSS("transform", "none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(surface).toHaveCSS("transform", "none");
  await expect(page.locator(".home-feature").last()).toHaveCSS("opacity", "1");
  await expect(page.locator(".home-feature h3").last()).toHaveCSS(
    "opacity",
    "1",
  );
  await category.hover();
  await expect(category.locator(".home-category-icon svg")).toHaveCSS(
    "animation-name",
    "none",
  );
});

test.describe("сенсорный экран", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  test("карточка не наклоняется от касания", async ({ page }) => {
    await page.goto("/");
    const card = page.locator(".home-service-perspective").first();
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveCSS("opacity", "1");
    await card.dispatchEvent("pointermove", {
      pointerType: "touch",
      clientX: 60,
      clientY: 90,
    });
    await expect(card.locator(".home-service-surface")).toHaveCSS(
      "transform",
      "none",
    );
    await card.getByRole("link").tap();
    await expect(page).toHaveURL(new RegExp(`/services/${service.id}$`));
  });
});
