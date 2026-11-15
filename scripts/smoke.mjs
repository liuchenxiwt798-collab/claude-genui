import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
const c = new Client({ name: "smoke", version: "1" }, { capabilities: { extensions: { "io.modelcontextprotocol/ui": { mimeTypes: ["text/html;profile=mcp-app"] } } } });
await c.connect(new StdioClientTransport({ command: "node", args: ["server.mjs"] }));
console.log("instructions:", (c.getInstructions?.() ?? "").slice(0,60));
const { tools } = await c.listTools();
for (const t of tools) console.log("tool", t.name, JSON.stringify(t._meta));
const { resources } = await c.listResources();
for (const r of resources) {
  const res = await c.readResource({ uri: r.uri });
  const x = res.contents[0];
  console.log("res", r.uri, x.mimeType, x.text.length, x.text.match(/genui-kind" content="(\w+)/)?.[1], JSON.stringify(x._meta));
}
const out = await c.callTool({ name: "render_chart", arguments: { title: "t", type: "line", labels: ["a","b"], datasets: [{ label: "s", data: [1,2] }] } });
console.log("call", JSON.stringify(out).slice(0, 200));
const bad = await c.callTool({ name: "render_chart", arguments: { title: "t" } });
console.log("invalid ->", bad.isError, JSON.stringify(bad.content).slice(0,120));
await c.close();
