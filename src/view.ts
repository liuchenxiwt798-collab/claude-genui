import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import Chart from "chart.js/auto";
import { DEMOS } from "./demos";

type Kind = "chart" | "card" | "html";
type Args = Record<string, any>;

const root = document.getElementById("root")!;
const standalone = window.parent === window;
const kind: Kind =
  (document.querySelector<HTMLMetaElement>('meta[name="genui-kind"]')?.content as Kind) ??
  (new URLSearchParams(location.search).get("demo") as Kind) ??
  "chart";

const app = new App({ name: "Claude GenUI", version: "1.0.0" }, {}, { autoResize: true });
let current: Args | null = null;

// ---------------- helpers ----------------
const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const css = (name: string) => getComputedStyle(root).getPropertyValue(name).trim();

async function sendToClaude(text: string) {
  if (standalone) return alert(`[demo] would send to Claude:\n${text}`);
  await app.sendMessage({ role: "user", content: [{ type: "text", text }] });
}

function header(a: Args) {
  return `<div class="head">
    ${a.icon ? `<div class="icon">${esc(a.icon)}</div>` : ""}
    <div><h2>${esc(a.title)}</h2>${a.subtitle ? `<div class="sub">${esc(a.subtitle)}</div>` : ""}</div>
    ${a.badge ? `<span class="badge">${esc(a.badge)}</span>` : ""}
  </div>`;
}

// ---------------- chart ----------------
let chart: Chart | null = null;

function renderChart(a: Args) {
  const type: string = a.type ?? "bar";
  const round = type === "pie" || type === "doughnut";
  const datasets: Args[] = a.datasets ?? [];
  const labels: string[] = a.labels ?? [];
  const unit: string = a.unit ?? "";
  const fmt = (v: number) => `${typeof v === "number" ? v.toLocaleString() : v}${unit}`;

  root.innerHTML = `${header(a)}
    <div class="chart-box${round ? " round" : ""}"><canvas aria-label="${esc(a.title)}" role="img"></canvas></div>
    <div class="toolbar"><button class="linkbtn" id="tbl">显示数据表</button></div>
    <div id="table" hidden></div>`;

  const series = Array.from({ length: 8 }, (_, i) => css(`--series-${i + 1}`));
  const surface = css("--surface-1");
  const text2 = css("--text-secondary");
  const grid = css("--grid");

  const jsType =
    type === "horizontalBar" ? "bar" : type === "area" ? "line" : type;
  const ds = datasets.map((d, i) => {
    const c = series[i % 8];
    const base: Args = { label: d.label, data: d.data };
    if (round) {
      return {
        ...base,
        backgroundColor: labels.map((_, j) => series[j % 8]),
        borderColor: surface,
        borderWidth: 2,
        hoverOffset: 4,
      };
    }
    if (jsType === "bar") {
      return { ...base, backgroundColor: c, borderRadius: 4, borderSkipped: "start", borderColor: surface, borderWidth: 1, maxBarThickness: 36 };
    }
    if (jsType === "scatter") {
      return { ...base, backgroundColor: c, borderColor: surface, borderWidth: 2, pointRadius: 5, pointHoverRadius: 7 };
    }
    // line / area / radar
    return {
      ...base,
      borderColor: c,
      backgroundColor: type === "area" || type === "radar" ? c + "33" : c,
      fill: type === "area" ? (a.stacked ? (i === 0 ? "origin" : "-1") : "origin") : type === "radar",
      borderWidth: 2,
      pointRadius: labels.length > 24 ? 0 : 3,
      pointHoverRadius: 5,
      tension: 0.25,
    };
  });

  const axis = (title?: string, stacked?: boolean) => ({
    stacked,
    grid: { color: grid, drawTicks: false },
    border: { display: false },
    ticks: { color: text2, padding: 6 },
    title: title ? { display: true, text: title, color: text2 } : undefined,
  });

  chart?.destroy();
  chart = new Chart(root.querySelector("canvas")!, {
    type: jsType as any,
    data: { labels: jsType === "scatter" ? undefined : labels, datasets: ds as any },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      indexAxis: type === "horizontalBar" ? "y" : "x",
      interaction: round ? undefined : { mode: jsType === "scatter" ? "nearest" : "index", intersect: false },
      plugins: {
        legend: {
          display: round || datasets.length > 1,
          position: round ? "right" : "top",
          align: "start",
          labels: { color: text2, usePointStyle: true, pointStyle: "rectRounded", boxWidth: 10, boxHeight: 10 },
        },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const v = ctx.raw;
              const val = typeof v === "object" && v ? `(${v.x}, ${fmt(v.y)})` : fmt(v);
              return ` ${round ? ctx.label : ctx.dataset.label}: ${val}`;
            },
          },
        },
      },
      scales: round
        ? undefined
        : jsType === "radar"
          ? { r: { grid: { color: grid }, angleLines: { color: grid }, pointLabels: { color: text2 }, ticks: { display: false } } }
          : {
              x: axis(a.xLabel, a.stacked),
              y: { ...axis(a.yLabel, a.stacked), beginAtZero: true, ticks: { color: text2, padding: 6, callback: (v: any) => fmt(v) } },
            },
    } as any,
  });

  // accessible table view
  const tbl = root.querySelector<HTMLDivElement>("#table")!;
  if (jsType === "scatter") {
    tbl.innerHTML = `<table class="data"><tr><th>系列</th><th>x</th><th>y</th></tr>${datasets
      .flatMap((d) => d.data.map((p: Args) => `<tr><td>${esc(d.label)}</td><td>${p.x}</td><td>${fmt(p.y)}</td></tr>`))
      .join("")}</table>`;
  } else {
    tbl.innerHTML = `<table class="data"><tr><th></th>${datasets.map((d) => `<th>${esc(d.label)}</th>`).join("")}</tr>${labels
      .map((l, j) => `<tr><td>${esc(l)}</td>${datasets.map((d) => `<td>${fmt(d.data[j])}</td>`).join("")}</tr>`)
      .join("")}</table>`;
  }
  const btn = root.querySelector<HTMLButtonElement>("#tbl")!;
  btn.onclick = () => {
    tbl.hidden = !tbl.hidden;
    btn.textContent = tbl.hidden ? "显示数据表" : "隐藏数据表";
  };
}

