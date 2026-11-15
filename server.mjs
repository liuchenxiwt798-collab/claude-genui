#!/usr/bin/env node
// Claude GenUI — MCP Apps server that lets Claude render charts, cards and
// free-form HTML inline in the conversation (Claude Desktop / claude.ai).
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");

// One bundled view serves all three tools; the kind is stamped into the HTML.
async function viewHtml(kind) {
  const html = await fs.readFile(path.join(DIST, "view.html"), "utf-8");
  return html.replace("<head>", `<head><meta name="genui-kind" content="${kind}">`);
}

// CDNs the free-form HTML tool may load scripts/styles/images from.
const CDN_DOMAINS = [
  "https://cdn.jsdelivr.net",
  "https://unpkg.com",
  "https://cdnjs.cloudflare.com",
  "https://esm.sh",
];

function addView(server, kind, extraMeta = {}) {
  const uri = `ui://genui/${kind}.html`;
  registerAppResource(server, `genui-${kind}`, uri, { mimeType: RESOURCE_MIME_TYPE }, async () => ({
    contents: [
      {
        uri,
        mimeType: RESOURCE_MIME_TYPE,
        text: await viewHtml(kind),
        _meta: { ui: { prefersBorder: true, ...extraMeta } },
      },
    ],
  }));
  return uri;
}

const ok = (text, structuredContent) => ({
  content: [{ type: "text", text }],
  structuredContent,
});

export function createServer() {
  const server = new McpServer(
    { name: "claude-genui", version: "1.0.0" },
    {
      instructions:
        "These tools render native, interactive visuals directly inside the chat. Whenever the user asks for a chart, " +
        "graph, visualization, dashboard, card or any visual presentation, CALL THESE TOOLS instead of writing HTML/code " +
        "in the reply or creating an artifact. Preference order: render_chart for any numeric data; render_card for " +
        "structured info (weather, product, profile, itinerary, summary, checklist); render_html ONLY when neither fits " +
        "(diagrams, simulations, custom interactive widgets). Several tools may be called in one reply.",
    },
  );

  // ---------- 1. Charts ----------
  const chartUri = addView(server, "chart");
  registerAppTool(
    server,
    "render_chart",
    {
      title: "Render chart",
      description:
        "PREFERRED for any numeric data. Renders a native interactive chart inline in the chat (do not write chart HTML yourself). Use whenever numbers are better understood visually " +
        "(trends, comparisons, shares). Supports bar, horizontal bar, line, area, pie, doughnut, radar and scatter. " +
        "Keep to at most 8 series (3 for pie/scatter); never mix two different units on one chart.",
      inputSchema: z.object({
        title: z.string().describe("Chart title"),
        subtitle: z.string().optional().describe("One-line takeaway or data source"),
        type: z.enum(["bar", "horizontalBar", "line", "area", "pie", "doughnut", "radar", "scatter"]),
        labels: z.array(z.string()).optional().describe("Category / x-axis labels (not used for scatter)"),
        datasets: z
          .array(
            z.object({
              label: z.string(),
              data: z
                .array(z.union([z.number(), z.object({ x: z.number(), y: z.number() })]))
                .describe("Numbers aligned with labels, or {x,y} points for scatter"),
            }),
          )
          .min(1),
        xLabel: z.string().optional(),
        yLabel: z.string().optional(),
        stacked: z.boolean().optional().describe("Stack bar/area series"),
        unit: z.string().optional().describe("Unit suffix for values, e.g. '%', 'ms', '万元'"),
      }),
      _meta: { ui: { resourceUri: chartUri } },
    },
    async (args) => ok(`Rendered ${args.type} chart "${args.title}" for the user.`, { kind: "chart", ...args }),
  );

  // ---------- 2. Cards ----------
  const cardUri = addView(server, "card");
  registerAppTool(
    server,
    "render_card",
    {
      title: "Render card",
      description:
        "Render a structured information card inline (e.g. weather, product, profile, summary, checklist, comparison). " +
        "Optional action buttons send a follow-up prompt back to Claude when clicked.",
      inputSchema: z.object({
        title: z.string(),
        subtitle: z.string().optional(),
        icon: z.string().optional().describe("A single emoji shown beside the title"),
        badge: z.string().optional().describe("Short status tag, e.g. 'New', 'In stock'"),
        hero: z
          .object({ value: z.string(), caption: z.string().optional() })
          .optional()
          .describe("One big headline number, e.g. {value:'23°C', caption:'Feels like 25°C'}"),
        image: z.string().url().optional().describe("https image URL"),
        description: z.string().optional(),
        fields: z
          .array(z.object({ label: z.string(), value: z.string() }))
          .optional()
          .describe("Key/value grid"),
        items: z
          .array(z.object({ text: z.string(), checked: z.boolean().optional() }))
          .optional()
          .describe("Checklist / bullet list"),
        actions: z
          .array(z.object({ label: z.string(), prompt: z.string().describe("Message sent to Claude on click") }))
          .max(4)
          .optional(),
      }),
      _meta: { ui: { resourceUri: cardUri } },
    },
    async (args) => ok(`Rendered card "${args.title}" for the user.`, { kind: "card", ...args }),
  );

  // ---------- 3. Free-form HTML ----------
  const htmlUri = addView(server, "html", {
    csp: { resourceDomains: CDN_DOMAINS, connectDomains: CDN_DOMAINS },
  });
  registerAppTool(
    server,
    "render_html",
    {
      title: "Render HTML",
      description:
        "FALLBACK ONLY — use render_chart for data and render_card for structured info first. Renders a free-form interactive HTML/CSS/JS interface inline in a sandbox — diagrams, simulations, mini apps, " +
        "custom visualizations (SVG, Canvas, D3, three.js). Provide a body fragment or full document. " +
        "Scripts may be loaded only from cdn.jsdelivr.net, unpkg.com, cdnjs.cloudflare.com or esm.sh; no other network access. " +
        "Inside scripts, call window.genui.send('text') to send a message back to Claude.",
      inputSchema: z.object({
        title: z.string().optional(),
        html: z.string().describe("HTML to render (inline <style> and <script> allowed)"),
        height: z.number().int().min(100).max(1600).optional().describe("Preferred height in px"),
      }),
      _meta: { ui: { resourceUri: htmlUri } },
    },
    async (args) => ok(`Rendered HTML view${args.title ? ` "${args.title}"` : ""} for the user.`, { kind: "html", ...args }),
  );

  return server;
}

await createServer().connect(new StdioServerTransport());
