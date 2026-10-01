// node_modules/flint-chart/dist/core/index.js
function applyEncodingOverrides(template, encodings, chartProperties) {
  const actions = template.encodingActions;
  if (!actions || actions.length === 0 || !chartProperties) return encodings;
  let result = encodings;
  for (const action of actions) {
    const override = chartProperties[action.key];
    if (override !== void 0) {
      result = action.set(result, override);
    }
  }
  return result;
}
var CHART_TRANSITIONS = {
  // ── Categorical comparison — D × M (§4.1) ──────────────────────────────
  "Bar Chart": [
    // Ordered-axis bridge into the trend family (§4.9). Only when the domain
    // axis is temporal/ordinal — an unordered nominal bar never sprouts a line.
    // orientDomainAxis:'x' re-orients a horizontal bar so time stays horizontal.
    { to: "Line Chart", label: "Line", requireOrderedAxis: true, orientDomainAxis: "x" },
    { to: "Area Chart", label: "Area", requireOrderedAxis: true, requireNonNegative: true, orientDomainAxis: "x" },
    // Same D×M signature, lighter ink.
    { to: "Lollipop Chart", label: "Lollipop" }
  ],
  "Lollipop Chart": [
    { to: "Bar Chart", label: "Bar" }
  ],
  "Grouped Bar Chart": [
    {
      to: "Stacked Bar Chart",
      label: "Stacked",
      route: { from: "group", to: "color", mode: "move" },
      requireDiscreteSource: true
    },
    // A 2-sided grouped bar reads as a population pyramid (mirrored).
    {
      to: "Pyramid Chart",
      label: "Pyramid",
      route: { from: "group", to: "color", mode: "move" },
      requireDiscreteSource: true,
      maxSourceCardinality: 2
    }
  ],
  "Stacked Bar Chart": [
    {
      to: "Grouped Bar Chart",
      label: "Grouped",
      route: { from: "color", to: "group", mode: "move" },
      requireDiscreteSource: true,
      maxSourceCardinality: 12
    }
  ],
  // Population pyramid = a 2-sided category × measure; its complement is the
  // side-by-side grouped bar (the 2 sides dodged instead of mirrored).
  "Pyramid Chart": [
    {
      to: "Grouped Bar Chart",
      label: "Grouped",
      route: { from: "color", to: "group", mode: "move" },
      requireDiscreteSource: true
    }
  ],
  // ── Trend over an ordered domain — T × M (§4.2) ────────────────────────
  "Line Chart": [
    { to: "Area Chart", label: "Area", requireNonNegative: true },
    // Back to discrete-period comparison; only readable with few ticks.
    { to: "Bar Chart", label: "Bar", maxCategoryCardinality: 30 },
    // Small-multiple trend strips (one per series) — needs a series. Route
    // the series onto `color` (from wherever it sits — color OR a column/row
    // facet) so the Sparkline template picks it up as its row series.
    { to: "Sparkline", label: "Sparklines", requireSeries: true, route: { from: "series", to: "color", mode: "move" } }
  ],
  "Area Chart": [
    { to: "Line Chart", label: "Line" },
    { to: "Bar Chart", label: "Bar", maxCategoryCardinality: 30 },
    { to: "Streamgraph", label: "Stream", requireSeries: true, requireNonNegative: true, route: { from: "series", to: "color", mode: "move" } }
  ],
  // Small-multiple trend table → a single overlaid multi-series line.
  "Sparkline": [
    { to: "Line Chart", label: "Line" }
  ],
  // Flowing composition → back to baseline-anchored trend / area. Both reads
  // are safe; note Streamgraph → Line is intentionally *one-directional* (there
  // is no Line → Streamgraph — see the note above).
  "Streamgraph": [
    { to: "Area Chart", label: "Area" },
    { to: "Line Chart", label: "Line" }
  ],
  // ── Two-measure relationship — M₁ × M₂ (§4.3) ──────────────────────────
  "Scatter Plot": [
    {
      to: "Strip Plot",
      label: "Jitter",
      route: { from: "series", to: "x", mode: "swap", spill: "color" }
    },
    // Add a fitted trend layer over the same cloud — only a clean
    // two-measure scatter (both axes quantitative, no size bubble).
    { to: "Regression", label: "Trend", requireBiaxialMeasure: true, requireNoSize: true }
  ],
  "Regression": [
    { to: "Scatter Plot", label: "Scatter" }
  ],
  "Strip Plot": [
    {
      to: "Scatter Plot",
      label: "Scatter",
      route: { from: "color", to: "x", mode: "swap", spill: "color" }
    },
    // A strip plot is a per-category distribution: box (summary) + violin
    // (density) are the same {x:category, y:measure} layout, no route.
    { to: "Boxplot", label: "Box" },
    { to: "Violin Plot", label: "Violin" }
  ],
  // ── Univariate distribution — M (§4.4) ─────────────────────────────────
  "Histogram": [
    { to: "Density Plot", label: "Density" },
    { to: "ECDF Plot", label: "ECDF" }
  ],
  "Density Plot": [
    { to: "Histogram", label: "Histogram" },
    { to: "ECDF Plot", label: "ECDF" }
  ],
  "ECDF Plot": [
    { to: "Histogram", label: "Histogram" },
    { to: "Density Plot", label: "Density" }
  ],
  "Boxplot": [
    { to: "Violin Plot", label: "Violin" },
    { to: "Strip Plot", label: "Strip" }
  ],
  "Violin Plot": [
    { to: "Boxplot", label: "Box" },
    { to: "Strip Plot", label: "Strip" }
  ]
};
function getChartTransitions(chart) {
  if (!chart) return [];
  return CHART_TRANSITIONS[chart] ?? [];
}
var DISCRETE_TYPES = /* @__PURE__ */ new Set(["nominal", "ordinal"]);
function isDiscrete(enc) {
  return !!enc?.field && !!enc.type && DISCRETE_TYPES.has(enc.type);
}
function isMeasure(enc) {
  return !!enc?.field && (enc.type === "quantitative" || !!enc.aggregate);
}
function isTemporal(enc) {
  return enc?.type === "temporal";
}
function temporalActsDiscrete(template) {
  return template.markCognitiveChannel !== "position";
}
function clone(encodings) {
  const out = {};
  for (const [ch, enc] of Object.entries(encodings)) {
    out[ch] = { ...enc };
  }
  return out;
}
function distinctCount(data, field) {
  if (!field || !Array.isArray(data)) return 0;
  const seen = /* @__PURE__ */ new Set();
  for (const row of data) {
    if (row && row[field] != null) seen.add(row[field]);
  }
  return seen.size;
}
function makeCartesianPivot(opts = {}) {
  return {
    key: opts.key ?? "pivot",
    label: opts.label ?? "View",
    transpose: opts.transpose ?? [],
    permute: opts.permute ?? [],
    shift: opts.shift ?? [],
    facetBudget: opts.facetBudget ?? 12,
    transitions: opts.transitions
  };
}
var CHANNEL_ORDER = ["x", "y", "color", "size", "group", "column", "row"];
function orderPair(a, b) {
  const ia = CHANNEL_ORDER.indexOf(a);
  const ib = CHANNEL_ORDER.indexOf(b);
  return ia <= ib ? [a, b] : [b, a];
}
var CHANNEL_DISPLAY = {
  x: "X",
  y: "Y",
  color: "Color",
  size: "Size",
  group: "Groups",
  column: "Columns",
  row: "Rows",
  detail: "Detail",
  opacity: "Opacity"
};
function chDisplay(ch) {
  return CHANNEL_DISPLAY[ch] ?? ch.charAt(0).toUpperCase() + ch.slice(1);
}
function changedChannels(a, b) {
  const out = /* @__PURE__ */ new Set();
  for (const ch of /* @__PURE__ */ new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (a[ch]?.field !== b[ch]?.field) out.add(ch);
  }
  return out;
}
function transposeState(base, template, pair) {
  const [a, b] = orderPair(pair[0], pair[1]);
  const ea = base[a];
  const eb = base[b];
  if (!ea?.field || !eb?.field) return null;
  if (!temporalActsDiscrete(template) && (isTemporal(ea) || isTemporal(eb))) return null;
  const next = clone(base);
  next[a] = { ...eb };
  next[b] = { ...ea };
  return { id: `flip:${a}-${b}`, label: `${chDisplay(a)} \u21C4 ${chDisplay(b)}`, enc: next };
}
function channelProfile(enc, template) {
  if (!enc?.field) return null;
  if (isMeasure(enc)) return "measure";
  if (isDiscrete(enc) || isTemporal(enc) && temporalActsDiscrete(template)) return "category";
  return "time";
}
function permuteSwapState(base, template, pair) {
  const [a, b] = orderPair(pair[0], pair[1]);
  const posCh = a === "x" || a === "y" ? a : null;
  const auxCh = b;
  if (!posCh || auxCh !== "color" && auxCh !== "size") return null;
  const posEnc = base[posCh];
  const auxEnc = base[auxCh];
  if (!posEnc?.field || !auxEnc?.field) return null;
  if (posEnc.field === auxEnc.field) return null;
  const profile = channelProfile(posEnc, template);
  if (!profile || profile !== channelProfile(auxEnc, template)) return null;
  const id = `swap:${a}-${b}`;
  const label = `${chDisplay(a)} \u21C4 ${chDisplay(b)}`;
  if (profile === "measure") {
    if (template.markCognitiveChannel !== "position") return null;
    const next = clone(base);
    next[posCh] = measureCore(auxEnc);
    next[auxCh] = measureCore(posEnc);
    return { id, label, enc: next };
  }
  if (profile === "category") {
    if (auxCh !== "color") return null;
    const next = clone(base);
    next[posCh] = { ...auxEnc };
    next.color = { ...posEnc };
    return { id, label, enc: next };
  }
  return null;
}
function measureCore(enc) {
  const core = { field: enc.field, type: enc.type };
  if (enc.aggregate) core.aggregate = enc.aggregate;
  return core;
}
var GROUPING_CHANNELS = ["color", "group", "column", "row"];
function routeBudget(target, facetBudget) {
  if (target === "column" || target === "row") return facetBudget;
  if (target === "group") return 12;
  return 20;
}
function routeLabel(from, to) {
  return `${chDisplay(from)} \u21C4 ${chDisplay(to)}`;
}
function findTransitionSeries(base, candidates, channels2) {
  for (const channel of candidates) {
    if (channels2.includes(channel) && isDiscrete(base[channel])) {
      return { channel, enc: base[channel] };
    }
  }
  return null;
}
function seriesRoutingStates(base, template, data, shiftChannels, facetBudget, preferredFacet) {
  const channels2 = template.channels ?? [];
  const out = [];
  const identitySource = isDiscrete(base.color) ? "color" : !base.color?.field && isDiscrete(base.group) ? "group" : void 0;
  if (identitySource && shiftChannels.includes(identitySource) && channels2.includes(identitySource)) {
    const identityEncoding = base[identitySource];
    const card = distinctCount(data, identityEncoding.field);
    const facetTargets = preferredFacet ? [preferredFacet] : ["column", "row"];
    for (const target of facetTargets) {
      if (!shiftChannels.includes(target) || !channels2.includes(target)) continue;
      if (base[target]?.field || card > routeBudget(target, facetBudget)) continue;
      const next = clone(base);
      delete next[identitySource];
      next[target] = { ...identityEncoding };
      out.push({
        id: `augment:${target}`,
        enc: next,
        label: `Color + ${chDisplay(target)}`,
        augmentation: {
          kind: "facet-identity",
          sourceChannel: identitySource,
          facetChannel: target,
          colorEncoding: { ...identityEncoding }
        }
      });
    }
  }
  const facetSource = ["column", "row"].find(
    (channel) => shiftChannels.includes(channel) && channels2.includes(channel) && isDiscrete(base[channel])
  );
  if (facetSource) {
    const facetEncoding = base[facetSource];
    const card = distinctCount(data, facetEncoding.field);
    for (const target of shiftChannels) {
      if (target === facetSource || target === "group") continue;
      if ((target === "column" || target === "row") && preferredFacet && target !== preferredFacet) continue;
      if (!channels2.includes(target) || base[target]?.field) continue;
      if (card > routeBudget(target, facetBudget)) continue;
      const next = clone(base);
      delete next[facetSource];
      next[target] = { ...facetEncoding };
      out.push({ id: `series:${target}`, enc: next, label: routeLabel(facetSource, target) });
    }
  }
  return out;
}
function preferredFacetTarget(base) {
  const domain = domainAxisEnc(base);
  return domain === base.y ? "row" : "column";
}
function changedFacetTarget(authored, transformed) {
  for (const channel of ["column", "row"]) {
    if (transformed[channel]?.field && transformed[channel]?.field !== authored[channel]?.field) {
      return channel;
    }
  }
  return void 0;
}
function domainAxisEnc(base) {
  if (base.x?.field && !isMeasure(base.x)) return base.x;
  if (base.y?.field && !isMeasure(base.y)) return base.y;
  return void 0;
}
function measureAxisEnc(base) {
  if (base.x?.field && isMeasure(base.x)) return base.x;
  if (base.y?.field && isMeasure(base.y)) return base.y;
  return void 0;
}
function transitionGatesPass(base, data, t) {
  if (t.requireOrderedAxis) {
    const domain = domainAxisEnc(base);
    if (!domain || !(domain.type === "temporal" || domain.type === "ordinal")) return false;
  }
  if (t.requireNonNegative) {
    const measure = measureAxisEnc(base);
    if (measure?.field) {
      for (const row of data) {
        const v = row?.[measure.field];
        if (typeof v === "number" && v < 0) return false;
      }
    }
  }
  if (t.maxCategoryCardinality != null) {
    const domain = domainAxisEnc(base);
    if (domain?.field && distinctCount(data, domain.field) > t.maxCategoryCardinality) return false;
  }
  if (t.requireNoSeries) {
    for (const ch of GROUPING_CHANNELS) {
      if (isDiscrete(base[ch])) return false;
    }
  }
  if (t.requireSeries) {
    const seriesChannels = ["color", "group", "detail", "column", "row"];
    if (!seriesChannels.some((ch) => isDiscrete(base[ch]))) return false;
  }
  if (t.requireBiaxialMeasure) {
    if (!isMeasure(base.x) || !isMeasure(base.y)) return false;
  }
  if (t.requireNoSize) {
    if (base.size?.field) return false;
  }
  return true;
}
function transitionState(base, data, template, t) {
  if (!transitionGatesPass(base, data, t)) return null;
  const enc = clone(base);
  const route = t.route;
  if (route) {
    const fromCh = route.from === "series" ? findTransitionSeries(base, GROUPING_CHANNELS, template.channels ?? [])?.channel : route.from;
    if (!fromCh) return null;
    const srcEnc = base[fromCh];
    if (!srcEnc?.field) return null;
    if (t.requireDiscreteSource && !isDiscrete(srcEnc)) return null;
    if (t.maxSourceCardinality != null && distinctCount(data, srcEnc.field) > t.maxSourceCardinality) return null;
    const mode = route.mode ?? "move";
    const dstEnc = base[route.to];
    if (mode === "swap") {
      const spillCh = route.spill ?? fromCh;
      if (spillCh !== fromCh && base[spillCh]?.field) return null;
      enc[route.to] = { ...srcEnc };
      delete enc[fromCh];
      if (dstEnc?.field) enc[spillCh] = { ...dstEnc };
      else delete enc[spillCh];
    } else {
      if (fromCh !== route.to) {
        if (dstEnc?.field) return null;
        delete enc[fromCh];
        enc[route.to] = { ...srcEnc };
      }
    }
  }
  if (t.orientDomainAxis) {
    const target = t.orientDomainAxis;
    const other = target === "x" ? "y" : "x";
    const domainOnOther = !!enc[other]?.field && !isMeasure(enc[other]);
    const targetFreeForDomain = !enc[target]?.field || isMeasure(enc[target]);
    if (domainOnOther && targetFreeForDomain) {
      const a = enc[target];
      const b = enc[other];
      if (b) enc[target] = { ...b };
      else delete enc[target];
      if (a) enc[other] = { ...a };
      else delete enc[other];
    }
  }
  return { enc, chartType: t.to, label: t.label };
}
function pivotSteps(template, enc, data, opts, resolveTemplate) {
  const def = template.pivot;
  if (!def) return [];
  const includeTransitions = opts?.transitions !== false;
  const steps = [];
  for (const pair of def.transpose ?? []) {
    if (pair.length !== 2) continue;
    const s = transposeState(enc, template, [pair[0], pair[1]]);
    if (s) steps.push({ id: s.id, label: s.label, enc: s.enc });
  }
  for (const block of def.permute ?? []) {
    for (let i = 0; i < block.length; i++) {
      for (let j = i + 1; j < block.length; j++) {
        const s = permuteSwapState(enc, template, [block[i], block[j]]);
        if (s) steps.push({ id: s.id, label: s.label, enc: s.enc });
      }
    }
  }
  if (def.shift && def.shift.length) {
    const preferredFacet = opts?.preferFacetTarget ? preferredFacetTarget(enc) : void 0;
    for (const s of seriesRoutingStates(enc, template, data, def.shift, def.facetBudget ?? 12, preferredFacet)) {
      steps.push({ id: s.id, label: s.label, enc: s.enc, augmentation: s.augmentation });
    }
  }
  if (includeTransitions) {
    for (const t of getChartTransitions(template.chart)) {
      if (resolveTemplate && !resolveTemplate(t.to)) continue;
      const st = transitionState(enc, data, template, t);
      if (st) steps.push({ id: `type:${t.to}`, label: `\u03B8_\u2192${t.label.toLowerCase()}`, enc: st.enc, chartType: st.chartType });
    }
  }
  return steps;
}
function encodingKey(enc, chartType) {
  const cells = Object.keys(enc).filter((ch) => enc[ch]?.field).sort().map((ch) => {
    const e = enc[ch];
    return `${ch}=${e.field}/${e.type ?? ""}/${e.aggregate ?? ""}`;
  });
  return `${chartType ?? ""}::${cells.join(",")}`;
}
function isRenderableState(template, enc) {
  const channels2 = template.channels ?? [];
  if (channels2.includes("x") && channels2.includes("y")) {
    if (!enc.x?.field || !enc.y?.field) return false;
  }
  return true;
}
var MAX_PIVOT_STATES = 12;
function computePivot(template, base, data, resolveTemplate, opts) {
  const def = template.pivot;
  if (!def) return null;
  const key = opts?.key ?? def.key ?? "pivot";
  const label = opts?.label ?? def.label ?? "View";
  const includeTransitions = opts?.includeTransitions !== false;
  const ids = ["default"];
  const labels = ["Default"];
  const statesById = {
    default: clone(base)
  };
  const augmentationById = {
    default: void 0
  };
  const chartTypeById = {
    default: void 0
  };
  const seen = /* @__PURE__ */ new Set([encodingKey(base, void 0)]);
  const queue = [{ id: "default", label: "Default", enc: clone(base), chartType: void 0, template, augmentation: void 0 }];
  const authoredChart = template.chart;
  while (queue.length > 0 && ids.length < MAX_PIVOT_STATES) {
    const cur = queue.shift();
    for (const step of pivotSteps(cur.template, cur.enc, data, {
      transitions: includeTransitions,
      preferFacetTarget: opts?.preferFacetTarget
    }, resolveTemplate)) {
      let nextChartType = step.chartType ?? cur.chartType;
      if (nextChartType === authoredChart) nextChartType = void 0;
      const resolved = step.chartType ? resolveTemplate?.(step.chartType) : void 0;
      const nextTemplate = step.chartType ? resolved ?? { ...cur.template, pivot: void 0 } : cur.template;
      if (!isRenderableState(nextTemplate, step.enc)) continue;
      if (opts?.preferFacetTarget) {
        const facetTarget = changedFacetTarget(base, step.enc);
        if (facetTarget && facetTarget !== preferredFacetTarget(step.enc)) continue;
      }
      if (step.chartType === void 0 && cur.id !== "default") {
        const already = changedChannels(base, cur.enc);
        const now = changedChannels(cur.enc, step.enc);
        let overlaps = false;
        for (const ch of now) {
          if (already.has(ch)) {
            overlaps = true;
            break;
          }
        }
        if (overlaps) continue;
      }
      const fp = encodingKey(step.enc, nextChartType);
      if (seen.has(fp)) continue;
      seen.add(fp);
      const id = cur.id === "default" ? step.id : `${cur.id}|${step.id}`;
      const stepLabel = cur.id === "default" ? step.label : `${cur.label} \xB7 ${step.label}`;
      ids.push(id);
      labels.push(stepLabel);
      statesById[id] = step.enc;
      chartTypeById[id] = nextChartType;
      const augmentation = step.chartType ? void 0 : step.augmentation ?? cur.augmentation;
      augmentationById[id] = augmentation;
      queue.push({ id, label: stepLabel, enc: step.enc, chartType: nextChartType, template: nextTemplate, augmentation });
      if (ids.length >= MAX_PIVOT_STATES) break;
    }
  }
  return { key, label, ids, labels, statesById, augmentationById, chartTypeById };
}
function applyPivot(template, base, data, chartProperties, resolveTemplate) {
  const comp = computePivot(template, base, data, resolveTemplate);
  if (!comp || comp.ids.length <= 1) {
    return { encodings: base, augmentation: void 0, chartType: void 0, surface: void 0 };
  }
  const stored = chartProperties?.[comp.key];
  const id = typeof stored === "string" && comp.ids.includes(stored) ? stored : comp.ids[0];
  const index = comp.ids.indexOf(id);
  return {
    encodings: comp.statesById[id],
    augmentation: comp.augmentationById[id],
    chartType: comp.chartTypeById[id],
    surface: {
      key: comp.key,
      label: comp.label,
      length: comp.ids.length,
      index,
      ids: comp.ids,
      labels: comp.labels
    }
  };
}
var isMeasureEnc = (e) => !!e?.field && (!!e.aggregate || e.type === "quantitative");
var isDiscreteCategoryEnc = (e) => !!e?.field && !e.aggregate && e.type !== "quantitative" && e.type !== "temporal";
function resolveSortChannels(encodings, candidates) {
  const category = candidates.find((c) => isDiscreteCategoryEnc(encodings[c]));
  const measure = candidates.find((c) => isMeasureEnc(encodings[c]));
  if (!category || !measure || category === measure) return null;
  return { category, measure };
}
function makeSortAction(options) {
  const candidates = options?.channels ?? ["x", "y"];
  return {
    key: options?.key ?? "sort",
    label: options?.label ?? "Sort",
    dependencies: candidates,
    isApplicable: (ctx) => resolveSortChannels(ctx.encodings, candidates) !== null,
    control: {
      type: "discrete",
      options: [
        { value: void 0, label: "Default" },
        { value: "value-desc", label: "Value \u2193" },
        { value: "value-asc", label: "Value \u2191" }
      ]
    },
    get: (encodings) => {
      const resolved = resolveSortChannels(encodings, candidates);
      if (!resolved) return void 0;
      const { category, measure } = resolved;
      const enc = encodings[category];
      if (enc.sortBy === measure) {
        return enc.sortOrder === "descending" ? "value-desc" : "value-asc";
      }
      return void 0;
    },
    set: (encodings, value) => {
      const resolved = resolveSortChannels(encodings, candidates);
      if (!resolved) return encodings;
      const { category, measure } = resolved;
      const base = encodings[category];
      let next;
      switch (value) {
        case "value-asc":
          next = { ...base, sortBy: measure, sortOrder: "ascending" };
          break;
        case "value-desc":
          next = { ...base, sortBy: measure, sortOrder: "descending" };
          break;
        default:
          next = { ...base, sortBy: void 0, sortOrder: void 0 };
      }
      return { ...encodings, [category]: next };
    }
  };
}
var isDiscrete2 = (type) => type === "nominal" || type === "ordinal";
var getFieldCardinality = (field, table) => new Set(table.map((row) => row[field]).filter((value) => value != null)).size;
function resolveDiscreteType(currentType, field, table) {
  if (currentType === "nominal") return "nominal";
  if (currentType === "ordinal") return "ordinal";
  if (currentType === "temporal") return "ordinal";
  if (currentType === "quantitative" && field && table.length > 0) {
    return getFieldCardinality(field, table) <= 20 ? "ordinal" : "nominal";
  }
  return "nominal";
}
function detectBandedAxisFromSemantics(channelSemantics, table, options = {}) {
  const xType = channelSemantics.x?.type;
  const yType = channelSemantics.y?.type;
  if (xType && isDiscrete2(xType)) return { axis: "x" };
  if (yType && isDiscrete2(yType)) return { axis: "y" };
  if (xType && yType) {
    if (xType === "quantitative" && yType !== "quantitative") {
      return { axis: "y" };
    }
    if (yType === "quantitative" && xType !== "quantitative") {
      return { axis: "x" };
    }
    return { axis: options.preferAxis || "x" };
  }
  if (xType) {
    const newType = resolveDiscreteType(xType, channelSemantics.x?.field, table);
    return { axis: "x", resolvedTypes: { x: newType } };
  }
  if (yType) {
    const newType = resolveDiscreteType(yType, channelSemantics.y?.field, table);
    return { axis: "y", resolvedTypes: { y: newType } };
  }
  return null;
}
var DEFAULT_NESTED_SNAP_THRESHOLD = 0.9;
function recommendMode(maxPerBand, globalCount, nestedFraction, threshold) {
  if (maxPerBand <= 1) return "none";
  if (nestedFraction >= threshold) return "none";
  if (maxPerBand >= globalCount) return "global";
  return "local";
}
function planBandDodge(table, axisField, subField, options) {
  const perBand = /* @__PURE__ */ new Map();
  const global = /* @__PURE__ */ new Set();
  for (const row of table) {
    global.add(row[subField]);
    const key = row[axisField];
    let bandSet = perBand.get(key);
    if (!bandSet) perBand.set(key, bandSet = /* @__PURE__ */ new Set());
    bandSet.add(row[subField]);
  }
  const globalCount = Math.max(1, global.size);
  const bandCount = perBand.size;
  let maxPerBand = 0;
  let singleValuedBands = 0;
  let completeBands = 0;
  for (const bandSet of perBand.values()) {
    if (bandSet.size > maxPerBand) maxPerBand = bandSet.size;
    if (bandSet.size <= 1) singleValuedBands++;
    if (bandSet.size === globalCount) completeBands++;
  }
  const threshold = options?.nestedSnapThreshold ?? DEFAULT_NESTED_SNAP_THRESHOLD;
  const nestedFraction = bandCount > 0 ? singleValuedBands / bandCount : 1;
  const mode = recommendMode(maxPerBand, globalCount, nestedFraction, threshold);
  return {
    mode,
    dodge: mode !== "none",
    laneCount: globalCount,
    ambiguous: maxPerBand > 1 && completeBands < bandCount,
    maxPerBand,
    global: globalCount,
    bandCount
  };
}
var TYPE_REGISTRY = {
  // --- Temporal: DateTime ---
  DateTime: { t0: "Temporal", t1: "DateTime", visEncodings: ["temporal"], aggRole: "dimension", domainShape: "open", diverging: "none", formatClass: "plain", zeroBaseline: "none", zeroPad: 0 },
  Date: { t0: "Temporal", t1: "DateTime", visEncodings: ["temporal"], aggRole: "dimension", domainShape: "open", diverging: "none", formatClass: "plain", zeroBaseline: "none", zeroPad: 0 },
  Time: { t0: "Temporal", t1: "DateTime", visEncodings: ["temporal"], aggRole: "dimension", domainShape: "open", diverging: "none", formatClass: "plain", zeroBaseline: "none", zeroPad: 0 },
  Timestamp: { t0: "Temporal", t1: "DateTime", visEncodings: ["temporal"], aggRole: "dimension", domainShape: "open", diverging: "none", formatClass: "plain", zeroBaseline: "none", zeroPad: 0 },
  // --- Temporal: DateGranule ---
  Year: { t0: "Temporal", t1: "DateGranule", visEncodings: ["temporal", "ordinal"], aggRole: "dimension", domainShape: "open", diverging: "none", formatClass: "integer", zeroBaseline: "arbitrary", zeroPad: 0.03 },
  Quarter: { t0: "Temporal", t1: "DateGranule", visEncodings: ["ordinal"], aggRole: "dimension", domainShape: "cyclic", diverging: "none", formatClass: "plain", zeroBaseline: "none", zeroPad: 0 },
  Month: { t0: "Temporal", t1: "DateGranule", visEncodings: ["ordinal"], aggRole: "dimension", domainShape: "cyclic", diverging: "none", formatClass: "plain", zeroBaseline: "none", zeroPad: 0 },
  Week: { t0: "Temporal", t1: "DateGranule", visEncodings: ["ordinal"], aggRole: "dimension", domainShape: "cyclic", diverging: "none", formatClass: "plain", zeroBaseline: "none", zeroPad: 0 },
  Day: { t0: "Temporal", t1: "DateGranule", visEncodings: ["ordinal"], aggRole: "dimension", domainShape: "cyclic", diverging: "none", formatClass: "plain", zeroBaseline: "none", zeroPad: 0 },
  Hour: { t0: "Temporal", t1: "DateGranule", visEncodings: ["ordinal"], aggRole: "dimension", domainShape: "cyclic", diverging: "none", formatClass: "integer", zeroBaseline: "arbitrary", zeroPad: 0 },
  YearMonth: { t0: "Temporal", t1: "DateGranule", visEncodings: ["temporal", "ordinal"], aggRole: "dimension", domainShape: "open", diverging: "none", formatClass: "plain", zeroBaseline: "none", zeroPad: 0 },
  YearQuarter: { t0: "Temporal", t1: "DateGranule", visEncodings: ["temporal", "ordinal"], aggRole: "dimension", domainShape: "open", diverging: "none", formatClass: "plain", zeroBaseline: "none", zeroPad: 0 },
  YearWeek: { t0: "Temporal", t1: "DateGranule", visEncodings: ["temporal", "ordinal"], aggRole: "dimension", domainShape: "open", diverging: "none", formatClass: "plain", zeroBaseline: "none", zeroPad: 0 },
  Decade: { t0: "Temporal", t1: "DateGranule", visEncodings: ["temporal", "ordinal"], aggRole: "dimension", domainShape: "open", diverging: "none", formatClass: "integer", zeroBaseline: "arbitrary", zeroPad: 0.03 },
  // --- Temporal: Duration ---
  Duration: { t0: "Temporal", t1: "Duration", visEncodings: ["quantitative"], aggRole: "additive", domainShape: "open", diverging: "none", formatClass: "unit-suffix", zeroBaseline: "meaningful", zeroPad: 0 },
  // --- Measure: Amount ---
  Amount: { t0: "Measure", t1: "Amount", visEncodings: ["quantitative"], aggRole: "additive", domainShape: "open", diverging: "none", formatClass: "currency", zeroBaseline: "meaningful", zeroPad: 0 },
  Price: { t0: "Measure", t1: "Amount", visEncodings: ["quantitative"], aggRole: "intensive", domainShape: "open", diverging: "none", formatClass: "currency", zeroBaseline: "meaningful", zeroPad: 0 },
  // --- Measure: Physical ---
  Quantity: { t0: "Measure", t1: "Physical", visEncodings: ["quantitative"], aggRole: "additive", domainShape: "open", diverging: "none", formatClass: "unit-suffix", zeroBaseline: "meaningful", zeroPad: 0 },
  Temperature: { t0: "Measure", t1: "Physical", visEncodings: ["quantitative"], aggRole: "intensive", domainShape: "open", diverging: "conditional", formatClass: "unit-suffix", zeroBaseline: "arbitrary", zeroPad: 0.05 },
  // --- Measure: Proportion ---
  Percentage: { t0: "Measure", t1: "Proportion", visEncodings: ["quantitative"], aggRole: "intensive", domainShape: "bounded", diverging: "none", formatClass: "percent", zeroBaseline: "contextual", zeroPad: 0 },
  // --- Measure: SignedMeasure ---
  Profit: { t0: "Measure", t1: "SignedMeasure", visEncodings: ["quantitative"], aggRole: "signed-additive", domainShape: "open", diverging: "conditional", formatClass: "decimal", zeroBaseline: "meaningful", zeroPad: 0 },
  PercentageChange: { t0: "Measure", t1: "SignedMeasure", visEncodings: ["quantitative"], aggRole: "intensive", domainShape: "open", diverging: "conditional", formatClass: "percent", zeroBaseline: "contextual", zeroPad: 0.05 },
  Sentiment: { t0: "Measure", t1: "SignedMeasure", visEncodings: ["quantitative"], aggRole: "intensive", domainShape: "open", diverging: "inherent", formatClass: "decimal", zeroBaseline: "meaningful", zeroPad: 0 },
  Correlation: { t0: "Measure", t1: "SignedMeasure", visEncodings: ["quantitative"], aggRole: "intensive", domainShape: "bounded", diverging: "inherent", formatClass: "decimal", zeroBaseline: "meaningful", zeroPad: 0 },
  // --- Measure: GenericMeasure ---
  Count: { t0: "Measure", t1: "GenericMeasure", visEncodings: ["quantitative"], aggRole: "additive", domainShape: "open", diverging: "none", formatClass: "integer", zeroBaseline: "meaningful", zeroPad: 0 },
  Number: { t0: "Measure", t1: "GenericMeasure", visEncodings: ["quantitative"], aggRole: "additive", domainShape: "open", diverging: "none", formatClass: "decimal", zeroBaseline: "meaningful", zeroPad: 0 },
  // --- Discrete ---
  Rank: { t0: "Discrete", t1: "Rank", visEncodings: ["ordinal"], aggRole: "dimension", domainShape: "open", diverging: "none", formatClass: "integer", zeroBaseline: "arbitrary", zeroPad: 0.08 },
  Score: { t0: "Discrete", t1: "Score", visEncodings: ["quantitative", "ordinal"], aggRole: "intensive", domainShape: "bounded", diverging: "conditional", formatClass: "decimal", zeroBaseline: "contextual", zeroPad: 0.05 },
  ID: { t0: "Identifier", t1: "ID", visEncodings: ["nominal"], aggRole: "identifier", domainShape: "open", diverging: "none", formatClass: "plain", zeroBaseline: "arbitrary", zeroPad: 0 },
  // --- Geographic ---
  Latitude: { t0: "Geographic", t1: "GeoCoordinate", visEncodings: ["quantitative", "geographic"], aggRole: "dimension", domainShape: "fixed", diverging: "none", formatClass: "decimal", zeroBaseline: "arbitrary", zeroPad: 0.02 },
  Longitude: { t0: "Geographic", t1: "GeoCoordinate", visEncodings: ["quantitative", "geographic"], aggRole: "dimension", domainShape: "fixed", diverging: "none", formatClass: "decimal", zeroBaseline: "arbitrary", zeroPad: 0.02 },
  Country: { t0: "Geographic", t1: "GeoPlace", visEncodings: ["nominal"], aggRole: "dimension", domainShape: "open", diverging: "none", formatClass: "plain", zeroBaseline: "none", zeroPad: 0 },
  State: { t0: "Geographic", t1: "GeoPlace", visEncodings: ["nominal"], aggRole: "dimension", domainShape: "open", diverging: "none", formatClass: "plain", zeroBaseline: "none", zeroPad: 0 },
  City: { t0: "Geographic", t1: "GeoPlace", visEncodings: ["nominal"], aggRole: "dimension", domainShape: "open", diverging: "none", formatClass: "plain", zeroBaseline: "none", zeroPad: 0 },
  Region: { t0: "Geographic", t1: "GeoPlace", visEncodings: ["nominal"], aggRole: "dimension", domainShape: "open", diverging: "none", formatClass: "plain", zeroBaseline: "none", zeroPad: 0 },
  Address: { t0: "Geographic", t1: "GeoPlace", visEncodings: ["nominal"], aggRole: "dimension", domainShape: "open", diverging: "none", formatClass: "plain", zeroBaseline: "none", zeroPad: 0 },
  ZipCode: { t0: "Geographic", t1: "GeoPlace", visEncodings: ["nominal"], aggRole: "identifier", domainShape: "open", diverging: "none", formatClass: "plain", zeroBaseline: "none", zeroPad: 0 },
  // --- Categorical: Entity ---
  Category: { t0: "Categorical", t1: "Entity", visEncodings: ["nominal"], aggRole: "dimension", domainShape: "open", diverging: "none", formatClass: "plain", zeroBaseline: "none", zeroPad: 0 },
  Name: { t0: "Categorical", t1: "Entity", visEncodings: ["nominal"], aggRole: "dimension", domainShape: "open", diverging: "none", formatClass: "plain", zeroBaseline: "none", zeroPad: 0 },
  // --- Categorical: Coded ---
  Status: { t0: "Categorical", t1: "Coded", visEncodings: ["nominal"], aggRole: "dimension", domainShape: "open", diverging: "none", formatClass: "plain", zeroBaseline: "none", zeroPad: 0 },
  Boolean: { t0: "Categorical", t1: "Coded", visEncodings: ["nominal"], aggRole: "dimension", domainShape: "fixed", diverging: "none", formatClass: "plain", zeroBaseline: "none", zeroPad: 0 },
  Direction: { t0: "Categorical", t1: "Coded", visEncodings: ["ordinal", "nominal"], aggRole: "dimension", domainShape: "cyclic", diverging: "none", formatClass: "plain", zeroBaseline: "none", zeroPad: 0 },
  // --- Categorical: Binned ---
  Range: { t0: "Categorical", t1: "Binned", visEncodings: ["ordinal"], aggRole: "dimension", domainShape: "open", diverging: "none", formatClass: "plain", zeroBaseline: "none", zeroPad: 0 },
  // --- Fallbacks ---
  Unknown: { t0: "Categorical", t1: "Entity", visEncodings: ["nominal"], aggRole: "dimension", domainShape: "open", diverging: "none", formatClass: "plain", zeroBaseline: "none", zeroPad: 0 }
};
var UNKNOWN_ENTRY = {
  t0: "Categorical",
  t1: "Entity",
  visEncodings: ["nominal"],
  aggRole: "dimension",
  domainShape: "open",
  diverging: "none",
  formatClass: "plain",
  zeroBaseline: "none",
  zeroPad: 0
};
function getRegistryEntry(semanticType) {
  return TYPE_REGISTRY[semanticType] ?? UNKNOWN_ENTRY;
}
function isRegistered(semanticType) {
  return semanticType in TYPE_REGISTRY;
}
function getRegisteredTypes() {
  return Object.keys(TYPE_REGISTRY);
}
var measureTypes = new Set(
  getRegisteredTypes().filter((t) => {
    const e = getRegistryEntry(t);
    return ["additive", "intensive", "signed-additive"].includes(e.aggRole) && e.t1 !== "Score";
  })
);
var categoricalTypes = new Set(
  getRegisteredTypes().filter((t) => {
    const e = getRegistryEntry(t);
    return e.visEncodings.includes("nominal") && e.aggRole !== "identifier" || e.t1 === "Binned";
  })
);
var ordinalTypes = new Set(
  getRegisteredTypes().filter((t) => {
    const e = getRegistryEntry(t);
    return e.visEncodings.includes("ordinal");
  })
);
function getVisCategory(semanticType) {
  if (!semanticType || !isRegistered(semanticType)) return null;
  return getRegistryEntry(semanticType).visEncodings[0] ?? null;
}
function inferVisCategory(values) {
  if (values.length === 0) return "nominal";
  const isBoolean = (v) => v === true || v === false || Object.prototype.toString.call(v) === "[object Boolean]";
  const isNumber = (v) => !isNaN(+v) && !(Object.prototype.toString.call(v) === "[object Date]");
  const looksLikeDate = (s) => /^\d|^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(s.trim());
  const isDate = (v) => {
    if (v instanceof Date) return !isNaN(v.getTime());
    if (typeof v === "string") return looksLikeDate(v) && !isNaN(Date.parse(v));
    return !isNaN(Date.parse(v));
  };
  const nonNull = values.filter((v) => v != null);
  if (nonNull.length === 0) return "nominal";
  if (nonNull.every(isBoolean)) return "nominal";
  if (nonNull.every(isNumber)) return "quantitative";
  if (nonNull.every(isDate)) return "temporal";
  return "nominal";
}
function getZeroClass(semanticType) {
  const baseline = getRegistryEntry(semanticType).zeroBaseline;
  if (baseline === "none") return "unknown";
  return baseline;
}
var ZERO_BASELINE_GAP_THRESHOLD = 0.5;
function dataFarFromZero(values) {
  if (!values || values.length === 0) return false;
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  if (dataMin <= 0 || dataMax <= 0) return false;
  return dataMin / dataMax >= ZERO_BASELINE_GAP_THRESHOLD;
}
function computeZeroDecision(semanticType, channel, markType, values) {
  const isBarLike = ["bar", "area", "rect"].includes(markType);
  const isScatterMark = markType === "circle" || markType === "point";
  const isPositional = ["x", "y"].includes(channel);
  const entry = getRegistryEntry(semanticType);
  const zeroClass = getZeroClass(semanticType);
  if (zeroClass === "meaningful") {
    if (isBarLike) {
      return { zero: true, domainPadFraction: 0, zeroClass, forced: true, uncertain: false };
    }
    if (isPositional && isScatterMark) {
      if (values && values.length > 0 && Math.min(...values) <= 0) {
        return { zero: true, domainPadFraction: 0, zeroClass, forced: true, uncertain: false };
      }
      return {
        zero: false,
        domainPadFraction: entry.zeroPad || 0.05,
        zeroClass,
        forced: false,
        uncertain: true
      };
    }
    return {
      zero: true,
      domainPadFraction: 0,
      zeroClass,
      forced: false,
      uncertain: dataFarFromZero(values)
    };
  }
  if (zeroClass === "arbitrary") {
    if (isBarLike && values && values.length > 0) {
      const dataMin = Math.min(...values);
      if (dataMin <= 0) {
        return { zero: true, domainPadFraction: 0, zeroClass, forced: true, uncertain: false };
      }
    }
    return {
      zero: false,
      domainPadFraction: entry.zeroPad || 0.05,
      zeroClass,
      forced: false,
      uncertain: false
    };
  }
  if (zeroClass === "contextual" && values && values.length > 0) {
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    if (dataMin <= 0) {
      return { zero: true, domainPadFraction: 0, zeroClass, forced: true, uncertain: false };
    }
    const proximity = dataMax > 0 ? dataMin / dataMax : 0;
    if (proximity < 0.3) {
      return { zero: true, domainPadFraction: 0, zeroClass, forced: false, uncertain: false };
    }
    if (isBarLike) {
      return { zero: true, domainPadFraction: 0, zeroClass, forced: true, uncertain: false };
    }
    return { zero: false, domainPadFraction: 0.05, zeroClass, forced: false, uncertain: false };
  }
  if (isBarLike && isPositional) {
    return { zero: true, domainPadFraction: 0, zeroClass: "unknown", forced: true, uncertain: false };
  }
  return { zero: false, domainPadFraction: 0.05, zeroClass: "unknown", forced: true, uncertain: false };
}
function computePaddedDomain(values, padFraction) {
  if (padFraction <= 0 || values.length < 2) return null;
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const span = dataMax - dataMin;
  if (span <= 0) return null;
  const padding = span * padFraction;
  return [dataMin - padding, dataMax + padding];
}
var DIVERGING_WARM_HIGH = "blueorange";
var DIVERGING_WARM_LOW = "redblue";
function getRecommendedColorScheme(semanticType, encodingType, uniqueValueCount = 10, fieldName = "", values = [], colorHint) {
  const pickScheme = (schemes, name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash = hash & hash;
    }
    return schemes[Math.abs(hash) % schemes.length];
  };
  if (!semanticType) {
    if (encodingType === "quantitative") {
      return { scheme: "viridis", type: "sequential", reason: "default for quantitative" };
    }
    if (encodingType === "ordinal") {
      return { scheme: "blues", type: "sequential", reason: "default for ordinal" };
    }
    return {
      scheme: uniqueValueCount > 10 ? "tableau20" : "tableau10",
      type: "categorical",
      reason: "default for categorical"
    };
  }
  if (semanticType === "Temperature") {
    if (colorHint?.type === "diverging") {
      return { scheme: DIVERGING_WARM_HIGH, type: "diverging", reason: "temperature diverging around freezing point, warm end high" };
    }
    return { scheme: "reds", type: "sequential", reason: "temperature single-direction uses sequential" };
  }
  if (semanticType === "Percentage") {
    if (colorHint?.type === "diverging") {
      return { scheme: DIVERGING_WARM_LOW, type: "diverging", reason: "percentage spans positive and negative, red is the losing side" };
    }
    return { scheme: "oranges", type: "sequential", reason: "percentage all same sign uses sequential" };
  }
  if (["Price", "Amount"].includes(semanticType)) {
    if (colorHint?.type === "diverging") {
      return { scheme: DIVERGING_WARM_LOW, type: "diverging", reason: "financial data spans positive and negative, red is the losing side" };
    }
    return { scheme: "goldgreen", type: "sequential", reason: "financial data uses gold-green" };
  }
  if (semanticType === "Score") {
    if (colorHint?.type === "diverging") {
      return { scheme: DIVERGING_WARM_LOW, type: "diverging", reason: "score diverging around midpoint, red is the poor side" };
    }
    return { scheme: "yelloworangebrown", type: "sequential", reason: "scores use warm sequential" };
  }
  if (semanticType === "Rank") {
    return { scheme: "purples", type: "sequential", reason: "ranks use single-hue sequential" };
  }
  if (semanticType === "Range") {
    return { scheme: "blues", type: "sequential", reason: "range groups use sequential" };
  }
  if (ordinalTypes.has(semanticType) && ["Year", "Quarter", "Month", "Week", "Day", "Hour", "Decade"].includes(semanticType)) {
    return { scheme: "viridis", type: "sequential", reason: "temporal granules use perceptually uniform" };
  }
  if (getRegistryEntry(semanticType ?? "").t1 === "GeoPlace") {
    if (uniqueValueCount <= 10) {
      return { scheme: "tableau10", type: "categorical", reason: "places are named categories, at a contrast that survives thin marks" };
    }
    return { scheme: "tableau20", type: "categorical", reason: "many regions use large categorical" };
  }
  if (["Status", "Boolean"].includes(semanticType)) {
    return { scheme: "set1", type: "categorical", reason: "status uses high-contrast categorical" };
  }
  if (semanticType === "Category") {
    return {
      scheme: uniqueValueCount > 10 ? "tableau20" : "tableau10",
      type: "categorical",
      reason: "categories use standard categorical"
    };
  }
  if (semanticType === "Name") {
    return {
      scheme: uniqueValueCount > 8 ? "tableau20" : "tableau10",
      type: "categorical",
      reason: "names use readable categorical"
    };
  }
  if (semanticType === "Duration") {
    return { scheme: "oranges", type: "sequential", reason: "duration uses intensity-based sequential" };
  }
  if (measureTypes.has(semanticType)) {
    if (colorHint?.type === "diverging") {
      const signed = getRegistryEntry(semanticType).t1 === "SignedMeasure";
      return signed ? { scheme: DIVERGING_WARM_LOW, type: "diverging", reason: "signed measure, red is the negative side" } : { scheme: DIVERGING_WARM_HIGH, type: "diverging", reason: "measure with no valence, warm end high" };
    }
    const sequentialSchemes = ["viridis", "blues", "greens", "reds", "yelloworangebrown", "goldgreen"];
    return {
      scheme: pickScheme(sequentialSchemes, fieldName),
      type: "sequential",
      reason: "measures use perceptually uniform sequential"
    };
  }
  if (ordinalTypes.has(semanticType) || encodingType === "ordinal") {
    const ordinalSchemes = ["blues", "greens", "purples", "oranges"];
    return {
      scheme: pickScheme(ordinalSchemes, fieldName),
      type: "sequential",
      reason: "ordinal data uses sequential scheme"
    };
  }
  if (encodingType === "nominal" || encodingType === "temporal") {
    return {
      scheme: uniqueValueCount > 10 ? "tableau20" : "tableau10",
      type: "categorical",
      reason: "default categorical palette"
    };
  }
  return { scheme: "viridis", type: "sequential", reason: "universal fallback" };
}
var MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var MONTH_ABBR3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var MONTH_NUM = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
var DOW_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
var DOW_ABBR3 = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
var DOW_ABBR2 = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
var DOW_FULL_SUN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var DOW_ABBR3_SUN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var QUARTER_LABELS = ["Q1", "Q2", "Q3", "Q4"];
var COMPASS_8 = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
var COMPASS_8_FULL = ["North", "Northeast", "East", "Southeast", "South", "Southwest", "West", "Northwest"];
var COMPASS_4 = ["N", "E", "S", "W"];
var COMPASS_4_FULL = ["North", "East", "South", "West"];
var ORDINAL_SEQUENCES = {
  Month: [
    { labels: MONTH_FULL, caseInsensitive: true },
    { labels: MONTH_ABBR3, caseInsensitive: true },
    { labels: MONTH_NUM, caseInsensitive: false }
  ],
  Day: [
    { labels: DOW_FULL, caseInsensitive: true },
    { labels: DOW_ABBR3, caseInsensitive: true },
    { labels: DOW_ABBR2, caseInsensitive: true },
    { labels: DOW_FULL_SUN, caseInsensitive: true },
    { labels: DOW_ABBR3_SUN, caseInsensitive: true }
  ],
  Quarter: [
    { labels: QUARTER_LABELS, caseInsensitive: true }
  ],
  Direction: [
    { labels: COMPASS_8, caseInsensitive: true },
    { labels: COMPASS_8_FULL, caseInsensitive: true },
    { labels: COMPASS_4, caseInsensitive: true },
    { labels: COMPASS_4_FULL, caseInsensitive: true }
  ]
};
function buildLookup(seq) {
  const m = /* @__PURE__ */ new Map();
  for (let i = 0; i < seq.labels.length; i++) {
    const key = seq.caseInsensitive ? seq.labels[i].toLowerCase() : seq.labels[i];
    m.set(key, i);
  }
  return m;
}
function matchSequence(values, sequences) {
  const uniqueValues = [...new Set(values.map((v) => v != null ? String(v) : ""))].filter((v) => v !== "");
  if (uniqueValues.length === 0) return void 0;
  for (const seq of sequences) {
    const lookup = buildLookup(seq);
    const matched = [];
    const unmatched = [];
    for (const val of uniqueValues) {
      const key = seq.caseInsensitive ? val.toLowerCase() : val;
      const idx = lookup.get(key);
      if (idx !== void 0) {
        matched.push({ value: val, index: idx });
      } else {
        unmatched.push(val);
      }
    }
    if (matched.length >= uniqueValues.length * 0.6 && matched.length >= 2) {
      matched.sort((a, b) => a.index - b.index);
      const result = matched.map((m) => m.value);
      result.push(...unmatched);
      return result;
    }
  }
  return void 0;
}
function inferOrdinalSortOrder(semanticType, values) {
  const sequences = ORDINAL_SEQUENCES[semanticType];
  if (sequences) {
    return matchSequence(values, sequences);
  }
  if (!semanticType || semanticType === "Category" || semanticType === "Unknown") {
    for (const seqs of Object.values(ORDINAL_SEQUENCES)) {
      const result = matchSequence(values, seqs);
      if (result) return result;
    }
  }
  return void 0;
}
function visCategoryToVLType(vc) {
  switch (vc) {
    case "quantitative":
      return "quantitative";
    case "ordinal":
      return "ordinal";
    case "temporal":
      return "temporal";
    case "geographic":
      return "quantitative";
    case "nominal":
    default:
      return "nominal";
  }
}
function validateTemporalParsing(data, fieldName, fromRegistry) {
  const sampleValues = [];
  const seen = /* @__PURE__ */ new Set();
  for (const row of data) {
    const value = row[fieldName];
    if (value == null) continue;
    const key = value instanceof Date ? `date:${value.getTime()}` : `${typeof value}:${String(value)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sampleValues.push(value);
    if (sampleValues.length >= 15) break;
  }
  if (sampleValues.length === 0) return false;
  if (sampleValues.length <= 1) return false;
  const looksTemporalValue = (val) => {
    if (val instanceof Date) return true;
    if (typeof val === "number") {
      if (val >= 1500 && val <= 2200 && val % 1 === 0) return true;
      if (val > 864e5 && val < 42e11) return true;
      return false;
    }
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (!trimmed) return false;
      if (/^\d{4}$/.test(trimmed)) return true;
      return !Number.isNaN(Date.parse(trimmed));
    }
    return false;
  };
  const passingCount = sampleValues.filter(looksTemporalValue).length;
  const minFraction = fromRegistry ? 0.3 : 0.5;
  return passingCount / sampleValues.length >= minFraction;
}
function resolveTemporalEncoding(visCategory, channel, data, fieldName, fromRegistry) {
  if (["size", "column", "row"].includes(channel)) {
    return { vlType: "ordinal", visCategory, channelOverride: true, cardinalityGuard: false };
  }
  if (channel === "color") {
    const uniqueCount = new Set(data.map((r) => r[fieldName])).size;
    if (uniqueCount <= 12) {
      return { vlType: "ordinal", visCategory, channelOverride: true, cardinalityGuard: false };
    }
  }
  if (!validateTemporalParsing(data, fieldName, fromRegistry)) {
    return { vlType: "ordinal", visCategory, channelOverride: false, cardinalityGuard: false };
  }
  return { vlType: "temporal", visCategory, channelOverride: false, cardinalityGuard: false };
}
function applyOrdinalGuards(visCategory, channel, data, fieldName, fieldValues, fromRegistry) {
  const numericVals = fieldValues.filter((v) => v != null && !isNaN(+v)).map(Number);
  if (numericVals.length > 0) {
    const uniqueCount = new Set(numericVals).size;
    const hasFractions = numericVals.some((v) => v % 1 !== 0);
    if (!fromRegistry && hasFractions && uniqueCount > 20) {
      return { vlType: "quantitative", visCategory, channelOverride: false, cardinalityGuard: true };
    }
    if (!hasFractions && uniqueCount > 12 && ["color", "group"].includes(channel)) {
      return { vlType: "quantitative", visCategory, channelOverride: true, cardinalityGuard: true };
    }
    if (!hasFractions && uniqueCount > 12 && ["x", "y"].includes(channel)) {
      return { vlType: "quantitative", visCategory, channelOverride: true, cardinalityGuard: true };
    }
  }
  return { vlType: "ordinal", visCategory, channelOverride: false, cardinalityGuard: false };
}
function disambiguateMultiEncoding(candidates, channel, data, fieldName, fieldValues) {
  const has = (vc) => candidates.includes(vc);
  if (has("temporal") && has("ordinal")) {
    return resolveTemporalEncoding("temporal", channel, data, fieldName, true);
  }
  if (has("quantitative") && has("ordinal")) {
    if (["color", "group"].includes(channel)) {
      const uniqueCount = new Set(data.map((r) => r[fieldName])).size;
      if (uniqueCount <= 12) {
        return { vlType: "ordinal", visCategory: "ordinal", channelOverride: false, cardinalityGuard: false };
      }
      return { vlType: "quantitative", visCategory: "quantitative", channelOverride: false, cardinalityGuard: true };
    }
    if (["column", "row"].includes(channel)) {
      return { vlType: "ordinal", visCategory: "ordinal", channelOverride: false, cardinalityGuard: false };
    }
    return { vlType: "quantitative", visCategory: "quantitative", channelOverride: false, cardinalityGuard: false };
  }
  if (has("quantitative") && has("geographic")) {
    return { vlType: "quantitative", visCategory: "quantitative", channelOverride: false, cardinalityGuard: false };
  }
  if (has("ordinal") && has("nominal")) {
    if (["color", "group"].includes(channel)) {
      return { vlType: "nominal", visCategory: "nominal", channelOverride: false, cardinalityGuard: false };
    }
    return { vlType: "ordinal", visCategory: "ordinal", channelOverride: false, cardinalityGuard: false };
  }
  const fallback = candidates[0];
  return { vlType: visCategoryToVLType(fallback), visCategory: fallback, channelOverride: false, cardinalityGuard: false };
}
function resolveEncodingType(semanticType, fieldValues, channel, data, fieldName) {
  if (semanticType && isRegistered(semanticType)) {
    const entry = getRegistryEntry(semanticType);
    const candidates = entry.visEncodings;
    if (candidates.length > 1) {
      return disambiguateMultiEncoding(candidates, channel, data, fieldName);
    }
    const baseType = candidates[0];
    if (baseType === "quantitative") {
      const nonNull = fieldValues.filter((v) => v != null);
      const allNumeric = nonNull.length > 0 && nonNull.every((v) => typeof v === "number" || typeof v === "string" && !isNaN(+v) && v.trim() !== "");
      if (!allNumeric) {
        const inferred = inferVisCategory(fieldValues);
        return {
          vlType: visCategoryToVLType(inferred),
          visCategory: inferred,
          channelOverride: false,
          cardinalityGuard: false
        };
      }
    }
    if (baseType === "temporal") {
      return resolveTemporalEncoding(baseType, channel, data, fieldName, true);
    }
    if (baseType === "ordinal") {
      return applyOrdinalGuards(baseType, channel, data, fieldName, fieldValues, true);
    }
    return {
      vlType: visCategoryToVLType(baseType),
      visCategory: baseType,
      channelOverride: false,
      cardinalityGuard: false
    };
  }
  const visCategory = inferVisCategory(fieldValues);
  const channelOverride = false;
  const cardinalityGuard = false;
  switch (visCategory) {
    case "temporal":
      return resolveTemporalEncoding(visCategory, channel, data, fieldName, false);
    case "ordinal":
      return applyOrdinalGuards(visCategory, channel, data, fieldName, fieldValues, false);
    case "quantitative":
      return { vlType: "quantitative", visCategory, channelOverride, cardinalityGuard };
    case "geographic":
      return { vlType: "quantitative", visCategory, channelOverride, cardinalityGuard };
    case "nominal":
    default:
      return { vlType: "nominal", visCategory, channelOverride, cardinalityGuard };
  }
}
var DEFAULT_GAS_PRESSURE_PARAMS = {
  markCrossSection: 30,
  elasticity: 0.3,
  maxStretch: 1.5
};
function computeGasPressure(xValues, yValues, xDomain, yDomain, canvasWidth, canvasHeight, params = DEFAULT_GAS_PRESSURE_PARAMS) {
  const N = xValues.length;
  if (N <= 1 || canvasWidth <= 0 || canvasHeight <= 0) {
    return { stretchX: 1, stretchY: 1, rawStretchX: 1, rawStretchY: 1 };
  }
  const sigma1dDefault = Math.sqrt(params.markCrossSection);
  const computeAxisStretch = (values, domain, baseDim, sigma1d) => {
    if (baseDim <= 0 || values.length <= 1) return [1, 1];
    const range = domain[1] - domain[0];
    if (range <= 0) return [1, 1];
    const pxPerUnit = baseDim / range;
    const seen = /* @__PURE__ */ new Set();
    for (const v of values) {
      seen.add(Math.round((v - domain[0]) * pxPerUnit));
    }
    const uniquePositions = seen.size;
    const pressure = uniquePositions * sigma1d / baseDim;
    if (pressure <= 1) return [1, 1];
    const raw = Math.pow(pressure, params.elasticity);
    return [Math.min(params.maxStretch, raw), raw];
  };
  const sigma1dX = params.markCrossSectionX != null ? Math.sqrt(params.markCrossSectionX) : sigma1dDefault;
  const sigma1dY = params.markCrossSectionY != null ? Math.sqrt(params.markCrossSectionY) : sigma1dDefault;
  const computeStretchForAxis = (values, domain, baseDim, sigma1d, sigmaRaw, itemCountOverride) => {
    if (itemCountOverride != null && sigmaRaw > 0) {
      const pressure = itemCountOverride * sigmaRaw / baseDim;
      if (pressure <= 1) return [1, 1];
      const raw = Math.pow(pressure, params.elasticity);
      return [Math.min(params.maxStretch, raw), raw];
    }
    return sigma1d > 0 ? computeAxisStretch(values, domain, baseDim, sigma1d) : [1, 1];
  };
  const sigmaRawX = params.markCrossSectionX ?? params.markCrossSection;
  const sigmaRawY = params.markCrossSectionY ?? params.markCrossSection;
  const [stretchX, rawStretchX] = computeStretchForAxis(xValues, xDomain, canvasWidth, sigma1dX, sigmaRawX, params.xItemCountOverride);
  const [stretchY, rawStretchY] = computeStretchForAxis(yValues, yDomain, canvasHeight, sigma1dY, sigmaRawY, params.yItemCountOverride);
  return { stretchX, stretchY, rawStretchX, rawStretchY };
}
function computeElasticBudget(itemCount, baseDimension, params) {
  if (itemCount <= 0) {
    return { budget: baseDimension, stretchFactor: 1 };
  }
  const pressure = itemCount * params.defaultStepSize / baseDimension;
  if (pressure <= 1) {
    return { budget: baseDimension, stretchFactor: 1 };
  }
  const stretchFactor = Math.min(params.maxStretch, Math.pow(pressure, params.elasticity));
  return {
    budget: baseDimension * stretchFactor,
    stretchFactor
  };
}
function computeAxisStep(nominalCount, continuousCount, baseDimension, params) {
  const itemCount = nominalCount > 0 ? nominalCount : continuousCount;
  if (itemCount > 0) {
    const fit = Math.max(0, Math.min(1, params.bandStepFit ?? 0));
    const baseSpanStep = baseDimension / itemCount;
    const capacityStep = baseDimension * (params.bandStepFitCapacity ?? 1) / itemCount;
    const preferredStep = baseSpanStep > params.defaultStepSize ? params.defaultStepSize * (1 - fit) + capacityStep * fit : params.defaultStepSize;
    if (preferredStep <= baseSpanStep) {
      return { step: Math.floor(preferredStep), budget: baseDimension, itemCount };
    }
    const { budget } = computeElasticBudget(itemCount, baseDimension, {
      ...params,
      defaultStepSize: preferredStep
    });
    return {
      step: Math.floor(Math.min(preferredStep, budget / itemCount)),
      budget,
      itemCount
    };
  }
  return { step: params.defaultStepSize, budget: baseDimension, itemCount: 0 };
}
function computeLabelSizing(effectiveStep, hasDiscreteItems, opts) {
  const baseFont = opts?.baseFont ?? 10;
  const minFont = opts?.minFont ?? 6;
  const defaultLimit = 100;
  if (!hasDiscreteItems) {
    return { fontSize: baseFont, labelLimit: defaultLimit };
  }
  let fontSize = Math.max(minFont, Math.min(baseFont, effectiveStep - 1));
  let labelLimit = Math.max(30, Math.min(100, effectiveStep * 8));
  let labelAngle;
  let labelAlign;
  let labelBaseline;
  if (effectiveStep < 10) {
    labelAngle = -90;
    fontSize = Math.max(minFont, Math.min(baseFont - 2, effectiveStep));
    labelLimit = 40;
    labelAlign = "right";
    labelBaseline = "middle";
  } else if (effectiveStep < 16) {
    labelAngle = -45;
    fontSize = Math.max(minFont, Math.min(baseFont - 1, effectiveStep));
    labelLimit = 60;
    labelAlign = "right";
    labelBaseline = "top";
  }
  return { fontSize, labelLimit, labelAngle, labelAlign, labelBaseline };
}
function computeFontSizing(minPlotDimension, opts) {
  const baseLabel = opts?.baseLabelFontSize ?? 10;
  const baseTitle = opts?.baseTitleFontSize ?? 11;
  const minDim = minPlotDimension || 320;
  const ratio = minDim >= 220 ? 1 : Math.max(0.7, minDim / 220);
  const atMostNative = (base) => Math.round(Math.max(base - 2, Math.min(base, base * ratio)));
  const tickBase = atMostNative(baseLabel);
  const titleFontSize = atMostNative(baseTitle);
  const legendFontSize = Math.max(baseTitle - 2, titleFontSize - 1);
  return { tickBase, titleFontSize, legendFontSize };
}
function toTypeString(input) {
  if (!input) return "";
  if (typeof input === "string") return input;
  return input.semanticType || "";
}
function normalizeAnnotation(input) {
  if (!input) return { semanticType: "Unknown" };
  if (typeof input === "string") return { semanticType: input || "Unknown" };
  return { ...input, semanticType: input.semanticType || "Unknown" };
}
var CURRENCY_MAP = {
  USD: "$",
  EUR: "\u20AC",
  GBP: "\xA3",
  JPY: "\xA5",
  CNY: "\xA5",
  KRW: "\u20A9",
  INR: "\u20B9",
  BRL: "R$",
  CAD: "CA$",
  AUD: "A$",
  CHF: "CHF",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr"
};
var UNIT_SUFFIX_MAP = {
  // Temperature
  "\xB0C": "\xB0C",
  "\xB0F": "\xB0F",
  C: "\xB0C",
  F: "\xB0F",
  // Mass
  kg: " kg",
  lb: " lb",
  // Distance
  km: " km",
  mi: " mi",
  m: " m",
  ft: " ft",
  // Speed
  "km/h": " km/h",
  mph: " mph",
  // Time
  sec: " s",
  min: " min",
  hr: " hr",
  seconds: " s",
  minutes: " min",
  hours: " hr",
  // Percentage (handled by formatClass, but allow explicit suffix)
  "%": "%"
};
function detectPercentageRepresentation(values) {
  if (values.length === 0) return "0-100";
  const abs = values.map(Math.abs);
  const countBelow1 = abs.filter((v) => v <= 1).length;
  if (countBelow1 / abs.length >= 0.8) return "0-1";
  return "0-100";
}
function detectPrecision(values) {
  let maxDecimals = 0;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    const s = v.toFixed(10);
    const dot = s.indexOf(".");
    if (dot === -1) continue;
    let end = s.length - 1;
    while (end > dot && s[end] === "0") end--;
    const decimals = end > dot ? end - dot : 0;
    if (decimals > maxDecimals) maxDecimals = decimals;
  }
  return Math.min(maxDecimals, 4);
}
function precisionFormat(values, useGrouping = true, signMode = "") {
  const p = detectPrecision(values);
  const group = useGrouping ? "," : "";
  if (p === 0) return `${signMode}${group}d`;
  return `${signMode}${group}.${p}f`;
}
function resolveFormat(semanticType, annotation, values) {
  const entry = getRegistryEntry(semanticType);
  const unit = annotation.unit;
  const currencyPrefix = unit ? CURRENCY_MAP[unit.toUpperCase()] ?? CURRENCY_MAP[unit] : void 0;
  const unitSuffix = unit ? UNIT_SUFFIX_MAP[unit] : void 0;
  const nums = values.filter((v) => typeof v === "number" && !isNaN(v));
  switch (entry.formatClass) {
    case "currency": {
      const pfx = currencyPrefix;
      if (pfx) {
        const axisPattern = semanticType === "Price" ? ",.2f" : precisionFormat(nums);
        return {
          format: { pattern: axisPattern, prefix: pfx },
          tooltipFormat: { pattern: ",.2f", prefix: pfx }
        };
      }
      return { tooltipFormat: { pattern: ",.2f" } };
    }
    case "percent": {
      if (!annotation.intrinsicDomain) {
        return { tooltipFormat: { pattern: precisionFormat(nums) } };
      }
      const rep = detectPercentageRepresentation(nums);
      if (rep === "0-1") {
        const p = detectPrecision(nums);
        const axisP = Math.max(0, p - 2);
        const tipP = Math.min(axisP + 1, 4);
        return {
          format: { pattern: `.${axisP}~%` },
          tooltipFormat: { pattern: `.${tipP}%` }
        };
      }
      return {
        tooltipFormat: { pattern: precisionFormat(nums, false), suffix: "%" }
      };
    }
    case "unit-suffix":
      return {
        tooltipFormat: unitSuffix ? { pattern: precisionFormat(nums), suffix: unitSuffix } : { pattern: precisionFormat(nums) }
      };
    case "integer":
      if (semanticType === "Year" || semanticType === "Decade") {
        return {};
      }
      return { tooltipFormat: { pattern: ",d" } };
    case "decimal":
      return { tooltipFormat: { pattern: precisionFormat(nums) } };
    case "plain":
    default:
      return {};
  }
}
function resolveDefaultVisType(semanticType, values) {
  if (!isRegistered(semanticType)) {
    return inferVisCategory(values);
  }
  const entry = getRegistryEntry(semanticType);
  const candidates = entry.visEncodings;
  if (candidates.length === 1) {
    if (candidates[0] === "quantitative") {
      const nonNull = values.filter((v) => v != null);
      const allNumeric = nonNull.length > 0 && nonNull.every((v) => typeof v === "number" || typeof v === "string" && !isNaN(+v) && v.trim() !== "");
      if (!allNumeric) {
        return inferVisCategory(values);
      }
    }
    return candidates[0];
  }
  if (candidates.includes("quantitative") && candidates.includes("ordinal")) {
    const distinct = new Set(values.filter((v) => v != null)).size;
    return distinct <= 12 ? "ordinal" : "quantitative";
  }
  if (candidates.includes("temporal") && candidates.includes("ordinal")) {
    const distinct = new Set(values.filter((v) => v != null)).size;
    return distinct <= 6 ? "ordinal" : "temporal";
  }
  if (candidates.includes("geographic") && candidates.includes("quantitative")) {
    return "quantitative";
  }
  return candidates[0];
}
function resolveAggregationDefault(semanticType) {
  const entry = getRegistryEntry(semanticType);
  switch (entry.aggRole) {
    case "additive":
      return "sum";
    case "signed-additive":
      return "sum";
    case "intensive":
      return "average";
    case "dimension":
      return void 0;
    case "identifier":
      return void 0;
    default:
      return void 0;
  }
}
function resolveZeroClassFromAnnotation(semanticType, domain) {
  if (domain && domain[0] > 0) return "arbitrary";
  return getZeroClass(semanticType);
}
function resolveScaleType(semanticType, values) {
  const entry = getRegistryEntry(semanticType);
  const eligible = entry.aggRole === "additive" && entry.domainShape === "open" && entry.t1 !== "GenericMeasure";
  if (!eligible) return void 0;
  if (values.length < 10) return void 0;
  const filtered = values.filter((v) => typeof v === "number" && !isNaN(v) && isFinite(v));
  if (filtered.length < 10) return void 0;
  const min = Math.min(...filtered);
  const max = Math.max(...filtered);
  if (max <= 0 || min === max) return void 0;
  if (min < 0) return void 0;
  const positiveMin = Math.min(...filtered.filter((v) => v > 0));
  if (positiveMin > 0 && max / positiveMin >= 1e6) {
    const hasZeros = filtered.some((v) => v === 0);
    return hasZeros ? "symlog" : "log";
  }
  return void 0;
}
function mergeIntrinsicWithData(intrinsic, values, hard) {
  if (hard) {
    return { min: intrinsic[0], max: intrinsic[1], clamp: true };
  }
  const nums = values.filter((v) => typeof v === "number" && !isNaN(v));
  if (nums.length === 0) {
    return { min: intrinsic[0], max: intrinsic[1], clamp: false };
  }
  const dataMin = Math.min(...nums);
  const dataMax = Math.max(...nums);
  return {
    min: Math.min(intrinsic[0], dataMin),
    max: Math.max(intrinsic[1], dataMax),
    clamp: false
  };
}
function snapToBoundHeuristic(intrinsic, values) {
  const nums = values.filter((v) => typeof v === "number" && !isNaN(v));
  if (nums.length === 0) return void 0;
  const [lo, hi] = intrinsic;
  const range = hi - lo;
  if (range <= 0) return void 0;
  const dataMin = Math.min(...nums);
  const dataMax = Math.max(...nums);
  const zeroInside = lo < 0 && hi > 0;
  const thresholdLo = 0.25 * (zeroInside ? 0 - lo : range);
  const thresholdHi = 0.25 * (zeroInside ? hi : range);
  let snapMin;
  let snapMax;
  if (dataMin >= lo && dataMin <= lo + thresholdLo) {
    snapMin = lo;
  }
  if (dataMax <= hi && dataMax >= hi - thresholdHi) {
    snapMax = hi;
  }
  if (snapMin === void 0 && snapMax === void 0) return void 0;
  return { min: snapMin, max: snapMax, clamp: false };
}
function resolveDomainConstraint(semanticType, annotation, values) {
  const entry = getRegistryEntry(semanticType);
  if (annotation.intrinsicDomain) {
    if (entry.t1 === "Proportion" || entry.t1 === "SignedMeasure") {
      return snapToBoundHeuristic(annotation.intrinsicDomain, values);
    }
    return mergeIntrinsicWithData(annotation.intrinsicDomain, values, false);
  }
  if (semanticType === "Latitude") return mergeIntrinsicWithData([-90, 90], values, true);
  if (semanticType === "Longitude") return mergeIntrinsicWithData([-180, 180], values, true);
  if (semanticType === "Correlation") return mergeIntrinsicWithData([-1, 1], values, true);
  if (semanticType === "Percentage") {
    const nums = values.filter((v) => typeof v === "number" && !isNaN(v));
    if (nums.length > 0) {
      const rep = detectPercentageRepresentation(nums);
      const M = rep === "0-1" ? 1 : 100;
      return snapToBoundHeuristic([0, M], values);
    }
  }
  return void 0;
}
function resolveTickConstraint(semanticType, domain) {
  const entry = getRegistryEntry(semanticType);
  if (entry.formatClass === "integer") {
    const tc = { integersOnly: true, minStep: 1 };
    if (domain) {
      const span = domain[1] - domain[0];
      if (span <= 20 && span > 0) {
        tc.exactTicks = [];
        for (let i = domain[0]; i <= domain[1]; i++) {
          tc.exactTicks.push(i);
        }
      }
    }
    return tc;
  }
  if (semanticType === "Score" && domain) {
    const span = domain[1] - domain[0];
    if (span >= 2) {
      const tc = { integersOnly: true, minStep: 1 };
      if (span <= 20) {
        tc.exactTicks = [];
        for (let i = domain[0]; i <= domain[1]; i++) {
          tc.exactTicks.push(i);
        }
      }
      return tc;
    }
  }
  return void 0;
}
function resolveCanonicalOrder(semanticType, annotation, values) {
  if (annotation.sortOrder && annotation.sortOrder.length > 0) {
    return annotation.sortOrder;
  }
  return inferOrdinalSortOrder(semanticType, values);
}
function resolveCyclic(semanticType) {
  const entry = getRegistryEntry(semanticType);
  return entry.domainShape === "cyclic";
}
function resolveReversed(semanticType, channel) {
  if (semanticType === "Rank") {
    return channel !== "x";
  }
  return false;
}
function resolveNice(semanticType, domainConstraint) {
  if (domainConstraint?.clamp) return false;
  if (domainConstraint && domainConstraint.min !== void 0 && domainConstraint.max !== void 0) {
    return false;
  }
  const entry = getRegistryEntry(semanticType);
  if (entry.domainShape === "fixed") return false;
  return true;
}
function resolveDivergingInfo(semanticType, annotation, values) {
  const entry = getRegistryEntry(semanticType);
  if (annotation.divergingMidpoint !== void 0) {
    return { midpoint: annotation.divergingMidpoint, inherent: true, source: "annotation" };
  }
  if (semanticType === "Temperature" && annotation.unit) {
    const unitMidpoints = {
      "\xB0C": 0,
      "\xB0F": 32,
      "K": 273.15,
      C: 0,
      F: 32
    };
    const mid = unitMidpoints[annotation.unit];
    if (mid !== void 0) {
      return { midpoint: mid, inherent: false, source: "unit" };
    }
  }
  if (entry.diverging === "inherent") {
    return { midpoint: 0, inherent: true, source: "type-intrinsic" };
  }
  if (entry.diverging === "conditional") {
    return { midpoint: 0, inherent: false, source: "type-intrinsic" };
  }
  if (annotation.intrinsicDomain) {
    return {
      midpoint: (annotation.intrinsicDomain[0] + annotation.intrinsicDomain[1]) / 2,
      inherent: false,
      source: "domain"
    };
  }
  if (values.length > 0) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min < 0 && max > 0) {
      return { midpoint: 0, inherent: false, source: "data" };
    }
  }
  return void 0;
}
function resolveColorSchemeHint(semanticType, annotation, values) {
  const entry = getRegistryEntry(semanticType);
  const nums = values.filter((v) => typeof v === "number" && !isNaN(v));
  const divInfo = resolveDivergingInfo(semanticType, annotation, nums);
  if (divInfo) {
    const min = nums.length > 0 ? Math.min(...nums) : 0;
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    const spansBothSides = min < divInfo.midpoint && max > divInfo.midpoint;
    if (divInfo.inherent || spansBothSides) {
      return {
        type: "diverging",
        divergingMidpoint: divInfo.midpoint,
        inherentlyDiverging: divInfo.inherent
      };
    }
  }
  if (entry.visEncodings.includes("quantitative")) {
    return { type: "sequential" };
  }
  return { type: "categorical" };
}
function resolveBinningSuggested(semanticType, domain) {
  const entry = getRegistryEntry(semanticType);
  if (!entry.visEncodings.includes("quantitative")) return false;
  if (entry.aggRole === "identifier" || entry.aggRole === "dimension") return false;
  if (semanticType === "Year" || semanticType === "Decade") return false;
  if (domain && domain[1] - domain[0] <= 20) return false;
  if (semanticType === "Score" && !domain) return false;
  return true;
}
function resolveStackable(semanticType) {
  const entry = getRegistryEntry(semanticType);
  switch (entry.aggRole) {
    case "additive":
      return "sum";
    case "signed-additive":
      return "sum";
    case "intensive":
      if (semanticType === "Percentage") return "normalize";
      return false;
    case "dimension":
      return false;
    case "identifier":
      return false;
    default:
      return false;
  }
}
function resolveSortDirection(semanticType) {
  if (semanticType === "Rank") return "descending";
  return "ascending";
}
function resolveFieldSemantics(input, fieldName, values) {
  const annotation = normalizeAnnotation(input);
  const semanticType = annotation.semanticType;
  const numericValues = values.filter((v) => typeof v === "number" && !isNaN(v) && isFinite(v));
  const defaultVisType = resolveDefaultVisType(semanticType, values);
  const { format, tooltipFormat } = resolveFormat(semanticType, annotation, values);
  let aggregationDefault = resolveAggregationDefault(semanticType);
  let zeroClass = resolveZeroClassFromAnnotation(semanticType, annotation.intrinsicDomain);
  const scaleType = resolveScaleType(semanticType, numericValues);
  const domainConstraint = resolveDomainConstraint(semanticType, annotation, values);
  const canonicalOrder = resolveCanonicalOrder(semanticType, annotation, values);
  const cyclic = resolveCyclic(semanticType);
  let binningSuggested = resolveBinningSuggested(semanticType, annotation.intrinsicDomain);
  const sortDirection = resolveSortDirection(semanticType);
  if (!isRegistered(semanticType) && defaultVisType === "quantitative") {
    if (!aggregationDefault) aggregationDefault = "sum";
    if (zeroClass === "unknown") zeroClass = "meaningful";
    binningSuggested = true;
  }
  return {
    semanticAnnotation: annotation,
    defaultVisType,
    format,
    tooltipFormat,
    aggregationDefault,
    zeroClass,
    scaleType: scaleType ?? void 0,
    domainConstraint,
    canonicalOrder,
    cyclic,
    sortDirection,
    binningSuggested
  };
}
var MAX_TIMESTAMP_SEC = 4102444800;
var MAX_TIMESTAMP_MS = 41024448e5;
function isLikelyTimestamp(val) {
  if (val >= 1e9 && val <= MAX_TIMESTAMP_SEC) return true;
  if (val > MAX_TIMESTAMP_SEC && val <= MAX_TIMESTAMP_MS) return true;
  return false;
}
function timestampToMs(val) {
  return val <= MAX_TIMESTAMP_SEC ? val * 1e3 : val;
}
function inferImplicitSemanticType(fieldName, values) {
  const tokens = fieldName.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (!tokens.includes("year")) return "";
  const observed = values.filter((value) => value != null && value !== "");
  if (new Set(observed.map(String)).size <= 1) return "";
  const allYears = observed.every((value) => {
    const numeric = typeof value === "number" ? value : Number(value);
    return Number.isInteger(numeric) && numeric >= 1500 && numeric <= 2200;
  });
  return allYears ? "Year" : "";
}
function analyzeTemporalField(fieldValues) {
  const dates = [];
  let nonNull = 0;
  for (const v of fieldValues.slice(0, 100)) {
    if (v == null) continue;
    nonNull++;
    const d = v instanceof Date ? v : new Date(v);
    if (!isNaN(d.getTime())) dates.push(d);
  }
  if (dates.length < 2 || dates.length < nonNull * 0.5) return null;
  const monthSet = new Set(dates.map((d) => d.getUTCMonth()));
  const daySet = new Set(dates.map((d) => d.getUTCDate()));
  const hourSet = new Set(dates.map((d) => d.getUTCHours()));
  const minuteSet = new Set(dates.map((d) => d.getUTCMinutes()));
  const secondSet = new Set(dates.map((d) => d.getUTCSeconds()));
  const yearSet = new Set(dates.map((d) => d.getUTCFullYear()));
  const isSmallSpread = (s, maxSpread = 1) => {
    if (s.size <= 1) return true;
    const arr = [...s];
    return Math.max(...arr) - Math.min(...arr) <= maxSpread;
  };
  const same = {
    month: monthSet.size === 1,
    day: daySet.size === 1,
    hour: isSmallSpread(hourSet, 1),
    minute: minuteSet.size === 1,
    second: secondSet.size === 1
  };
  const sameYear = yearSet.size === 1;
  const sameMonth = sameYear && same.month;
  const sameDay = sameMonth && same.day;
  return { dates, same, sameYear, sameMonth, sameDay };
}
function computeDataVotes(same) {
  const votes = [0, 0, 0, 0, 0, 0];
  if (same.second) votes[5] += 1;
  if (same.minute && same.second) votes[5] += 1;
  if (same.hour && same.minute && same.second) votes[5] += 1;
  if (same.day && same.hour && same.minute && same.second) votes[5] += 2;
  if (same.month && same.day && same.hour && same.minute && same.second) votes[5] += 3;
  if (same.second) votes[4] += 1;
  if (same.minute && same.second) votes[4] += 1;
  if (same.hour && same.minute && same.second) votes[4] += 1;
  if (same.day && same.hour && same.minute && same.second) votes[4] += 2;
  if (!same.month && same.day && same.hour && same.minute && same.second) votes[4] += 3;
  if (same.second) votes[3] += 1;
  if (same.minute && same.second) votes[3] += 1;
  if (same.hour && same.minute && same.second) votes[3] += 1;
  if (!same.day && same.hour && same.minute && same.second) votes[3] += 3;
  if (same.second) votes[2] += 1;
  if (same.minute && same.second) votes[2] += 1;
  if (!same.hour && same.minute && same.second) votes[2] += 3;
  if (same.second) votes[1] += 1;
  if (!same.minute && same.second) votes[1] += 3;
  if (!same.second) votes[0] += 4;
  return votes;
}
var SEMANTIC_LEVEL = {
  Year: 5,
  Decade: 5,
  YearMonth: 4,
  Month: 4,
  YearQuarter: 4,
  Quarter: 4,
  Date: 3,
  Day: 3,
  Hour: 2,
  DateTime: 1,
  Timestamp: 0
};
function pickBestLevel(votes) {
  let bestLevel = 0;
  let bestScore = votes[0];
  for (let i = 1; i <= 5; i++) {
    if (votes[i] >= bestScore) {
      bestScore = votes[i];
      bestLevel = i;
    }
  }
  return { level: bestLevel, score: bestScore };
}
function levelToFormat(level, analysis) {
  switch (level) {
    case 5:
      return "%Y";
    case 4:
      return analysis.sameYear ? "%b" : "%b %Y";
    case 3:
      return analysis.sameYear ? "%b %d" : "%b %d, %Y";
    case 2:
      return analysis.sameDay ? "%H:00" : "%b %d %H:00";
    case 1:
      return analysis.sameDay ? "%H:%M" : "%b %d %H:%M";
    case 0:
      return analysis.sameDay ? "%H:%M:%S" : "%b %d %H:%M:%S";
    default:
      return null;
  }
}
function resolveTemporalFormat(fieldValues, semanticType) {
  const analysis = analyzeTemporalField(fieldValues);
  if (!analysis) return null;
  const votes = computeDataVotes(analysis.same);
  const semLevel = SEMANTIC_LEVEL[semanticType];
  if (semLevel !== void 0) votes[semLevel] += 3;
  const { level } = pickBestLevel(votes);
  return levelToFormat(level, analysis);
}
function expandToFullYear(val) {
  const trimmed = val.trim();
  if (/^\d{2}$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    return String(n <= 49 ? 2e3 + n : 1900 + n);
  }
  return val;
}
function convertTemporalData(data, semanticTypes) {
  if (data.length === 0) return data;
  const keys = Object.keys(data[0]);
  const fieldValues = Object.fromEntries(keys.map((key) => [key, data.map((row) => row[key])]));
  const effectiveSemanticTypes = Object.fromEntries(keys.map((key) => [
    key,
    toTypeString(semanticTypes[key]) || inferImplicitSemanticType(key, fieldValues[key])
  ]));
  const temporalKeys = keys.filter((k) => {
    const st = effectiveSemanticTypes[k];
    const vc = inferVisCategory(fieldValues[k]);
    const stCategory = st ? getVisCategory(st) : null;
    return vc === "temporal" || stCategory === "temporal" || st === "Decade";
  });
  if (temporalKeys.length === 0) return data;
  const values = structuredClone(data);
  return values.map((r) => {
    for (const temporalKey of temporalKeys) {
      const val = r[temporalKey];
      const st = effectiveSemanticTypes[temporalKey];
      if (typeof val === "number") {
        if (st === "Year" || st === "Decade") {
          r[temporalKey] = `${Math.floor(val)}`;
        } else if (isLikelyTimestamp(val)) {
          r[temporalKey] = new Date(timestampToMs(val)).toISOString();
        } else {
          r[temporalKey] = String(val);
        }
      } else if (val instanceof Date) {
        r[temporalKey] = val.toISOString();
      } else {
        if ((st === "Year" || st === "Decade") && typeof val === "string") {
          r[temporalKey] = expandToFullYear(val);
        } else {
          r[temporalKey] = String(val);
        }
      }
    }
    return r;
  });
}
function resolveChannelSemantics(encodings, data, semanticTypes, convertedData) {
  const result = {};
  const temporalData = convertedData ?? data;
  for (const [channel, encoding] of Object.entries(encodings)) {
    const fieldName = encoding.field;
    if (!fieldName && encoding.aggregate !== "count") continue;
    if (!fieldName && encoding.aggregate === "count") {
      result[channel] = {
        field: "_count",
        semanticAnnotation: { semanticType: "Count" },
        type: "quantitative",
        aggregationDefault: "sum"
      };
      continue;
    }
    if (!fieldName) continue;
    const rawAnnotation = semanticTypes[fieldName];
    const suppliedSemanticType = typeof rawAnnotation === "string" ? rawAnnotation || "" : rawAnnotation?.semanticType ?? "";
    const fieldValues = data.map((r) => r[fieldName]);
    const semanticType = suppliedSemanticType || inferImplicitSemanticType(fieldName, fieldValues);
    const typeDecision = resolveEncodingType(
      semanticType,
      fieldValues,
      channel,
      data,
      fieldName
    );
    let resolvedType = typeDecision.vlType;
    if (encoding.type) {
      resolvedType = encoding.type;
    } else if (channel === "column" || channel === "row") {
      if (resolvedType !== "nominal" && resolvedType !== "ordinal") {
        resolvedType = "nominal";
      }
    }
    if (resolvedType === "quantitative") {
      const sampleValues = data.slice(0, 15).filter((r) => r[fieldName] != void 0).map((r) => r[fieldName]);
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
      if (sampleValues.length > 0 && sampleValues.every((val) => isoDateRegex.test(`${val}`.trim()))) {
        resolvedType = "temporal";
      }
    }
    const fc = resolveFieldSemantics(rawAnnotation || semanticType, fieldName, fieldValues);
    const annotation = fc.semanticAnnotation;
    const tickConstraint = resolveTickConstraint(annotation.semanticType, annotation.intrinsicDomain);
    const reversed = resolveReversed(annotation.semanticType, channel);
    const nice = resolveNice(annotation.semanticType, fc.domainConstraint);
    const stackable = resolveStackable(annotation.semanticType);
    const cs = {
      field: fieldName,
      semanticAnnotation: annotation,
      type: resolvedType,
      // From FieldSemantics (data identity)
      format: fc.format,
      tooltipFormat: fc.tooltipFormat,
      aggregationDefault: fc.aggregationDefault,
      scaleType: fc.scaleType,
      domainConstraint: fc.domainConstraint,
      cyclic: fc.cyclic || void 0,
      sortDirection: fc.sortDirection,
      binningSuggested: fc.binningSuggested || void 0,
      // Channel-specific visualization decisions
      nice,
      tickConstraint,
      reversed: reversed || void 0,
      stackable
    };
    if (encoding.aggregate) {
      if (encoding.aggregate === "count") {
        cs.field = "_count";
        cs.type = "quantitative";
      } else {
        cs.field = `${fieldName}_${encoding.aggregate}`;
        cs.type = "quantitative";
      }
    }
    if ((channel === "color" || channel === "group") && fieldName) {
      if (encoding.scheme && encoding.scheme !== "default") {
        cs.colorScheme = {
          scheme: encoding.scheme,
          type: "categorical",
          reason: "explicit user scheme"
        };
      } else {
        const encodingVLType = cs.type;
        const colorHint = resolveColorSchemeHint(semanticType, annotation, fieldValues);
        const uniqueValues = [...new Set(fieldValues)];
        cs.colorScheme = getRecommendedColorScheme(
          semanticType,
          encodingVLType,
          uniqueValues.length,
          fieldName,
          fieldValues,
          { type: colorHint.type }
        );
        if (cs.colorScheme.type === "diverging" && encodingVLType === "quantitative") {
          const nums = fieldValues.filter((v) => typeof v === "number" && !isNaN(v));
          const divInfo = resolveDivergingInfo(semanticType, annotation, nums);
          if (divInfo) {
            cs.colorScheme.domainMid = divInfo.midpoint;
          }
        }
      }
    }
    if (cs.type === "temporal" || semanticType && getVisCategory(semanticType) === "temporal") {
      const convertedFieldValues = temporalData.map((r) => r[fieldName]);
      const fmt = resolveTemporalFormat(convertedFieldValues, semanticType);
      if (fmt) cs.temporalFormat = fmt;
    }
    if (cs.type === "ordinal" || cs.type === "nominal") {
      if (!encoding.sortOrder && !encoding.sortBy) {
        const ordinalSort = inferOrdinalSortOrder(semanticType, fieldValues);
        if (ordinalSort) {
          cs.ordinalSortOrder = ordinalSort;
        }
      }
    }
    result[channel] = cs;
  }
  return result;
}
function filterOverflow(channelSemantics, declaration, encodings, data, budgets, allMarkTypes) {
  const effectiveType = (ch) => declaration.resolvedTypes?.[ch] ?? channelSemantics[ch]?.type;
  const effectiveField = (ch) => {
    if (channelSemantics[ch]?.field) return channelSemantics[ch].field;
    return void 0;
  };
  const isDiscreteType = (t) => t === "nominal" || t === "ordinal";
  const nominalCounts = {
    x: 0,
    y: 0,
    column: 0,
    row: 0,
    group: 0
  };
  const truncations = [];
  const warnings = [];
  let filteredData = data;
  const groupField = channelSemantics.group?.field;
  if (groupField) {
    nominalCounts.group = new Set(data.map((r) => r[groupField])).size;
  }
  const strategyContext = {
    data,
    channelSemantics,
    encodings,
    allMarkTypes
  };
  const strategy = declaration.overflowStrategy ?? defaultOverflowStrategy;
  for (const channel of ["x", "y", "column", "row", "color"]) {
    const fieldName = effectiveField(channel);
    const type = effectiveType(channel);
    if (!fieldName) continue;
    const maxToKeep = budgets.maxValues[channel] ?? Infinity;
    if (!isDiscreteType(type)) {
      if (channel === "column" || channel === "row") {
        const uniqueValues2 = [...new Set(filteredData.map((r) => r[fieldName]))];
        nominalCounts[channel] = Math.min(uniqueValues2.length, maxToKeep);
        if (uniqueValues2.length > maxToKeep) {
          const sorted = [...uniqueValues2].sort();
          const valuesToKeep = sorted.slice(0, maxToKeep);
          const omittedCount = uniqueValues2.length - valuesToKeep.length;
          warnings.push({
            severity: "warning",
            code: "overflow",
            message: `${omittedCount} of ${uniqueValues2.length} values in '${fieldName}' were omitted (showing first ${valuesToKeep.length}).`,
            channel,
            field: fieldName
          });
          const keepSet = new Set(valuesToKeep);
          filteredData = filteredData.filter((row) => keepSet.has(row[fieldName]));
        }
      }
      continue;
    }
    const uniqueValues = [...new Set(filteredData.map((r) => r[fieldName]))];
    nominalCounts[channel] = Math.min(uniqueValues.length, maxToKeep);
    if (uniqueValues.length > maxToKeep) {
      const valuesToKeep = strategy(channel, fieldName, uniqueValues, maxToKeep, strategyContext);
      const omittedCount = uniqueValues.length - valuesToKeep.length;
      const placeholder = `...${omittedCount} items omitted`;
      warnings.push({
        severity: "warning",
        code: "overflow",
        message: `${omittedCount} of ${uniqueValues.length} values in '${fieldName}' were omitted (showing first ${valuesToKeep.length} in sort order).`,
        channel,
        field: fieldName
      });
      truncations.push({
        severity: "warning",
        code: "overflow",
        message: `${omittedCount} of ${uniqueValues.length} values in '${fieldName}' were omitted (showing first ${valuesToKeep.length} in sort order).`,
        channel,
        field: fieldName,
        keptValues: valuesToKeep,
        omittedCount,
        placeholder
      });
      if (channel !== "color") {
        filteredData = filteredData.filter((row) => valuesToKeep.includes(row[fieldName]));
      }
    }
  }
  return { filteredData, nominalCounts, truncations, warnings };
}
var defaultOverflowStrategy = (channel, fieldName, uniqueValues, maxToKeep, context) => {
  const { data, channelSemantics, encodings, allMarkTypes } = context;
  const encoding = encodings[channel];
  const sortBy = encoding?.sortBy;
  const sortOrder = encoding?.sortOrder;
  let sortField;
  let sortFieldType;
  let isDescending = false;
  if (sortBy) {
    if (sortBy === "x" || sortBy === "y" || sortBy === "color") {
      const sortCS = channelSemantics[sortBy];
      sortField = sortCS?.field;
      sortFieldType = sortCS?.type;
      isDescending = sortOrder === "descending" || sortOrder !== "ascending" && sortBy !== channel;
    } else {
      try {
        const sortedList = JSON.parse(sortBy);
        if (Array.isArray(sortedList)) {
          const orderedValues = sortOrder === "descending" ? sortedList.reverse() : sortedList;
          return orderedValues.filter((v) => uniqueValues.includes(v)).slice(0, maxToKeep);
        }
      } catch {
      }
      isDescending = sortOrder === "descending";
    }
  }
  if (sortField && sortFieldType === "quantitative") {
    let aggregateOp = Math.max;
    let initialValue = -Infinity;
    if (allMarkTypes.has("bar") && sortField !== channelSemantics.color?.field) {
      aggregateOp = (x, y) => x + y;
      initialValue = 0;
    }
    const valueAggregates = /* @__PURE__ */ new Map();
    for (const row of data) {
      const fieldValue = row[fieldName];
      const sortValue = Number(row[sortField] ?? 0);
      if (valueAggregates.has(fieldValue)) {
        valueAggregates.set(fieldValue, aggregateOp(valueAggregates.get(fieldValue), sortValue));
      } else {
        valueAggregates.set(fieldValue, aggregateOp(initialValue, sortValue));
      }
    }
    return Array.from(valueAggregates.entries()).map(([value, agg]) => ({ value, agg })).sort((a, b) => isDescending ? b.agg - a.agg : a.agg - b.agg).slice(0, maxToKeep).map((v) => v.value);
  }
  const canonicalOrder = channelSemantics[channel]?.ordinalSortOrder;
  if (!sortBy && !sortOrder && canonicalOrder?.length) {
    const present = new Set(uniqueValues);
    const ordered = canonicalOrder.filter((value) => present.has(value));
    const canonicalValues = new Set(ordered);
    ordered.push(...uniqueValues.filter((value) => !canonicalValues.has(value)));
    return ordered.slice(0, maxToKeep);
  }
  const fieldOriginalType = inferVisCategory(data.map((r) => r[fieldName]));
  if (fieldOriginalType === "quantitative" || channel === "color") {
    return [...uniqueValues].sort((a, b) => Number(a) - Number(b)).slice(0, maxToKeep);
  }
  if (channel === "column" || channel === "row") {
    return uniqueValues.slice(0, maxToKeep);
  }
  if (sortOrder === "descending") {
    return [...uniqueValues].sort((a, b) => String(b).localeCompare(String(a), void 0, { numeric: true })).slice(0, maxToKeep);
  }
  if (sortOrder === "ascending") {
    return [...uniqueValues].sort((a, b) => String(a).localeCompare(String(b), void 0, { numeric: true })).slice(0, maxToKeep);
  }
  return uniqueValues.slice(0, maxToKeep);
};
var VL_SHORT_DISCRETE_CATEGORY_COUNT = 4;
var VL_SHORT_DISCRETE_LABEL_MAX_LEN = 8;
var APPROX_CHAR_WIDTH_RATIO = 0.62;
var SPARSE_FIT_BAND_CEILING = 100;
function computeDiscreteLabelStats(field, table) {
  if (!field) return null;
  const uniques = /* @__PURE__ */ new Set();
  for (const row of table) {
    const v = row[field];
    if (v == null || v === "") continue;
    uniques.add(String(v));
  }
  if (uniques.size === 0) return null;
  const labels = [...uniques];
  return {
    count: labels.length,
    maxLen: Math.max(...labels.map((s) => s.length)),
    allNumeric: labels.every((s) => s.trim() !== "" && isFinite(Number(s)))
  };
}
function discreteYAxisShouldUseHorizontalLabels(field, channelType2, table) {
  if (!field) return false;
  if (channelType2 === "quantitative") return true;
  const stats = computeDiscreteLabelStats(field, table);
  if (!stats) return false;
  if (stats.count > VL_SHORT_DISCRETE_CATEGORY_COUNT) return false;
  return stats.maxLen <= VL_SHORT_DISCRETE_LABEL_MAX_LEN;
}
function resolveStretchCaps(options) {
  const def = options.maxStretch ?? DEFAULT_MAX_STRETCH;
  return {
    x: Math.max(1, options.maxStretchX ?? def),
    y: Math.max(1, options.maxStretchY ?? def)
  };
}
var DEFAULT_MAX_STRETCH = 1.5;
var CELL_BAND_SIZE = 28;
var SQUARE_CELL_TOLERANCE = 1.5;
function computeLayout(channelSemantics, declaration, table, canvasSize, options = {}, facetGrid) {
  const {
    elasticity: elasticityVal = 0.5,
    facetElasticity: facetElasticityVal = 0.3,
    minStep: minStepVal = 6,
    minSubplotSize: minSubplotVal = 60,
    stepPadding: stepPaddingVal = 0.1,
    bandStepFit: bandStepFitVal = 0,
    maintainContinuousAxisRatio = false,
    continuousMarkCrossSection,
    facetAspectRatioResistance = 0
  } = options;
  const { x: maxStretchX, y: maxStretchY } = resolveStretchCaps(options);
  const defaultChartWidth = canvasSize.width;
  const defaultChartHeight = canvasSize.height;
  const fixW = options.facetFixedPadding?.width ?? 0;
  const fixH = options.facetFixedPadding?.height ?? 0;
  const gap = options.facetGap ?? 0;
  const baseRefSize = 300;
  const sizeRatio = Math.max(defaultChartWidth, defaultChartHeight) / baseRefSize;
  const baseBandSize = options.defaultBandSize ?? 20;
  const defaultStepSize = Math.round(baseBandSize * Math.max(1, sizeRatio));
  const isDiscreteType = (t) => t === "nominal" || t === "ordinal";
  const effectiveTypes = {};
  for (const [ch, cs] of Object.entries(channelSemantics)) {
    effectiveTypes[ch] = declaration.resolvedTypes?.[ch] || cs.type;
  }
  const axisFlags = declaration.axisFlags || {};
  const xBanded = axisFlags.x?.banded ?? false;
  const yBanded = axisFlags.y?.banded ?? false;
  const effectiveBandStepFit = xBanded && yBanded ? 0 : bandStepFitVal;
  const maxBandSize = options.maxBandSize == null ? effectiveBandStepFit > 0 ? Math.max(baseBandSize, SPARSE_FIT_BAND_CEILING) : baseBandSize : Math.max(baseBandSize, options.maxBandSize);
  const maxStepSize = options.maxBandSize == null && effectiveBandStepFit > 0 ? Math.max(defaultStepSize, SPARSE_FIT_BAND_CEILING) : Math.round(maxBandSize * Math.max(1, sizeRatio));
  const nominalCount = {
    x: 0,
    y: 0,
    column: 0,
    row: 0,
    group: 0
  };
  for (const channel of ["x", "y", "column", "row", "color"]) {
    const cs = channelSemantics[channel];
    if (!cs?.field) continue;
    const effectiveType = effectiveTypes[channel] || cs.type;
    if (!isDiscreteType(effectiveType)) continue;
    const uniqueValues = [...new Set(table.map((r) => r[cs.field]))];
    nominalCount[channel] = uniqueValues.length;
  }
  let groupField = channelSemantics.group?.field;
  if (!groupField && declaration.colorActsAsGroup) {
    const colorCS = channelSemantics.color;
    const colorType = effectiveTypes.color ?? colorCS?.type;
    const axisField = isDiscreteType(effectiveTypes.x ?? channelSemantics.x?.type) ? channelSemantics.x?.field : channelSemantics.y?.field;
    if (colorCS?.field && isDiscreteType(colorType) && colorCS.field !== axisField) {
      groupField = colorCS.field;
    }
  }
  if (groupField) {
    const groupAxisField = isDiscreteType(effectiveTypes.x ?? channelSemantics.x?.type) ? channelSemantics.x?.field : channelSemantics.y?.field;
    if (groupAxisField === groupField) {
      groupField = void 0;
    } else if (groupAxisField && planBandDodge(table, groupAxisField, groupField).maxPerBand <= 1) {
      groupField = void 0;
    }
  }
  let groupAxis;
  if (groupField) {
    nominalCount.group = declaration.groupLaneCount ?? new Set(table.map((r) => r[groupField])).size;
    if (isDiscreteType(effectiveTypes.x ?? channelSemantics.x?.type)) groupAxis = "x";
    else if (isDiscreteType(effectiveTypes.y ?? channelSemantics.y?.type)) groupAxis = "y";
  }
  const xGroupMultiplier = groupAxis === "x" && nominalCount.group > 1 ? nominalCount.group : 1;
  const yGroupMultiplier = groupAxis === "y" && nominalCount.group > 1 ? nominalCount.group : 1;
  const xTotalNominalCount = nominalCount.x * xGroupMultiplier;
  const yTotalNominalCount = nominalCount.y * yGroupMultiplier;
  const MIN_GROUP_GAP_PX = 3;
  let xContinuousAsDiscrete = 0;
  let yContinuousAsDiscrete = 0;
  for (const axis of ["x", "y"]) {
    const cs = channelSemantics[axis];
    if (!cs?.field) continue;
    const effectiveType = effectiveTypes[axis] || cs.type;
    if (isDiscreteType(effectiveType)) continue;
    const isBanded = axis === "x" ? xBanded : yBanded;
    const isBinned = declaration.binnedAxes?.[axis];
    if (!isBanded && !isBinned) continue;
    let count;
    if (isBinned) {
      const binDef = declaration.binnedAxes[axis];
      count = typeof binDef === "object" && binDef.maxbins ? binDef.maxbins : 10;
    } else {
      count = new Set(table.map((r) => r[cs.field])).size;
    }
    if (count <= 1) continue;
    if (axis === "x") {
      xContinuousAsDiscrete = count;
    } else {
      yContinuousAsDiscrete = count;
    }
  }
  let facetCols = 1;
  let facetRows = 1;
  if (facetGrid) {
    facetCols = facetGrid.columns;
    facetRows = facetGrid.rows;
  } else {
    if (nominalCount.column > 0) facetCols = nominalCount.column;
    if (nominalCount.row > 0) facetRows = nominalCount.row;
  }
  const LOG_PX_PER_DECADE = 40;
  let logBoostX = 0;
  let logBoostY = 0;
  for (const axis of ["x", "y"]) {
    const cs = channelSemantics[axis];
    if (!cs?.field || !cs.scaleType) continue;
    if (cs.scaleType !== "log" && cs.scaleType !== "symlog") continue;
    const vals = table.map((r) => r[cs.field]).filter((v) => typeof v === "number" && v > 0 && isFinite(v));
    if (vals.length < 2) continue;
    const decades = Math.log10(Math.max(...vals)) - Math.log10(Math.min(...vals));
    const needed = Math.ceil(Math.max(1, decades)) * LOG_PX_PER_DECADE;
    if (axis === "x") logBoostX = needed;
    else logBoostY = needed;
  }
  const minContinuousSize = Math.max(10, minStepVal);
  const minContinuousSizeX = Math.max(minContinuousSize, logBoostX);
  const minContinuousSizeY = Math.max(minContinuousSize, logBoostY);
  let subplotWidth;
  if (facetCols > 1) {
    const stretch = Math.min(maxStretchX, Math.pow(facetCols, facetElasticityVal));
    subplotWidth = Math.round(Math.max(
      minContinuousSizeX,
      (defaultChartWidth * stretch - fixW) / facetCols - gap
    ));
  } else {
    subplotWidth = defaultChartWidth;
  }
  let subplotHeight;
  if (facetRows > 1) {
    const stretch = Math.min(maxStretchY, Math.pow(facetRows, facetElasticityVal));
    subplotHeight = Math.round(Math.max(
      minContinuousSizeY,
      (defaultChartHeight * stretch - fixH) / facetRows - gap
    ));
  } else {
    subplotHeight = defaultChartHeight;
  }
  const xIsContinuousNonBanded = xTotalNominalCount === 0 && xContinuousAsDiscrete === 0;
  const yIsContinuousNonBanded = yTotalNominalCount === 0 && yContinuousAsDiscrete === 0;
  const bothContinuousNonBanded = xIsContinuousNonBanded && yIsContinuousNonBanded;
  if (facetAspectRatioResistance > 0 && !bothContinuousNonBanded && (facetCols > 1 || facetRows > 1)) {
    const baseAR = defaultChartWidth / defaultChartHeight;
    const facetAR = subplotWidth / subplotHeight;
    const arDrift = facetAR / baseAR;
    if (arDrift < 1) {
      subplotHeight = Math.round(
        Math.max(minContinuousSizeY, subplotHeight * Math.pow(arDrift, facetAspectRatioResistance))
      );
    } else if (arDrift > 1) {
      subplotWidth = Math.round(
        Math.max(minContinuousSizeX, subplotWidth * Math.pow(1 / arDrift, facetAspectRatioResistance))
      );
    }
  }
  if (bothContinuousNonBanded) {
    const xCS = channelSemantics.x;
    const yCS = channelSemantics.y;
    if (xCS?.field && yCS?.field) {
      const isTempX = (effectiveTypes.x || xCS.type) === "temporal";
      const isTempY = (effectiveTypes.y || yCS.type) === "temporal";
      const xNumeric = [];
      const yNumeric = [];
      for (const row of table) {
        let xv = row[xCS.field];
        let yv = row[yCS.field];
        if (xv == null || yv == null) continue;
        if (isTempX) xv = +new Date(xv);
        else xv = +xv;
        if (isTempY) yv = +new Date(yv);
        else yv = +yv;
        if (isNaN(xv) || isNaN(yv)) continue;
        xNumeric.push(xv);
        yNumeric.push(yv);
      }
      if (xNumeric.length > 1) {
        const xMin = Math.min(...xNumeric);
        const xMax = Math.max(...xNumeric);
        const yMin = Math.min(...yNumeric);
        const yMax = Math.max(...yNumeric);
        const xDomain = [xMin, xMax];
        const yDomain = [yMin, yMax];
        if (xCS.zero?.zero) {
          if (xDomain[0] > 0) xDomain[0] = 0;
          if (xDomain[1] < 0) xDomain[1] = 0;
        }
        if (yCS.zero?.zero) {
          if (yDomain[0] > 0) yDomain[0] = 0;
          if (yDomain[1] < 0) yDomain[1] = 0;
        }
        const xDataCoverage = xDomain[1] - xDomain[0] > 0 ? (xMax - xMin) / (xDomain[1] - xDomain[0]) : 1;
        const yDataCoverage = yDomain[1] - yDomain[0] > 0 ? (yMax - yMin) / (yDomain[1] - yDomain[0]) : 1;
        const BANKING_COVERAGE_THRESHOLD = 0.2;
        let gasPressureParams = DEFAULT_GAS_PRESSURE_PARAMS;
        if (continuousMarkCrossSection != null) {
          if (typeof continuousMarkCrossSection === "number") {
            gasPressureParams = { ...DEFAULT_GAS_PRESSURE_PARAMS, markCrossSection: continuousMarkCrossSection };
          } else {
            const maxCS = Math.max(continuousMarkCrossSection.x, continuousMarkCrossSection.y);
            gasPressureParams = {
              ...DEFAULT_GAS_PRESSURE_PARAMS,
              markCrossSection: maxCS,
              markCrossSectionX: continuousMarkCrossSection.x,
              markCrossSectionY: continuousMarkCrossSection.y,
              ...continuousMarkCrossSection.elasticity != null && { elasticity: continuousMarkCrossSection.elasticity },
              ...continuousMarkCrossSection.maxStretch != null && { maxStretch: continuousMarkCrossSection.maxStretch }
            };
            if (continuousMarkCrossSection.seriesCountAxis) {
              const resolvedAxis = continuousMarkCrossSection.seriesCountAxis === "auto" ? "y" : continuousMarkCrossSection.seriesCountAxis;
              const nSeries = countDistinctSeries(channelSemantics, table);
              if (resolvedAxis === "y") {
                gasPressureParams.yItemCountOverride = nSeries;
              } else {
                gasPressureParams.xItemCountOverride = nSeries;
              }
            }
          }
        }
        const perSubplotCanvasW = facetCols > 1 ? Math.max(
          minContinuousSizeX,
          (defaultChartWidth * Math.min(maxStretchX, Math.pow(facetCols, facetElasticityVal)) - fixW) / facetCols - gap
        ) : defaultChartWidth;
        const perSubplotCanvasH = facetRows > 1 ? Math.max(
          minContinuousSizeY,
          (defaultChartHeight * Math.min(maxStretchY, Math.pow(facetRows, facetElasticityVal)) - fixH) / facetRows - gap
        ) : defaultChartHeight;
        const idealResult = computeGasPressure(
          xNumeric,
          yNumeric,
          xDomain,
          yDomain,
          perSubplotCanvasW,
          perSubplotCanvasH,
          gasPressureParams
        );
        const isConnected = typeof continuousMarkCrossSection === "object" && !!continuousMarkCrossSection.seriesCountAxis;
        const useBanking = xDataCoverage >= BANKING_COVERAGE_THRESHOLD && yDataCoverage >= BANKING_COVERAGE_THRESHOLD;
        let idealW;
        let idealH;
        const rawW = perSubplotCanvasW * idealResult.rawStretchX;
        const rawH = perSubplotCanvasH * idealResult.rawStretchY;
        if (useBanking) {
          const seriesFields = [];
          const colorField = channelSemantics.color?.field;
          const detailField = channelSemantics.detail?.field;
          if (colorField) seriesFields.push(colorField);
          if (detailField && detailField !== colorField) seriesFields.push(detailField);
          const perPointSeriesKeys = new Array(xNumeric.length);
          if (seriesFields.length === 0) {
            perPointSeriesKeys.fill("");
          } else {
            let idx = 0;
            for (const row of table) {
              const xv = xCS?.field ? row[xCS.field] : void 0;
              const yv = yCS?.field ? row[yCS.field] : void 0;
              if (xv == null || yv == null) continue;
              const xn = isTempX ? +new Date(xv) : +xv;
              const yn = isTempY ? +new Date(yv) : +yv;
              if (isNaN(xn) || isNaN(yn)) continue;
              perPointSeriesKeys[idx++] = seriesFields.map((f) => String(row[f] ?? "")).join("\0");
            }
          }
          const bankingAR = computeBankingAR(
            xNumeric,
            yNumeric,
            xDomain,
            yDomain,
            perPointSeriesKeys,
            isConnected
          );
          const BANKING_BLEND = 0.5;
          const gasAR = rawW / rawH;
          const blendedAR = gasAR > 0 && bankingAR > 0 ? Math.exp((1 - BANKING_BLEND) * Math.log(gasAR) + BANKING_BLEND * Math.log(bankingAR)) : bankingAR;
          const rawArea = rawW * rawH;
          const maxArea = perSubplotCanvasW * perSubplotCanvasH * Math.max(maxStretchX, maxStretchY);
          const area = Math.min(rawArea, maxArea);
          idealW = Math.sqrt(area * blendedAR);
          idealH = Math.sqrt(area / blendedAR);
        } else {
          idealW = rawW;
          idealH = rawH;
        }
        const availW = facetCols > 1 ? Math.max(minContinuousSizeX, (defaultChartWidth * maxStretchX - fixW) / facetCols - gap) : defaultChartWidth * maxStretchX;
        const availH = facetRows > 1 ? Math.max(minContinuousSizeY, (defaultChartHeight * maxStretchY - fixH) / facetRows - gap) : defaultChartHeight * maxStretchY;
        const scaleX = idealW > availW ? availW / idealW : 1;
        const scaleY = idealH > availH ? availH / idealH : 1;
        const fitScale = Math.min(scaleX, scaleY);
        let finalW = idealW * fitScale;
        let finalH = idealH * fitScale;
        finalW = Math.max(finalW, minContinuousSizeX);
        finalH = Math.max(finalH, minContinuousSizeY);
        subplotWidth = Math.round(finalW);
        subplotHeight = Math.round(finalH);
      }
    }
  } else if (xIsContinuousNonBanded || yIsContinuousNonBanded) {
    const contAxis = xIsContinuousNonBanded ? "x" : "y";
    const otherAxisHasDiscreteItems = contAxis === "x" ? yTotalNominalCount > 0 || yContinuousAsDiscrete > 0 : xTotalNominalCount > 0 || xContinuousAsDiscrete > 0;
    let seriesStretchApplied = false;
    if (typeof continuousMarkCrossSection === "object" && continuousMarkCrossSection.seriesCountAxis) {
      const resolvedAxis = continuousMarkCrossSection.seriesCountAxis === "auto" ? contAxis : continuousMarkCrossSection.seriesCountAxis;
      if (resolvedAxis === contAxis) {
        const sigmaPerSeries = contAxis === "x" ? continuousMarkCrossSection.x : continuousMarkCrossSection.y;
        const baseDim = contAxis === "x" ? subplotWidth : subplotHeight;
        const nSeries = countDistinctSeries(channelSemantics, table);
        const pressure = nSeries * sigmaPerSeries / baseDim;
        const elast = continuousMarkCrossSection.elasticity ?? DEFAULT_GAS_PRESSURE_PARAMS.elasticity;
        const maxS = continuousMarkCrossSection.maxStretch ?? DEFAULT_GAS_PRESSURE_PARAMS.maxStretch;
        if (pressure > 1) {
          const stretch = Math.min(maxS, Math.pow(pressure, elast));
          if (contAxis === "x") {
            subplotWidth = Math.round(subplotWidth * stretch);
          } else {
            subplotHeight = Math.round(subplotHeight * stretch);
          }
        }
        seriesStretchApplied = true;
      }
    }
    if (!seriesStretchApplied && !otherAxisHasDiscreteItems) {
      const contCS = channelSemantics[contAxis];
      if (contCS?.field) {
        const isTemporal2 = (effectiveTypes[contAxis] || contCS.type) === "temporal";
        const contValues = [];
        for (const row of table) {
          let v = row[contCS.field];
          if (v == null) continue;
          if (isTemporal2) v = +new Date(v);
          else v = +v;
          if (!isNaN(v)) contValues.push(v);
        }
        const sigma1d = Math.sqrt(DEFAULT_GAS_PRESSURE_PARAMS.markCrossSection);
        const baseDim = contAxis === "x" ? subplotWidth : subplotHeight;
        const pressure1d = contValues.length * sigma1d / baseDim;
        if (pressure1d > 1) {
          const stretch1d = Math.min(
            DEFAULT_GAS_PRESSURE_PARAMS.maxStretch,
            Math.pow(pressure1d, DEFAULT_GAS_PRESSURE_PARAMS.elasticity)
          );
          if (contAxis === "x") {
            subplotWidth = Math.round(subplotWidth * stretch1d);
          } else {
            subplotHeight = Math.round(subplotHeight * stretch1d);
          }
        }
      }
    }
  }
  const elasticParamsX = {
    elasticity: elasticityVal,
    maxStretch: maxStretchX,
    defaultStepSize,
    bandStepFit: effectiveBandStepFit,
    bandStepFitCapacity: Math.max(
      1,
      (options.bandStepFitCapacityX ?? defaultChartWidth) / defaultChartWidth
    ),
    minStep: minStepVal
  };
  const elasticParamsY = {
    elasticity: elasticityVal,
    maxStretch: maxStretchY,
    defaultStepSize,
    bandStepFit: effectiveBandStepFit,
    bandStepFitCapacity: Math.max(
      1,
      (options.bandStepFitCapacityY ?? defaultChartHeight) / defaultChartHeight
    ),
    minStep: minStepVal
  };
  const xAxis = computeAxisStep(xTotalNominalCount, xContinuousAsDiscrete, subplotWidth, elasticParamsX);
  const yAxis = computeAxisStep(yTotalNominalCount, yContinuousAsDiscrete, subplotHeight, elasticParamsY);
  const xIsDiscrete = xTotalNominalCount > 0;
  const yIsDiscrete = yTotalNominalCount > 0;
  const xHasGrouping = groupAxis === "x" && nominalCount.group > 0;
  const yHasGrouping = groupAxis === "y" && nominalCount.group > 0;
  let xStepSize;
  let yStepSize;
  let xStepUnit;
  let yStepUnit;
  if (xIsDiscrete && xHasGrouping) {
    const itemsPerGroup = nominalCount.group;
    const defaultGroupStep = itemsPerGroup * maxStepSize;
    const minGroupStep = Math.max(Math.ceil(MIN_GROUP_GAP_PX / stepPaddingVal), 2 * itemsPerGroup);
    const groupElasticX = {
      ...elasticParamsX,
      defaultStepSize: elasticParamsX.defaultStepSize * itemsPerGroup
    };
    const groupAxis2 = computeAxisStep(nominalCount.x, 0, subplotWidth, groupElasticX);
    const groupStep = Math.max(minGroupStep, Math.min(defaultGroupStep, groupAxis2.step));
    xStepSize = groupStep;
    xStepUnit = "group";
  } else if (xIsDiscrete) {
    xStepSize = Math.max(minStepVal, Math.min(maxStepSize, xAxis.step));
  } else if (xContinuousAsDiscrete > 0) {
    xStepSize = Math.max(minStepVal, Math.min(maxStepSize, xAxis.step));
  } else {
    xStepSize = defaultStepSize;
  }
  if (yIsDiscrete && yHasGrouping) {
    const itemsPerGroup = nominalCount.group;
    const defaultGroupStep = itemsPerGroup * maxStepSize;
    const minGroupStep = Math.max(Math.ceil(MIN_GROUP_GAP_PX / stepPaddingVal), 2 * itemsPerGroup);
    const groupElasticY = {
      ...elasticParamsY,
      defaultStepSize: elasticParamsY.defaultStepSize * itemsPerGroup
    };
    const groupAxis2 = computeAxisStep(nominalCount.y, 0, subplotHeight, groupElasticY);
    const groupStep = Math.max(minGroupStep, Math.min(defaultGroupStep, groupAxis2.step));
    yStepSize = groupStep;
    yStepUnit = "group";
  } else if (yIsDiscrete) {
    yStepSize = Math.max(minStepVal, Math.min(maxStepSize, yAxis.step));
  } else if (yContinuousAsDiscrete > 0) {
    yStepSize = Math.max(minStepVal, Math.min(maxStepSize, yAxis.step));
  } else {
    yStepSize = defaultStepSize;
  }
  for (const axis of ["x", "y"]) {
    const count = axis === "x" ? xContinuousAsDiscrete : yContinuousAsDiscrete;
    if (count <= 0) continue;
    const stepSize = axis === "x" ? xStepSize : yStepSize;
    const continuousSize = Math.round(stepSize * (count + 1));
    if (axis === "x") {
      subplotWidth = continuousSize;
    } else {
      subplotHeight = continuousSize;
    }
  }
  const maxSubplotW = (defaultChartWidth * maxStretchX - fixW) / facetCols - gap;
  const maxSubplotH = (defaultChartHeight * maxStretchY - fixH) / facetRows - gap;
  if (xTotalNominalCount > 0) {
    const divisor = xStepUnit === "group" ? nominalCount.x : xTotalNominalCount;
    const cap = Math.max(minStepVal, Math.floor(maxSubplotW / divisor));
    if (xStepSize > cap) xStepSize = cap;
  }
  if (xContinuousAsDiscrete > 0) {
    const cap = Math.max(minStepVal, Math.floor(maxSubplotW / (xContinuousAsDiscrete + 1)));
    if (xStepSize > cap) xStepSize = cap;
  }
  if (yTotalNominalCount > 0) {
    const divisor = yStepUnit === "group" ? nominalCount.y : yTotalNominalCount;
    const cap = Math.max(minStepVal, Math.floor(maxSubplotH / divisor));
    if (yStepSize > cap) yStepSize = cap;
  }
  if (yContinuousAsDiscrete > 0) {
    const cap = Math.max(minStepVal, Math.floor(maxSubplotH / (yContinuousAsDiscrete + 1)));
    if (yStepSize > cap) yStepSize = cap;
  }
  for (const axis of ["x", "y"]) {
    const count = axis === "x" ? xContinuousAsDiscrete : yContinuousAsDiscrete;
    if (count <= 0) continue;
    const stepSize = axis === "x" ? xStepSize : yStepSize;
    if (axis === "x") subplotWidth = Math.round(stepSize * (count + 1));
    else subplotHeight = Math.round(stepSize * (count + 1));
  }
  const isConnectedMark = typeof continuousMarkCrossSection === "object" && !!continuousMarkCrossSection.seriesCountAxis;
  const bothDiscreteConnected = isConnectedMark && xTotalNominalCount > 0 && yTotalNominalCount > 0 && !xHasGrouping && !yHasGrouping;
  if (bothDiscreteConnected && typeof continuousMarkCrossSection === "object") {
    const csX = continuousMarkCrossSection.x ?? 0;
    const csY = continuousMarkCrossSection.y ?? 0;
    if (csX > 0 && csY > 0) {
      const RUN_AR_CAP = 2;
      const runIsX = csX >= csY;
      const crossCS = runIsX ? csY : csX;
      const runBudget = runIsX ? Math.floor(maxSubplotW / xTotalNominalCount) : Math.floor(maxSubplotH / yTotalNominalCount);
      const cross = Math.max(
        minStepVal,
        Math.min(runIsX ? yStepSize : xStepSize, crossCS)
      );
      const ratio = Math.min(RUN_AR_CAP, Math.max(1, Math.max(csX, csY) / Math.min(csX, csY)));
      const run = Math.max(
        runIsX ? xStepSize : yStepSize,
        Math.min(runBudget, Math.round(cross * ratio))
      );
      if (runIsX) {
        xStepSize = run;
        yStepSize = cross;
      } else {
        yStepSize = run;
        xStepSize = cross;
      }
    }
  }
  if (xTotalNominalCount > 0 && yTotalNominalCount > 0 && !xHasGrouping && !yHasGrouping && !bothDiscreteConnected) {
    const capX = Math.floor(maxSubplotW / xTotalNominalCount);
    const capY = Math.floor(maxSubplotH / yTotalNominalCount);
    const generous = CELL_BAND_SIZE;
    const wanted = Math.max(generous, Math.min(xStepSize, yStepSize));
    const square = Math.min(capX, capY, wanted);
    const widest = Math.max(xStepSize, yStepSize);
    if (square >= minStepVal && square * SQUARE_CELL_TOLERANCE >= widest) {
      xStepSize = square;
      yStepSize = square;
    }
  }
  subplotWidth = Math.min(subplotWidth, Math.round(maxSubplotW));
  subplotHeight = Math.min(subplotHeight, Math.round(maxSubplotH));
  const targetBandAR = options.targetBandAR;
  if (targetBandAR && targetBandAR > 0) {
    const xIsBanded = xTotalNominalCount > 0 || xContinuousAsDiscrete > 0;
    const yIsBanded = yTotalNominalCount > 0 || yContinuousAsDiscrete > 0;
    if (xIsBanded && !yIsBanded) {
      const actualBandAR = subplotHeight / xStepSize;
      if (actualBandAR > targetBandAR) {
        const idealH = xStepSize * targetBandAR;
        const blendedH = Math.exp(
          0.5 * Math.log(subplotHeight) + 0.5 * Math.log(idealH)
        );
        subplotHeight = Math.round(
          Math.max(minContinuousSizeY, Math.min(blendedH, subplotHeight))
        );
      }
    } else if (yIsBanded && !xIsBanded) {
      const actualBandAR = subplotWidth / yStepSize;
      if (actualBandAR > targetBandAR) {
        const idealW = yStepSize * targetBandAR;
        const blendedW = Math.exp(
          0.5 * Math.log(subplotWidth) + 0.5 * Math.log(idealW)
        );
        subplotWidth = Math.round(
          Math.max(minContinuousSizeX, Math.min(blendedW, subplotWidth))
        );
      }
    }
  }
  const xHasDiscreteItems = xTotalNominalCount > 0 || xContinuousAsDiscrete > 0;
  const yHasDiscreteItems = yTotalNominalCount > 0 || yContinuousAsDiscrete > 0;
  const fontSizing = computeFontSizing(Math.min(subplotWidth, subplotHeight), {
    baseLabelFontSize: options.baseLabelFontSize,
    baseTitleFontSize: options.baseTitleFontSize
  });
  const labelOpts = { baseFont: fontSizing.tickBase, minFont: 6 };
  let xLabel = computeLabelSizing(xStepSize, xHasDiscreteItems, labelOpts);
  let yLabel = computeLabelSizing(yStepSize, yHasDiscreteItems, labelOpts);
  if (xHasDiscreteItems) {
    const xf = channelSemantics.x?.field;
    const xt = effectiveTypes.x || channelSemantics.x?.type;
    const stats = computeDiscreteLabelStats(xf, table);
    if (stats) {
      const numericLike = xt === "quantitative" || stats.allNumeric;
      let labelPx = stats.maxLen * xLabel.fontSize * APPROX_CHAR_WIDTH_RATIO;
      const fewShortStrings = !numericLike && stats.count <= VL_SHORT_DISCRETE_CATEGORY_COUNT && stats.maxLen <= VL_SHORT_DISCRETE_LABEL_MAX_LEN;
      if (fewShortStrings || numericLike && labelPx <= xStepSize) {
        if (labelPx > xStepSize) {
          const desiredStep = Math.ceil(labelPx) + 6;
          const cap = Math.max(minStepVal, Math.floor(maxSubplotW / stats.count));
          if (desiredStep <= cap) {
            xStepSize = Math.max(xStepSize, desiredStep);
            xLabel = computeLabelSizing(xStepSize, xHasDiscreteItems, labelOpts);
            labelPx = stats.maxLen * xLabel.fontSize * APPROX_CHAR_WIDTH_RATIO;
          }
        }
        if (labelPx <= xStepSize) {
          xLabel = {
            ...xLabel,
            labelAngle: 0,
            labelAlign: "center",
            labelBaseline: "top"
          };
        } else {
          xLabel = {
            ...xLabel,
            labelAngle: -45,
            labelAlign: "right",
            labelBaseline: "top"
          };
        }
      } else if (numericLike && labelPx > xStepSize && xLabel.labelAngle === void 0) {
        xLabel = {
          ...xLabel,
          labelAngle: -45,
          labelAlign: "right",
          labelBaseline: "top"
        };
      }
    }
  }
  if (yHasDiscreteItems) {
    const yf = channelSemantics.y?.field;
    const yt = effectiveTypes.y || channelSemantics.y?.type;
    if (discreteYAxisShouldUseHorizontalLabels(yf, yt, table)) {
      yLabel = {
        ...yLabel,
        labelAngle: 0,
        labelAlign: "right",
        labelBaseline: "middle"
      };
    }
  }
  const unifiedTickFont = Math.min(xLabel.fontSize, yLabel.fontSize);
  if (xLabel.fontSize !== unifiedTickFont) xLabel = { ...xLabel, fontSize: unifiedTickFont };
  if (yLabel.fontSize !== unifiedTickFont) yLabel = { ...yLabel, fontSize: unifiedTickFont };
  return {
    subplotWidth,
    subplotHeight,
    xStep: xStepSize,
    yStep: yStepSize,
    xStepUnit,
    yStepUnit,
    xContinuousAsDiscrete,
    yContinuousAsDiscrete,
    xNominalCount: xTotalNominalCount,
    yNominalCount: yTotalNominalCount,
    xLabel,
    yLabel,
    titleFontSize: fontSizing.titleFontSize,
    legendFontSize: fontSizing.legendFontSize,
    stepPadding: stepPaddingVal,
    facet: facetCols > 1 || facetRows > 1 ? {
      columns: facetCols,
      rows: facetRows,
      subplotWidth,
      subplotHeight
    } : void 0,
    effectiveFacetGap: gap,
    truncations: []
    // Overflow truncations are handled by filterOverflow
  };
}
function countDistinctSeries(channelSemantics, data) {
  const seriesFields = [];
  const colorField = channelSemantics.color?.field;
  const detailField = channelSemantics.detail?.field;
  if (colorField) seriesFields.push(colorField);
  if (detailField && detailField !== colorField) seriesFields.push(detailField);
  if (seriesFields.length === 0) return 1;
  const seriesKeys = /* @__PURE__ */ new Set();
  for (const row of data) {
    const key = seriesFields.map((f) => String(row[f] ?? "")).join("\0");
    seriesKeys.add(key);
  }
  return seriesKeys.size;
}
function computeBankingAR(xValues, yValues, xDomain, yDomain, seriesKeys, isConnected) {
  const MIN_AR = 0.5;
  const MAX_AR = 3;
  const xRange = xDomain[1] - xDomain[0];
  const yRange = yDomain[1] - yDomain[0];
  if (xRange <= 0 || yRange <= 0) return 1;
  if (!isConnected) {
    const n = xValues.length;
    let sumX = 0, sumY = 0;
    for (let i = 0; i < n; i++) {
      sumX += (xValues[i] - xDomain[0]) / xRange;
      sumY += (yValues[i] - yDomain[0]) / yRange;
    }
    const meanX = sumX / n;
    const meanY = sumY / n;
    let varX = 0, varY = 0;
    for (let i = 0; i < n; i++) {
      const dx = (xValues[i] - xDomain[0]) / xRange - meanX;
      const dy = (yValues[i] - yDomain[0]) / yRange - meanY;
      varX += dx * dx;
      varY += dy * dy;
    }
    const sdX = Math.sqrt(varX / n);
    const sdY = Math.sqrt(varY / n);
    if (sdY <= 0) return MAX_AR;
    if (sdX <= 0) return MIN_AR;
    const sdRatio = sdX / sdY;
    const ar2 = sdRatio > 1 ? 1 + (sdRatio - 1) * 0.3 : 1 - (1 - sdRatio) * 0.3;
    return Math.min(MAX_AR, Math.max(MIN_AR, ar2));
  }
  const seriesMap = /* @__PURE__ */ new Map();
  for (let i = 0; i < xValues.length; i++) {
    const key = seriesKeys[i];
    let arr = seriesMap.get(key);
    if (!arr) {
      arr = [];
      seriesMap.set(key, arr);
    }
    arr.push({ x: xValues[i], y: yValues[i] });
  }
  for (const pts of seriesMap.values()) {
    pts.sort((a, b) => a.x - b.x);
  }
  const scaleMedians = [];
  let maxSeriesLen = 0;
  for (const pts of seriesMap.values()) {
    if (pts.length > maxSeriesLen) maxSeriesLen = pts.length;
  }
  const maxScale = Math.max(0, Math.floor(Math.log2(maxSeriesLen)) - 1);
  for (let scale = 0; scale <= maxScale; scale++) {
    const windowSize = 1 << scale;
    const absSlopes = [];
    for (const pts of seriesMap.values()) {
      const n = pts.length;
      if (n < 2) continue;
      const smoothed = [];
      for (let i = 0; i < n; i += windowSize) {
        const end = Math.min(i + windowSize, n);
        let sx = 0, sy = 0;
        for (let j = i; j < end; j++) {
          sx += pts[j].x;
          sy += pts[j].y;
        }
        const cnt = end - i;
        smoothed.push({ x: sx / cnt, y: sy / cnt });
      }
      for (let i = 1; i < smoothed.length; i++) {
        const dx = (smoothed[i].x - smoothed[i - 1].x) / xRange;
        const dy = (smoothed[i].y - smoothed[i - 1].y) / yRange;
        if (dx === 0) continue;
        absSlopes.push(Math.abs(dy / dx));
      }
    }
    if (absSlopes.length === 0) continue;
    absSlopes.sort((a, b) => a - b);
    const mid = absSlopes.length >> 1;
    const median = absSlopes.length % 2 === 1 ? absSlopes[mid] : (absSlopes[mid - 1] + absSlopes[mid]) / 2;
    if (median > 0) {
      scaleMedians.push(median);
    }
  }
  if (scaleMedians.length === 0) return 1;
  let logSum = 0;
  for (const m of scaleMedians) {
    logSum += Math.log(m);
  }
  const combinedSlope = Math.exp(logSum / scaleMedians.length);
  if (combinedSlope <= 0) return MAX_AR;
  const ar = Math.max(1, combinedSlope);
  return Math.min(MAX_AR, Math.max(MIN_AR, ar));
}
function computeChannelBudgets(channelSemantics, declaration, data, canvasSize, options) {
  const {
    minStep: minStepVal = 6,
    stepPadding: stepPaddingVal = 0.1,
    maxColorValues: maxColorVal = 24
  } = options;
  const { x: maxStretchX, y: maxStretchY } = resolveStretchCaps(options);
  const fixW = options.facetFixedPadding?.width ?? 0;
  const fixH = options.facetFixedPadding?.height ?? 0;
  const gap = options.facetGap ?? 0;
  const isDiscreteType = (t) => t === "nominal" || t === "ordinal";
  const effectiveType = (ch) => declaration.resolvedTypes?.[ch] ?? channelSemantics[ch]?.type;
  const facetGrid = computeFacetGrid(
    channelSemantics,
    declaration,
    data,
    canvasSize,
    options
  );
  const facetCols = facetGrid?.columns ?? 1;
  const facetRows = facetGrid?.rows ?? 1;
  const maxSubplotW = Math.max(
    options.minSubplotSize ?? 60,
    (canvasSize.width * maxStretchX - fixW) / facetCols - gap
  );
  const maxSubplotH = Math.max(
    options.minSubplotSize ?? 60,
    (canvasSize.height * maxStretchY - fixH) / facetRows - gap
  );
  const groupField = channelSemantics.group?.field;
  let groupCount = 0;
  let groupAxis;
  if (groupField) {
    groupCount = new Set(data.map((r) => r[groupField])).size;
    if (isDiscreteType(effectiveType("x"))) groupAxis = "x";
    else if (isDiscreteType(effectiveType("y"))) groupAxis = "y";
  }
  const xGroupMultiplier = groupAxis === "x" && groupCount > 1 ? groupCount : 1;
  const yGroupMultiplier = groupAxis === "y" && groupCount > 1 ? groupCount : 1;
  const MIN_GROUP_GAP_PX = 3;
  const xMinGroupStep = xGroupMultiplier > 1 ? Math.max(Math.ceil(MIN_GROUP_GAP_PX / stepPaddingVal), 2 * xGroupMultiplier) : minStepVal;
  const yMinGroupStep = yGroupMultiplier > 1 ? Math.max(Math.ceil(MIN_GROUP_GAP_PX / stepPaddingVal), 2 * yGroupMultiplier) : minStepVal;
  let maxXToKeep = Math.floor(maxSubplotW / xMinGroupStep);
  let maxYToKeep = Math.floor(maxSubplotH / yMinGroupStep);
  if (facetGrid) {
    const canvasXCap = Math.max(1, Math.floor(canvasSize.width / xMinGroupStep));
    const canvasYCap = Math.max(1, Math.floor(canvasSize.height / yMinGroupStep));
    if (maxXToKeep > canvasXCap || maxYToKeep > canvasYCap) {
      maxXToKeep = Math.min(maxXToKeep, canvasXCap);
      maxYToKeep = Math.min(maxYToKeep, canvasYCap);
      const colField = channelSemantics.column?.field;
      const rowField = channelSemantics.row?.field;
      const colCount = colField ? new Set(data.map((r) => r[colField])).size : 0;
      if (colCount > 1 && !rowField) {
        const tighterW = Math.max(
          options.minSubplotSize ?? 60,
          maxXToKeep * xMinGroupStep
        );
        const totalW = canvasSize.width * maxStretchX - fixW;
        const totalH = canvasSize.height * maxStretchY - fixH;
        const revisedMaxCols = Math.max(1, Math.floor(
          totalW / (tighterW + gap)
        ));
        const revisedMaxRows = Math.max(1, Math.floor(
          totalH / ((options.minSubplotSize ?? 60) + gap)
        ));
        const maxTotal = revisedMaxCols * revisedMaxRows;
        const effectiveCount = Math.min(colCount, maxTotal);
        const visRows = Math.ceil(effectiveCount / revisedMaxCols);
        const visCols = Math.ceil(effectiveCount / visRows);
        facetGrid.columns = visCols;
        facetGrid.rows = visRows;
        facetGrid.maxColumnValues = maxTotal;
      }
    }
  }
  const maxValues = {
    x: maxXToKeep,
    y: maxYToKeep,
    column: facetGrid?.maxColumnValues ?? Infinity,
    row: facetGrid?.maxRowValues ?? Infinity,
    color: maxColorVal
  };
  return { maxValues, facetGrid };
}
function computeFacetGrid(channelSemantics, declaration, data, canvasSize, options) {
  const { x: msX, y: msY } = resolveStretchCaps(options);
  const fixW = options.facetFixedPadding?.width ?? 0;
  const fixH = options.facetFixedPadding?.height ?? 0;
  const gap = options.facetGap ?? 0;
  const minStep = options.minStep ?? 6;
  const stepPadding = options.stepPadding ?? 0.1;
  const baseMinSubplot = options.minSubplotSize ?? 60;
  const isDiscreteType = (t) => t === "nominal" || t === "ordinal";
  const maxW = canvasSize.width * msX - fixW;
  const maxH = canvasSize.height * msY - fixH;
  const MIN_GROUP_GAP_PX = 3;
  const groupField = channelSemantics.group?.field;
  let groupCount = 0;
  let groupAxis;
  if (groupField) {
    groupCount = new Set(data.map((r) => r[groupField])).size;
    const xType = declaration.resolvedTypes?.x ?? channelSemantics.x?.type;
    const yType = declaration.resolvedTypes?.y ?? channelSemantics.y?.type;
    if (isDiscreteType(xType)) groupAxis = "x";
    else if (isDiscreteType(yType)) groupAxis = "y";
  }
  let minSubplotWidth = baseMinSubplot;
  let minSubplotHeight = baseMinSubplot;
  const LOG_PX_PER_DECADE_FACET = 40;
  for (const axis of ["x", "y"]) {
    const cs = channelSemantics[axis];
    if (!cs?.field || !cs.scaleType) continue;
    if (cs.scaleType !== "log" && cs.scaleType !== "symlog") continue;
    const vals = data.map((r) => r[cs.field]).filter((v) => typeof v === "number" && v > 0 && isFinite(v));
    if (vals.length < 2) continue;
    const decades = Math.log10(Math.max(...vals)) - Math.log10(Math.min(...vals));
    const needed = Math.ceil(Math.max(1, decades)) * LOG_PX_PER_DECADE_FACET;
    if (axis === "x") minSubplotWidth = Math.max(minSubplotWidth, needed);
    else minSubplotHeight = Math.max(minSubplotHeight, needed);
  }
  for (const axis of ["x", "y"]) {
    const cs = channelSemantics[axis];
    if (!cs?.field) continue;
    const effectiveType = declaration.resolvedTypes?.[axis] ?? cs.type;
    const isBanded = declaration.axisFlags?.[axis]?.banded === true;
    if (!isDiscreteType(effectiveType) && !isBanded) continue;
    const valueCount = new Set(data.map((r) => r[cs.field])).size;
    const axisGroupCount = groupAxis === axis && groupCount > 1 ? groupCount : 1;
    const maxDim = axis === "x" ? maxW : maxH;
    let perCategoryStep;
    if (axisGroupCount > 1) {
      const minGroupStep = Math.max(
        Math.ceil(MIN_GROUP_GAP_PX / stepPadding),
        2 * axisGroupCount
      );
      perCategoryStep = Math.max(minStep * axisGroupCount, minGroupStep);
    } else {
      perCategoryStep = minStep;
    }
    const dataDrivenMin = Math.min(perCategoryStep * valueCount, maxDim);
    const minDim = Math.max(baseMinSubplot, dataDrivenMin);
    if (axis === "x") {
      minSubplotWidth = minDim;
    } else {
      minSubplotHeight = minDim;
    }
  }
  const xIsCont = (() => {
    const cs = channelSemantics.x;
    if (!cs?.field) return false;
    const t = declaration.resolvedTypes?.x ?? cs.type;
    return !isDiscreteType(t) && !(declaration.axisFlags?.x?.banded === true);
  })();
  const yIsCont = (() => {
    const cs = channelSemantics.y;
    if (!cs?.field) return false;
    const t = declaration.resolvedTypes?.y ?? cs.type;
    return !isDiscreteType(t) && !(declaration.axisFlags?.y?.banded === true);
  })();
  if (xIsCont && yIsCont) {
    const xCS = channelSemantics.x;
    const yCS = channelSemantics.y;
    if (xCS?.field && yCS?.field) {
      const isTempX = (declaration.resolvedTypes?.x ?? xCS.type) === "temporal";
      const isTempY = (declaration.resolvedTypes?.y ?? yCS.type) === "temporal";
      const cmcs = options.continuousMarkCrossSection;
      const isConn = typeof cmcs === "object" && !!cmcs.seriesCountAxis;
      const xNum = [];
      const yNum = [];
      const sKeys = [];
      const sFields = [];
      const colF = channelSemantics.column?.field;
      const rowF = channelSemantics.row?.field;
      if (colF) sFields.push(colF);
      if (rowF) sFields.push(rowF);
      const cf = channelSemantics.color?.field;
      const df = channelSemantics.detail?.field;
      if (cf) sFields.push(cf);
      if (df && df !== cf) sFields.push(df);
      for (const row of data) {
        const xv = row[xCS.field];
        const yv = row[yCS.field];
        if (xv == null || yv == null) continue;
        const xn = isTempX ? +new Date(xv) : +xv;
        const yn = isTempY ? +new Date(yv) : +yv;
        if (isNaN(xn) || isNaN(yn)) continue;
        xNum.push(xn);
        yNum.push(yn);
        sKeys.push(sFields.length > 0 ? sFields.map((f) => String(row[f] ?? "")).join("\0") : "");
      }
      if (xNum.length > 1) {
        const xMin = Math.min(...xNum);
        const xMax = Math.max(...xNum);
        const yMin = Math.min(...yNum);
        const yMax = Math.max(...yNum);
        const xDom = [xMin, xMax];
        const yDom = [yMin, yMax];
        if (xCS.zero?.zero) {
          if (xDom[0] > 0) xDom[0] = 0;
          if (xDom[1] < 0) xDom[1] = 0;
        }
        if (yCS.zero?.zero) {
          if (yDom[0] > 0) yDom[0] = 0;
          if (yDom[1] < 0) yDom[1] = 0;
        }
        const ar = computeBankingAR(xNum, yNum, xDom, yDom, sKeys, isConn);
        if (ar >= 1) {
          minSubplotWidth = Math.max(
            minSubplotWidth,
            Math.round(baseMinSubplot * Math.min(ar, msX))
          );
          minSubplotHeight = Math.max(minSubplotHeight, baseMinSubplot);
        } else {
          minSubplotWidth = Math.max(minSubplotWidth, baseMinSubplot);
          minSubplotHeight = Math.max(
            minSubplotHeight,
            Math.round(baseMinSubplot * Math.min(1 / ar, msY))
          );
        }
      }
    }
  }
  const effectiveW = maxW;
  const effectiveH = maxH;
  const maxFacetColumns = Math.max(1, Math.floor(
    effectiveW / (minSubplotWidth + gap)
  ));
  const maxFacetRows = Math.max(1, Math.floor(
    effectiveH / (minSubplotHeight + gap)
  ));
  const colField = channelSemantics.column?.field;
  const rowField = channelSemantics.row?.field;
  if (!colField && !rowField) return void 0;
  const colCount = colField ? new Set(data.map((r) => r[colField])).size : 0;
  const rowCount = rowField ? new Set(data.map((r) => r[rowField])).size : 0;
  if (colCount === 0 && rowCount === 0) return void 0;
  const forcedCols = options.facetColumns != null && options.facetColumns >= 1 ? Math.min(Math.max(1, Math.floor(options.facetColumns)), Math.max(1, colCount)) : void 0;
  if (colCount > 0 && rowCount === 0) {
    if (forcedCols != null) {
      const nRows2 = Math.ceil(colCount / forcedCols);
      return {
        columns: forcedCols,
        rows: nRows2,
        maxColumnValues: forcedCols * nRows2,
        maxRowValues: Math.max(maxFacetRows, nRows2)
      };
    }
    if (colCount <= maxFacetColumns) {
      return {
        columns: colCount,
        rows: 1,
        maxColumnValues: colCount,
        maxRowValues: maxFacetRows
      };
    }
    let nCols = maxFacetColumns;
    let nRows = Math.ceil(colCount / nCols);
    while (nCols > 2 && colCount % nCols === 1) {
      nCols--;
      nRows = Math.ceil(colCount / nCols);
    }
    const visRows = Math.min(nRows, maxFacetRows);
    const maxTotal = nCols * visRows;
    return {
      columns: nCols,
      rows: visRows,
      maxColumnValues: maxTotal,
      maxRowValues: maxFacetRows
    };
  }
  return {
    columns: Math.max(1, Math.min(colCount, maxFacetColumns)),
    rows: Math.max(1, Math.min(rowCount, maxFacetRows)),
    maxColumnValues: maxFacetColumns,
    maxRowValues: maxFacetRows
  };
}
var STATIC_SERIES_KEY_COLUMN = "__flint_series_key";
var STATIC_SERIES_VALUE_COLUMN = "__flint_series_value";
var MEASURE_CHANNELS = /* @__PURE__ */ new Set(["x", "y"]);
function coerceEncodingValue(value) {
  if (typeof value === "string") {
    return { field: value };
  }
  if (Array.isArray(value)) {
    return value.map((entry) => typeof entry === "string" ? { field: entry } : entry);
  }
  return value;
}
function normalizeEncodingShorthand(encodings) {
  const out = {};
  for (const [channel, value] of Object.entries(encodings)) {
    out[channel] = coerceEncodingValue(value);
  }
  return out;
}
function normalizeStaticSeries(rawEncodings, data, semanticTypes) {
  const encodings = normalizeEncodingShorthand(rawEncodings);
  const arrayChannels = [];
  for (const [channel2, enc] of Object.entries(encodings)) {
    if (Array.isArray(enc)) {
      arrayChannels.push({ channel: channel2, entries: enc });
    }
  }
  if (arrayChannels.length === 0) {
    return {
      encodings,
      data
    };
  }
  if (arrayChannels.length > 1) {
    const channelNames = arrayChannels.map((c) => c.channel).join(", ");
    throw new Error(
      `Static series (array encoding) found on multiple channels: ${channelNames}. Only one channel may use array encoding at a time.`
    );
  }
  const { channel, entries } = arrayChannels[0];
  if (!MEASURE_CHANNELS.has(channel)) {
    throw new Error(
      `Static series (array encoding) is only allowed on measure channels (${[...MEASURE_CHANNELS].join(", ")}), not "${channel}".`
    );
  }
  if (entries.length < 2) {
    throw new Error(
      `Static series requires at least 2 fields, got ${entries.length} on channel "${channel}".`
    );
  }
  const fields = [];
  for (const entry of entries) {
    if (!entry.field) {
      throw new Error(
        `Each static series entry must have a "field" property.`
      );
    }
    fields.push(entry.field);
  }
  const fieldSet = new Set(fields);
  if (fieldSet.size !== fields.length) {
    throw new Error(
      `Static series contains duplicate fields. Each field must be unique.`
    );
  }
  if (data.length > 0) {
    const dataColumns = new Set(Object.keys(data[0]));
    for (const field of fields) {
      if (!dataColumns.has(field)) {
        throw new Error(
          `Static series field "${field}" not found in data columns. Available columns: ${[...dataColumns].join(", ")}`
        );
      }
    }
  }
  for (const entry of entries) {
    const field = entry.field;
    const explicitType = entry.type;
    if (explicitType === "nominal" || explicitType === "ordinal") {
      throw new Error(
        `Static series field "${field}" has type "${explicitType}" \u2014 only quantitative or temporal fields are allowed in static series.`
      );
    }
    if (!explicitType && data.length > 0) {
      const semType = semanticTypes[field];
      const semTypeStr = typeof semType === "string" ? semType : semType?.semanticType || "";
      const fromRegistry = semTypeStr ? getVisCategory(semTypeStr) : null;
      const inferred = fromRegistry ?? inferVisCategory(data.map((r) => r[field]));
      if (inferred === "nominal" || inferred === "ordinal") {
        throw new Error(
          `Static series field "${field}" infers as "${inferred}" from data \u2014 only quantitative or temporal fields are allowed in static series.`
        );
      }
    }
  }
  const colorEnc = encodings.color;
  if (colorEnc && !Array.isArray(colorEnc) && colorEnc.field) {
    throw new Error(
      `Cannot use static series on "${channel}" when the color channel is already bound to field "${colorEnc.field}". Static series implicitly uses the color channel for series discrimination.`
    );
  }
  const foldedData = foldData(data, fields);
  const normalizedEncodings = {};
  for (const [ch, enc] of Object.entries(encodings)) {
    if (ch === channel) {
      normalizedEncodings[ch] = { field: STATIC_SERIES_VALUE_COLUMN, type: "quantitative" };
    } else if (Array.isArray(enc)) {
      normalizedEncodings[ch] = enc[0];
    } else {
      normalizedEncodings[ch] = enc;
    }
  }
  const colorScheme = !Array.isArray(colorEnc) && colorEnc?.scheme ? colorEnc.scheme : void 0;
  normalizedEncodings.color = {
    field: STATIC_SERIES_KEY_COLUMN,
    type: "nominal",
    ...colorScheme ? { scheme: colorScheme } : {}
  };
  const metadata = {
    channel,
    fields,
    keyColumn: STATIC_SERIES_KEY_COLUMN,
    valueColumn: STATIC_SERIES_VALUE_COLUMN
  };
  return {
    encodings: normalizedEncodings,
    data: foldedData,
    staticSeries: metadata
  };
}
function foldData(data, fields) {
  const fieldSet = new Set(fields);
  const result = [];
  for (const row of data) {
    const baseRow = {};
    for (const [key, value] of Object.entries(row)) {
      if (!fieldSet.has(key)) {
        baseRow[key] = value;
      }
    }
    for (const field of fields) {
      const value = row[field];
      if (value == null) continue;
      result.push({
        ...baseRow,
        [STATIC_SERIES_KEY_COLUMN]: field,
        [STATIC_SERIES_VALUE_COLUMN]: value
      });
    }
  }
  return result;
}
var BASELINE = 12.5;
function tile(canvas, frame, body, radius = 2) {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">',
    `<rect x=".5" y=".5" width="15" height="15" rx="${radius}" fill="${canvas}" stroke="${frame}"/>`,
    body,
    "</svg>"
  ].join("");
}
function bars(colors, heights, width = 2.6, radius = 0) {
  const x = [3, 6.7, 10.4];
  return colors.map((fill, i) => {
    const h = heights[i];
    const rx = radius ? ` rx="${radius}"` : "";
    return `<rect x="${x[i]}" y="${BASELINE - h}" width="${width}" height="${h}" fill="${fill}"${rx}/>`;
  }).join("");
}
function rule(x1, y, x2, stroke, width = 1) {
  return `<path d="M${x1} ${y}H${x2}" stroke="${stroke}" stroke-width="${width}"/>`;
}
var FLINT_ICON = tile(
  "#ffffff",
  "#dcdcdc",
  bars(["#4c78a8", "#f58518", "#e45756"], [6.5, 8.5, 5]) + rule(2.6, BASELINE, 13.4, "#bdbdbd")
);
var NYT_ICON = tile(
  "#ffffff",
  "#dcdcdc",
  '<rect x="3" y="2.4" width="7" height="1.3" fill="#121212"/>' + bars(["#2f6b9a", "#c2352b", "#4a8b6f"], [6, 7.6, 4.6]) + rule(2.6, BASELINE, 13.4, "#121212")
);
var ECONOMIST_ICON = tile(
  "#ffffff",
  "#dcdcdc",
  '<rect x="2.6" y="2.3" width="4.6" height="1.6" fill="#e3120b"/>' + bars(["#006ba2", "#3ebcd2", "#ebb434"], [6, 7.6, 4.6]) + rule(2.6, BASELINE, 13.4, "#121317")
);
var NATURE_ICON = tile(
  "#ffffff",
  "#dcdcdc",
  bars(["#0072b2", "#e69f00", "#009e73"], [6.2, 8, 4.6], 2) + `<path d="M3 3.2V${BASELINE}H13.4" fill="none" stroke="#000000" stroke-width="1.2"/>`
);
var MCKINSEY_ICON = tile(
  "#ffffff",
  "#dcdcdc",
  '<rect x="4" y="3.4" width="8.6" height="2.4" fill="#051c2c"/><rect x="4" y="6.9" width="6.4" height="2.4" fill="#2251ff"/><rect x="4" y="10.4" width="4.2" height="2.4" fill="#00a9f4"/><path d="M3.5 3V13" stroke="#051c2c" stroke-width="1"/>'
);
var DATAWRAPPER_ICON = tile(
  "#ffffff",
  "#dcdcdc",
  rule(2.6, 5.5, 13.4, "#b3b3b3") + rule(2.6, 8, 13.4, "#b3b3b3") + rule(2.6, 10.5, 13.4, "#b3b3b3") + bars(["#18a1cd", "#e2a233", "#c04a4a"], [6.5, 8.5, 5], 2.2) + rule(2.6, BASELINE, 13.4, "#333333")
);
var POWERBI_ICON = tile(
  "#1b1a19",
  "#3b3a39",
  rule(2.6, 7.6, 13.4, "#3b3a39") + bars(["#118dff", "#e66c37", "#3bd1c7"], [6.5, 8.5, 5]) + rule(2.6, BASELINE, 13.4, "#3b3a39")
);
var POWERBI_LIGHT_ICON = tile(
  "#ffffff",
  "#d2d0ce",
  rule(2.6, 7.6, 13.4, "#dcdcdc") + bars(["#118dff", "#12239e", "#e66c37"], [6.5, 8.5, 5]) + rule(2.6, BASELINE, 13.4, "#d2d0ce")
);
var SWISS_ICON = tile(
  "#f4f1ea",
  "#d9d5cc",
  bars(["#e2231a", "#1a1a1a", "#0067a5"], [6.2, 8.2, 4.8]) + `<path d="M3 3V${BASELINE}H13.4" fill="none" stroke="#1a1a1a" stroke-width="1.6"/>`,
  0
);
var POP_ICON = tile(
  "#fff200",
  "#111111",
  '<rect x="2.5" y="3" width="5.5" height="5" fill="#ff1493" stroke="#111111" stroke-width="1.5"/><rect x="8" y="3" width="5.5" height="5" fill="#00d9ff" stroke="#111111" stroke-width="1.5"/><rect x="2.5" y="8" width="5.5" height="5" fill="#7a3cff" stroke="#111111" stroke-width="1.5"/><rect x="8" y="8" width="5.5" height="5" fill="#ff5a1f" stroke="#111111" stroke-width="1.5"/>'
);
var CARTOON_ICON = tile(
  "#fffdf5",
  "#ece5d6",
  bars(["#3aa9ff", "#ff5d5d", "#ffc23c"], [6.4, 8.4, 5], 2.8, 1.3) + rule(2.6, BASELINE, 13.4, "#2e2b28", 1.7),
  3.5
);
var nyt = {
  id: "nyt",
  label: "New York Times",
  description: "Newsroom graphics: a headline that states the finding, values printed on the marks, series named at their own ends.",
  guidance: [
    "- `title` is the finding, in a sentence; `subtitle` names the measure, the population and the unit.",
    "- Colour can tell 5 categories apart; past that they share a grey."
  ].join("\n"),
  icon: NYT_ICON,
  spec: {
    "id": "nyt",
    "label": "New York Times",
    "ink": {
      "surface": {
        "source": "host"
      },
      "text": {
        "primary": "#121212",
        "secondary": "#6b6b6b",
        "muted": "#8a8a8a",
        "inverse": "#ffffff"
      },
      "structure": {
        "grid": "#e4e4e4",
        "axis": "#121212",
        "rule": "#121212"
      },
      "series": {
        "single": "#2f6b9a",
        "categorical": [
          "#2f6b9a",
          "#c2352b",
          "#4a8b6f",
          "#7f6a9e",
          "#d9a441"
        ],
        "categoricalExtended": [
          "#2f6b9a",
          "#c2352b",
          "#4a8b6f",
          "#7f6a9e",
          "#d9a441",
          "#e27ea6",
          "#3fae9e",
          "#9ca13a",
          "#8c6d31",
          "#6b8fb3",
          "#d07b3a",
          "#b5546a"
        ],
        // Continuous measure: the house blue, light tint to deep, so
        // a heat map or choropleth reads as one hue growing, not a set.
        "sequential": {
          "stops": [
            "#eef4f8",
            "#c2d8e7",
            "#8bb0cf",
            "#5187b3",
            "#2f6b9a",
            "#1c4363"
          ],
          "space": "lab",
          "endpointsAgainstSurface": true,
          "consumption": "interpolate"
        },
        "diverging": {
          "stops": [
            "#2f6b9a",
            "#8fb4cc",
            "#efece5",
            "#dd9a86",
            "#c2352b"
          ],
          "neutral": "#efece5",
          "space": "lab",
          "endpointsAgainstSurface": true,
          "consumption": "interpolate"
        },
        "overflow": "#9e9e9e",
        "status": {
          "positive": "#2f6b9a",
          "negative": "#c2352b",
          "neutral": "#9e9e9e"
        },
        "selection": {
          "signed": "status",
          "statusUse": "anySigned"
        }
      },
      "accent": "#c2352b"
    },
    "type": {
      "minSize": 8,
      "headline": {
        "family": "Georgia, serif",
        "size": "text.400",
        "weight": "bold",
        "color": "#121212"
      },
      "deck": {
        "family": "Georgia, serif",
        "size": "text.200",
        "color": "#6b6b6b"
      },
      "axisLabel": {
        "family": "Helvetica, Arial, sans-serif",
        "size": "text.100"
      },
      "valueLabel": {
        "family": "Helvetica, Arial, sans-serif",
        "size": "text.100",
        "weight": "bold"
      }
    },
    "structure": {
      "axis": {
        "categorical": {
          "line": "full",
          "ticks": "omit",
          "tickLabels": "sparse"
        },
        "measure": {
          "line": "omit",
          "ticks": "omit",
          "tickDensity": "sparse",
          "suppressWhenValuesPrinted": true
        }
      },
      "grid": {
        "measure": "quiet",
        "category": "omit",
        "style": "solid",
        "zero": "full"
      },
      "frame": "omit",
      "baseline": "full"
    },
    "marks": {
      "bandFraction": 0.72,
      "strokeWeight": 2.4,
      "strokeCap": "round",
      "strokeJoin": "round",
      "slice": {
        "gap": 1.5
      },
      "tile": {
        "gap": 1
      },
      "point": {
        "size": 58
      },
      "zOrder": "summaryOverData",
      "redundantEncoding": "whenNeeded",
      "redundantChannels": [
        "dash"
      ]
    },
    "labels": {
      "truncation": "never",
      "flush": true
    },
    "legend": {
      "show": "always",
      "placement": [
        "seriesEnd",
        "top"
      ],
      "title": "omit",
      "suppressWhenValuesPrinted": false
    },
    "dataLabels": {
      "show": "always",
      "placement": "atMark",
      "inkMode": "contrastWithMark"
    },
    "annotation": {
      "axisTitles": "omit",
      "axisTitlePlacement": "flatAboveAxis",
      "unit": "lastTick",
      "pointEmphasis": "endpoints",
      "numberFormat": {
        "precision": "auto",
        "thousands": "suffix"
      }
    },
    "layout": {
      "density": "normal",
      "bandStepFit": 0.7,
      "titleBlock": {
        "anchor": "start",
        "deckGap": "tight"
      }
    },
    "compileDefaults": {
      "baseSize": { "width": 380, "height": 340 }
    },
    "chartDefaults": {
      "Line Chart": {
        "showPoints": true
      },
      "Bump Chart": {
        "interpolate": "linear"
      }
    }
  }
};
var economist = {
  id: "economist",
  label: "The Economist",
  description: "Print weekly: compact, flat headline over a deck that names the measure, units repeated down the ruler.",
  guidance: [
    '- `subtitle` names the measure, the place and the period \u2014 "% of GDP, 2023".',
    "- Annotate each measure with `unit` in `semantic_types`.",
    "- The key holds 3 colours."
  ].join("\n"),
  icon: ECONOMIST_ICON,
  spec: {
    "id": "economist",
    "label": "The Economist",
    "ink": {
      "surface": {
        "source": "host"
      },
      "text": {
        "primary": "#121317",
        "secondary": "#54585a",
        "muted": "#8b9196"
      },
      "structure": {
        "grid": "#c9d3da",
        "axis": "#121317",
        "rule": "#c9d3da",
        "zero": "#121317"
      },
      "series": {
        "single": "#006ba2",
        "categorical": [
          "#006ba2",
          "#3ebcd2",
          "#ebb434",
          "#379a8b",
          "#9a3d5b",
          "#a17ba5"
        ],
        // Continuous measure: the Economist blue, light to deep.
        "sequential": {
          "stops": [
            "#dcebf2",
            "#a7ccdd",
            "#6ba7c6",
            "#2f88ae",
            "#006ba2",
            "#003f5c"
          ],
          "space": "lab",
          "endpointsAgainstSurface": true,
          "consumption": "interpolate"
        },
        "diverging": {
          "stops": [
            "#006ba2",
            "#7ba7b8",
            "#e9e5dc",
            "#c8967a",
            "#a1655a"
          ],
          "neutral": "#e9e5dc",
          "space": "lab",
          "endpointsAgainstSurface": true,
          "consumption": "quantize",
          "quantizeCount": 5
        },
        "status": {
          "positive": "#006ba2",
          "negative": "#e3120b",
          "neutral": "#b8c4cc"
        },
        "overflow": "#b0aca1",
        "selection": {
          "signed": "status",
          "statusUse": "anySigned"
        }
      },
      "accent": "#e3120b"
    },
    "type": {
      "minSize": 8,
      "headline": {
        "family": "'Helvetica Neue', Helvetica, Arial, sans-serif",
        "size": "text.300",
        "weight": "bold"
      },
      "deck": {
        "size": "text.200",
        "color": "#54585a"
      },
      "axisLabel": {
        "size": 11
      },
      "axisTitle": {
        "size": 11,
        "weight": "regular",
        "color": "#54585a"
      }
    },
    "structure": {
      "axis": {
        "categorical": {
          "line": "full",
          "ticks": "omit"
        },
        "measure": {
          "line": "omit",
          "ticks": "omit",
          "placement": "opposite"
        }
      },
      "grid": {
        "measure": "quiet",
        "category": "omit",
        "style": "solid",
        "zero": "full"
      },
      "frame": "omit",
      "baseline": "full"
    },
    "marks": {
      "bandFraction": 0.68,
      "strokeWeight": 1.6,
      "slice": {
        "gap": 1.5
      },
      "interval": {
        "fillOpacity": 0.22,
        "edge": "quiet",
        "inkSource": "sameAsCentral"
      },
      "point": {
        "size": 66
      },
      "sizeRange": [
        10,
        450
      ]
    },
    "geometry": {
      "cell": {
        "gap": 0.6
      }
    },
    "labels": {
      "truncation": "never",
      "angle": "auto"
    },
    "legend": {
      "show": "always",
      "placement": [
        "seriesEnd",
        "top"
      ],
      "direction": "horizontal",
      "title": "omit",
      "maxSwatches": 3
    },
    "dataLabels": {
      "show": "whenTheyFit",
      "placement": "atMark"
    },
    "annotation": {
      "axisTitles": "omit",
      "axisTitlePlacement": "flatAboveAxis",
      "axisTitleGap": 8,
      "unit": "everyTick"
    },
    "furniture": [
      {
        // The Economist "red tab" is a chunky rectangle, not a thin
        // rule: the style guide draws it ~15pt wide × 5pt tall (≈3:1)
        // on a 160pt chart — about 1/10 of the width. On this ~460px
        // plot that is ≈44px wide; a ~12px height keeps the 3–4:1 block
        // proportion so it reads as the masthead tag, not a hairline.
        "kind": "mastheadTab",
        "anchor": "topLeft",
        "color": "#e3120b",
        "width": 44,
        "height": 12
      }
    ],
    "layout": {
      "density": "compact",
      "bandStepFit": 0.55,
      "titleBlock": {
        "anchor": "start",
        "gap": "tight"
      }
    },
    "compileDefaults": {
      "baseSize": { "width": 460, "height": 300 }
    },
    "variants": [
      {
        "when": {
          "markChannel": "area",
          "isPartToWhole": false
        },
        "then": {
          "structure": {
            "axis": {
              "measure": {
                "placement": "default"
              }
            }
          }
        },
        "because": "Right-hand measure axis is the house default (ggthemes theme_economist; measured opposite on 3/3 bar charts and the electricity-mix part-to-whole area). The one measured exception is a non-part-to-whole range/area band (seattle-range), which keeps y on the left."
      }
    ],
    "chartDefaults": {
      "Slope Chart": {
        "showText": true,
        "showSeriesInLabel": true
      }
    }
  }
};
var nature = {
  id: "nature",
  label: "Nature",
  description: "Journal figure: small panel, axis titles kept with units, statistics printed beside the fit.",
  guidance: [
    "- Annotate every measure with `unit` in `semantic_types`; `subtitle` names the sample, not the unit.",
    "- Colour can tell 6 categories apart; past that they share a grey."
  ].join("\n"),
  icon: NATURE_ICON,
  spec: {
    "id": "nature",
    "label": "Nature",
    "ink": {
      "surface": {
        "source": "host"
      },
      "text": {
        "primary": "#000000",
        "secondary": "#000000"
      },
      "structure": {
        "axis": "#000000",
        "grid": "#00000000",
        "frame": "#000000"
      },
      "series": {
        "single": "#0072b2",
        "categorical": [
          "#0072b2",
          "#e69f00",
          "#009e73",
          "#cc79a7",
          "#56b4e9",
          "#d55e00"
        ],
        "categoricalExtended": [
          "#0072b2",
          "#e69f00",
          "#009e73",
          "#cc79a7",
          "#56b4e9",
          "#d55e00",
          "#f0e442",
          "#332288",
          "#117733",
          "#882255",
          "#88ccee",
          "#999933"
        ],
        // Continuous measure: the house blue (Wong), light to deep.
        "sequential": {
          "stops": [
            "#e6f0f7",
            "#b3d3e8",
            "#79b0d5",
            "#3a8fc4",
            "#0072b2",
            "#00436a"
          ],
          "space": "lab",
          "endpointsAgainstSurface": true,
          "consumption": "interpolate"
        },
        "diverging": {
          "stops": [
            "#0072b2",
            "#83b9db",
            "#ffffff",
            "#eba06a",
            "#d55e00"
          ],
          "neutral": "#ffffff",
          "space": "lab",
          "endpointsAgainstSurface": false,
          "consumption": "interpolate"
        },
        "overflow": "#999999",
        "selection": {
          "partToWhole": "categorical"
        }
      },
      "accent": "#000000"
    },
    "type": {
      "minSize": 8.5,
      "headline": {
        "family": "Arial, Helvetica, sans-serif",
        "size": "text.200",
        "weight": "bold"
      },
      "deck": {
        "size": "text.100",
        "style": "italic",
        "case": "asIs"
      },
      "axisLabel": {
        "family": "Arial, Helvetica, sans-serif",
        "size": "text.100"
      },
      "axisTitle": {
        "family": "Arial, Helvetica, sans-serif",
        "size": "text.100"
      }
    },
    "structure": {
      "axis": {
        "categorical": {
          "line": "full",
          "ticks": "full",
          "tickLength": "long",
          "tickDirection": "outward"
        },
        "measure": {
          "line": "full",
          "ticks": "full",
          "tickLength": "long",
          "tickDirection": "outward"
        }
      },
      "grid": {
        "measure": "omit",
        "category": "omit"
      },
      "frame": "omit",
      "baseline": "quiet"
    },
    "marks": {
      "bandFraction": 0.55,
      "strokeWeight": 1.2,
      "separator": {
        "presence": "hairline",
        "source": "surface",
        "width": 0.5
      },
      "slice": {
        "gap": 1.5
      },
      "point": {
        "presence": "full",
        "size": 45,
        "fill": "solid",
        "halo": {
          "presence": "hairline",
          "width": 0.6
        }
      },
      "interval": {
        "fillOpacity": 0.25,
        "edge": "omit",
        "inkSource": "sameAsCentral"
      },
      "summary": {
        "fill": "omit",
        "outline": "full",
        "centralRule": "emphasised",
        "widthFraction": 0.4
      },
      "observations": {
        "expose": "always",
        "maxRows": 400
      },
      "zOrder": "summaryUnderData",
      "redundantEncoding": "always",
      "redundantChannels": [
        "shape"
      ]
    },
    "geometry": {
      "point": {
        "vertexSize": 26
      }
    },
    "labels": {
      "truncation": "never"
    },
    "legend": {
      "show": "always",
      "placement": [
        "right",
        "inside"
      ],
      "title": "whenAmbiguous",
      "suppressWhenAxisNames": true
    },
    "dataLabels": {
      "show": "whenTheyFit",
      "placement": "outsideMark"
    },
    "annotation": {
      "axisTitles": "always",
      "axisTitlePlacement": "rotated",
      "unitsInAxisTitle": true,
      "statistics": {
        "show": [
          "n",
          "r2",
          "slope"
        ],
        "placement": "panel"
      }
    },
    "layout": {
      "density": "compact",
      "targetWidth": 252,
      "bandStepFit": 0.2,
      "titleBlock": {
        "anchor": "middle",
        "position": "bottom",
        "gap": "tight",
        "deckGap": "tight"
      },
      "bandStep": 46
    },
    "compileDefaults": {
      "baseSize": { "width": 300, "height": 250 }
    },
    "chartDefaults": {
      "Boxplot": {
        "showPoints": true
      },
      "Violin Plot": {
        "showPoints": true,
        "showMedian": true,
        "showContour": true
      }
    }
  }
};
var mckinsey = {
  id: "mckinsey",
  label: "McKinsey",
  description: "Consulting deck: wide bands, every value printed in a column, a headline that states the takeaway.",
  guidance: [
    "- `title` states the takeaway; `subtitle` names the measure and unit.",
    "- Colour can tell 5 categories apart."
  ].join("\n"),
  icon: MCKINSEY_ICON,
  spec: {
    "id": "mckinsey",
    "label": "McKinsey",
    "ink": {
      "surface": {
        "source": "host"
      },
      "text": {
        "primary": "#051c2c",
        "secondary": "#5a6872",
        "muted": "#8a969d"
      },
      "structure": {
        "axis": "#051c2c",
        "rule": "#d3dce1",
        // A lollipop stem borrows the rule where no connector ink is
        // named, but McKinsey's rule is a near-white gridline (#d3dce1)
        // — far too faint for a stem that must carry the eye up to the
        // dot. Their exhibits draw the stem a solid medium-light grey,
        // clearly present yet subordinate to the near-black dot. So the
        // connector states its own, more definite ink.
        "connector": "#a7b1bc"
      },
      "series": {
        // McKinsey's 2020 "Deep Blue" (#051c2c) is deliberately
        // *almost black* — the firm's own brand refresh describes it
        // as near-black to project authority against white, and real
        // exhibits/reports use it as the primary data-bar colour.
        // So a lone series reads near-black by design; electric blue
        // (#2251ff) is the house's highlight, not its default. Kept
        // authentic — do not "fix" it to a lighter blue.
        "single": "#051c2c",
        "categorical": [
          "#051c2c",
          "#2251ff",
          "#00a9f4",
          "#00cfb4",
          "#8c9ba5"
        ],
        // The house is blue at heart, so the extended set does not
        // reach for a rainbow — it walks the cool wheel the way
        // McKinsey's own decks do: blue → cyan → teal, then a
        // restrained turn into violet before the slate. The core five
        // stay a prefix so a chart's colours don't reshuffle as it
        // grows past the handful the identity is built on.
        "categoricalExtended": [
          "#051c2c",
          "#2251ff",
          "#00a9f4",
          "#00cfb4",
          "#8c9ba5",
          "#7c5cff",
          "#0e7c8b",
          "#6fb7e8",
          "#b39ddb",
          "#3d4f66"
        ],
        "sequential": {
          "stops": [
            "#eef3f8",
            "#cfdcea",
            "#9db8d2",
            "#5b82ab",
            "#051c2c"
          ],
          "space": "lab",
          "endpointsAgainstSurface": true,
          // Stated light-to-dark. One ramp, two consumptions: a
          // part-to-whole pie samples it in reverse, a heat map
          // interpolates it.
          "consumption": "interpolate"
        },
        // A signed measure crosses zero, and a single-hue ramp cannot
        // say which side of it a value sits on — dark reads as "more",
        // not "positive". The house is otherwise all blue, so the one
        // place it must reach for a second hue is here: cool blue below
        // zero, a restrained warm above, the light surface tint at the
        // break. Cool-below / warm-above matches the other houses.
        "diverging": {
          "stops": [
            "#2251ff",
            "#9db8d2",
            "#eef3f8",
            "#d98f6a",
            "#b4472e"
          ],
          "neutral": "#eef3f8",
          "space": "lab",
          "endpointsAgainstSurface": true,
          "consumption": "interpolate"
        },
        "selection": {
          "partToWhole": "categorical",
          "signed": "sequential"
        },
        "overflow": "#b6bfc7"
      },
      "accent": "#2251ff"
    },
    "type": {
      "minSize": 9,
      "headline": {
        "family": "'Helvetica Neue', Helvetica, Arial, sans-serif",
        "size": "text.300",
        "weight": "bold"
      },
      "deck": {
        "size": "text.200"
      },
      "axisLabel": {
        "size": "text.100"
      },
      "axisTitle": {
        "size": "text.100"
      },
      "valueLabel": {
        "size": "text.200",
        "weight": "semibold",
        "color": "#051c2c"
      }
    },
    "structure": {
      "axis": {
        "categorical": {
          "line": "omit",
          "ticks": "omit"
        },
        "measure": {
          "line": "omit",
          "ticks": "omit",
          "suppressWhenValuesPrinted": true
        }
      },
      "grid": {
        "measure": "omit",
        "category": "omit"
      },
      "frame": "omit",
      "baseline": "full"
    },
    "marks": {
      "bandFraction": 0.7,
      "strokeWeight": 2,
      "connector": {
        "presence": "full",
        "weight": 0.8,
        "spanWeight": 3
      },
      "point": {
        "size": 72
      },
      "separator": {
        "presence": "hairline",
        "source": "surface",
        "width": 0.6
      },
      "slice": {
        "gap": 1
      }
    },
    "geometry": {
      "cell": {
        "gap": 0.8
      }
    },
    "labels": {
      "truncation": "never",
      "angle": "horizontal"
    },
    "legend": {
      "show": "always",
      "placement": [
        "seriesEnd",
        "inline",
        "top"
      ],
      "direction": "horizontal",
      "title": "omit",
      "suppressWhenValuesPrinted": true
    },
    "dataLabels": {
      "show": "always",
      "placement": "column",
      "inkMode": "contrastWithMark"
    },
    "annotation": {
      "axisTitles": "omit",
      "numberFormat": {
        "precision": "integer",
        "thousands": "separator"
      }
    },
    "layout": {
      "density": "airy",
      "titleBlock": {
        "anchor": "start",
        "gap": "loose",
        "deckGap": "loose"
      },
      // McKinsey exhibits use substantial bars inside an airy page: the
      // whitespace lives around the chart and its annotations, not in
      // unusually narrow marks or compressed category rows.
      "bandStep": 24,
      // Sparse exhibits broaden their category rhythm, but retain more
      // of the house's stable base step than the renderer's full-span fit.
      "bandStepFit": 0.35
    },
    "compileDefaults": {
      "baseSize": { "width": 440, "height": 300 }
    }
  }
};
var datawrapper = {
  id: "datawrapper",
  label: "Datawrapper",
  description: "Embedded web chart: narrow column, plain headline and deck, a rule under the footer.",
  guidance: [
    "- `title` and `subtitle` do all the naming; annotate the measure with `unit`.",
    "- Sized for a narrow column, so it reads tall rather than wide.",
    "- Colour can tell 5 categories apart."
  ].join("\n"),
  icon: DATAWRAPPER_ICON,
  spec: {
    "id": "datawrapper",
    "label": "Datawrapper",
    "ink": {
      "surface": {
        "source": "host"
      },
      "text": {
        "primary": "#333333",
        "secondary": "#666666",
        "muted": "#999999"
      },
      "structure": {
        "grid": "#dcdcdc",
        "rule": "#dcdcdc",
        "connector": "#c8c8c8",
        "axis": "#333333"
      },
      "series": {
        "single": "#18a1cd",
        "categorical": [
          "#18a1cd",
          "#e2a233",
          "#c04a4a",
          "#2d8659",
          "#7e5aa2"
        ],
        "categoricalExtended": [
          "#18a1cd",
          "#e2a233",
          "#c04a4a",
          "#2d8659",
          "#7e5aa2",
          "#d97b4f",
          "#5b8fb0",
          "#b5546a",
          "#8c9a3f",
          "#c98ac0",
          "#6b8e8a",
          "#a67c52"
        ],
        "sequential": {
          "stops": [
            "#dceef6",
            "#a9d3e6",
            "#6aabcc",
            "#2f7fa8",
            "#0b5c82"
          ],
          "space": "lab",
          "consumption": "quantize",
          "quantizeCount": 5
        },
        "diverging": {
          "stops": [
            "#2f7fa8",
            "#a9d3e6",
            "#f0ece4",
            "#e8ac70",
            "#c04a4a"
          ],
          "neutral": "#f0ece4",
          "space": "lab",
          "endpointsAgainstSurface": true,
          "consumption": "quantize",
          "quantizeCount": 5
        },
        "selection": {},
        "overflow": "#b9bcbe"
      },
      "accent": "#18a1cd"
    },
    "type": {
      "minSize": 11,
      "headline": {
        "family": "'Helvetica Neue', Helvetica, Arial, sans-serif",
        "size": "text.300",
        "weight": "bold"
      },
      "axisLabel": {
        "size": "text.200"
      },
      "keyLabel": {
        "size": "text.200"
      }
    },
    "structure": {
      "axis": {
        "categorical": {
          "line": "full",
          "ticks": "omit",
          "tickLabels": "sparse"
        },
        "measure": {
          "line": "omit",
          "ticks": "omit"
        }
      },
      "grid": {
        "measure": "quiet",
        "category": "omit",
        "style": "dashed"
      },
      "frame": "omit",
      "baseline": "quiet"
    },
    "marks": {
      "bandFraction": 0.66,
      "separator": {
        "presence": "hairline",
        "source": "surface",
        "width": 1.5
      },
      "point": {
        "size": 48
      },
      "connector": {
        "presence": "full",
        "weight": 1
      }
    },
    "geometry": {
      "arc": {
        "gap": 1.5
      },
      "cell": {
        "gap": 1.5
      }
    },
    "labels": {
      "truncation": "never"
    },
    "legend": {
      "show": "always",
      "placement": [
        "top"
      ],
      "direction": "horizontal",
      "title": "omit"
    },
    "dataLabels": {
      "show": "whenTheyFit",
      "placement": "outsideMark"
    },
    "annotation": {
      "axisTitles": "omit",
      "unit": "lastTick",
      "numberFormat": {
        "precision": "auto"
      }
    },
    "furniture": [
      {
        "kind": "footerRule",
        "anchor": "bottomLeft",
        "color": "#dcdcdc",
        "height": 1
      }
    ],
    "interaction": {
      "tooltipFormat": "matchKey"
    },
    "layout": {
      "density": "normal",
      "targetWidth": 300,
      "bandStepFit": 1,
      "titleBlock": {
        "anchor": "start"
      }
    },
    "compileDefaults": {
      "baseSize": { "width": 420, "height": 340 }
    }
  }
};
var powerbi = {
  id: "powerbi",
  label: "Power BI",
  description: "Dashboard tile: compact, legend to the right, the latest point emphasised.",
  guidance: [
    "- Leave `title` out where the tile sits under its own caption \u2014 the axis titles come back to name the measure.",
    "- Colour can tell 6 categories apart."
  ].join("\n"),
  icon: POWERBI_ICON,
  spec: {
    "id": "powerbi",
    "label": "Power BI",
    "ink": {
      "surface": {
        "source": "house",
        "canvas": "#1b1a19",
        "plot": "#1b1a19",
        "panel": "#252423"
      },
      "text": {
        "primary": "#f3f2f1",
        "secondary": "#c8c6c4",
        "muted": "#a19f9d",
        "inverse": "#1b1a19"
      },
      "structure": {
        "grid": "#3b3a39",
        "axis": "#3b3a39",
        "rule": "#3b3a39",
        "connector": "#797775"
      },
      "series": {
        "single": "#118dff",
        // Power BI themes name dataColors explicitly; the classic
        // defaults are for a light report canvas. This dark set keeps
        // the product's azure/orange/magenta character while every
        // swatch clears 3:1 against both the plot and panel.
        "categorical": [
          "#118dff",
          "#e66c37",
          "#3bd1c7",
          "#e044a7",
          "#d9b300",
          "#8764b8"
        ],
        "categoricalExtended": [
          "#118dff",
          "#e66c37",
          "#3bd1c7",
          "#e044a7",
          "#d9b300",
          "#8764b8",
          "#d64550",
          "#4a9c2d",
          "#6677d9",
          "#b146c2",
          "#ff9d3b",
          "#25797f"
        ],
        // Continuous measure on a dark canvas: dim blue at the low end
        // (never the background) rising to bright azure, so "more"
        // reads as brighter — a light-to-dark ramp would sink the high
        // values into the near-black plot.
        "sequential": {
          "stops": [
            "#123049",
            "#0f4c86",
            "#1170c9",
            "#3f9dff",
            "#7bbcff",
            "#c9e3ff"
          ],
          "space": "lab",
          "endpointsAgainstSurface": true,
          "consumption": "interpolate"
        },
        "diverging": {
          "stops": [
            "#118dff",
            "#5aa9f0",
            "#4a4948",
            "#e08a4a",
            "#d64550"
          ],
          "neutral": "#4a4948",
          "space": "lab",
          "endpointsAgainstSurface": true,
          "consumption": "interpolate"
        },
        "status": {
          "positive": "#22b14c",
          "negative": "#e66c37",
          "neutral": "#a19f9d"
        },
        "selection": {
          "signed": "diverging",
          "statusUse": "thresholdOnly",
          "redundantWithFacet": "single"
        },
        "overflow": "#8a8886"
      },
      "accent": "#118dff"
    },
    "type": {
      "minSize": 8,
      "headline": {
        "family": "'Segoe UI', system-ui, sans-serif",
        "size": "text.200",
        "weight": "semibold",
        "color": "#f3f2f1"
      },
      "display": {
        "family": "'Segoe UI', system-ui, sans-serif",
        "size": "text.hero900",
        "weight": "semibold"
      },
      "axisLabel": {
        "family": "'Segoe UI', system-ui, sans-serif",
        "size": "text.100",
        "color": "#c8c6c4"
      },
      "keyLabel": {
        "size": "text.100",
        "color": "#c8c6c4"
      }
    },
    "structure": {
      "axis": {
        "categorical": {
          "line": "omit",
          "ticks": "omit",
          "tickLabels": "sparse"
        },
        "measure": {
          "line": "omit",
          "ticks": "omit",
          "tickDensity": "sparse"
        }
      },
      "grid": {
        "measure": "quiet",
        "category": "omit",
        "style": "solid"
      },
      "frame": "omit",
      "baseline": "quiet"
    },
    "marks": {
      "strokeWeight": 2.2,
      "strokeCap": "square",
      "minSize": 1.5,
      "point": {
        "size": 62
      },
      "separator": {
        "presence": "hairline",
        "source": "surface",
        "width": 1
      },
      "slice": {
        "gap": 1.5
      },
      "connector": {
        "presence": "full",
        "weight": 1.5,
        "spanWeight": 2
      },
      "trailingFill": {
        "presence": "quiet",
        "opacity": 0.18
      },
      "reference": {
        "presence": "full",
        "style": "tick",
        "label": true,
        "weight": 2
      }
    },
    "geometry": {
      "band": {
        "cornerRadius": 3
      },
      "cell": {
        "gap": 1
      },
      "point": {
        "presence": "full",
        "vertexSize": 28
      }
    },
    "variants": [
      {
        "when": {
          "isFaceted": true
        },
        "then": {
          "geometry": {
            "point": {
              "presence": "omit"
            }
          }
        },
        "because": "a panel in a grid has no room for a dot at every reading \u2014 its own 16-panel exhibit drops them"
      }
    ],
    "labels": {
      "truncation": "never"
    },
    "legend": {
      "show": "always",
      "placement": [
        "right",
        "bottom"
      ],
      "title": "omit",
      "gradientLength": 90,
      "suppressWhenValuesPrinted": false
    },
    "dataLabels": {
      "show": "whenTheyFit",
      "placement": "atMark",
      "inkMode": "contrastWithMark"
    },
    "annotation": {
      "axisTitles": "omit",
      "unit": "everyTick",
      "pointEmphasis": "latest",
      "numberFormat": {
        "precision": "auto"
      }
    },
    "facets": {
      "header": {
        "presence": "full",
        "style": "flushLabel",
        "fieldTitle": "omit"
      },
      "panelFrame": "omit",
      "axisRepetition": "edgeOnly",
      "preferredColumns": 4,
      "sharedScale": "whenComparable"
    },
    "layout": {
      "density": "compact",
      "bandStepFit": 1,
      "titleBlock": {
        "anchor": "start",
        "gap": "tight",
        "deckGap": "tight"
      }
    },
    "compileDefaults": {
      "baseSize": { "width": 480, "height": 280 }
    }
  }
};
var powerbiLight = {
  id: "powerbi-light",
  label: "Power BI (light)",
  description: "Light dashboard tile: white canvas, Segoe UI, hairline grid, legend to the right.",
  guidance: [
    "- Leave `title` out where the tile sits under its own caption \u2014 the axis titles come back to name the measure.",
    "- Colour can tell 6 categories apart."
  ].join("\n"),
  icon: POWERBI_LIGHT_ICON,
  spec: {
    "id": "powerbi-light",
    "label": "Power BI (light)",
    "ink": {
      "surface": {
        "source": "house",
        "canvas": "#ffffff",
        "plot": "#ffffff",
        "panel": "#faf9f8"
      },
      "text": {
        "primary": "#252423",
        "secondary": "#605e5c",
        "muted": "#a19f9d",
        "inverse": "#ffffff"
      },
      "structure": {
        "grid": "#ededed",
        "axis": "#d2d0ce",
        "rule": "#d2d0ce",
        "connector": "#8a8886"
      },
      "series": {
        "single": "#118dff",
        "categorical": [
          "#118dff",
          "#12239e",
          "#e66c37",
          "#6b007b",
          "#e044a7",
          "#744ec2"
        ],
        "categoricalExtended": [
          "#118dff",
          "#12239e",
          "#e66c37",
          "#6b007b",
          "#e044a7",
          "#744ec2",
          "#d9b300",
          "#d64550",
          "#197278",
          "#5c2e91",
          "#ff9d3b",
          "#4a9c2d"
        ],
        // Continuous measure: Power BI azure, light to deep.
        "sequential": {
          "stops": [
            "#e5f1ff",
            "#b3d7ff",
            "#7bbcff",
            "#3f9dff",
            "#118dff",
            "#0a5cb5"
          ],
          "space": "lab",
          "endpointsAgainstSurface": true,
          "consumption": "interpolate"
        },
        "diverging": {
          "stops": [
            "#118dff",
            "#7bb8f5",
            "#e1dfdd",
            "#e59866",
            "#d64550"
          ],
          "neutral": "#e1dfdd",
          "space": "lab",
          "endpointsAgainstSurface": true,
          "consumption": "interpolate"
        },
        "status": {
          "positive": "#107c10",
          "negative": "#d13438",
          "neutral": "#a19f9d"
        },
        "selection": {
          "signed": "diverging",
          "statusUse": "thresholdOnly",
          "redundantWithFacet": "single"
        },
        "overflow": "#bcbcbc"
      },
      "accent": "#118dff"
    },
    "type": {
      "minSize": 8,
      "headline": {
        "family": "'Segoe UI', system-ui, sans-serif",
        "size": "text.200",
        "weight": "semibold",
        "color": "#252423"
      },
      "display": {
        "family": "'Segoe UI', system-ui, sans-serif",
        "size": "text.hero900",
        "weight": "semibold"
      },
      "axisLabel": {
        "family": "'Segoe UI', system-ui, sans-serif",
        "size": "text.100",
        "color": "#605e5c"
      },
      "keyLabel": {
        "size": "text.100",
        "color": "#605e5c"
      }
    },
    "structure": {
      "axis": {
        "categorical": {
          "line": "omit",
          "ticks": "omit",
          "tickLabels": "sparse"
        },
        "measure": {
          "line": "omit",
          "ticks": "omit",
          "tickDensity": "sparse"
        }
      },
      "grid": {
        "measure": "quiet",
        "category": "omit",
        "style": "solid"
      },
      "frame": "omit",
      "baseline": "quiet"
    },
    "marks": {
      "strokeWeight": 2.2,
      "strokeCap": "square",
      "minSize": 1.5,
      "point": {
        "size": 62
      },
      "separator": {
        "presence": "hairline",
        "source": "surface",
        "width": 1
      },
      "slice": {
        "gap": 1.5
      },
      "connector": {
        "presence": "full",
        "weight": 1.5,
        "spanWeight": 2
      },
      "trailingFill": {
        "presence": "quiet",
        "opacity": 0.18
      },
      "reference": {
        "presence": "full",
        "style": "tick",
        "label": true,
        "weight": 2
      }
    },
    "labels": {
      "truncation": "never"
    },
    "legend": {
      "show": "always",
      "placement": [
        "right",
        "bottom"
      ],
      "title": "omit",
      "gradientLength": 90,
      "suppressWhenValuesPrinted": false
    },
    "dataLabels": {
      "show": "whenTheyFit",
      "placement": "atMark",
      "inkMode": "contrastWithMark"
    },
    "annotation": {
      "axisTitles": "omit",
      "unit": "everyTick",
      "pointEmphasis": "latest",
      "numberFormat": {
        "precision": "auto"
      }
    },
    "facets": {
      "header": {
        "presence": "full",
        "style": "flushLabel",
        "fieldTitle": "omit"
      },
      "panelFrame": "omit",
      "axisRepetition": "edgeOnly",
      "preferredColumns": 4,
      "sharedScale": "whenComparable"
    },
    "layout": {
      "density": "compact",
      "bandStepFit": 1,
      "titleBlock": {
        "anchor": "start",
        "gap": "tight",
        "deckGap": "tight"
      }
    },
    "compileDefaults": {
      "baseSize": { "width": 480, "height": 280 }
    }
  }
};
var swiss = {
  id: "swiss",
  label: "Swiss",
  description: "International Typographic Style: warm paper, a visible modular grid, black structural axes, a bold flush-left Helvetica headline over a rule, and a single signal-red accent.",
  guidance: [
    "- `title` carries the naming in a bold flush-left block; `subtitle` names the measure and period.",
    "- Annotate the measure with `unit` in `semantic_types`.",
    "- Colour is a single signal red; the categorical key tells 5 series apart."
  ].join("\n"),
  icon: SWISS_ICON,
  spec: {
    id: "swiss",
    label: "Swiss",
    ink: {
      surface: {
        source: "house",
        canvas: "#f4f1ea",
        plot: "#f4f1ea"
      },
      text: {
        primary: "#1a1a1a",
        secondary: "#555555",
        muted: "#8a8a8a"
      },
      structure: {
        grid: "#d9d5cc",
        axis: "#1a1a1a",
        rule: "#1a1a1a",
        connector: "#8a8a8a"
      },
      series: {
        single: "#e2231a",
        categorical: ["#e2231a", "#1a1a1a", "#0067a5", "#f2b705", "#2a7f4f"],
        categoricalExtended: [
          "#e2231a",
          "#1a1a1a",
          "#0067a5",
          "#f2b705",
          "#2a7f4f",
          "#e06d1f",
          "#5b4b8a",
          "#1f8a8a",
          "#b5195f",
          "#8a8a2a",
          "#5a6b78",
          "#8a5a2a"
        ],
        // Sequential: a single-hue red ramp, binned into steps — a scale
        // the reader can name a bin off, not a wash.
        sequential: {
          stops: ["#fbe3df", "#f4a19a", "#eb6a5f", "#e2231a", "#9e120c"],
          space: "lab",
          endpointsAgainstSurface: true,
          consumption: "quantize",
          quantizeCount: 5
        },
        // Diverging: cobalt to signal red, through the paper neutral.
        diverging: {
          stops: ["#0067a5", "#7fb2d6", "#efeae0", "#ef9a90", "#e2231a"],
          neutral: "#efeae0",
          space: "lab",
          endpointsAgainstSurface: true,
          consumption: "quantize",
          quantizeCount: 5
        },
        // Signed data reads as the two Swiss primaries: cobalt up,
        // signal red down, a neutral grey for the anchoring total.
        status: {
          positive: "#0067a5",
          negative: "#e2231a",
          neutral: "#9a9a9a"
        },
        overflow: "#9a9a9a",
        selection: {
          signed: "status",
          statusUse: "anySigned"
        }
      },
      accent: "#e2231a"
    },
    type: {
      minSize: 9,
      headline: {
        family: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        size: "text.400",
        weight: "bold"
      },
      deck: {
        size: "text.200",
        color: "#555555"
      },
      axisLabel: {
        size: "text.100"
      },
      axisTitle: {
        size: "text.100",
        weight: "bold",
        color: "#1a1a1a"
      }
    },
    structure: {
      axis: {
        categorical: {
          line: "full",
          ticks: "omit"
        },
        measure: {
          line: "full",
          ticks: "full",
          tickLength: "short",
          tickDirection: "outward"
        }
      },
      grid: {
        measure: "quiet",
        category: "omit",
        style: "solid",
        zero: "full"
      },
      frame: "omit",
      baseline: "full"
    },
    marks: {
      bandFraction: 0.7,
      strokeWeight: 3,
      strokeCap: "butt",
      strokeJoin: "miter",
      interpolation: "linear",
      point: {
        presence: "omit",
        fill: "solid",
        // Small and exact. The grid does the work of placing a
        // reading here, so the dot only has to mark the spot.
        size: 52
      },
      separator: {
        presence: "hairline",
        source: "surface",
        width: 1.5
      },
      slice: {
        gap: 2,
        gapStyle: "rule"
      },
      sizeRange: [12, 400]
    },
    labels: {
      truncation: "never",
      flush: true,
      angle: "auto"
    },
    legend: {
      show: "always",
      placement: ["top"],
      direction: "horizontal",
      title: "omit",
      suppressWhenAxisNames: true
    },
    dataLabels: {
      show: "whenTheyFit",
      placement: "outsideMark",
      inkMode: "fixed"
    },
    annotation: {
      axisTitles: "whenAmbiguous",
      unit: "lastTick",
      numberFormat: {
        precision: "auto"
      }
    },
    layout: {
      density: "normal",
      targetWidth: 300,
      bandStepFit: 0.5,
      titleBlock: {
        anchor: "start",
        gap: "normal"
      }
    },
    compileDefaults: {
      baseSize: { width: 420, height: 320 }
    }
  }
};
var pop = {
  id: "pop",
  label: "Pop",
  description: "A pop-art remix of Swiss: electric process colours, heavy black structure, oversized marks, and punchy display type.",
  guidance: [
    "- Use a short title that can carry the poster-like display treatment.",
    "- Strong categorical or binned quantitative data makes best use of the 6-colour process key.",
    "- Keep annotations concise; the heavy structure and high-contrast marks already speak loudly."
  ].join("\n"),
  icon: POP_ICON,
  spec: {
    extends: "swiss",
    id: "pop",
    label: "Pop",
    ink: {
      surface: { source: "house", canvas: "#fff200", plot: "#fff200" },
      text: { primary: "#111111", secondary: "#5f0047", muted: "#8c0068", inverse: "#fff200" },
      structure: { axis: "#111111", grid: "#111111", rule: "#111111", connector: "#111111" },
      series: {
        single: "#ff1493",
        categorical: ["#ff1493", "#00d9ff", "#ff5a1f", "#7a3cff", "#00c853", "#111111"],
        sequential: {
          stops: ["#00d9ff", "#7a3cff", "#ff1493", "#ff5a1f", "#fff200"],
          space: "rgb",
          endpointsAgainstSurface: true,
          consumption: "quantize",
          quantizeCount: 5
        },
        diverging: {
          stops: ["#00d9ff", "#7a3cff", "#fff200", "#ff5a1f", "#ff1493"],
          neutral: "#fff200",
          space: "rgb",
          endpointsAgainstSurface: true,
          consumption: "quantize",
          quantizeCount: 5
        },
        status: { positive: "#00c853", negative: "#ff1493", neutral: "#111111" },
        overflow: "#111111"
      },
      accent: "#ff1493"
    },
    type: {
      minSize: 10,
      headline: {
        family: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
        size: "text.500",
        weight: "bold",
        case: "upper"
      },
      deck: { size: "text.200", weight: "bold", color: "#5f0047" },
      axisLabel: { family: "'Arial Black', Arial, sans-serif", size: "text.100" },
      axisTitle: { family: "'Arial Black', Arial, sans-serif", size: "text.100", weight: "bold" },
      valueLabel: { family: "'Arial Black', Arial, sans-serif", weight: "bold" }
    },
    structure: {
      axis: {
        categorical: { line: "emphasised", lineWeight: 3, ticks: "omit" },
        measure: { line: "emphasised", lineWeight: 3, ticks: "full", tickLength: "long" }
      },
      grid: { measure: "quiet", category: "hairline", style: "solid", weight: 1, zero: "emphasised" },
      baseline: "emphasised"
    },
    marks: {
      bandFraction: 0.84,
      strokeWeight: 6,
      strokeCap: "square",
      strokeJoin: "miter",
      fillOpacity: 1,
      outline: { presence: "emphasised", weight: 3, source: "ink" },
      tile: { gap: 1, source: "structure" },
      point: { presence: "full", size: 180, fill: "solid", halo: { presence: "omit" } },
      separator: { presence: "emphasised", width: 3, source: "structure" }
    },
    dataLabels: { show: "whenTheyFit", placement: "atMark", inkMode: "contrastWithMark" },
    layout: { density: "normal", bandStepFit: 0.85, titleBlock: { anchor: "start", gap: "tight" } }
  }
};
var cartoon = {
  id: "cartoon",
  label: "Cartoon",
  description: 'A playful comic house: warm cream paper, a rounded comic typeface, fat dark "sticker" outlines around bright crayon-coloured bars, wedges and dots, rounded corners, chunky round-capped lines, and a soft dashed grid.',
  guidance: [
    "- `title` carries the naming in a bold rounded comic block; `subtitle` names the measure in a friendly aside.",
    "- Annotate the measure with `unit` in `semantic_types`.",
    "- Colour is a bright crayon set; the key tells 6 series apart."
  ].join("\n"),
  icon: CARTOON_ICON,
  spec: {
    id: "cartoon",
    label: "Cartoon",
    ink: {
      surface: {
        source: "house",
        canvas: "#fffdf5",
        plot: "#fffdf5"
      },
      text: {
        primary: "#2e2b28",
        secondary: "#8a837a",
        muted: "#b3aa9c"
      },
      structure: {
        grid: "#ece5d6",
        axis: "#2e2b28",
        rule: "#2e2b28",
        // The lollipop stem / dumbbell bridge in a soft pencil grey so
        // the emoji-ish chunky marks stay the loud part.
        connector: "#c9c1b2"
      },
      series: {
        // Sky blue reads as the friendly default single.
        single: "#3aa9ff",
        // Bright crayon: sky, coral, sunflower, grass, grape, tangerine.
        categorical: ["#3aa9ff", "#ff5d5d", "#ffc23c", "#4cc76a", "#9b6cff", "#ff8a3d"],
        categoricalExtended: [
          "#3aa9ff",
          "#ff5d5d",
          "#ffc23c",
          "#4cc76a",
          "#9b6cff",
          "#ff8a3d",
          "#2ec4c4",
          "#ff77b7",
          "#7bd23a",
          "#ffd84a",
          "#6c8cff",
          "#c96a2a"
        ],
        // Sequential: a warm cream-to-coral crayon ramp, binned so the
        // reader can name a bin, not read a wash.
        sequential: {
          stops: ["#fff2cc", "#ffd98a", "#ffb14a", "#ff8a3d", "#ff5d5d"],
          space: "lab",
          endpointsAgainstSurface: true,
          consumption: "quantize",
          quantizeCount: 5
        },
        // Diverging: sky to coral, through the warm paper neutral. The
        // warm end is the high end — a ramp that runs the other way
        // paints a hot July blue and a cold January red, and no reader
        // checks the key before believing that.
        diverging: {
          stops: ["#3aa9ff", "#8fc9ff", "#f2ead8", "#ffb0a0", "#ff5d5d"],
          neutral: "#f2ead8",
          space: "lab",
          endpointsAgainstSurface: true,
          consumption: "quantize",
          quantizeCount: 5
        },
        // Signed data: grass up, coral down, a soft pencil grey total.
        status: {
          positive: "#4cc76a",
          negative: "#ff5d5d",
          neutral: "#b3aa9c"
        },
        overflow: "#b3aa9c",
        selection: {
          signed: "status",
          statusUse: "anySigned"
        }
      },
      accent: "#ff5d5d"
    },
    type: {
      minSize: 9,
      // One rounded comic face carries every role: `bodyFamily` falls back
      // to the headline family, so axis and value labels inherit it.
      headline: {
        family: "'Comic Sans MS', 'Comic Neue', 'Chalkboard SE', 'Marker Felt', cursive",
        size: "text.400",
        weight: "bold"
      },
      deck: {
        size: "text.200",
        color: "#8a837a"
      },
      axisLabel: {
        size: "text.100"
      },
      axisTitle: {
        size: "text.100",
        weight: "bold",
        color: "#2e2b28"
      }
    },
    structure: {
      axis: {
        categorical: {
          line: "full",
          lineWeight: 2.5,
          ticks: "omit",
          labelGap: 7
        },
        measure: {
          line: "full",
          lineWeight: 2.5,
          ticks: "omit",
          labelGap: 7
        }
      },
      // A soft dashed grid the reader reads values off, only across the
      // value axis — the category side stays clean.
      grid: {
        measure: "quiet",
        category: "omit",
        style: "dashed",
        weight: 1.5
      },
      frame: "omit",
      baseline: "full"
    },
    marks: {
      // Chunky bars with a friendly gap between them.
      bandFraction: 0.62,
      // Fat round-capped, round-joined strokes and bouncy curves.
      strokeWeight: 5,
      strokeCap: "round",
      strokeJoin: "round",
      interpolation: "monotone",
      // Rounded bar tops and wedge corners — the balloon/gumball tell.
      cornerRadius: 10,
      // The sticker edge: a fat dark outline around every filled shape.
      outline: { presence: "full", weight: 2.5, source: "ink" },
      point: {
        presence: "full",
        fill: "solid",
        size: 170,
        // The dark sticker edge is the identity here; a pale halo would
        // replace it because Vega-Lite gives a point only one stroke.
        halo: { presence: "omit" }
      },
      // Wedges swing apart (keeping their dark ring) rather than being cut
      // by a rule that would paint over the outline.
      slice: {
        gap: 5,
        gapStyle: "pad"
      },
      sizeRange: [120, 2600]
    },
    labels: {
      truncation: "never",
      flush: true,
      angle: "auto"
    },
    legend: {
      show: "always",
      placement: ["top"],
      direction: "horizontal",
      title: "omit",
      suppressWhenAxisNames: true
    },
    dataLabels: {
      show: "whenTheyFit",
      placement: "outsideMark",
      inkMode: "fixed"
    },
    annotation: {
      axisTitles: "whenAmbiguous",
      unit: "lastTick",
      numberFormat: {
        precision: "auto"
      }
    },
    layout: {
      density: "normal",
      targetWidth: 300,
      bandStepFit: 0.75,
      titleBlock: {
        anchor: "start",
        gap: "normal"
      }
    },
    compileDefaults: {
      baseSize: { width: 380, height: 320 }
    }
  }
};

// src/ntcharts/colormap.ts
var CATEGORICAL = {
  tableau10: [
    "#4e79a7",
    "#f28e2c",
    "#e15759",
    "#76b7b2",
    "#59a14f",
    "#edc949",
    "#af7aa1",
    "#ff9da7",
    "#9c755f",
    "#bab0ab"
  ],
  set1: [
    "#e41a1c",
    "#377eb8",
    "#4daf4a",
    "#984ea3",
    "#ff7f00",
    "#ffff33",
    "#a65628",
    "#f781bf",
    "#999999"
  ],
  set2: [
    "#66c2a5",
    "#fc8d62",
    "#8da0cb",
    "#e78ac3",
    "#a6d854",
    "#ffd92f",
    "#e5c494",
    "#b3b3b3"
  ],
  tableau20: [
    "#4e79a7",
    "#a0cbe8",
    "#f28e2c",
    "#ffbe7d",
    "#59a14f",
    "#8cd17d",
    "#b6992d",
    "#f1ce63",
    "#499894",
    "#86bcb6",
    "#e15759",
    "#ff9d9a",
    "#79706e",
    "#bab0ab",
    "#d37295",
    "#fabfd2",
    "#b07aa1",
    "#d4a6c8",
    "#9d7660",
    "#d7b5a6"
  ]
};
var SEQUENTIAL = {
  viridis: ["#440154", "#414487", "#2a788e", "#22a884", "#7ad151", "#fde725"],
  blues: ["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08306b"],
  greens: ["#f7fcf5", "#c7e9c0", "#74c476", "#238b45", "#00441b"],
  reds: ["#fff5f0", "#fcbba1", "#fb6a4a", "#cb181d", "#67000d"],
  oranges: ["#fff5eb", "#fdd0a2", "#fd8d3c", "#d94801", "#7f2704"],
  purples: ["#fcfbfd", "#dadaeb", "#9e9ac8", "#6a51a3", "#3f007d"],
  yelloworangebrown: ["#ffffe5", "#fee391", "#fe9929", "#cc4c02", "#662506"],
  // Vega "goldgreen": gold at the low end through green to a deep teal.
  goldgreen: ["#f4d166", "#c8c463", "#9bb968", "#71ac6c", "#4c9c6e", "#2f8b6e", "#0e6960"],
  // diverging: cool low end, neutral midpoint, warm high end
  redblue: ["#67001f", "#d6604d", "#f7f7f7", "#4393c3", "#053061"],
  blueorange: ["#134b73", "#4f97cc", "#b7d9ef", "#f7f7f7", "#f8d1a6", "#e08214", "#8c4109"]
};
function paletteForScheme(scheme) {
  return CATEGORICAL[scheme ?? ""] ?? CATEGORICAL.tableau10;
}
function gradientForScheme(scheme) {
  return SEQUENTIAL[scheme ?? ""] ?? SEQUENTIAL.viridis;
}

// src/ntcharts/series.ts
function splitSeries(table, channelSemantics, pointOf) {
  const groupCS = channelSemantics.color ?? channelSemantics.group;
  const yField = channelSemantics.y?.field ?? "value";
  if (!groupCS || groupCS.type === "quantitative") {
    return [{ name: String(yField), values: table.map(pointOf) }];
  }
  const order = [];
  const buckets = /* @__PURE__ */ new Map();
  const preferred = groupCS.ordinalSortOrder;
  if (preferred) for (const v of preferred) {
    order.push(String(v));
    buckets.set(String(v), []);
  }
  for (const row of table) {
    const key = String(row[groupCS.field]);
    if (!buckets.has(key)) {
      order.push(key);
      buckets.set(key, []);
    }
    buckets.get(key).push(pointOf(row));
  }
  const palette = paletteForScheme(groupCS.colorScheme?.scheme);
  return order.map((name, i) => ({ name, values: buckets.get(name) ?? [], color: palette[i % palette.length] })).filter((s) => s.values.length > 0);
}

// src/ntcharts/templates/bar.ts
var ntBarChartDef = {
  chart: "Bar Chart",
  template: { mark: "bar" },
  channels: ["x", "y", "color", "group"],
  markCognitiveChannel: "length",
  declareLayoutMode: (cs, table) => {
    const result = detectBandedAxisFromSemantics(cs, table, { preferAxis: "x" });
    return {
      axisFlags: result ? { [result.axis]: { banded: true } } : { x: { banded: true } },
      resolvedTypes: result?.resolvedTypes,
      // The ntcharts bar model spends two cells per category — the bar and
      // the gap after it — and draws nothing at all once the bar width
      // reaches zero. A 2-cell step makes flint budget, and truncate with its
      // usual overflow warning, to what the renderer can actually draw.
      paramOverrides: { minStep: 2 }
    };
  },
  instantiate: (_spec, rawCtx) => {
    const ctx = rawCtx;
    const { emit, channelSemantics: cs, table } = ctx;
    const horizontal = cs.y != null && cs.y.type !== "quantitative" && cs.x?.type === "quantitative";
    const catCS = horizontal ? cs.y : cs.x;
    const valCS = horizontal ? cs.x : cs.y;
    emit.type = "bar";
    if (horizontal) emit.options = { ...emit.options, orientation: "horizontal" };
    const labels = [];
    const seen = /* @__PURE__ */ new Set();
    for (const row of table) {
      const v = String(row[catCS.field]);
      if (!seen.has(v)) {
        seen.add(v);
        labels.push(v);
      }
    }
    emit.x_axis = { ...emit.x_axis, type: "category", labels, title: catCS.field };
    emit.y_axis = { ...emit.y_axis, title: valCS.field };
    const valueFormat = horizontal ? ctx.ntFormatX : ctx.ntFormatY;
    if (valueFormat) emit.y_axis.format = valueFormat;
    if (valCS.zero?.zero) emit.y_axis.min = 0;
    const index = new Map(labels.map((l, i) => [l, i]));
    const series = splitSeries(table, cs, (row) => ({ y: Number(row[valCS.field]) }));
    const groupField = cs.color?.field ?? cs.group?.field;
    for (const s of series) {
      const slots = labels.map(() => ({ y: 0 }));
      for (const row of table) {
        const cat = String(row[catCS.field]);
        const belongs = series.length === 1 || groupField == null || String(row[groupField]) === s.name;
        if (belongs) slots[index.get(cat)] = { y: Number(row[valCS.field]) };
      }
      s.values = slots;
    }
    emit.data.series = series;
    if (series.length > 1) emit.options = { ...emit.options, stacked: true, show_legend: true };
  },
  encodingActions: [makeSortAction()],
  pivot: makeCartesianPivot({
    transpose: [["x", "y"]],
    permute: [["x", "y", "color"]],
    shift: ["color", "group"]
  })
};

// src/ntcharts/templates/stacked-bar.ts
var ntStackedBarChartDef = {
  ...ntBarChartDef,
  chart: "Stacked Bar Chart",
  instantiate: (spec, rawCtx) => {
    ntBarChartDef.instantiate(spec, rawCtx);
    const ctx = rawCtx;
    ctx.emit.options = { ...ctx.emit.options, stacked: true };
  },
  encodingActions: [makeSortAction()],
  pivot: makeCartesianPivot({
    transpose: [["x", "y"]],
    permute: [["x", "y", "color"]],
    shift: ["color", "group"]
  })
};

// src/ntcharts/temporal.ts
function toMs(v) {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v;
  return Date.parse(String(v));
}

// src/ntcharts/domain.ts
function pinFittedYDomain(emit, cs, table) {
  const decision = cs.y?.zero;
  const field = cs.y?.field;
  if (!decision || decision.zero || !(decision.domainPadFraction > 0) || field == null) return;
  const values = table.map((row) => row[field]).filter((v) => typeof v === "number" && Number.isFinite(v));
  const padded = computePaddedDomain(values, decision.domainPadFraction);
  if (padded) {
    emit.y_axis.min = padded[0];
    emit.y_axis.max = padded[1];
  }
}

// src/ntcharts/templates/line.ts
var ntLineChartDef = {
  chart: "Line Chart",
  template: { mark: "line" },
  channels: ["x", "y", "color", "group"],
  markCognitiveChannel: "position",
  instantiate: (_spec, rawCtx) => {
    const ctx = rawCtx;
    const { emit, channelSemantics: cs, table } = ctx;
    const temporal = cs.x?.type === "temporal";
    emit.type = temporal ? "timeseries" : "line";
    emit.x_axis = { ...emit.x_axis, type: temporal ? "time" : "value", title: cs.x?.field };
    emit.y_axis = { ...emit.y_axis, title: cs.y?.field };
    if (ctx.ntFormatX) emit.x_axis.format = ctx.ntFormatX;
    if (ctx.ntFormatY) emit.y_axis.format = ctx.ntFormatY;
    if (cs.y?.zero?.zero) emit.y_axis.min = 0;
    else pinFittedYDomain(emit, cs, table);
    const xField = cs.x.field;
    emit.data.series = splitSeries(table, cs, (row) => ({
      x: temporal ? toMs(row[xField]) : Number(row[xField]),
      y: Number(row[cs.y.field])
    }));
    let droppedCount = 0;
    for (const series of emit.data.series) {
      const values = series.values ?? [];
      const kept = values.filter((p) => {
        const ok = !Number.isNaN(p.x) && !Number.isNaN(p.y);
        if (!ok) droppedCount++;
        return ok;
      });
      kept.sort((a, b) => a.x - b.x);
      series.values = kept;
    }
    if (droppedCount > 0) {
      ctx.warn({
        severity: "warning",
        code: "invalid-temporal-x",
        message: `dropped ${droppedCount} point(s) with unparsable X values`
      });
    }
    if (emit.data.series.length > 1) emit.options = { ...emit.options, show_legend: true };
  },
  encodingActions: [makeSortAction()],
  pivot: makeCartesianPivot({ permute: [["x", "y", "color"]], shift: ["color", "group"] })
};

// src/ntcharts/templates/scatter.ts
var ntScatterPlotDef = {
  chart: "Scatter Plot",
  template: { mark: "circle" },
  channels: ["x", "y", "color", "size", "group"],
  markCognitiveChannel: "position",
  instantiate: (_spec, rawCtx) => {
    const ctx = rawCtx;
    const { emit, channelSemantics: cs, table } = ctx;
    emit.type = "scatter";
    emit.x_axis = { ...emit.x_axis, type: "value", title: cs.x?.field };
    emit.y_axis = { ...emit.y_axis, title: cs.y?.field };
    if (ctx.ntFormatX) emit.x_axis.format = ctx.ntFormatX;
    if (ctx.ntFormatY) emit.y_axis.format = ctx.ntFormatY;
    if (cs.y?.zero?.zero) emit.y_axis.min = 0;
    else pinFittedYDomain(emit, cs, table);
    const sizeField = cs.size?.field;
    emit.data.series = splitSeries(table, cs, (row) => {
      const p = { x: Number(row[cs.x.field]), y: Number(row[cs.y.field]) };
      if (sizeField != null) p.size = Number(row[sizeField]);
      return p;
    });
    if (emit.data.series.length > 1) emit.options = { ...emit.options, show_legend: true };
  },
  encodingActions: [makeSortAction()],
  pivot: makeCartesianPivot({
    transpose: [["x", "y"]],
    permute: [["x", "y", "color", "size"]],
    shift: ["color", "group"]
  })
};

// src/ntcharts/templates/heatmap.ts
var ntHeatmapDef = {
  chart: "Heatmap",
  template: { mark: "rect" },
  channels: ["x", "y", "color"],
  markCognitiveChannel: "color",
  declareLayoutMode: (cs, table) => {
    const result = detectBandedAxisFromSemantics(cs, table, { preferAxis: "x" });
    return {
      axisFlags: { x: { banded: true }, y: { banded: true } },
      resolvedTypes: result?.resolvedTypes
    };
  },
  instantiate: (_spec, rawCtx) => {
    const ctx = rawCtx;
    const { emit, channelSemantics: cs, table } = ctx;
    emit.type = "heatmap";
    const indexOf = (field, preferred) => {
      const order = [];
      const seen = /* @__PURE__ */ new Set();
      if (preferred) for (const v of preferred) {
        seen.add(String(v));
        order.push(String(v));
      }
      for (const row of table) {
        const v = String(row[field]);
        if (!seen.has(v)) {
          seen.add(v);
          order.push(v);
        }
      }
      return order;
    };
    const xLabels = indexOf(cs.x.field, cs.x.ordinalSortOrder);
    const yLabels = indexOf(cs.y.field, cs.y.ordinalSortOrder);
    const xi = new Map(xLabels.map((l, i) => [l, i]));
    const yi = new Map(yLabels.map((l, i) => [l, i]));
    const zField = cs.color.field;
    emit.heat = {
      cells: table.map((row) => ({
        x: xi.get(String(row[cs.x.field])),
        y: yi.get(String(row[cs.y.field])),
        z: Number(row[zField])
      }))
    };
    emit.data.series = [];
    emit.x_axis = { ...emit.x_axis, type: "category", labels: xLabels, title: cs.x?.field };
    emit.y_axis = { ...emit.y_axis, labels: yLabels, title: cs.y?.field };
    const scheme = cs.color?.colorScheme;
    emit.theme = { ...emit.theme, gradient: gradientForScheme(scheme?.scheme) };
  }
};

// src/ntcharts/templates/candlestick.ts
var OHLC_PALETTE = ["#26a69a", "#ef5350"];
var ntCandlestickChartDef = {
  chart: "Candlestick Chart",
  // template.mark only seeds assemble.ts's `markType` (zero-decision +
  // filterOverflow's connected-mark detection), it is not a Vega-Lite
  // skeleton we render. OHLC data is a time-ordered series like a line
  // chart's, so "line" gets the same "connected mark" overflow treatment
  // (contiguous window kept, not arbitrary category sampling) rather than
  // the discrete-mark default.
  template: { mark: "line" },
  channels: ["x", "open", "high", "low", "close"],
  markCognitiveChannel: "position",
  instantiate: (_spec, rawCtx) => {
    const ctx = rawCtx;
    const { emit, channelSemantics: cs, table } = ctx;
    emit.type = "ohlc";
    const xField = cs.x.field;
    emit.x_axis = { ...emit.x_axis, type: "time", title: xField };
    if (ctx.ntFormatX) emit.x_axis.format = ctx.ntFormatX;
    const openField = cs.open.field;
    const highField = cs.high.field;
    const lowField = cs.low.field;
    const closeField = cs.close.field;
    const points = table.map((row) => ({
      t: toMs(row[xField]),
      o: Number(row[openField]),
      h: Number(row[highField]),
      l: Number(row[lowField]),
      c: Number(row[closeField])
    }));
    let droppedCount = 0;
    const kept = points.filter((p) => {
      const ok = !Number.isNaN(p.t);
      if (!ok) droppedCount++;
      return ok;
    });
    kept.sort((a, b) => a.t - b.t);
    if (droppedCount > 0) {
      ctx.warn({
        severity: "warning",
        code: "invalid-temporal-x",
        message: `dropped ${droppedCount} point(s) with unparsable X values`
      });
    }
    emit.data.series = [{ name: xField, ohlc: kept }];
    emit.theme = { ...emit.theme, palette: OHLC_PALETTE };
    const candleStyle = ctx.chartProperties?.candleStyle;
    if (candleStyle === "line" || candleStyle === "block") {
      emit.options = { ...emit.options, candle_style: candleStyle };
    }
  }
};

// src/ntcharts/templates/sparkline.ts
var ntSparklineDef = {
  chart: "Sparkline",
  // Matches flint-chart's own Sparkline template mark ("line") -- a
  // sparkline is a compressed, connected time/index series, so it gets the
  // same connected-mark overflow treatment as Line Chart (see line.ts).
  template: { mark: "line" },
  channels: ["x", "y"],
  markCognitiveChannel: "position",
  instantiate: (_spec, rawCtx) => {
    const ctx = rawCtx;
    const { emit, channelSemantics: cs, table } = ctx;
    emit.type = "sparkline";
    const yField = cs.y.field;
    const xField = cs.x?.field;
    const temporal = cs.x?.type === "temporal";
    let rows = table;
    if (xField != null) {
      rows = [...table].sort((a, b) => {
        const ax = temporal ? toMs(a[xField]) : Number(a[xField]);
        const bx = temporal ? toMs(b[xField]) : Number(b[xField]);
        return ax - bx;
      });
    }
    emit.data.series = [{ name: yField, values: rows.map((row) => ({ y: Number(row[yField]) })) }];
  }
};

// src/ntcharts/ecdf.ts
function ecdf(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    if (i + 1 < n && sorted[i + 1] === sorted[i]) continue;
    out.push({ x: sorted[i], y: (i + 1) / n });
  }
  return out;
}

// src/ntcharts/templates/ecdf.ts
var ntEcdfPlotDef = {
  chart: "ECDF Plot",
  template: { mark: "line" },
  channels: ["x", "color", "detail"],
  markCognitiveChannel: "position",
  instantiate: (_spec, rawCtx) => {
    const ctx = rawCtx;
    const { emit, channelSemantics: cs, table } = ctx;
    const measure = cs.x?.field;
    if (!measure) return;
    const grouping = { ...cs, group: cs.group ?? cs.detail };
    emit.type = "line";
    emit.x_axis = { ...emit.x_axis, type: "value", title: measure };
    emit.y_axis = { ...emit.y_axis, title: "Cumulative proportion", min: 0, max: 1, format: { kind: "percent", precision: 0 } };
    if (ctx.ntFormatX) emit.x_axis.format = ctx.ntFormatX;
    let dropped = 0;
    const raw = splitSeries(table, grouping, (row) => ({ x: Number(row[measure]), y: 0 }));
    emit.data.series = raw.map((s) => {
      const xs = (s.values ?? []).map((p) => p.x);
      const kept = xs.filter((x) => Number.isFinite(x));
      dropped += xs.length - kept.length;
      return { ...s, name: s.name === "value" ? measure : s.name, values: ecdf(kept) };
    });
    if (dropped > 0) {
      ctx.warn({
        severity: "warning",
        code: "invalid-value",
        message: `dropped ${dropped} value(s) of ${measure} that are not numbers`
      });
    }
    if (emit.data.series.length > 1) emit.options = { ...emit.options, show_legend: true };
  },
  encodingActions: [],
  pivot: makeCartesianPivot({ permute: [["color", "detail"]], shift: ["color", "detail"] })
};

// src/ntcharts/templates/connected-scatter.ts
var ntConnectedScatterDef = {
  chart: "Connected Scatter Plot",
  template: { mark: "line" },
  channels: ["x", "y", "order", "color", "detail"],
  markCognitiveChannel: "position",
  instantiate: (_spec, rawCtx) => {
    const ctx = rawCtx;
    const { emit, channelSemantics: cs, table } = ctx;
    emit.type = "line";
    emit.x_axis = { ...emit.x_axis, type: "value", title: cs.x?.field };
    emit.y_axis = { ...emit.y_axis, title: cs.y?.field };
    if (ctx.ntFormatX) emit.x_axis.format = ctx.ntFormatX;
    if (ctx.ntFormatY) emit.y_axis.format = ctx.ntFormatY;
    if (cs.y?.zero?.zero) emit.y_axis.min = 0;
    else pinFittedYDomain(emit, cs, table);
    let rows = table;
    const orderField = cs.order?.field;
    if (orderField != null) {
      const key = (r) => cs.order.type === "temporal" ? toMs(r[orderField]) : Number(r[orderField]);
      const numeric = table.every((r) => Number.isFinite(key(r)));
      rows = [...table].sort(
        (a, b) => numeric ? key(a) - key(b) : String(a[orderField]).localeCompare(String(b[orderField]))
      );
    }
    const grouping = { ...cs, group: cs.group ?? cs.detail };
    emit.data.series = splitSeries(rows, grouping, (row) => ({
      x: Number(row[cs.x.field]),
      y: Number(row[cs.y.field])
    }));
    if (emit.data.series.length > 1) emit.options = { ...emit.options, show_legend: true };
  },
  encodingActions: [],
  pivot: makeCartesianPivot({ transpose: [["x", "y"]], permute: [["x", "y", "color"]], shift: ["color", "detail"] })
};

// src/ntcharts/templates/bubble.ts
var ntBubbleChartDef = {
  ...ntScatterPlotDef,
  chart: "Bubble Chart",
  channels: ["x", "y", "size", "color", "opacity"],
  instantiate: (spec, rawCtx) => {
    ntScatterPlotDef.instantiate(spec, rawCtx);
    const ctx = rawCtx;
    const size = ctx.channelSemantics.size?.field;
    if (size != null) {
      ctx.warn({
        severity: "info",
        code: "chart-type-approximated",
        message: `drawn as a scatter plot: the size channel (${size}) is not shown`
      });
    }
  }
};

// src/ntcharts/bins.ts
function binValues(values, n) {
  if (values.length === 0) return { edges: [], counts: [] };
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return { edges: [min, min + 1], counts: [values.length] };
  const bins = Math.max(1, Math.floor(n));
  const width = (max - min) / bins;
  const edges = Array.from({ length: bins + 1 }, (_, i) => i === bins ? max : min + i * width);
  const counts = new Array(bins).fill(0);
  for (const v of values) counts[Math.min(bins - 1, Math.floor((v - min) / width))]++;
  return { edges, counts };
}

// src/ntcharts/templates/histogram.ts
var DEFAULT_BINS = 10;
var AXIS_CELLS = 8;
var num = (v) => String(Number(v.toPrecision(3)));
var ntHistogramDef = {
  chart: "Histogram",
  template: { mark: "bar" },
  channels: ["x", "color"],
  markCognitiveChannel: "length",
  instantiate: (_spec, rawCtx) => {
    const ctx = rawCtx;
    const { emit, channelSemantics: cs, table } = ctx;
    const measure = cs.x?.field;
    if (!measure) return;
    const groupField = cs.color?.type === "quantitative" ? void 0 : cs.color?.field;
    let dropped = 0;
    const rows = table.map((r) => ({ v: Number(r[measure]), g: groupField != null ? String(r[groupField]) : "" })).filter((r) => {
      const ok = Number.isFinite(r.v);
      if (!ok) dropped++;
      return ok;
    });
    if (dropped > 0) {
      ctx.warn({ severity: "warning", code: "invalid-value", message: `dropped ${dropped} value(s) of ${measure} that are not numbers` });
    }
    const requested = Number(ctx.chartProperties?.binCount) > 0 ? Number(ctx.chartProperties.binCount) : DEFAULT_BINS;
    const capacity = Math.max(1, Math.floor((ctx.canvasSize.width - AXIS_CELLS + 1) / 2));
    const bins = binValues(rows.map((r) => r.v), Math.min(requested, capacity));
    if (requested > capacity && bins.counts.length > 0) {
      ctx.warn({ severity: "info", code: "overflow", message: `using ${bins.counts.length} bins instead of ${requested}: that is all the width fits` });
    }
    const labels = bins.counts.map((_, i) => `${num(bins.edges[i])}\u2013${num(bins.edges[i + 1])}`);
    emit.type = "bar";
    emit.x_axis = { ...emit.x_axis, type: "category", labels, title: measure };
    emit.y_axis = { ...emit.y_axis, title: "Count", min: 0 };
    const groups = [];
    for (const r of rows) if (!groups.includes(r.g)) groups.push(r.g);
    const palette = paletteForScheme(cs.color?.colorScheme?.scheme);
    emit.data.series = groups.map((g, gi) => {
      const mine = rows.filter((r) => r.g === g).map((r) => r.v);
      const counts = new Array(bins.counts.length).fill(0);
      for (const v of mine) {
        let i = bins.edges.findIndex((e, k) => k < counts.length && v < bins.edges[k + 1]);
        if (i < 0) i = counts.length - 1;
        counts[i]++;
      }
      return {
        name: groupField != null ? g : measure,
        values: counts.map((y) => ({ y })),
        ...groupField != null ? { color: palette[gi % palette.length] } : {}
      };
    });
    if (groups.length > 1) emit.options = { ...emit.options, stacked: true, show_legend: true };
  },
  encodingActions: [],
  pivot: makeCartesianPivot({ permute: [["x", "color"]], shift: ["color"] })
};

// src/ntcharts/templates/area.ts
var ntAreaChartDef = {
  ...ntLineChartDef,
  chart: "Area Chart",
  template: { mark: "area" },
  channels: ["x", "y", "color", "opacity"],
  instantiate: (spec, rawCtx) => {
    ntLineChartDef.instantiate(spec, rawCtx);
    rawCtx.warn({
      severity: "info",
      code: "chart-type-approximated",
      message: "drawn as a line chart: the area fill is not shown"
    });
  }
};

// src/ntcharts/templates/lollipop.ts
var ntLollipopChartDef = {
  ...ntBarChartDef,
  chart: "Lollipop Chart",
  channels: ["x", "y", "color"],
  instantiate: (spec, rawCtx) => {
    ntBarChartDef.instantiate(spec, rawCtx);
    rawCtx.warn({
      severity: "info",
      code: "chart-type-approximated",
      message: "drawn as a bar chart: the lollipop stems and dots are not shown"
    });
  }
};

// src/ntcharts/calendar.ts
var DAY = 864e5;
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
var dayStart = (t) => Math.floor(t / DAY) * DAY;
var weekday = (day) => ((Math.floor(day / DAY) + 3) % 7 + 7) % 7;
function calendarGrid(points) {
  if (points.length === 0) return { weeks: 0, cells: [], labels: [] };
  const byDay = /* @__PURE__ */ new Map();
  for (const p of points) {
    const d = dayStart(p.t);
    byDay.set(d, (byDay.get(d) ?? 0) + p.v);
  }
  const days = [...byDay.keys()].sort((a, b) => a - b);
  const first = days[0] - weekday(days[0]) * DAY;
  const weeks = Math.floor((days[days.length - 1] - first) / (7 * DAY)) + 1;
  const cells = days.map((d) => ({
    x: Math.floor((d - first) / (7 * DAY)),
    y: weekday(d),
    z: byDay.get(d)
  }));
  const labels = Array.from({ length: weeks }, (_, w) => {
    const start = first + w * 7 * DAY;
    for (let d = 0; d < 7; d++) {
      const date = new Date(start + d * DAY);
      if (date.getUTCDate() === 1) return MONTHS[date.getUTCMonth()];
    }
    return w === 0 ? MONTHS[new Date(days[0]).getUTCMonth()] : "";
  });
  return { weeks, cells, labels };
}

// src/ntcharts/templates/calendar-heatmap.ts
var ntCalendarHeatmapDef = {
  chart: "Calendar Heatmap",
  template: { mark: "rect" },
  channels: ["x", "color"],
  markCognitiveChannel: "color",
  declareLayoutMode: () => ({ axisFlags: { x: { banded: true }, y: { banded: true } } }),
  instantiate: (_spec, rawCtx) => {
    const ctx = rawCtx;
    const { emit, channelSemantics: cs, table } = ctx;
    const dateField = cs.x?.field;
    if (!dateField) return;
    const valueField = cs.color?.field;
    let dropped = 0;
    const points = [];
    for (const row of table) {
      const t = toMs(row[dateField]);
      const v = valueField != null ? Number(row[valueField]) : 1;
      if (Number.isNaN(t) || Number.isNaN(v)) {
        dropped++;
        continue;
      }
      points.push({ t, v });
    }
    if (dropped > 0) {
      ctx.warn({ severity: "warning", code: "invalid-temporal-x", message: `dropped ${dropped} row(s) with an unparsable date or value` });
    }
    const grid = calendarGrid(points);
    emit.type = "heatmap";
    emit.heat = { cells: grid.cells };
    emit.data.series = [];
    emit.x_axis = { ...emit.x_axis, type: "category", labels: grid.labels, title: dateField };
    emit.y_axis = { ...emit.y_axis, labels: WEEKDAYS };
    emit.theme = { ...emit.theme, gradient: gradientForScheme(cs.color?.colorScheme?.scheme) };
  }
};

// src/ntcharts/templates/index.ts
var defs = [];
function ntGetTemplateDef(chart) {
  return defs.find((d) => d.chart === chart);
}
function ntSupportedChartTypes() {
  return defs.map((d) => d.chart);
}
function ntRegister(def) {
  defs.push(def);
}
ntRegister(ntBarChartDef);
ntRegister(ntStackedBarChartDef);
ntRegister(ntLineChartDef);
ntRegister(ntScatterPlotDef);
ntRegister(ntHeatmapDef);
ntRegister(ntCandlestickChartDef);
ntRegister(ntSparklineDef);
ntRegister(ntEcdfPlotDef);
ntRegister(ntConnectedScatterDef);
ntRegister(ntBubbleChartDef);
ntRegister(ntHistogramDef);
ntRegister(ntAreaChartDef);
ntRegister(ntLollipopChartDef);
ntRegister(ntCalendarHeatmapDef);

// src/ntcharts/shims.ts
var DEFAULT_TERMINAL_BASE = { width: 64, height: 20 };
function resolveBaseSizeShim(base, ceiling) {
  const b = { ...base ?? DEFAULT_TERMINAL_BASE };
  if (ceiling) {
    b.width = Math.min(b.width, ceiling.width);
    b.height = Math.min(b.height, ceiling.height);
  }
  return b;
}
function deriveStretchCapsShim(base, ceiling, maxStretch = 1.5) {
  if (!ceiling) return { maxStretchX: maxStretch, maxStretchY: maxStretch };
  return {
    maxStretchX: Math.max(1, ceiling.width / base.width),
    maxStretchY: Math.max(1, ceiling.height / base.height)
  };
}
var averageFn = (v) => v.reduce((a, b) => a + b, 0) / v.length;
var AGGS = {
  sum: (v) => v.reduce((a, b) => a + b, 0),
  average: averageFn,
  mean: averageFn,
  count: (v) => v.length,
  min: (v) => Math.min(...v),
  max: (v) => Math.max(...v),
  median: (v) => {
    const s = [...v].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
};
function applyAggregationShim(encodings, rows) {
  const entries = Object.values(encodings).filter((e) => !!e && !!e.field);
  const aggFields = entries.filter((e) => e.aggregate);
  if (aggFields.length === 0) return rows;
  const groupFields = entries.filter((e) => !e.aggregate).map((e) => e.field);
  const groups = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const key = JSON.stringify(groupFields.map((f) => row[f]));
    (groups.get(key) ?? groups.set(key, []).get(key)).push(row);
  }
  const out = [];
  for (const bucket of groups.values()) {
    const merged = { ...bucket[0] };
    for (const enc of aggFields) {
      const field = enc.field;
      const op = enc.aggregate;
      if (op === "count") {
        merged[field] = bucket.length;
      } else {
        const fn = AGGS[op] ?? AGGS.sum;
        merged[field] = fn(bucket.map((r) => Number(r[field])).filter((n) => !Number.isNaN(n)));
      }
    }
    out.push(merged);
  }
  return out;
}

// src/ntcharts/format.ts
function patternPrecision(pattern, fallback) {
  const m = /\.(\d+)/.exec(pattern);
  return m ? parseInt(m[1], 10) : fallback;
}
function formatSpecToNt(fmt, warn) {
  if (!fmt) return void 0;
  const { pattern, prefix, suffix, abbreviate } = fmt;
  if (suffix) {
    warn({
      severity: "info",
      code: "format-suffix-dropped",
      message: `ntcharts-spec has no format suffix; dropping ${JSON.stringify(suffix)}`
    });
  }
  if (prefix) {
    return { kind: "currency", currency: prefix, precision: patternPrecision(pattern ?? "", 2) };
  }
  if (pattern && pattern.includes("%")) {
    return { kind: "percent", precision: patternPrecision(pattern, 0) };
  }
  if (abbreviate) return { kind: "si", precision: 1 };
  if (pattern) {
    if (/d$/.test(pattern)) return { kind: "number", precision: 0 };
    return { kind: "number", precision: patternPrecision(pattern, 2) };
  }
  return void 0;
}
var D3_TO_GO = [
  ["%Y", "2006"],
  ["%y", "06"],
  ["%B", "January"],
  ["%b", "Jan"],
  ["%m", "01"],
  ["%A", "Monday"],
  ["%a", "Mon"],
  ["%d", "02"],
  ["%e", "_2"],
  ["%H", "15"],
  ["%I", "03"],
  ["%M", "04"],
  ["%S", "05"],
  ["%p", "PM"],
  ["%Z", "MST"]
];
function d3TimeToGoLayout(d3fmt, warn) {
  let out = d3fmt;
  for (const [from, to] of D3_TO_GO) out = out.split(from).join(to);
  if (/%[A-Za-z]/.test(out)) {
    warn({
      severity: "info",
      code: "time-format-partial",
      message: `d3 time format ${JSON.stringify(d3fmt)} contains untranslatable tokens; passed through`
    });
  }
  return out;
}

// src/ntcharts/assemble.ts
var TERMINAL_OPTIONS = {
  minStep: 1,
  defaultBandSize: 3,
  stepPadding: 0.2,
  maxStretch: 1,
  minSubplotSize: 4
};
var OVERRIDE_DOMAIN_PAD = 0.05;
function assembleNtcharts(input) {
  const warnings = [];
  const warn = (w) => warnings.push(w);
  const chartType = input.chart_spec.chartType;
  let template = ntGetTemplateDef(chartType);
  if (!template) {
    throw new Error(`Unknown chart type "${chartType}". Supported: ${ntSupportedChartTypes().join(", ")}`);
  }
  const semanticTypes = input.semantic_types ?? {};
  const rawData = input.data.values ?? [];
  const ceiling = input.chart_spec.canvasSize;
  const baseSize = resolveBaseSizeShim(input.chart_spec.baseSize, ceiling);
  const caps = deriveStretchCapsShim(baseSize, ceiling, TERMINAL_OPTIONS.maxStretch);
  const normalized = normalizeStaticSeries(input.chart_spec.encodings ?? {}, rawData, semanticTypes);
  let data = normalized.data;
  const prelimConverted = convertTemporalData(data, semanticTypes);
  const prelim = resolveChannelSemantics(normalized.encodings, data, semanticTypes, prelimConverted);
  const typedEncodings = {};
  for (const [ch, enc] of Object.entries(normalized.encodings)) {
    if (!enc) continue;
    typedEncodings[ch] = { ...enc, type: enc.type ?? prelim[ch]?.type };
  }
  const pivoted = applyPivot(template, typedEncodings, data, input.chart_spec.chartProperties, ntGetTemplateDef);
  if (pivoted.chartType && pivoted.chartType !== template.chart) {
    const next = ntGetTemplateDef(pivoted.chartType);
    if (next) template = next;
  }
  const composed = applyEncodingOverrides(template, pivoted.encodings, input.chart_spec.chartProperties);
  const encodings = template.normalizeEncodings?.(composed, data) ?? composed;
  data = applyAggregationShim(encodings, data);
  const convertedData = convertTemporalData(data, semanticTypes);
  const channelSemantics = resolveChannelSemantics(encodings, data, semanticTypes, convertedData);
  const markType = template.template?.mark ?? "point";
  for (const axis of ["x", "y"]) {
    const cs = channelSemantics[axis];
    if (cs?.type === "quantitative") {
      const nums = convertedData.map((r) => Number(r[cs.field])).filter((n) => !Number.isNaN(n));
      cs.zero = computeZeroDecision(cs.semanticAnnotation.semanticType, axis, markType, nums);
    }
  }
  applyAxisProperties(template, channelSemantics, input.chart_spec.chartProperties, warn);
  const declaration = template.declareLayoutMode?.(channelSemantics, data, input.chart_spec.chartProperties) ?? {};
  const options = { ...TERMINAL_OPTIONS, ...declaration.paramOverrides, ...caps };
  const budgets = computeChannelBudgets(channelSemantics, declaration, convertedData, baseSize, options);
  const overflow = filterOverflow(channelSemantics, declaration, encodings, convertedData, budgets, /* @__PURE__ */ new Set([markType]));
  warnings.push(...overflow.warnings);
  const layout = computeLayout(channelSemantics, declaration, overflow.filteredData, baseSize, options, budgets.facetGrid);
  const ntFormatX = axisFormat(channelSemantics.x, warn);
  const ntFormatY = axisFormat(channelSemantics.y, warn);
  const emit = {
    type: "bar",
    // template overwrites
    width: Math.max(8, Math.round(layout.subplotWidth), baseSize.width),
    height: Math.max(4, Math.round(layout.subplotHeight), baseSize.height),
    data: { series: [] }
  };
  if (input.chart_spec.title) emit.title = input.chart_spec.title;
  if (input.chart_spec.subtitle) emit.subtitle = input.chart_spec.subtitle;
  const ctx = {
    channelSemantics,
    layout,
    table: overflow.filteredData,
    encodings,
    chartProperties: input.chart_spec.chartProperties,
    canvasSize: baseSize,
    chartType: template.chart,
    emit,
    warn,
    ntFormatX,
    ntFormatY
  };
  template.instantiate(emit, ctx);
  applyLogScale(emit, input.chart_spec.chartProperties, channelSemantics, warn);
  const result = { ...emit };
  if (warnings.length) result._warnings = warnings;
  result._width = emit.width;
  result._height = emit.height;
  return result;
}
function applyAxisProperties(template, channelSemantics, chartProperties, warn) {
  if (!chartProperties) return;
  const positional = template.markCognitiveChannel === "position";
  for (const axis of ["x", "y"]) {
    const cs = channelSemantics[axis];
    const zeroChoice = chartProperties[`includeZero_${axis}`];
    if (zeroChoice === true || zeroChoice === false) {
      if (axis === "y" && positional && cs?.type === "quantitative" && cs.zero) {
        cs.zero = {
          ...cs.zero,
          zero: zeroChoice,
          domainPadFraction: zeroChoice ? cs.zero.domainPadFraction : cs.zero.domainPadFraction || OVERRIDE_DOMAIN_PAD
        };
      } else {
        warn({
          severity: "info",
          code: "chart-property-unsupported",
          message: `includeZero_${axis} has no effect on a terminal ${template.chart}` + (axis === "x" ? ": the X axis range always follows the data." : ": its value axis always starts at zero."),
          channel: axis,
          field: cs?.field
        });
      }
    }
  }
}
function applyLogScale(emit, chartProperties, channelSemantics, warn) {
  if (!chartProperties) return;
  for (const axis of ["x", "y"]) {
    if (chartProperties[`logScale_${axis}`] !== true) continue;
    const reason = logScaleBlocker(emit, axis);
    if (reason) {
      warn({
        severity: "warning",
        code: "log-scale-unsupported",
        message: `logScale_${axis} was requested but ${reason}; drawn on a linear scale.`,
        channel: axis,
        field: channelSemantics[axis]?.field
      });
      continue;
    }
    const target = axis === "x" ? emit.x_axis ?? (emit.x_axis = {}) : emit.y_axis ?? (emit.y_axis = {});
    target.scale = "log";
    if (axis === "y" && emit.y_axis) {
      delete emit.y_axis.min;
      delete emit.y_axis.max;
    }
  }
}
function logScaleBlocker(emit, axis) {
  const drawsLogY = ["line", "scatter", "timeseries", "ohlc"];
  const drawsLogX = ["line", "scatter"];
  if (!(axis === "y" ? drawsLogY : drawsLogX).includes(emit.type)) {
    if (axis === "x" && drawsLogY.includes(emit.type)) return "its X axis is time";
    return `a terminal ${emit.type} chart cannot draw a logarithmic axis`;
  }
  const values = [];
  for (const series of emit.data.series) {
    for (const p of series.values ?? []) values.push(axis === "y" ? p.y : p.x);
    for (const p of series.ohlc ?? []) {
      if (axis === "y") values.push(p.o, p.h, p.l, p.c);
    }
  }
  if (values.some((v) => !(v > 0) || !Number.isFinite(v))) {
    return "the data has zero or negative values (flint would use a symlog scale, which terminal charts do not have)";
  }
  return void 0;
}
function axisFormat(cs, warn) {
  if (!cs) return void 0;
  if (cs.type === "temporal" && cs.temporalFormat) {
    return { kind: "time", layout: d3TimeToGoLayout(cs.temporalFormat, warn) };
  }
  return formatSpecToNt(cs.format, warn);
}

// src/compile.ts
function compileToNtSpec(inputJSON) {
  try {
    const out = assembleNtcharts(JSON.parse(inputJSON));
    const { _warnings, _width, _height } = out;
    if (_width === void 0 || _height === void 0) {
      throw new Error("assembleNtcharts output is missing _width/_height (size must always be present)");
    }
    const spec = Object.fromEntries(
      Object.entries(out).filter(([key]) => !key.startsWith("_"))
    );
    return JSON.stringify({
      spec,
      warnings: _warnings ?? [],
      size: { width: _width, height: _height }
    });
  } catch (err) {
    return JSON.stringify({
      error: { message: String(err instanceof Error ? err.message : err) }
    });
  }
}

// src/entry-browser.ts
var VERSION = true ? "flint-chart@0.5.1" : "dev";
var NAMESPACE = globalThis.boobaShim = globalThis.boobaShim ?? {};
NAMESPACE.flintchart = {
  compile: (inputJSON) => compileToNtSpec(inputJSON),
  version: `flint-ntcharts ${VERSION}`,
  ready: Promise.resolve()
};