// ---------------- card ----------------
function renderCard(a: Args) {
  root.innerHTML = `<div class="card">
    ${a.image ? `<img class="hero-img" src="${esc(a.image)}" alt="">` : ""}
    ${header(a)}
    ${a.hero ? `<div class="hero"><div class="value">${esc(a.hero.value)}</div>${a.hero.caption ? `<div class="caption">${esc(a.hero.caption)}</div>` : ""}</div>` : ""}
    ${a.description ? `<p class="desc">${esc(a.description)}</p>` : ""}
    ${a.fields?.length ? `<div class="fields">${a.fields.map((f: Args) => `<div class="field"><div class="k">${esc(f.label)}</div><div class="v">${esc(f.value)}</div></div>`).join("")}</div>` : ""}
    ${a.items?.length ? `<ul class="items">${a.items.map((it: Args) => `<li class="${it.checked ? "done" : ""}"><span class="mark">${it.checked ? "✓" : it.checked === false ? "○" : "•"}</span><span class="t">${esc(it.text)}</span></li>`).join("")}</ul>` : ""}
    ${a.actions?.length ? `<div class="actions">${a.actions.map((x: Args, i: number) => `<button data-i="${i}">${esc(x.label)}</button>`).join("")}</div>` : ""}
  </div>`;
  root.querySelectorAll<HTMLButtonElement>(".actions button").forEach((b) => {
    b.onclick = async () => {
      b.disabled = true;
      try {
        await sendToClaude(a.actions[Number(b.dataset.i)].prompt);
      } finally {
        b.disabled = false;
      }
    };
  });
}

// ---------------- free-form html ----------------
async function renderHtml(a: Args) {
  root.classList.add("bare");
  (window as any).genui = { send: sendToClaude };
  const doc = new DOMParser().parseFromString(a.html ?? "", "text/html");
  root.innerHTML = "";
  if (a.height) root.style.minHeight = `${a.height}px`;

  // carry over styles/links from <head>, then body content
  doc.head.querySelectorAll("style, link[rel=stylesheet]").forEach((n) => root.appendChild(n.cloneNode(true)));
  const scripts: HTMLScriptElement[] = [];
  Array.from(doc.body.childNodes).forEach((n) => root.appendChild(document.importNode(n, true)));
  doc.head.querySelectorAll("script").forEach((s) => scripts.push(s));
  root.querySelectorAll("script").forEach((s) => scripts.push(s));

  // re-create scripts so they execute, in order (external ones awaited)
  for (const old of scripts) {
    const s = document.createElement("script");
    for (const attr of Array.from(old.attributes)) s.setAttribute(attr.name, attr.value);
    if (old.src) {
      await new Promise<void>((res) => {
        s.onload = s.onerror = () => res();
        old.isConnected ? old.replaceWith(s) : root.appendChild(s);
      });
    } else {
      s.textContent = old.textContent;
      old.isConnected ? old.replaceWith(s) : root.appendChild(s);
    }
  }
  document.dispatchEvent(new Event("DOMContentLoaded"));
  window.dispatchEvent(new Event("load"));
}

// ---------------- dispatch ----------------
function render(a: Args) {
  current = a;
  try {
    const k: Kind = a.kind ?? kind;
    if (k === "chart") renderChart(a);
    else if (k === "card") renderCard(a);
    else void renderHtml(a);
  } catch (e) {
    root.innerHTML = `<div class="error">渲染失败：${esc((e as Error).message)}</div>`;
  }
}

function applyContext(ctx?: McpUiHostContext) {
  if (!ctx) return;
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
  if (current && (current.kind ?? kind) === "chart") renderChart(current); // re-color for theme
}

if (standalone) {
  render(DEMOS[kind]);
} else {
  // Render as soon as arguments arrive; the result carries the same payload.
  app.ontoolinput = (p) => render({ kind, ...(p.arguments as Args) });
  app.ontoolresult = (r) => {
    if (r.structuredContent && !current) render(r.structuredContent as Args);
  };
  app.onhostcontextchanged = applyContext;
  app.connect().then(() => applyContext(app.getHostContext()));
}
