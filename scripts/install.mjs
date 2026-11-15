#!/usr/bin/env node
// Registers this MCP server in Claude Desktop's config on the current machine.
// Usage: npm run setup            (auto-detects the active Claude Desktop profile)
//        npm run setup -- --dir "<Claude Desktop userData dir>"
//        npm run setup -- --remove
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const NAME = "claude-genui";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverPath = path.join(root, "server.mjs");
const argv = process.argv.slice(2);
const flag = (f) => argv.indexOf(f);

function appSupport() {
  if (process.platform === "darwin") return path.join(os.homedir(), "Library", "Application Support");
  if (process.platform === "win32") return process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
  return process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
}

// Claude Desktop keeps one userData dir per profile: "Claude" normally, "Claude-*-3p" in
// third-party/gateway mode. Pick the most recently used one that has a config file.
function findProfileDirs() {
  if (flag("--dir") >= 0) return [path.resolve(argv[flag("--dir") + 1])];
  const base = appSupport();
  if (!fs.existsSync(base)) return [];
  return fs
    .readdirSync(base)
    .filter((d) => /^Claude(-.+)?$/.test(d))
    .map((d) => path.join(base, d))
    .filter((d) => fs.existsSync(path.join(d, "claude_desktop_config.json")))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

// Prefer the stable `node` on PATH (e.g. /opt/homebrew/bin/node) over process.execPath,
// which for Homebrew is a versioned Cellar path that breaks on `brew upgrade`.
function nodeCommand() {
  const exe = process.platform === "win32" ? "node.exe" : "node";
  for (const p of (process.env.PATH ?? "").split(path.delimiter)) {
    const candidate = path.join(p, exe);
    if (p && fs.existsSync(candidate) && !candidate.includes("node_modules")) return candidate;
  }
  return process.execPath;
}

const dirs = findProfileDirs();
if (!fs.existsSync(path.join(root, "dist", "view.html")) && flag("--remove") < 0) {
  console.error("dist/view.html is missing — run `npm install` (or `npm run build`) first.");
  process.exit(1);
}
if (dirs.length === 0) {
  console.error(
    "No Claude Desktop config found. Open Claude Desktop once, or pass --dir <its userData folder>.\n" +
      `Looked in: ${appSupport()}`,
  );
  process.exit(1);
}

// Register in every profile found: harmless for unused ones, and covers switching modes.
for (const dir of dirs) {
  const file = path.join(dir, "claude_desktop_config.json");
  const cfg = JSON.parse(fs.readFileSync(file, "utf8") || "{}");
  fs.copyFileSync(file, `${file}.bak-genui`);
  cfg.mcpServers ??= {};
  if (flag("--remove") >= 0) delete cfg.mcpServers[NAME];
  else cfg.mcpServers[NAME] = { command: nodeCommand(), args: [serverPath] };
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2));
  console.log(`${flag("--remove") >= 0 ? "Removed from" : "Registered in"} ${file}`);
}
console.log("\nFully quit Claude Desktop (⌘Q / File → Exit) and reopen it to apply.");
