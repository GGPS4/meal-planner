/*
 * script.js
 * Kosher Protein Planner. Plain JavaScript, no build step, no backend.
 *
 * How it fits together
 *   1. Data:    data.js defines window.PLANNER_DATA (items, recipes, add-ons, default week).
 *   2. State:   a copy of that data plus your edits, saved to localStorage.
 *   3. Math:    pure functions compute protein, grocery quantities, cost and tax from state.
 *   4. Views:   each section renders from state. Any change calls commit(), which saves
 *               and re-renders, so every total on every page stays in sync.
 *   5. Events:  one delegated click handler and one change handler, driven by data-action.
 */
(function () {
  "use strict";

  const DATA = window.PLANNER_DATA;
  const STORAGE_KEY = "kosher-protein-planner";
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const SLOTS = [
    { id: "breakfast", name: "Breakfast" },
    { id: "lunch", name: "Lunch" },
    { id: "dinner", name: "Dinner" },
    { id: "snack", name: "Snacks and additions" }
  ];
  const KOSHER_LABEL = { meat: "Meat", dairy: "Dairy", pareve: "Pareve", fish: "Pareve (fish)" };
  const SERVING_STEP = 0.5;
  const SERVING_MIN = 0.5;
  const SERVING_MAX = 8;

  /* ================================================================ utilities */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function round2(x) { return Math.round((x + Number.EPSILON) * 100) / 100; }

  function money(x) {
    const v = round2(x);
    return (v < 0 ? "-$" : "$") + Math.abs(v).toFixed(2);
  }

  // Protein is rounded DOWN to one decimal so the page never overstates it.
  function gramsValue(x) { return Math.floor(x * 10 + 1e-6) / 10; }
  function grams(x) { return gramsValue(x).toFixed(1) + " g"; }

  function servingsText(n) { return fmtNumber(n) + (n === 1 ? " serving" : " servings"); }

  function fmtNumber(n) {
    return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
  }

  // Kitchen-friendly fractions: 0.5 -> "½", 1.25 -> "1¼".
  const FRACTIONS = [[0, ""], [0.125, "⅛"], [0.25, "¼"], [1 / 3, "⅓"], [0.375, "⅜"],
    [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"], [1, ""]];
  function fmtQty(n) {
    if (n <= 0) return "0";
    const whole = Math.floor(n + 1e-9);
    const frac = n - whole;
    let best = FRACTIONS[0];
    for (const f of FRACTIONS) if (Math.abs(frac - f[0]) < Math.abs(frac - best[0])) best = f;
    if (Math.abs(frac - best[0]) > 0.02) return String(Math.round(n * 100) / 100);
    if (best[0] === 1) return String(whole + 1);
    if (best[0] === 0) return String(whole);
    return (whole > 0 ? String(whole) : "") + best[1];
  }

  const PLURAL_FIRST_WORD = ["egg", "can", "slice", "onion", "carrot", "banana", "cup", "package", "serving"];
  function unitText(unit, n) {
    if (n <= 1 + 1e-9) return unit;
    const parts = unit.split(" ");
    if (PLURAL_FIRST_WORD.includes(parts[0])) parts[0] += "s";
    return parts.join(" ");
  }

  function amountText(n, unit) {
    if (unit === "tsp" && n > 0 && n < 0.1) return "a pinch";
    return fmtQty(n) + " " + unitText(unit, n);
  }

  /* ---------------- dates */

  function parseISO(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d) ? null : d;
  }
  function toISO(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function mondayOf(d) {
    const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
    return copy;
  }
  function addDays(d, n) {
    const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    copy.setDate(copy.getDate() + n);
    return copy;
  }
  function shortDate(d) { return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  function longDate(d) { return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }); }
  function startDate() { return parseISO(state.settings.startDate) || mondayOf(new Date()); }
  function dayDate(i) { return addDays(startDate(), i); }
  // Index of today within the planner week, or -1 if today is outside it.
  function todayIndex() {
    const t = new Date();
    const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    const diff = Math.round((today - startDate()) / 86400000);
    return diff >= 0 && diff < 7 ? diff : -1;
  }

  /* ---------------- icons (inline SVG, stroke style) */

  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
    cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2 2h2l2.7 12.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L22 7H5.1"/>',
    wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    pencil: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    copy: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    swap: '<path d="m8 3-4 4 4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>',
    reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    calendarPlus: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M12 14v5M9.5 16.5h5"/>',
    listPlus: '<path d="M11 12H3M16 6H3M16 18H3M18 9v6M21 12h-6"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'
  };
  function icon(name, cls = "icon") {
    return '<svg class="' + cls + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[name] || "") + "</svg>";
  }

  /* ================================================================ lookups */

  const RECIPES = DATA.recipes;
  const RECIPE_BY_ID = Object.fromEntries(RECIPES.map(r => [r.id, r]));
  const ADDONS = DATA.addons;
  const ADDON_BY_ID = Object.fromEntries(ADDONS.map(a => [a.id, a]));
  const CATALOG_BY_ID = Object.fromEntries(DATA.items.map(i => [i.id, i]));

  function item(id) { return state.items.find(i => i.id === id); }

  /* ================================================================ state */

  let state = null;
  let storageOK = true;

  function defaultSlot(src) {
    return {
      recipe: src.recipe || null,
      servings: src.servings || 1,
      done: false,
      extras: clone(src.extras || []),
      note: src.note || ""
    };
  }

  function freshItem(catalogItem) {
    return Object.assign(clone(catalogItem), {
      custom: false,
      taxable: true,         // conservative default: count tax on everything
      owned: 0,              // units already at home
      ownedAll: false,       // "I already have all of it"
      purchased: false,
      removed: false,
      manualExtra: 0,        // units added from a recipe's "add missing ingredients"
      buyOverride: null,     // packages to buy; null means calculate from the plan
      verified: false        // protein value checked against a real label
    });
  }

  function defaultState() {
    return {
      v: DATA.dataVersion,
      settings: {
        startDate: toISO(mondayOf(new Date())),
        budget: DATA.defaults.budget,
        taxRate: DATA.defaults.taxRate,
        buffer: DATA.defaults.buffer,
        proteinGoal: DATA.defaults.proteinGoal
      },
      items: DATA.items.map(freshItem),
      schedule: DATA.schedule.map(day => {
        const out = {};
        SLOTS.forEach(s => { out[s.id] = defaultSlot(day[s.id] || {}); });
        return out;
      }),
      ui: { recipeFilter: "all" }
    };
  }

  // Load saved state and repair anything missing so older saves keep working.
  function loadState() {
    let saved = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      saved = raw ? JSON.parse(raw) : null;
    } catch (err) {
      storageOK = false;
      saved = null;
    }
    const base = defaultState();
    if (!saved || saved.v !== DATA.dataVersion || !Array.isArray(saved.items) || !Array.isArray(saved.schedule)) {
      return base;
    }
    const s = base;
    Object.assign(s.settings, saved.settings || {});
    if (!parseISO(s.settings.startDate)) s.settings.startDate = base.settings.startDate;
    ["budget", "taxRate", "buffer", "proteinGoal"].forEach(k => {
      if (!isFinite(Number(s.settings[k])) || Number(s.settings[k]) < 0) s.settings[k] = DATA.defaults[k];
      s.settings[k] = Number(s.settings[k]);
    });
    // Catalog items keep your edits; new catalog items are added; custom items are kept.
    s.items = DATA.items.map(ci => {
      const old = saved.items.find(x => x.id === ci.id && !x.custom);
      return old ? Object.assign(freshItem(ci), old, { custom: false, unit: ci.unit, kosher: ci.kosher }) : freshItem(ci);
    }).concat(saved.items.filter(x => x.custom && x.id && x.name));
    if (saved.schedule.length === 7) {
      s.schedule = saved.schedule.map((day, i) => {
        const out = {};
        SLOTS.forEach(sl => {
          const src = (day && day[sl.id]) || {};
          const slot = defaultSlot({});
          slot.recipe = RECIPE_BY_ID[src.recipe] ? src.recipe : null;
          slot.servings = clampServings(Number(src.servings) || 1);
          slot.done = !!src.done;
          slot.extras = (Array.isArray(src.extras) ? src.extras : [])
            .filter(e => ADDON_BY_ID[e.id] && Number(e.qty) > 0)
            .map(e => ({ id: e.id, qty: Math.round(Number(e.qty)) }));
          slot.note = typeof src.note === "string" ? src.note : "";
          out[sl.id] = slot;
        });
        return out;
      });
    }
    s.ui = Object.assign(base.ui, saved.ui || {});
    return s;
  }

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      storageOK = true;
    } catch (err) {
      storageOK = false;
    }
  }

  // Every edit goes through here: save, then re-render the whole app from state.
  function commit() {
    saveState();
    render();
  }

  function clampServings(n) {
    if (!isFinite(n)) return 1;
    return Math.min(SERVING_MAX, Math.max(SERVING_MIN, Math.round(n / SERVING_STEP) * SERVING_STEP));
  }

  /* ================================================================ calculations */

  function ingredientProtein(ing) {
    if (ing.free) return 0;
    const it = item(ing.item);
    return it ? ing.qty * Number(it.proteinPerUnit || 0) : 0;
  }

  function recipeProtein(recipe) {
    return recipe.ingredients.reduce((sum, ing) => sum + ingredientProtein(ing), 0);
  }

  // Cost of the amount actually used (not whole packages), including tax on taxable items.
  function unitCost(it) {
    if (!it || !it.packageSize) return 0;
    const pre = Number(it.price) / Number(it.packageSize);
    return it.taxable ? pre * (1 + state.settings.taxRate / 100) : pre;
  }
  function recipeCost(recipe) {
    return recipe.ingredients.reduce((sum, ing) => ing.free ? sum : sum + ing.qty * unitCost(item(ing.item)), 0);
  }

  function addonProtein(addon) {
    return addon.ingredients.reduce((sum, ing) => sum + ingredientProtein(ing), 0);
  }
  function addonCost(addon) {
    return addon.ingredients.reduce((sum, ing) => sum + ing.qty * unitCost(item(ing.item)), 0);
  }

  function slotProtein(slot) {
    let total = 0;
    const r = RECIPE_BY_ID[slot.recipe];
    if (r) total += recipeProtein(r) * slot.servings;
    slot.extras.forEach(e => { const a = ADDON_BY_ID[e.id]; if (a) total += addonProtein(a) * e.qty; });
    return total;
  }

  function dayProtein(i) {
    return SLOTS.reduce((sum, s) => sum + slotProtein(state.schedule[i][s.id]), 0);
  }
  function dayEatenProtein(i) {
    return SLOTS.reduce((sum, s) => {
      const slot = state.schedule[i][s.id];
      return slot.done ? sum + slotProtein(slot) : sum;
    }, 0);
  }
  function meetsGoal(total) { return total + 1e-9 >= state.settings.proteinGoal; }

  // True only if every protein-bearing ingredient used that day has been checked against a label.
  function dayVerified(i) {
    const used = new Set();
    SLOTS.forEach(s => {
      const slot = state.schedule[i][s.id];
      const r = RECIPE_BY_ID[slot.recipe];
      if (r) r.ingredients.forEach(ing => { if (!ing.free) used.add(ing.item); });
      slot.extras.forEach(e => { const a = ADDON_BY_ID[e.id]; if (a) a.ingredients.forEach(ing => used.add(ing.item)); });
    });
    const relevant = Array.from(used).map(item).filter(it => it && Number(it.proteinPerUnit) > 0);
    return relevant.length > 0 && relevant.every(it => it.verified);
  }

  // Cheapest single add-on that closes the gap to the protein goal.
  function proteinSuggestion(i) {
    const deficit = state.settings.proteinGoal - dayProtein(i);
    if (deficit <= 1e-9) return null;
    let best = null;
    ADDONS.forEach(a => {
      const p = addonProtein(a);
      if (p <= 0) return;
      const qty = Math.ceil((deficit - 1e-9) / p);
      const cost = qty * addonCost(a);
      if (!best || cost < best.cost - 1e-9 || (Math.abs(cost - best.cost) < 1e-9 && qty < best.qty)) {
        best = { addon: a, qty, cost, protein: qty * p, deficit };
      }
    });
    return best;
  }

  // Units of each grocery item the whole week's schedule needs. Shared ingredients are summed
  // once per item here, so they are never double counted when converted to packages.
  function scheduleNeeds() {
    const needs = {};
    const add = (id, q) => { needs[id] = (needs[id] || 0) + q; };
    state.schedule.forEach(day => {
      SLOTS.forEach(s => {
        const slot = day[s.id];
        const r = RECIPE_BY_ID[slot.recipe];
        if (r) r.ingredients.forEach(ing => { if (!ing.free) add(ing.item, ing.qty * slot.servings); });
        slot.extras.forEach(e => {
          const a = ADDON_BY_ID[e.id];
          if (a) a.ingredients.forEach(ing => add(ing.item, ing.qty * e.qty));
        });
      });
    });
    return needs;
  }

  // Which scheduled recipes use an item (for the shopping list).
  function itemUsedBy(id) {
    const names = new Set();
    state.schedule.forEach(day => SLOTS.forEach(s => {
      const slot = day[s.id];
      const r = RECIPE_BY_ID[slot.recipe];
      if (r && r.ingredients.some(ing => ing.item === id)) names.add(r.name);
      slot.extras.forEach(e => {
        const a = ADDON_BY_ID[e.id];
        if (a && a.ingredients.some(ing => ing.item === id)) names.add(a.short);
      });
    }));
    return Array.from(names);
  }

  function shoppingLines() {
    const needs = scheduleNeeds();
    return state.items.map(it => {
      const planNeed = it.custom ? 0 : (needs[it.id] || 0);
      const need = it.custom ? Number(it.qty || 0) : planNeed + Number(it.manualExtra || 0);
      const owned = it.custom ? 0 : (it.ownedAll ? need : Math.max(0, Number(it.owned || 0)));
      const toBuy = Math.max(0, need - owned);
      const autoPackages = it.custom ? need : Math.ceil(toBuy / it.packageSize - 1e-9);
      const packages = (!it.custom && it.buyOverride !== null && it.buyOverride !== undefined && it.buyOverride !== "")
        ? Math.max(0, Number(it.buyOverride)) : autoPackages;
      const lineCost = round2(packages * Number(it.price || 0));
      return { it, planNeed, need, owned, toBuy, packages, autoPackages, lineCost,
        overridden: packages !== autoPackages };
    });
  }

  function totals() {
    const lines = shoppingLines().filter(l => !l.it.removed);
    const subtotal = round2(lines.reduce((s, l) => s + l.lineCost, 0));
    const taxableBase = round2(lines.filter(l => l.it.taxable).reduce((s, l) => s + l.lineCost, 0));
    const tax = round2(taxableBase * state.settings.taxRate / 100);
    const total = round2(subtotal + tax);
    const budget = Number(state.settings.budget);
    const buffer = Number(state.settings.buffer);
    const purchasedLines = lines.filter(l => l.it.purchased && l.packages > 0);
    const purchasedCost = round2(purchasedLines.reduce((s, l) => s + l.lineCost, 0));
    const purchasedTax = round2(purchasedLines.filter(l => l.it.taxable).reduce((s, l) => s + l.lineCost, 0) * state.settings.taxRate / 100);
    const byCategory = DATA.categories.map(c => ({
      id: c.id, name: c.name,
      amount: round2(lines.filter(l => (l.it.category || "other") === c.id).reduce((s, l) => s + l.lineCost, 0))
    }));
    const buyCount = lines.filter(l => l.packages > 0).length;
    const boughtCount = purchasedLines.length;
    return {
      subtotal, taxableBase, tax, total, budget, buffer,
      remaining: round2(budget - total),
      remainingAfterBuffer: round2(budget - buffer - total),
      purchasedTotal: round2(purchasedCost + purchasedTax),
      byCategory, buyCount, boughtCount
    };
  }

  function weekProtein() {
    const days = DAYS.map((_, i) => dayProtein(i));
    const avg = days.reduce((a, b) => a + b, 0) / 7;
    return { days, avg, metDays: days.filter(meetsGoal).length };
  }

  // Kosher rule check for the recipe data: meat recipes may not contain dairy or fish.
  function kosherProblems() {
    const problems = [];
    RECIPES.forEach(r => {
      if (r.kosher !== "meat") return;
      r.ingredients.forEach(ing => {
        if (ing.free) return;
        const ci = CATALOG_BY_ID[ing.item];
        if (!ci) problems.push(r.name + " uses an unknown item: " + ing.item);
        else if (ci.kosher === "dairy") problems.push(r.name + " is a meat recipe but contains dairy (" + ci.name + ").");
        else if (ci.kosher === "fish") problems.push(r.name + " is a meat recipe but contains fish (" + ci.name + ").");
      });
    });
    RECIPES.forEach(r => r.ingredients.forEach(ing => {
      if (!ing.free && !CATALOG_BY_ID[ing.item] && r.kosher !== "meat") problems.push(r.name + " uses an unknown item: " + ing.item);
    }));
    return problems;
  }

  // Fish add-ons are not allowed on meat meals.
  function addonAllowed(addon, slot) {
    const r = RECIPE_BY_ID[slot.recipe];
    return !(addon.fish && r && r.kosher === "meat");
  }
  function stripFishFromMeat(slot) {
    const before = slot.extras.length;
    slot.extras = slot.extras.filter(e => addonAllowed(ADDON_BY_ID[e.id], slot));
    return before - slot.extras.length;
  }

  /* ================================================================ shared view pieces */

  function photoURL(recipe, w) {
    return "https://images.unsplash.com/photo-" + recipe.photo.id + "?auto=format&fit=crop&w=" + w + "&q=70";
  }
  function photoTag(recipe, w, cls) {
    return '<img class="' + cls + '" src="' + photoURL(recipe, w) + '" alt="' + esc(recipe.photo.alt) +
      '" loading="lazy" decoding="async" data-fallback="' + esc(recipe.name) + '">';
  }
  function kosherBadge(k) {
    return '<span class="badge badge-' + k + '">' + KOSHER_LABEL[k] + "</span>";
  }
  function estTag() {
    return '<span class="est" title="Estimated from typical nutrition values, not verified data">est.</span>';
  }

  function meter(value, goal, label) {
    const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
    const ok = meetsGoal(value);
    return '<div class="meter' + (ok ? " is-met" : "") + '" role="meter" aria-valuemin="0" aria-valuemax="' + goal +
      '" aria-valuenow="' + gramsValue(value) + '" aria-label="' + esc(label) + '"><span style="width:' + pct.toFixed(1) + '%"></span></div>';
  }

  // The week strip: one bar per day against the goal line. Used on Dashboard and Schedule.
  function weekStrip() {
    const goal = state.settings.proteinGoal;
    const days = DAYS.map((_, i) => dayProtein(i));
    const max = Math.max(goal * 1.3, ...days);
    const today = todayIndex();
    const goalPct = (goal / max) * 100;
    return '<div class="week-strip" role="list" aria-label="Estimated protein per day">' +
      DAYS.map((d, i) => {
        const v = days[i];
        const h = Math.max(2, (v / max) * 100);
        const ok = meetsGoal(v);
        return '<a role="listitem" class="ws-day' + (i === today ? " is-today" : "") + '" href="#schedule" data-action="goto-day" data-day="' + i +
          '" title="' + d + ": " + grams(v) + ' estimated">' +
          '<span class="ws-val">' + Math.floor(gramsValue(v)) + '</span>' +
          '<span class="ws-track"><span class="ws-goal" style="bottom:' + goalPct.toFixed(1) + '%"></span>' +
          '<span class="ws-bar' + (ok ? "" : " is-short") + '" style="height:' + h.toFixed(1) + '%"></span></span>' +
          '<span class="ws-label">' + d.slice(0, 3) + '</span>' +
          '<span class="sr-only">' + (ok ? "meets goal" : "below goal") + "</span></a>";
      }).join("") +
      '</div><p class="ws-legend"><span class="ws-key"></span> ' + goal + " g daily goal. Bars show estimated grams; amber bars are below the goal.</p>";
  }

  function budgetBar(t) {
    const pct = t.budget > 0 ? Math.min(100, (t.total / t.budget) * 100) : 100;
    const bufferPct = t.budget > 0 ? Math.max(0, ((t.budget - t.buffer) / t.budget) * 100) : 0;
    const state_ = t.total > t.budget ? "is-over" : (t.remainingAfterBuffer < 0 ? "is-tight" : "");
    return '<div class="budget-bar ' + state_ + '" role="meter" aria-valuemin="0" aria-valuemax="' + t.budget +
      '" aria-valuenow="' + t.total + '" aria-label="Estimated checkout total compared with the budget">' +
      '<span class="bb-fill" style="width:' + pct.toFixed(1) + '%"></span>' +
      (t.buffer > 0 ? '<span class="bb-buffer" style="left:' + bufferPct.toFixed(1) + '%" title="Contingency buffer starts here"></span>' : "") +
      "</div>" +
      '<div class="bb-scale"><span>' + money(t.total) + " of " + money(t.budget) + "</span><span>" +
      (t.buffer > 0 ? money(t.buffer) + " buffer kept aside" : "No buffer set") + "</span></div>";
  }

  function budgetWarnings(t) {
    let html = "";
    if (t.total > t.budget) {
      html += '<div class="alert alert-danger" role="alert">' + icon("alert") + "<div><strong>Over budget by " + money(t.total - t.budget) +
        ".</strong> The estimated checkout total of " + money(t.total) + " (including " + money(t.tax) + " tax) is above your " + money(t.budget) +
        " limit. Mark items you already own, lower quantities or swap a meat meal for lentils or eggs.</div></div>";
    } else if (t.remainingAfterBuffer < 0) {
      html += '<div class="alert alert-warn" role="status">' + icon("alert") + "<div><strong>Inside the limit, but the buffer is not covered.</strong> Only " +
        money(t.remaining) + " is left, less than your " + money(t.buffer) + " contingency buffer.</div></div>";
    }
    const missing = shoppingLines().filter(l => l.it.removed && l.need > 0);
    if (missing.length) {
      html += '<div class="alert alert-warn" role="status">' + icon("alert") + "<div><strong>Removed items your plan still uses:</strong> " +
        missing.map(l => esc(l.it.name)).join(", ") + ". Their cost is not in the total. Restore them on the shopping list or mark them as owned.</div></div>";
    }
    return html;
  }

  function kosherReminder(compact) {
    return '<aside class="note-card kosher-note" aria-label="Kosher reminder">' + icon("shield") +
      "<div><strong>Check certification against your household's standard.</strong> " +
      (compact ? "Packaged foods here are not assumed kosher. " :
        "This planner does not assume any packaged product is kosher. Check the hechsher on tuna, bread (must be pareve, not dairy), pasta, sauces, oil, spices, soy sauce, mayonnaise and peanut butter. No recipe here uses broth; if you add some, it needs certification too. ") +
      "Meat and dairy are never combined in these recipes, and fish is kept off meat meals.</div></aside>";
  }

  /* ================================================================ dashboard */

  function renderDashboard() {
    const t = totals();
    const w = weekProtein();
    const ti = todayIndex();
    const di = ti >= 0 ? ti : 0;
    const planned = dayProtein(di);
    const eaten = dayEatenProtein(di);
    const start = startDate();

    let todayIntro;
    if (ti >= 0) {
      todayIntro = "<h2>Today, " + longDate(dayDate(di)) + "</h2>";
    } else {
      const before = new Date() < start;
      todayIntro = "<h2>" + longDate(dayDate(0)) + "</h2>" +
        '<p class="muted">' + (before ? "Your planner week starts on " + longDate(start) + "." :
          "This planner week ended on " + longDate(dayDate(6)) + ". Use Start next week in Planner settings below to roll it forward.") +
        " Showing Monday.</p>";
    }

    const slots = SLOTS.map(s => {
      const slot = state.schedule[di][s.id];
      const r = RECIPE_BY_ID[slot.recipe];
      const extras = slot.extras.map(e => ADDON_BY_ID[e.id].short + (e.qty > 1 ? " ×" + e.qty : "")).join(", ");
      if (!r && !slot.extras.length) {
        return '<li class="today-item is-empty"><div class="ti-body"><span class="ti-slot">' + s.name + '</span><span class="muted">Nothing planned</span></div></li>';
      }
      return '<li class="today-item' + (slot.done ? " is-done" : "") + '">' +
        (r ? photoTag(r, 240, "ti-photo") : '<div class="ti-photo ti-photo-plain">' + icon("plus") + "</div>") +
        '<div class="ti-body"><span class="ti-slot">' + s.name + "</span>" +
        "<strong>" + (r ? esc(r.name) : "Protein additions") + "</strong>" +
        (extras ? '<span class="muted small">' + (r ? "Plus " : "") + esc(extras) + "</span>" : "") +
        '<span class="small">' + grams(slotProtein(slot)) + " " + estTag() + "</span></div>" +
        '<div class="ti-actions">' +
        '<label class="check"><input type="checkbox" data-change="slot-done" data-day="' + di + '" data-slot="' + s.id + '"' +
        (slot.done ? " checked" : "") + "><span>Done</span></label>" +
        (r ? '<button class="btn btn-quiet btn-sm" data-action="open-recipe" data-recipe="' + r.id + '" data-servings="' + slot.servings + '">Recipe</button>' : "") +
        "</div></li>";
    }).join("");

    const sug = proteinSuggestion(di);

    $("#view-dashboard").innerHTML =
      '<header class="view-head"><div><h1>This week</h1><p class="muted">Week of ' + longDate(start) + ". Prices and protein are estimates you can edit.</p></div></header>" +
      budgetWarnings(t) +
      '<section class="stats" aria-label="Week summary">' +
      stat("Weekly budget", money(t.budget), "Maximum, including tax") +
      stat("Estimated checkout", money(t.total), "Includes " + money(t.tax) + " tax at " + fmtNumber(state.settings.taxRate) + "%") +
      stat("Remaining", money(t.remaining), t.remaining < 0 ? "Over the limit" : (t.buffer > 0 ? money(t.remainingAfterBuffer) + " after the " + money(t.buffer) + " buffer" : "No buffer set"), t.remaining < 0 ? "is-bad" : "") +
      stat("Average daily protein", grams(w.avg), w.metDays + " of 7 days reach " + state.settings.proteinGoal + " g (estimated)") +
      stat("Recipes available", String(RECIPES.length), "Meat and pareve") +
      "</section>" +
      '<section class="panel"><div class="panel-head"><h2>Grocery spending</h2><a class="link" href="#budget">Budget details</a></div>' + budgetBar(t) + "</section>" +
      '<div class="dash-grid">' +
      '<section class="panel today">' + todayIntro +
      '<p class="today-sum">' + grams(planned) + " planned " + estTag() + ", " + grams(eaten) + " eaten so far. " +
      (meetsGoal(planned) ? "The plan reaches your " + state.settings.proteinGoal + " g goal." : "The plan is " + grams(state.settings.proteinGoal - planned) + " short of your goal.") + "</p>" +
      meter(planned, state.settings.proteinGoal, "Planned protein for the day compared with the goal") +
      (sug ? suggestionBox(di, sug) : "") +
      '<ul class="today-list">' + slots + "</ul></section>" +
      '<section class="panel"><div class="panel-head"><h2>Protein by day</h2><a class="link" href="#schedule">Open schedule</a></div>' + weekStrip() + "</section>" +
      "</div>" +
      '<nav class="quick" aria-label="Quick links">' +
      quick("#recipes", "book", "Recipes", RECIPES.length + " beginner recipes with serving controls") +
      quick("#shopping", "cart", "Shopping list", t.boughtCount + " of " + t.buyCount + " items checked off") +
      quick("#schedule", "calendar", "Meal schedule", "Change, swap and complete meals") +
      "</nav>" +
      kosherReminder(true) +
      settingsPanel();
  }

  function stat(label, value, sub, cls) {
    return '<div class="stat ' + (cls || "") + '"><span class="stat-label">' + label + '</span><span class="stat-value">' + value +
      '</span><span class="stat-sub">' + sub + "</span></div>";
  }
  function quick(href, ic, title, sub) {
    return '<a class="quick-link" href="' + href + '">' + icon(ic) + "<span><strong>" + title + "</strong><span>" + esc(sub) + "</span></span>" + icon("arrowRight", "icon icon-end") + "</a>";
  }

  function suggestionBox(dayIdx, sug) {
    return '<div class="suggest">' + icon("info") + "<div><strong>" + grams(sug.deficit) + " short.</strong> Cheapest fix: add " +
      sug.qty + " × " + esc(sug.addon.name.toLowerCase()) + " (+" + grams(sug.protein) + ", about " + money(sug.cost) + ").</div>" +
      '<button class="btn btn-sm" data-action="apply-suggestion" data-day="' + dayIdx + '" data-addon="' + sug.addon.id + '" data-qty="' + sug.qty + '">' + icon("plus") + "Add to snacks</button></div>";
  }

  function settingsPanel() {
    const s = state.settings;
    return '<section class="panel settings" aria-labelledby="settings-title"><h2 id="settings-title">Planner settings</h2>' +
      '<div class="form-grid">' +
      field("set-start", "Week starts (Monday)", '<input id="set-start" type="date" value="' + esc(s.startDate) + '" data-change="setting" data-key="startDate">') +
      field("set-budget", "Weekly budget ($)", '<input id="set-budget" type="number" inputmode="decimal" min="0" step="1" value="' + s.budget + '" data-change="setting" data-key="budget">') +
      field("set-goal", "Daily protein goal (g)", '<input id="set-goal" type="number" inputmode="numeric" min="0" step="1" value="' + s.proteinGoal + '" data-change="setting" data-key="proteinGoal">') +
      field("set-tax", "Sales tax rate (%)", '<input id="set-tax" type="number" inputmode="decimal" min="0" max="25" step="0.01" value="' + s.taxRate + '" data-change="setting" data-key="taxRate">') +
      field("set-buffer", "Contingency buffer ($)", '<input id="set-buffer" type="number" inputmode="decimal" min="0" step="1" value="' + s.buffer + '" data-change="setting" data-key="buffer">') +
      "</div>" +
      '<p class="muted small">' + (storageOK ? "Changes save automatically in this browser." :
        "This browser is blocking local storage, so changes will be lost when you close the page.") + "</p>" +
      '<div class="btn-row"><button class="btn" data-action="next-week">' + icon("calendarPlus") + "Start next week</button>" +
      '<button class="btn btn-danger-quiet" data-action="reset">' + icon("reset") + "Reset planner</button></div></section>";
  }

  function field(id, label, control, hint) {
    return '<div class="field"><label for="' + id + '">' + label + "</label>" + control + (hint ? '<span class="hint">' + hint + "</span>" : "") + "</div>";
  }

  /* ================================================================ schedule */

  function renderSchedule() {
    const start = startDate();
    $("#view-schedule").innerHTML =
      '<header class="view-head"><div><h1>Weekly schedule</h1><p class="muted">' + longDate(start) + " to " + longDate(dayDate(6)) +
      ". Protein totals come from each meal's actual portions.</p></div></header>" +
      '<section class="panel">' + weekStrip() + "</section>" +
      '<details class="panel prep"><summary><h2>Batch cooking and thawing plan</h2><span class="muted small">Written for the starting schedule</span></summary><dl class="prep-list">' +
      DATA.prepPlan.map(p => "<dt>" + esc(p.day) + "</dt><dd>" + esc(p.text) + "</dd>").join("") + "</dl></details>" +
      '<div class="days">' + DAYS.map((_, i) => dayCard(i)).join("") + "</div>";
  }

  function dayCard(i) {
    const total = dayProtein(i);
    const ok = meetsGoal(total);
    const sug = proteinSuggestion(i);
    const verified = dayVerified(i);
    const isToday = todayIndex() === i;
    return '<article class="day' + (isToday ? " is-today" : "") + '" id="day-' + i + '" aria-labelledby="day-title-' + i + '">' +
      '<header class="day-head"><div><h2 id="day-title-' + i + '">' + DAYS[i] + (isToday ? ' <span class="today-tag">Today</span>' : "") + "</h2>" +
      '<span class="muted small">' + shortDate(dayDate(i)) + "</span></div>" +
      '<div class="day-total"><strong>' + grams(total) + "</strong> " +
      (verified ? '<span class="verified" title="Every protein value used today was checked against a label">label-checked</span>' : estTag()) + "</div></header>" +
      meter(total, state.settings.proteinGoal, DAYS[i] + " protein compared with the goal") +
      '<p class="day-status ' + (ok ? "is-met" : "is-short") + '">' + (ok ? icon("check") + "Reaches the " + state.settings.proteinGoal + " g goal" :
        icon("alert") + grams(state.settings.proteinGoal - total) + " below the " + state.settings.proteinGoal + " g goal") + "</p>" +
      (sug ? suggestionBox(i, sug) : "") +
      SLOTS.map(s => slotRow(i, s)).join("") +
      "</article>";
  }

  function slotRow(i, s) {
    const slot = state.schedule[i][s.id];
    const r = RECIPE_BY_ID[slot.recipe];
    const key = i + "-" + s.id;
    const options = '<option value="">' + (s.id === "snack" ? "No recipe" : "Nothing planned") + "</option>" +
      ["meat", "pareve"].map(k => '<optgroup label="' + (k === "meat" ? "Meat meals" : "Pareve meals") + '">' +
        RECIPES.filter(x => (k === "pareve" ? x.kosher !== "meat" : x.kosher === "meat")).map(x =>
          '<option value="' + x.id + '"' + (x.id === slot.recipe ? " selected" : "") + ">" + esc(x.name) + " (" + grams(recipeProtein(x)) + ")</option>").join("") +
        "</optgroup>").join("");
    const allowed = ADDONS.filter(a => addonAllowed(a, slot));
    return '<section class="slot' + (slot.done ? " is-done" : "") + '" aria-label="' + DAYS[i] + " " + s.name.toLowerCase() + '">' +
      '<div class="slot-top"><h3>' + s.name + "</h3>" + (r ? kosherBadge(r.kosher) : "") +
      '<span class="slot-protein">' + grams(slotProtein(slot)) + "</span></div>" +
      '<label class="sr-only" for="sel-' + key + '">' + DAYS[i] + " " + s.name + " recipe</label>" +
      '<select id="sel-' + key + '" class="slot-select" data-change="slot-recipe" data-day="' + i + '" data-slot="' + s.id + '">' + options + "</select>" +
      (slot.note ? '<p class="slot-note">' + esc(slot.note) + "</p>" : "") +
      '<div class="slot-controls">' +
      (r ? stepper("slot-servings", i, s.id, slot.servings, servingsText(slot.servings), DAYS[i] + " " + s.name) : "") +
      '<label class="check"><input type="checkbox" data-change="slot-done" data-day="' + i + '" data-slot="' + s.id + '"' + (slot.done ? " checked" : "") +
      (r || slot.extras.length ? "" : " disabled") + "><span>Done</span></label>" +
      (r ? '<button class="btn btn-quiet btn-sm" data-action="open-recipe" data-recipe="' + r.id + '" data-servings="' + slot.servings + '">' + icon("eye") + "Recipe</button>" : "") +
      '<button class="btn btn-quiet btn-sm" data-action="open-swap" data-day="' + i + '" data-slot="' + s.id + '">' + icon("swap") + "Swap</button>" +
      "</div>" +
      '<div class="extras">' +
      slot.extras.map((e, idx) => {
        const a = ADDON_BY_ID[e.id];
        return '<span class="extra"><span>' + esc(a.short) + " <span class=\"muted\">" + grams(addonProtein(a) * e.qty) + "</span></span>" +
          '<button class="icon-btn" data-action="extra-qty" data-day="' + i + '" data-slot="' + s.id + '" data-index="' + idx + '" data-delta="-1" aria-label="One less ' + esc(a.short) + '">' + icon("minus") + "</button>" +
          '<span class="extra-qty" aria-label="Quantity">' + e.qty + "</span>" +
          '<button class="icon-btn" data-action="extra-qty" data-day="' + i + '" data-slot="' + s.id + '" data-index="' + idx + '" data-delta="1" aria-label="One more ' + esc(a.short) + '">' + icon("plus") + "</button></span>";
      }).join("") +
      '<label class="sr-only" for="add-' + key + '">Add a protein extra to ' + DAYS[i] + " " + s.name + "</label>" +
      '<select id="add-' + key + '" class="extra-add" data-change="add-extra" data-day="' + i + '" data-slot="' + s.id + '">' +
      '<option value="">+ Add protein extra</option>' +
      allowed.map(a => '<option value="' + a.id + '">' + esc(a.name) + " (" + grams(addonProtein(a)) + ")</option>").join("") +
      "</select></div></section>";
  }

  function stepper(action, day, slot, value, text, label) {
    return '<div class="stepper" role="group" aria-label="' + esc(label) + ' servings">' +
      '<button class="icon-btn" data-action="' + action + '" data-day="' + day + '" data-slot="' + slot + '" data-delta="-' + SERVING_STEP + '"' +
      (value <= SERVING_MIN ? " disabled" : "") + ' aria-label="Fewer servings">' + icon("minus") + "</button>" +
      '<span class="stepper-val" aria-live="polite">' + text + "</span>" +
      '<button class="icon-btn" data-action="' + action + '" data-day="' + day + '" data-slot="' + slot + '" data-delta="' + SERVING_STEP + '"' +
      (value >= SERVING_MAX ? " disabled" : "") + ' aria-label="More servings">' + icon("plus") + "</button></div>";
  }

  /* ================================================================ recipes */

  function renderRecipes() {
    const f = state.ui.recipeFilter;
    const list = RECIPES.filter(r => f === "all" || (f === "meat" ? r.kosher === "meat" : r.kosher !== "meat"));
    const filterBtn = (id, label) => '<button class="seg' + (f === id ? " is-active" : "") + '" data-action="recipe-filter" data-filter="' + id + '" aria-pressed="' + (f === id) + '">' + label + "</button>";
    $("#view-recipes").innerHTML =
      '<header class="view-head"><div><h1>Recipes</h1><p class="muted">Beginner recipes, 7 to 40 minutes from start to finish. Protein and cost are per serving and update with your prices.</p></div>' +
      '<div class="segmented" role="group" aria-label="Filter recipes">' + filterBtn("all", "All") + filterBtn("meat", "Meat") + filterBtn("pareve", "Pareve") + "</div></header>" +
      (list.length ? '<div class="recipe-grid">' + list.map(recipeCard).join("") + "</div>" :
        '<div class="empty">' + icon("book") + "<p>No recipes match this filter.</p></div>");
  }

  function recipeCard(r) {
    return '<article class="recipe-card">' +
      '<div class="rc-photo">' + photoTag(r, 640, "rc-img") + kosherBadge(r.kosher) + "</div>" +
      '<div class="rc-body"><h2>' + esc(r.name) + "</h2>" +
      '<dl class="rc-facts">' +
      "<div><dt>Protein</dt><dd>" + grams(recipeProtein(r)) + " " + estTag() + "</dd></div>" +
      "<div><dt>Cost</dt><dd>" + money(recipeCost(r)) + "</dd></div>" +
      "<div><dt>Time</dt><dd>" + (r.prepMin + r.cookMin) + " min</dd></div>" +
      "<div><dt>Makes</dt><dd>" + servingsText(r.baseServings) + "</dd></div>" +
      "</dl>" +
      '<div class="btn-row"><button class="btn" data-action="open-recipe" data-recipe="' + r.id + '">' + icon("eye") + "View recipe</button>" +
      '<button class="btn btn-quiet" data-action="open-recipe" data-recipe="' + r.id + '" data-focus="schedule">' + icon("calendarPlus") + "Add to schedule</button></div>" +
      "</div></article>";
  }

  /* ---------------- recipe dialog */

  let openRecipe = null; // { id, servings }

  function showRecipe(id, servings, focusSchedule) {
    const r = RECIPE_BY_ID[id];
    if (!r) return;
    openRecipe = { id, servings: clampServings(servings || r.baseServings) };
    renderRecipeDialog();
    openDialog("#recipe-dialog");
    if (focusSchedule) {
      const sel = $("#rd-day");
      if (sel) sel.focus();
    }
  }

  function renderRecipeDialog() {
    if (!openRecipe) return;
    const r = RECIPE_BY_ID[openRecipe.id];
    const n = openRecipe.servings;
    const perServing = recipeProtein(r);
    const ti = todayIndex();
    const rows = r.ingredients.map(ing => {
      if (ing.free) {
        return "<tr><td class=\"qty\">" + amountText(ing.qty * n, ing.unit) + "</td><td>" + esc(ing.name) + '</td><td class="num muted">0.0 g</td></tr>';
      }
      const it = item(ing.item);
      const name = it ? it.name : ing.item;
      return '<tr><td class="qty">' + amountText(ing.qty * n, it ? it.unit : "") + "</td><td>" + esc(name) +
        (ing.note ? ' <span class="muted">(' + esc(ing.note) + ")</span>" : "") +
        '</td><td class="num">' + grams(ingredientProtein(ing) * n) + "</td></tr>";
    }).join("");
    const kosherText = r.kosher === "meat" ? "Meat meal. Contains no dairy. Serve with pareve bread and no cheese, butter or milk." :
      r.kosher === "fish" ? "Pareve (fish). Contains no meat or dairy. Many kosher households do not serve fish together with meat, so keep it apart from meat meals." :
      r.kosher === "dairy" ? "Dairy meal. Do not serve with meat." :
      "Pareve. Contains no meat or dairy, so it can go with either. Use oil, not butter, to keep it pareve.";

    $("#recipe-dialog .dialog-body").innerHTML =
      '<div class="rd-hero">' + photoTag(r, 1200, "rd-img") + "</div>" +
      '<div class="rd-content"><div class="rd-title">' + kosherBadge(r.kosher) + '<h2 id="recipe-title">' + esc(r.name) + "</h2></div>" +
      '<dl class="rd-facts">' +
      "<div><dt>Protein per serving</dt><dd>" + grams(perServing) + " " + estTag() + "</dd></div>" +
      "<div><dt>Cost per serving</dt><dd>" + money(recipeCost(r)) + ' <span class="muted small">incl. est. tax</span></dd></div>' +
      "<div><dt>Prep</dt><dd>" + r.prepMin + " min</dd></div>" +
      "<div><dt>Cook</dt><dd>" + (r.cookMin ? r.cookMin + " min" : "No cooking") + "</dd></div>" +
      "</dl>" +
      '<div class="rd-servings"><span>Servings</span>' +
      '<div class="stepper" role="group" aria-label="Recipe servings">' +
      '<button class="icon-btn" data-action="recipe-servings" data-delta="-' + SERVING_STEP + '"' + (n <= SERVING_MIN ? " disabled" : "") + ' aria-label="Fewer servings">' + icon("minus") + "</button>" +
      '<span class="stepper-val" aria-live="polite">' + servingsText(n) + "</span>" +
      '<button class="icon-btn" data-action="recipe-servings" data-delta="' + SERVING_STEP + '"' + (n >= SERVING_MAX ? " disabled" : "") + ' aria-label="More servings">' + icon("plus") + "</button></div>" +
      '<span class="rd-total">' + grams(perServing * n) + " protein, " + money(recipeCost(r) * n) + " total</span></div>" +
      "<h3>Ingredients</h3>" +
      '<table class="ing-table"><thead><tr><th scope="col">Amount</th><th scope="col">Ingredient</th><th scope="col" class="num">Protein</th></tr></thead><tbody>' + rows + "</tbody></table>" +
      '<p class="muted small">' + esc(r.weightNote) + " Spices, oil, salt and mayonnaise count as 0 g.</p>" +
      "<h3>Steps</h3><ol class=\"steps\">" + r.steps.map(s => "<li>" + esc(s) + "</li>").join("") + "</ol>" +
      '<div class="rd-notes">' +
      '<div class="note-card">' + icon("flame") + "<div><strong>Food safety.</strong> " + esc(r.safety) + "</div></div>" +
      '<div class="note-card">' + icon("clock") + "<div><strong>Storage and leftovers.</strong> " + esc(r.storage) + "</div></div>" +
      '<div class="note-card">' + icon("shield") + "<div><strong>Kosher.</strong> " + kosherText + " Check each packaged ingredient's hechsher.</div></div>" +
      "</div>" +
      '<form class="rd-add" data-form="add-to-schedule"><h3>Add to the schedule</h3><div class="form-grid">' +
      field("rd-day", "Day", '<select id="rd-day" name="day">' + DAYS.map((d, i) => '<option value="' + i + '"' + (i === (ti >= 0 ? ti : 0) ? " selected" : "") + ">" + d + "</option>").join("") + "</select>") +
      field("rd-slot", "Meal", '<select id="rd-slot" name="slot">' + SLOTS.map(s => '<option value="' + s.id + '"' + (s.id === defaultSlotFor(r) ? " selected" : "") + ">" + s.name + "</option>").join("") + "</select>") +
      "</div><p class=\"muted small\">Adds " + servingsText(n) + " and replaces whatever recipe is in that slot.</p>" +
      '<div class="btn-row"><button type="submit" class="btn btn-primary">' + icon("calendarPlus") + "Add to schedule</button>" +
      '<button type="button" class="btn" data-action="add-missing">' + icon("listPlus") + "Add missing ingredients to shopping list</button></div></form>" +
      '<p class="credit">Photo by <a href="' + esc(r.photo.page) + '" target="_blank" rel="noopener">' + esc(r.photo.by) + '</a> on <a href="https://unsplash.com" target="_blank" rel="noopener">Unsplash</a></p>' +
      "</div>";
  }

  function defaultSlotFor(r) {
    if (r.id === "oatmeal" || r.id === "eggsToast") return "breakfast";
    if (r.id === "tunaSandwich" || r.id === "burritoBowl") return "lunch";
    return "dinner";
  }

  /* ================================================================ shopping */

  function renderShopping() {
    const t = totals();
    const lines = shoppingLines();
    const active = lines.filter(l => !l.it.removed && (l.it.custom || l.need > 0 || l.packages > 0));
    const notNeeded = lines.filter(l => !l.it.removed && !l.it.custom && l.need <= 0 && l.packages <= 0);
    const removed = lines.filter(l => l.it.removed);

    const cats = DATA.categories.map(c => {
      const rows = active.filter(l => (l.it.category || "other") === c.id);
      if (!rows.length) return "";
      const sub = round2(rows.reduce((s, l) => s + l.lineCost, 0));
      return '<section class="cat" aria-labelledby="cat-' + c.id + '"><div class="cat-head"><h2 id="cat-' + c.id + '">' + c.name + '</h2><span class="muted">' + money(sub) + "</span></div>" +
        '<ul class="items">' + rows.map(itemRow).join("") + "</ul></section>";
    }).join("");

    $("#view-shopping").innerHTML =
      '<header class="view-head"><div><h1>Shopping list</h1><p class="muted">Quantities come from all 7 days of your schedule, combined per ingredient. Prices are estimates, not live store prices.</p></div>' +
      '<div class="btn-row"><button class="btn btn-primary" data-action="add-item">' + icon("plus") + "Add item</button>" +
      '<button class="btn" data-action="copy-list">' + icon("copy") + "Copy as text</button>" +
      '<button class="btn" data-action="print-list">' + icon("printer") + "Print</button></div></header>" +
      budgetWarnings(t) +
      '<section class="panel totals-panel" aria-label="Checkout estimate">' +
      '<dl class="totals">' +
      "<div><dt>Subtotal</dt><dd>" + money(t.subtotal) + "</dd></div>" +
      '<div><dt><label for="shop-tax">Tax rate</label></dt><dd><span class="input-suffix"><input id="shop-tax" type="number" inputmode="decimal" min="0" max="25" step="0.01" value="' + state.settings.taxRate + '" data-change="setting" data-key="taxRate"><span>%</span></span></dd></div>' +
      "<div><dt>Estimated tax</dt><dd>" + money(t.tax) + ' <span class="muted small">on ' + money(t.taxableBase) + " taxable</span></dd></div>" +
      '<div class="is-strong"><dt>Estimated checkout</dt><dd>' + money(t.total) + "</dd></div>" +
      '<div class="' + (t.remaining < 0 ? "is-bad" : "") + '"><dt>Left from ' + money(t.budget) + "</dt><dd>" + money(t.remaining) + "</dd></div>" +
      "<div><dt>After " + money(t.buffer) + " buffer</dt><dd>" + money(t.remainingAfterBuffer) + "</dd></div>" +
      "</dl>" + budgetBar(t) +
      '<p class="muted small">' + t.boughtCount + " of " + t.buyCount + " items checked off (" + money(t.purchasedTotal) + " with tax). Checked items still count toward the week's total. " +
      "Tax treatment varies: many states exempt most grocery food. Untick Taxable on items your state does not tax.</p></section>" +
      kosherReminder(false) +
      (active.length ? cats : '<div class="empty">' + icon("cart") + "<p>Your list is empty. Add meals to the schedule or add an item yourself.</p>" +
        '<button class="btn btn-primary" data-action="add-item">' + icon("plus") + "Add item</button></div>") +
      (notNeeded.length ? '<details class="panel"><summary><h2>Not needed for this week\'s plan (' + notNeeded.length + ")</h2></summary>" +
        '<ul class="mini-list">' + notNeeded.map(l => "<li><span>" + esc(l.it.name) + '</span><button class="btn btn-quiet btn-sm" data-action="edit-item" data-id="' + l.it.id + '">' + icon("pencil") + "Edit</button></li>").join("") +
        '</ul><p class="muted small">Set a quantity in Edit to buy one anyway.</p></details>' : "") +
      (removed.length ? '<details class="panel" open><summary><h2>Removed items (' + removed.length + ")</h2></summary>" +
        '<ul class="mini-list">' + removed.map(l => "<li><span>" + esc(l.it.name) + (l.need > 0 ? ' <span class="badge badge-warn">used by your plan</span>' : "") +
          '</span><button class="btn btn-sm" data-action="restore-item" data-id="' + l.it.id + '">' + icon("reset") + "Restore</button></li>").join("") + "</ul></details>" : "");
  }

  function itemRow(l) {
    const it = l.it;
    const id = it.id;
    const usedBy = it.custom ? [] : itemUsedBy(id);
    const req = it.custom ? fmtNumber(l.need) + " × " + esc(it.packageLabel || "item") :
      amountText(l.need, it.unit) + (it.manualExtra > 0 ? ' <span class="muted">(includes ' + amountText(it.manualExtra, it.unit) + " added from recipes)</span>" : "");
    const buy = l.packages + " × " + esc(it.packageLabel || "item") + (l.overridden ? ' <span class="badge badge-warn">set by you</span>' : "");
    return '<li class="item' + (it.purchased ? " is-purchased" : "") + (l.packages === 0 ? " is-zero" : "") + '">' +
      '<div class="item-main">' +
      '<label class="check check-lg"><input type="checkbox" id="buy-' + id + '" data-change="item-purchased" data-id="' + id + '"' + (it.purchased ? " checked" : "") + ">" +
      '<span class="item-name">' + esc(it.name) + "</span></label>" +
      '<span class="item-cost">' + money(l.lineCost) + "</span></div>" +
      '<dl class="item-facts">' +
      "<div><dt>Need</dt><dd>" + req + "</dd></div>" +
      "<div><dt>Buy</dt><dd>" + (l.packages === 0 && !it.custom ? "Nothing, you have enough" : buy) + "</dd></div>" +
      (usedBy.length ? '<div class="wide"><dt>Used in</dt><dd>' + esc(usedBy.join(", ")) + "</dd></div>" : "") +
      "</dl>" +
      '<div class="item-inputs">' +
      '<div class="field field-inline"><label for="price-' + id + '">Price per ' + esc(it.custom ? "item" : "package") + '</label><span class="input-prefix"><span>$</span><input id="price-' + id + '" type="number" inputmode="decimal" min="0" step="0.01" value="' + Number(it.price).toFixed(2) + '" data-change="item-price" data-id="' + id + '"></span></div>' +
      (it.custom ? "" :
        '<div class="field field-inline"><label for="owned-' + id + '">Already have (' + esc(unitText(it.unit, 2)) + ')</label><input id="owned-' + id + '" type="number" inputmode="decimal" min="0" step="any" value="' + (it.ownedAll ? round2(l.need) : fmtNumber(Number(it.owned || 0))) + '" data-change="item-owned" data-id="' + id + '"' + (it.ownedAll ? " disabled" : "") + "></div>" +
        '<label class="check"><input type="checkbox" id="have-' + id + '" data-change="item-ownedall" data-id="' + id + '"' + (it.ownedAll ? " checked" : "") + "><span>Have it all</span></label>") +
      '<label class="check"><input type="checkbox" id="tax-' + id + '" data-change="item-taxable" data-id="' + id + '"' + (it.taxable ? " checked" : "") + "><span>Taxable</span></label>" +
      '<div class="item-actions">' +
      '<button class="btn btn-quiet btn-sm" data-action="edit-item" data-id="' + id + '" aria-label="Edit ' + esc(it.name) + '">' + icon("pencil") + "Edit</button>" +
      '<button class="btn btn-quiet btn-sm btn-danger-quiet" data-action="delete-item" data-id="' + id + '" aria-label="Delete ' + esc(it.name) + '">' + icon("trash") + "Delete</button></div>" +
      "</div>" +
      ((it.notes || it.kosherNote) ? '<p class="item-notes">' + (it.notes ? esc(it.notes) : "") + (it.kosherNote ? ' <span class="kosher-line">' + icon("shield", "icon icon-xs") + esc(it.kosherNote) + "</span>" : "") + "</p>" : "") +
      "</li>";
  }

  function shoppingText() {
    const t = totals();
    const lines = shoppingLines().filter(l => !l.it.removed && l.packages > 0);
    let out = "Kosher Protein Planner shopping list, week of " + longDate(startDate()) + "\n";
    out += "Estimated checkout " + money(t.total) + " (" + money(t.subtotal) + " + " + money(t.tax) + " tax). Prices are estimates.\n";
    DATA.categories.forEach(c => {
      const rows = lines.filter(l => (l.it.category || "other") === c.id);
      if (!rows.length) return;
      out += "\n" + c.name + "\n";
      rows.forEach(l => {
        out += (l.it.purchased ? "[x] " : "[ ] ") + l.it.name + ": " + l.packages + " x " + (l.it.packageLabel || "item") + ", about " + money(l.lineCost) +
          (l.it.notes ? " (" + l.it.notes + ")" : "") + "\n";
      });
    });
    out += "\nCheck every packaged item for a hechsher your household accepts.\n";
    return out;
  }

  function renderPrintList() {
    const t = totals();
    const lines = shoppingLines().filter(l => !l.it.removed && l.packages > 0);
    $("#print-list").innerHTML =
      "<h1>Shopping list</h1><p>Week of " + esc(longDate(startDate())) + ". Estimated checkout " + money(t.total) + " including " + money(t.tax) +
      " tax (" + fmtNumber(state.settings.taxRate) + "%). Budget " + money(t.budget) + ". Prices are estimates.</p>" +
      DATA.categories.map(c => {
        const rows = lines.filter(l => (l.it.category || "other") === c.id);
        if (!rows.length) return "";
        return "<h2>" + c.name + "</h2><table><tbody>" + rows.map(l =>
          '<tr><td class="pcheck"><span class="pbox">' + (l.it.purchased ? "&#10003;" : "") + "</span></td><td>" + esc(l.it.name) + "<br><small>" + esc(l.it.notes || "") + "</small></td><td>" +
          l.packages + " × " + esc(l.it.packageLabel || "item") + '</td><td class="num">' + money(l.lineCost) + "</td></tr>").join("") + "</tbody></table>";
      }).join("") +
      "<p>Check every packaged item for a hechsher your household accepts. Bread must be pareve.</p>";
  }

  /* ---------------- item dialog (add and edit) */

  let editingItemId = null; // null when adding a new custom item

  function showItemDialog(id) {
    editingItemId = id || null;
    const it = id ? item(id) : null;
    const isCustom = !it || it.custom;
    const lines = shoppingLines();
    const line = it ? lines.find(l => l.it.id === it.id) : null;
    const catOptions = DATA.categories.map(c => '<option value="' + c.id + '"' + ((it ? it.category : "other") === c.id ? " selected" : "") + ">" + c.name + "</option>").join("");
    $("#item-dialog .dialog-body").innerHTML =
      '<form data-form="item" novalidate><h2 id="item-title">' + (it ? "Edit " + esc(it.name) : "Add an item") + "</h2>" +
      '<div class="form-grid">' +
      field("it-name", "Name", '<input id="it-name" name="name" required maxlength="80" value="' + esc(it ? it.name : "") + '">') +
      field("it-cat", "Category", '<select id="it-cat" name="category">' + catOptions + "</select>") +
      field("it-pkg", "Package", '<input id="it-pkg" name="packageLabel" maxlength="60" value="' + esc(it ? it.packageLabel || "" : "") + '" placeholder="e.g. 16 oz bag">') +
      field("it-price", "Price per " + (isCustom ? "item" : "package") + " ($)", '<input id="it-price" name="price" type="number" inputmode="decimal" min="0" step="0.01" required value="' + (it ? Number(it.price).toFixed(2) : "") + '">') +
      (isCustom ?
        field("it-qty", "Quantity to buy", '<input id="it-qty" name="qty" type="number" inputmode="numeric" min="0" step="1" required value="' + (it ? fmtNumber(Number(it.qty || 0)) : "1") + '">') :
        field("it-size", "Package size (" + esc(unitText(it.unit, 2)) + ")", '<input id="it-size" name="packageSize" type="number" inputmode="decimal" min="0.01" step="any" required value="' + fmtNumber(it.packageSize) + '">',
          "Used to turn recipe amounts into packages.") +
        field("it-buy", "Packages to buy", '<input id="it-buy" name="buyOverride" type="number" inputmode="numeric" min="0" step="1" value="' + (it.buyOverride === null || it.buyOverride === undefined ? "" : it.buyOverride) + '" placeholder="Auto: ' + (line ? line.autoPackages : 0) + '">',
          "Leave blank to calculate from your schedule (" + (line ? line.autoPackages : 0) + " right now).") +
        field("it-protein", "Protein per " + esc(it.unit) + " (g)", '<input id="it-protein" name="proteinPerUnit" type="number" inputmode="decimal" min="0" step="0.1" required value="' + it.proteinPerUnit + '">')) +
      '<div class="field field-full">' + field("it-notes", "Store or brand notes", '<input id="it-notes" name="notes" maxlength="160" value="' + esc(it ? it.notes || "" : "") + '">') + "</div>" +
      "</div>" +
      '<div class="check-row">' +
      '<label class="check"><input type="checkbox" name="taxable"' + (!it || it.taxable ? " checked" : "") + "><span>Taxable</span></label>" +
      (isCustom ? "" : '<label class="check"><input type="checkbox" name="verified"' + (it.verified ? " checked" : "") + "><span>I checked this protein value against my package label</span></label>") +
      "</div>" +
      (!isCustom && it.manualExtra > 0 ? '<p class="muted small">' + amountText(it.manualExtra, it.unit) + ' were added from a recipe. <button type="button" class="link-btn" data-action="clear-extra" data-id="' + it.id + '">Remove that extra amount</button></p>' : "") +
      '<p class="form-error" role="alert" hidden></p>' +
      '<div class="btn-row dialog-actions"><button type="button" class="btn" data-action="close-dialog">Cancel</button><button type="submit" class="btn btn-primary">' +
      (it ? "Save changes" : "Add item") + "</button></div></form>";
    openDialog("#item-dialog");
    $("#it-name").focus();
  }

  function saveItemForm(form) {
    const fd = new FormData(form);
    const err = form.querySelector(".form-error");
    const fail = msg => { err.textContent = msg; err.hidden = false; };
    const name = String(fd.get("name") || "").trim();
    const price = Number(fd.get("price"));
    if (!name) return fail("Enter a name for the item.");
    if (fd.get("price") === "" || !isFinite(price) || price < 0) return fail("Enter a price of 0 or more.");
    const existing = editingItemId ? item(editingItemId) : null;
    if (!existing || existing.custom) {
      const qty = Number(fd.get("qty"));
      if (fd.get("qty") === "" || !isFinite(qty) || qty < 0) return fail("Enter a quantity of 0 or more.");
      const data = {
        name, price: round2(price), qty: Math.round(qty),
        category: String(fd.get("category") || "other"),
        packageLabel: String(fd.get("packageLabel") || "").trim() || "item",
        notes: String(fd.get("notes") || "").trim(),
        taxable: fd.get("taxable") === "on"
      };
      if (existing) Object.assign(existing, data);
      else {
        state.items.push(Object.assign({
          id: "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          custom: true, unit: "item", packageSize: 1, proteinPerUnit: 0, kosher: "pareve",
          purchased: false, removed: false, owned: 0, ownedAll: false, manualExtra: 0, buyOverride: null, verified: false, kosherNote: ""
        }, data));
      }
    } else {
      const size = Number(fd.get("packageSize"));
      const protein = Number(fd.get("proteinPerUnit"));
      const buyRaw = String(fd.get("buyOverride") || "").trim();
      const buy = buyRaw === "" ? null : Number(buyRaw);
      if (!isFinite(size) || size <= 0) return fail("Package size must be more than 0.");
      if (fd.get("proteinPerUnit") === "" || !isFinite(protein) || protein < 0) return fail("Enter protein of 0 or more.");
      if (buy !== null && (!isFinite(buy) || buy < 0)) return fail("Packages to buy must be 0 or more, or blank.");
      Object.assign(existing, {
        name, price: round2(price), packageSize: size, proteinPerUnit: protein,
        buyOverride: buy === null ? null : Math.round(buy),
        category: String(fd.get("category") || existing.category),
        packageLabel: String(fd.get("packageLabel") || "").trim() || existing.packageLabel,
        notes: String(fd.get("notes") || "").trim(),
        taxable: fd.get("taxable") === "on",
        verified: fd.get("verified") === "on"
      });
    }
    closeDialog("#item-dialog");
    commit();
    toast(existing ? "Saved " + name : "Added " + name);
  }

  /* ================================================================ budget */

  function renderBudget() {
    const t = totals();
    const max = Math.max(1, ...t.byCategory.map(c => c.amount), t.tax);
    const rows = t.byCategory.filter(c => c.amount > 0).concat([{ name: "Estimated tax", amount: t.tax, isTax: true }]);
    const recipeRows = RECIPES.slice().sort((a, b) => recipeCost(a) - recipeCost(b)).map(r => {
      const p = recipeProtein(r);
      const c = recipeCost(r);
      return "<tr><th scope=\"row\"><button class=\"link-btn\" data-action=\"open-recipe\" data-recipe=\"" + r.id + "\">" + esc(r.name) + "</button></th><td>" + kosherBadge(r.kosher) +
        '</td><td class="num">' + money(c) + '</td><td class="num">' + grams(p) + '</td><td class="num">' + (c > 0 ? (p / c).toFixed(1) + " g" : "n/a") + "</td></tr>";
    }).join("");

    $("#view-budget").innerHTML =
      '<header class="view-head"><div><h1>Budget tracker</h1><p class="muted">Every figure is computed from the shopping list. Change a price there or here and it updates everywhere.</p></div></header>' +
      budgetWarnings(t) +
      '<section class="stats" aria-label="Budget summary">' +
      stat("Maximum budget", money(t.budget), "Per week, including tax") +
      stat("Grocery subtotal", money(t.subtotal), "Before tax") +
      stat("Estimated tax", money(t.tax), fmtNumber(state.settings.taxRate) + "% on " + money(t.taxableBase) + " of taxable items") +
      stat("Estimated checkout", money(t.total), "Subtotal plus tax") +
      stat("Remaining", money(t.remaining), money(t.remainingAfterBuffer) + " after the " + money(t.buffer) + " buffer", t.remaining < 0 ? "is-bad" : "") +
      stat("Daily food cost", money(t.total / 7), "Checkout total divided by 7") +
      "</section>" +
      '<section class="panel"><div class="panel-head"><h2>Spending against the limit</h2></div>' + budgetBar(t) +
      '<div class="form-grid narrow">' +
      field("bud-tax", "Sales tax rate (%)", '<input id="bud-tax" type="number" inputmode="decimal" min="0" max="25" step="0.01" value="' + state.settings.taxRate + '" data-change="setting" data-key="taxRate">', "Applied only to items marked Taxable.") +
      field("bud-buffer", "Contingency buffer ($)", '<input id="bud-buffer" type="number" inputmode="decimal" min="0" step="1" value="' + state.settings.buffer + '" data-change="setting" data-key="buffer">', "Money kept aside for price surprises.") +
      "</div></section>" +
      '<div class="dash-grid budget-grid">' +
      '<section class="panel"><div class="panel-head"><h2>Spending by category</h2><span class="muted small">' + money(t.total) + " total</span></div>" +
      '<ul class="bars" aria-label="Estimated spending by category">' + rows.map(c =>
        '<li><span class="bar-label">' + esc(c.name) + '</span><span class="bar-track"><span class="bar-fill' + (c.isTax ? " is-tax" : "") + '" style="width:' + ((c.amount / max) * 100).toFixed(1) + '%" title="' + esc(c.name) + ": " + money(c.amount) + '"></span></span><span class="bar-value">' + money(c.amount) +
        '<span class="muted small"> ' + (t.total > 0 ? Math.round((c.amount / t.total) * 100) : 0) + "%</span></span></li>").join("") +
      "</ul></section>" +
      '<section class="panel"><div class="panel-head"><h2>Cost per serving</h2><span class="muted small">Amount used, incl. est. tax</span></div>' +
      '<div class="table-wrap"><table class="data-table"><thead><tr><th scope="col">Recipe</th><th scope="col">Type</th><th scope="col" class="num">Cost</th><th scope="col" class="num">Protein</th><th scope="col" class="num">Protein per $</th></tr></thead><tbody>' +
      recipeRows + "</tbody></table></div>" +
      '<p class="muted small">Cost per serving counts only the share of each package a serving uses. Checkout cost is higher because you buy whole packages, and the leftovers stay in your pantry.</p></section>' +
      "</div>";
  }

  /* ================================================================ routing and render */

  const VIEWS = ["dashboard", "schedule", "recipes", "shopping", "budget"];
  function currentView() {
    const h = (location.hash || "").replace("#", "");
    return VIEWS.includes(h) ? h : "dashboard";
  }

  function render() {
    // Remember focus so re-rendering does not throw keyboard users back to the top.
    const active = document.activeElement;
    const focusId = active && active.id && active !== document.body ? active.id : null;
    const view = currentView();
    VIEWS.forEach(v => {
      const el = $("#view-" + v);
      el.hidden = v !== view;
      if (v !== view) el.innerHTML = ""; // keep only one view in the DOM so ids stay unique
    });
    $$("[data-nav]").forEach(a => {
      if (a.dataset.nav === view) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    try {
      ({ dashboard: renderDashboard, schedule: renderSchedule, recipes: renderRecipes, shopping: renderShopping, budget: renderBudget })[view]();
      if (openRecipe && $("#recipe-dialog").open) renderRecipeDialog();
    } catch (err) {
      console.error(err);
      $("#view-" + view).innerHTML = '<div class="alert alert-danger" role="alert">' + icon("alert") +
        "<div><strong>This section could not be displayed.</strong> Your saved data may be damaged. Use Reset planner on the dashboard, or reload the page.</div></div>";
    }
    const pageTitles = { dashboard: "Dashboard", schedule: "Weekly schedule", recipes: "Recipes", shopping: "Shopping list", budget: "Budget tracker" };
    document.title = pageTitles[view] + " | Kosher Protein Planner";
    if (focusId) {
      const el = document.getElementById(focusId);
      if (el && el !== document.activeElement) el.focus({ preventScroll: true });
    }
  }

  /* ================================================================ dialogs and toasts */

  let lastFocus = null;
  function openDialog(sel) {
    const d = $(sel);
    lastFocus = document.activeElement;
    if (typeof d.showModal === "function") { if (!d.open) d.showModal(); }
    else d.setAttribute("open", "");
  }
  function closeDialog(sel) {
    const d = typeof sel === "string" ? $(sel) : sel;
    if (!d) return;
    if (typeof d.close === "function" && d.open) d.close();
    else d.removeAttribute("open");
  }

  let confirmCallback = null;
  function confirmAction(title, message, confirmLabel, cb) {
    $("#confirm-title").textContent = title;
    $("#confirm-message").textContent = message;
    $("#confirm-ok").textContent = confirmLabel;
    confirmCallback = cb;
    openDialog("#confirm-dialog");
    $("#confirm-cancel").focus();
  }

  let swapFrom = null;
  function showSwap(day, slot) {
    swapFrom = { day, slot };
    const slotName = SLOTS.find(s => s.id === slot).name;
    const r = RECIPE_BY_ID[state.schedule[day][slot].recipe];
    $("#swap-dialog .dialog-body").innerHTML =
      '<form data-form="swap"><h2 id="swap-title">Swap ' + DAYS[day] + " " + slotName.toLowerCase() + "</h2>" +
      '<p class="muted">' + (r ? esc(r.name) : "Empty slot") + " will trade places with the meal you pick. Servings, extras and Done marks move with each meal.</p>" +
      '<div class="form-grid">' +
      field("swap-day", "With day", '<select id="swap-day" name="day">' + DAYS.map((d, i) => '<option value="' + i + '"' + (i === (day + 1) % 7 ? " selected" : "") + ">" + d + "</option>").join("") + "</select>") +
      field("swap-slot", "Meal", '<select id="swap-slot" name="slot">' + SLOTS.map(s => '<option value="' + s.id + '"' + (s.id === slot ? " selected" : "") + ">" + s.name + "</option>").join("") + "</select>") +
      '</div><p class="swap-preview muted small" aria-live="polite"></p>' +
      '<div class="btn-row dialog-actions"><button type="button" class="btn" data-action="close-dialog">Cancel</button><button type="submit" class="btn btn-primary">' + icon("swap") + "Swap meals</button></div></form>";
    updateSwapPreview();
    openDialog("#swap-dialog");
    $("#swap-day").focus();
  }
  function updateSwapPreview() {
    const d = Number($("#swap-day").value);
    const s = $("#swap-slot").value;
    const target = state.schedule[d][s];
    const r = RECIPE_BY_ID[target.recipe];
    const same = d === swapFrom.day && s === swapFrom.slot;
    $(".swap-preview").textContent = same ? "Pick a different day or meal." :
      "Trading with: " + (r ? r.name : (target.extras.length ? "protein additions only" : "an empty slot")) + ".";
  }

  let toastTimer = null;
  function toast(msg, isError) {
    const el = $("#toast");
    el.textContent = msg;
    el.className = "toast is-visible" + (isError ? " is-error" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = "toast"; }, 3200);
  }

  /* ================================================================ actions */

  function slotAt(day, slot) { return state.schedule[Number(day)][slot]; }

  function addMissingIngredients() {
    const r = RECIPE_BY_ID[openRecipe.id];
    const n = openRecipe.servings;
    const needs = scheduleNeeds();
    const added = [];
    const restored = [];
    r.ingredients.forEach(ing => {
      if (ing.free) return;
      const it = item(ing.item);
      if (!it) return;
      const onList = !it.removed && ((needs[it.id] || 0) + Number(it.manualExtra || 0) > 0);
      if (onList) return;
      if (it.removed) { it.removed = false; restored.push(it.name); }
      if ((needs[it.id] || 0) + Number(it.manualExtra || 0) <= 0) {
        it.manualExtra = Number(it.manualExtra || 0) + ing.qty * n;
        if (!restored.includes(it.name)) added.push(it.name);
      }
    });
    commit();
    const count = added.length + restored.length;
    toast(count ? "Added " + count + " missing ingredient" + (count === 1 ? "" : "s") + " to the shopping list" :
      "Everything for this recipe is already on your shopping list");
  }

  const ACTIONS = {
    "goto-day": (el, ev) => {
      ev.preventDefault();
      pendingDay = Number(el.dataset.day);
      if (location.hash !== "#schedule") location.hash = "#schedule"; // hashchange handler scrolls
      else scrollToPendingDay();
    },
    "open-recipe": el => showRecipe(el.dataset.recipe, Number(el.dataset.servings) || null, el.dataset.focus === "schedule"),
    "recipe-servings": el => {
      openRecipe.servings = clampServings(openRecipe.servings + Number(el.dataset.delta));
      renderRecipeDialog();
      const btn = $('#recipe-dialog [data-action="recipe-servings"][data-delta="' + el.dataset.delta + '"]');
      if (btn && !btn.disabled) btn.focus();
    },
    "add-missing": () => addMissingIngredients(),
    "slot-servings": el => {
      const slot = slotAt(el.dataset.day, el.dataset.slot);
      slot.servings = clampServings(slot.servings + Number(el.dataset.delta));
      commit();
      refocus('[data-action="slot-servings"][data-day="' + el.dataset.day + '"][data-slot="' + el.dataset.slot + '"][data-delta="' + el.dataset.delta + '"]');
    },
    "extra-qty": el => {
      const slot = slotAt(el.dataset.day, el.dataset.slot);
      const idx = Number(el.dataset.index);
      const e = slot.extras[idx];
      if (!e) return;
      e.qty += Number(el.dataset.delta);
      const removedName = e.qty <= 0 ? ADDON_BY_ID[e.id].short : null;
      if (e.qty <= 0) slot.extras.splice(idx, 1);
      commit();
      if (removedName) toast("Removed " + removedName);
      else refocus('[data-action="extra-qty"][data-day="' + el.dataset.day + '"][data-slot="' + el.dataset.slot + '"][data-index="' + idx + '"][data-delta="' + el.dataset.delta + '"]');
    },
    "apply-suggestion": el => {
      const slot = slotAt(el.dataset.day, "snack");
      const qty = Number(el.dataset.qty);
      const existing = slot.extras.find(e => e.id === el.dataset.addon);
      if (existing) existing.qty += qty; else slot.extras.push({ id: el.dataset.addon, qty });
      commit();
      toast("Added to " + DAYS[Number(el.dataset.day)] + " snacks");
    },
    "open-swap": el => showSwap(Number(el.dataset.day), el.dataset.slot),
    "recipe-filter": el => { state.ui.recipeFilter = el.dataset.filter; commit(); },
    "add-item": () => showItemDialog(null),
    "edit-item": el => showItemDialog(el.dataset.id),
    "delete-item": el => {
      const it = item(el.dataset.id);
      if (!it) return;
      const used = !it.custom && itemUsedBy(it.id).length > 0;
      confirmAction("Delete " + it.name + "?",
        it.custom ? "This removes the item from your list." :
          (used ? "Your meal plan still uses this item. Its cost will leave the total and you will see a warning until you restore it or change the meals."
            : "This removes the item from your list. You can restore it later."),
        "Delete item", () => {
          if (it.custom) state.items = state.items.filter(x => x.id !== it.id);
          else it.removed = true;
          commit();
          toast("Deleted " + it.name);
        });
    },
    "restore-item": el => { const it = item(el.dataset.id); if (it) { it.removed = false; commit(); toast("Restored " + it.name); } },
    "clear-extra": el => {
      const it = item(el.dataset.id);
      if (it) { it.manualExtra = 0; closeDialog("#item-dialog"); commit(); toast("Removed the extra amount of " + it.name); }
    },
    "copy-list": () => {
      const text = shoppingText();
      const fallback = () => {
        const ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        let ok = false;
        try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
        document.body.removeChild(ta);
        toast(ok ? "Shopping list copied" : "Copy is blocked in this browser. Use Print instead.", !ok);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => toast("Shopping list copied"), fallback);
      } else fallback();
    },
    "print-list": () => { renderPrintList(); window.print(); },
    "next-week": () => confirmAction("Start next week?",
      "The start date moves forward 7 days. Done marks and purchased checkmarks are cleared. Your meals, prices and items stay.",
      "Start next week", () => {
        state.settings.startDate = toISO(addDays(startDate(), 7));
        state.schedule.forEach(d => SLOTS.forEach(s => { d[s.id].done = false; }));
        state.items.forEach(it => { it.purchased = false; });
        commit();
        toast("Planner moved to the week of " + shortDate(startDate()));
      }),
    "reset": () => confirmAction("Reset the planner?",
      "This erases your saved schedule changes, prices, custom items, checkmarks and settings in this browser and restores the starting plan. It cannot be undone.",
      "Reset everything", () => {
        try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) { /* storage unavailable */ }
        state = defaultState();
        commit();
        toast("Planner reset to the starting plan");
      }),
    "close-dialog": el => closeDialog(el.closest("dialog"))
  };

  let pendingDay = null;
  function scrollToPendingDay() {
    const t = document.getElementById("day-" + pendingDay);
    pendingDay = null;
    if (!t) return;
    t.setAttribute("tabindex", "-1");
    t.scrollIntoView({ block: "start" });
    t.focus({ preventScroll: true });
  }

  function refocus(selector) {
    const el = $(selector);
    if (el && !el.disabled) el.focus({ preventScroll: true });
  }

  function numberFrom(el, opts) {
    const raw = el.value.trim();
    const n = Number(raw);
    if (raw === "" || !isFinite(n) || n < (opts.min || 0) || (opts.max !== undefined && n > opts.max)) {
      toast(opts.msg, true);
      return null;
    }
    return n;
  }

  const CHANGES = {
    "setting": el => {
      const key = el.dataset.key;
      if (key === "startDate") {
        const d = parseISO(el.value);
        if (!d) { toast("Pick a valid date.", true); render(); return; }
        const monday = mondayOf(d);
        state.settings.startDate = toISO(monday);
        commit();
        if (toISO(d) !== toISO(monday)) toast("Moved to Monday, " + shortDate(monday) + " so the week runs Monday to Sunday");
        return;
      }
      const limits = { budget: [0, undefined, "Budget must be 0 or more."], proteinGoal: [0, 500, "Protein goal must be between 0 and 500 g."],
        taxRate: [0, 25, "Tax rate must be between 0 and 25%."], buffer: [0, undefined, "Buffer must be 0 or more."] }[key];
      const n = numberFrom(el, { min: limits[0], max: limits[1], msg: limits[2] });
      if (n === null) { render(); return; }
      state.settings[key] = key === "taxRate" ? Math.round(n * 1000) / 1000 : round2(n);
      commit();
    },
    "slot-recipe": el => {
      const slot = slotAt(el.dataset.day, el.dataset.slot);
      slot.recipe = el.value || null;
      slot.note = "";
      if (!slot.recipe) slot.servings = 1;
      const stripped = stripFishFromMeat(slot);
      if (!slot.recipe && !slot.extras.length) slot.done = false;
      commit();
      if (stripped) toast("Removed tuna from this meat meal. Fish and meat are kept apart.");
    },
    "slot-done": el => { slotAt(el.dataset.day, el.dataset.slot).done = el.checked; commit(); },
    "add-extra": el => {
      if (!el.value) return;
      const slot = slotAt(el.dataset.day, el.dataset.slot);
      const a = ADDON_BY_ID[el.value];
      if (!a || !addonAllowed(a, slot)) { toast("Fish is not added to meat meals.", true); render(); return; }
      const existing = slot.extras.find(e => e.id === a.id);
      if (existing) existing.qty += 1; else slot.extras.push({ id: a.id, qty: 1 });
      commit();
      toast("Added " + a.short);
    },
    "item-purchased": el => { const it = item(el.dataset.id); if (it) { it.purchased = el.checked; commit(); } },
    "item-price": el => {
      const it = item(el.dataset.id);
      const n = numberFrom(el, { min: 0, msg: "Enter a price of 0 or more." });
      if (n === null || !it) { render(); return; }
      it.price = round2(n);
      commit();
    },
    "item-owned": el => {
      const it = item(el.dataset.id);
      const n = numberFrom(el, { min: 0, msg: "Enter an amount of 0 or more." });
      if (n === null || !it) { render(); return; }
      it.owned = n;
      commit();
    },
    "item-ownedall": el => { const it = item(el.dataset.id); if (it) { it.ownedAll = el.checked; if (!el.checked) it.owned = 0; commit(); } },
    "item-taxable": el => { const it = item(el.dataset.id); if (it) { it.taxable = el.checked; commit(); } }
  };

  /* ================================================================ init */

  function bindEvents() {
    document.addEventListener("click", ev => {
      const el = ev.target.closest("[data-action]");
      if (!el || el.disabled) return;
      const fn = ACTIONS[el.dataset.action];
      if (fn) fn(el, ev);
    });
    document.addEventListener("change", ev => {
      const el = ev.target.closest("[data-change]");
      if (el && CHANGES[el.dataset.change]) {
        // Text-like inputs commit on blur. Wait one tick so focus has already moved to the
        // next field (e.g. after Tab); render() then restores focus there by id.
        const deferred = el.tagName === "INPUT" && el.type !== "checkbox";
        if (deferred) setTimeout(() => CHANGES[el.dataset.change](el, ev), 0);
        else CHANGES[el.dataset.change](el, ev);
      }
      if (ev.target.id === "swap-day" || ev.target.id === "swap-slot") updateSwapPreview();
    });
    document.addEventListener("submit", ev => {
      const form = ev.target;
      const kind = form.dataset.form;
      if (!kind) return;
      ev.preventDefault();
      if (kind === "item") saveItemForm(form);
      if (kind === "swap") {
        const d = Number(form.day.value);
        const s = form.slot.value;
        if (d === swapFrom.day && s === swapFrom.slot) { toast("Pick a different day or meal to swap with.", true); return; }
        const a = state.schedule[swapFrom.day][swapFrom.slot];
        state.schedule[swapFrom.day][swapFrom.slot] = state.schedule[d][s];
        state.schedule[d][s] = a;
        closeDialog("#swap-dialog");
        commit();
        toast("Swapped " + DAYS[swapFrom.day] + " and " + DAYS[d]);
      }
      if (kind === "add-to-schedule") {
        const d = Number(form.day.value);
        const s = form.slot.value;
        const slot = state.schedule[d][s];
        slot.recipe = openRecipe.id;
        slot.servings = openRecipe.servings;
        slot.note = "";
        slot.done = false;
        const stripped = stripFishFromMeat(slot);
        commit();
        toast("Added to " + DAYS[d] + " " + SLOTS.find(x => x.id === s).name.toLowerCase() + (stripped ? ". Tuna was removed from this meat meal." : ""));
      }
    });
    $("#confirm-ok").addEventListener("click", () => {
      const cb = confirmCallback;
      confirmCallback = null;
      closeDialog("#confirm-dialog");
      if (cb) cb();
    });
    $("#confirm-cancel").addEventListener("click", () => { confirmCallback = null; closeDialog("#confirm-dialog"); });
    $$("dialog").forEach(d => {
      d.addEventListener("close", () => {
        if (d.id === "recipe-dialog") openRecipe = null;
        if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
      });
      // Click on the dark backdrop closes the dialog.
      d.addEventListener("click", ev => { if (ev.target === d) closeDialog(d); });
    });
    // Replace any photo that fails to load with a labeled placeholder.
    document.addEventListener("error", ev => {
      const img = ev.target;
      if (!(img instanceof HTMLImageElement) || img.dataset.fallback === undefined) return;
      const ph = document.createElement("div");
      ph.className = img.className + " photo-fallback";
      ph.setAttribute("role", "img");
      ph.setAttribute("aria-label", "Photo unavailable: " + img.dataset.fallback);
      ph.innerHTML = icon("utensils") + "<span>" + esc(img.dataset.fallback) + "</span>";
      img.replaceWith(ph);
    }, true);
    window.addEventListener("hashchange", () => {
      render();
      if (pendingDay !== null && currentView() === "schedule") scrollToPendingDay();
      else window.scrollTo(0, 0);
      pendingDay = null;
    });
    window.addEventListener("beforeprint", renderPrintList);
    window.addEventListener("storage", ev => { if (ev.key === STORAGE_KEY) { state = loadState(); render(); } });
  }

  function init() {
    if (!DATA) {
      document.getElementById("app").innerHTML = '<p class="alert alert-danger">data.js did not load. Check that it sits next to index.html.</p>';
      return;
    }
    state = loadState();
    const problems = kosherProblems();
    if (problems.length) {
      const banner = document.getElementById("data-problems");
      banner.hidden = false;
      banner.innerHTML = icon("alert") + "<div><strong>Recipe data problem:</strong> " + problems.map(esc).join(" ") + "</div>";
    }
    bindEvents();
    render();
    if (!storageOK) toast("This browser is blocking storage. Changes will not be saved.", true);
  }

  // Exposed for testing in the browser console. Read-only helpers; nothing here is required.
  window.KPP = { totals: () => totals(), dayProtein: i => dayProtein(i), shoppingLines: () => shoppingLines(), state: () => state, weekProtein: () => weekProtein(), recipeProtein: id => recipeProtein(RECIPE_BY_ID[id]) };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
