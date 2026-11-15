// Sample payloads used only when the view is opened outside a host (local preview).
export const DEMOS: Record<string, Record<string, any>> = {
  chart: {
    kind: "chart",
    title: "2026 季度营收",
    subtitle: "单位：万元 · 线上渠道 Q3 首次超过线下",
    type: "bar",
    labels: ["Q1", "Q2", "Q3", "Q4"],
    datasets: [
      { label: "线上", data: [120, 168, 240, 310] },
      { label: "线下", data: [180, 190, 205, 220] },
    ],
    unit: "万",
  },
  card: {
    kind: "card",
    icon: "🌤️",
    title: "上海 · 今日天气",
    subtitle: "11月15日 星期日",
    badge: "空气良",
    hero: { value: "18°C", caption: "多云转晴 · 体感 17°C" },
    fields: [
      { label: "湿度", value: "62%" },
      { label: "风力", value: "东北风 3级" },
      { label: "日出 / 日落", value: "06:22 / 16:55" },
      { label: "降水概率", value: "10%" },
    ],
    items: [
      { text: "适合户外跑步", checked: true },
      { text: "早晚温差大，带件外套", checked: false },
    ],
    actions: [
      { label: "看未来 7 天", prompt: "用折线图展示上海未来 7 天的最高/最低气温" },
      { label: "穿衣建议", prompt: "根据今天上海的天气给我穿衣建议" },
    ],
  },
  html: {
    kind: "html",
    title: "交互演示",
    height: 260,
    html: `<style>
  .demo{font-family:inherit;padding:16px;text-align:center}
  .demo svg{display:block;margin:0 auto}
  .demo button{margin-top:8px;padding:6px 14px;border-radius:8px;border:1px solid #ccc;cursor:pointer}
</style>
<div class="demo">
  <svg id="s" width="200" height="200" viewBox="-100 -100 200 200"></svg>
  <div>花瓣数：<input id="n" type="range" min="3" max="12" value="6"></div>
  <button onclick="genui.send('把这朵花改成动画')">让 Claude 加动画</button>
</div>
<script>
  const s = document.getElementById('s'), n = document.getElementById('n');
  function draw(){ const k=+n.value; let p='';
    for(let i=0;i<=360;i++){const t=i*Math.PI/180, r=80*Math.cos(k*t); p+=(i?'L':'M')+(r*Math.cos(t)).toFixed(1)+' '+(r*Math.sin(t)).toFixed(1);}
    s.innerHTML='<path d="'+p+'" fill="#2a78d655" stroke="#2a78d6" stroke-width="2"/>'; }
  n.oninput = draw; draw();
</script>`,
  },
};
