# Claude GenUI

让 Claude Desktop 在对话里直接生成**原生的交互式可视化内容**，而不是输出一段 HTML 代码或生成 Artifact。实现上是一个 [MCP Apps](https://github.com/modelcontextprotocol/ext-apps) 服务器，采用的标准和 CopilotKit「开放式生成式 UI」相同。

| 工具 | 作用 |
|---|---|
| `render_chart` | 交互式图表：柱状、横向柱状、折线、面积、饼图、环形、雷达、散点。支持悬停提示、数据表视图和深浅色主题 |
| `render_card` | 信息卡片：大数字、字段网格、清单、图片。按钮点击后会把预设提示词发回给 Claude |
| `render_html` | 兜底用，渲染任意 HTML/CSS/JS（沙箱中运行）。可以从 jsdelivr / unpkg / cdnjs / esm.sh 加载库；脚本里调用 `genui.send('...')` 可给 Claude 发消息 |

服务器自带使用说明，会引导 Claude 按「图表 → 卡片 → HTML」的优先级选用工具。

## 在新电脑上安装

需要 Node.js 20 或更高版本，以及 Claude Desktop。

```bash
git clone https://github.com/liuchenxiwt798-collab/claude-genui.git
cd claude-genui
npm install        # 安装依赖，并自动构建 dist/view.html
npm run setup      # 把服务器注册到 Claude Desktop 配置中
```

然后**完全退出** Claude Desktop（macOS 按 ⌘Q，Windows 选「文件 → 退出」），再重新打开。只关窗口不会生效。

可以这样试：
- 「用图表对比北上广深 2024 年 GDP」
- 「做一张东京三日游行程卡片」
- 「用 HTML 做一个可调频率的正弦波动画」

### `npm run setup` 做了什么
- Claude Desktop 每个使用模式都有自己的配置目录，普通模式是 `Claude/`，第三方 gateway 模式是 `Claude-*-3p/`。脚本会找出所有带 `claude_desktop_config.json` 的目录，在每个目录里登记 `claude-genui`。修改前会备份为 `.bak-genui`。
- 登记的是当前 `node` 的路径和本目录下 `server.mjs` 的绝对路径。**移动项目目录后需要重新运行一次。**
- 手动指定目录：`npm run setup -- --dir "<配置目录>"`
- 卸载：`npm run setup -- --remove`

## 排错
- 服务器日志在 `~/Library/Logs/Claude/mcp-server-claude-genui.log`（macOS）。没有这个文件，说明 Claude Desktop 没有加载这个服务器：检查配置目录对不对，以及是否用 ⌘Q 完全退出过。
- Claude 还是输出 HTML：在提问里加一句「用可视化工具展示」。

## 开发
- `npm run dev`：本地预览视图，地址 `http://localhost:5173/view.html?demo=chart|card|html`，示例数据在 `src/demos.ts`
- `npm test`：通过 stdio 对 MCP 服务器做协议冒烟测试
- 修改 `src/` 后需要重新执行 `npm run build`，再用 ⌘Q 重启 Claude Desktop

## 结构
- `server.mjs`：MCP 服务器（3 个工具，对应 3 个 `ui://` 资源）
- `view.html` + `src/view.ts` + `src/view.css`：单文件视图，经 Vite 打包后内联 Chart.js
- `scripts/install.mjs`：注册到 Claude Desktop
- `scripts/smoke.mjs`：协议冒烟测试

## License
MIT
