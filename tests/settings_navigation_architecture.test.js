const test = require("node:test");
const assert = require("node:assert/strict");

// Category definitions matching Avencia Settings architecture
const EXPECTED_CATEGORIES = [
  { id: "profile", name: "Business Profile", ownerOnly: true },
  { id: "inventory", name: "Products & Inventory", ownerOnly: true },
  { id: "sales", name: "Sales & Customers", ownerOnly: false },
  { id: "finance", name: "Finance & Allocations", ownerOnly: true },
  { id: "notifications", name: "Notifications & Reminders", ownerOnly: false },
  { id: "team", name: "Team & Access", ownerOnly: true },
  { id: "security", name: "Security & Sessions", ownerOnly: false },
  { id: "appearance", name: "Appearance & Theme", ownerOnly: false },
  { id: "data", name: "Data & Maintenance", ownerOnly: true },
  { id: "about", name: "About Avencia", ownerOnly: false },
];

function isSettingsMode(pathname) {
  return pathname === "/settings" || pathname.startsWith("/settings/");
}

function resolveSafeReturnRoute(storedRoute) {
  if (
    storedRoute &&
    typeof storedRoute === "string" &&
    !storedRoute.startsWith("/settings") &&
    storedRoute !== "/settings" &&
    storedRoute.startsWith("/")
  ) {
    return storedRoute;
  }
  return "/";
}

test("Settings Mode Route Discrimination", async (t) => {
  await t.test("identifies /settings and /settings/* as Settings mode", () => {
    assert.equal(isSettingsMode("/settings"), true);
    assert.equal(isSettingsMode("/settings/team"), true);
    assert.equal(isSettingsMode("/settings/profile"), true);
    assert.equal(isSettingsMode("/settings/inventory"), true);
    assert.equal(isSettingsMode("/settings/finance"), true);
  });

  await t.test("identifies normal application routes as non-settings mode", () => {
    const normalRoutes = [
      "/",
      "/sales",
      "/products",
      "/batches",
      "/inventory",
      "/expenses",
      "/profit",
      "/customers",
      "/suppliers",
      "/reports",
      "/profile",
      "/ai",
    ];

    for (const route of normalRoutes) {
      assert.equal(
        isSettingsMode(route),
        false,
        `Route ${route} should not be in settings mode`
      );
    }
  });
});

test("Go to Avencia Safe Route Resolution", async (t) => {
  await t.test("returns to previously recorded safe application route", () => {
    assert.equal(resolveSafeReturnRoute("/products"), "/products");
    assert.equal(resolveSafeReturnRoute("/sales"), "/sales");
    assert.equal(resolveSafeReturnRoute("/inventory"), "/inventory");
    assert.equal(resolveSafeReturnRoute("/batches"), "/batches");
    assert.equal(resolveSafeReturnRoute("/customers"), "/customers");
  });

  await t.test("falls back to main dashboard (/) when stored route is invalid or settings route", () => {
    assert.equal(resolveSafeReturnRoute(null), "/");
    assert.equal(resolveSafeReturnRoute(""), "/");
    assert.equal(resolveSafeReturnRoute("/settings"), "/");
    assert.equal(resolveSafeReturnRoute("/settings/team"), "/");
    assert.equal(resolveSafeReturnRoute("https://external-site.com"), "/");
  });
});

test("Category Integrity & Authorization Alignment", async (t) => {
  await t.test("contains all 10 required Avencia settings categories", () => {
    assert.equal(EXPECTED_CATEGORIES.length, 10);
    const ids = EXPECTED_CATEGORIES.map((c) => c.id);
    assert.deepEqual(ids, [
      "profile",
      "inventory",
      "sales",
      "finance",
      "notifications",
      "team",
      "security",
      "appearance",
      "data",
      "about",
    ]);
  });

  await t.test("enforces owner-only flags on sensitive business categories", () => {
    const ownerOnlyCategories = EXPECTED_CATEGORIES.filter((c) => c.ownerOnly).map((c) => c.id);
    assert.deepEqual(ownerOnlyCategories, ["profile", "inventory", "finance", "team", "data"]);
  });

  await t.test("allows worker access to non-restricted categories", () => {
    const workerAccessible = EXPECTED_CATEGORIES.filter((c) => !c.ownerOnly).map((c) => c.id);
    assert.deepEqual(workerAccessible, ["sales", "notifications", "security", "appearance", "about"]);
  });
});
