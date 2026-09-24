import { initTypst, render, ensureFonts } from "../dist/web.js";

const CHINESE_MD = [
  "# 每周工作汇报",
  "",
  "## 本周完成",
  "- 完成客户合同评审与签署，回款流程已启动",
  "- 上线订单导出功能，客服平均处理时长下降两成",
  "",
  "## 数据摘要",
  "| 指标 | 本周 | 环比 |",
  "| --- | --- | --- |",
  "| 新增订单 | 128 | +8% |",
  "| 客诉工单 | 7 | -13% |",
  "",
  "## 下周计划",
  "1. 启动供应商季度对账",
  "2. 完成库存预警阈值配置并验证",
  "",
  "> 本文件用于验证中文渲染：汉字、标点、表格与列表均应在 PDF 中完整显示。",
].join("\n");

function line(name, ok, detail) {
  return (ok ? "PASS" : "FAIL") + " | " + name + " | " + detail + "\n";
}

const out = [];
const t0 = performance.now();
let engine;
try {
  engine = await initTypst({ wasmUrl: "./assets/typst.wasm" });
  out.push(line("initTypst", true, ((performance.now() - t0) / 1000).toFixed(2) + "s"));
} catch (e) {
  out.push(line("initTypst", false, String(e)));
  document.getElementById("result").textContent = out.join("\n");
  throw e;
}

const t1 = performance.now();
const fonts = await ensureFonts(engine, { langs: ["zh"] });
const fontBytes = fonts.reduce((n, f) => n + f.bytes, 0);
out.push(line("ensureFonts-zh", fonts.length === 2, fonts.map((f) => f.family).join(",") + " | " + (fontBytes / 1048576).toFixed(2) + "MB"));
const latin = await ensureFonts(engine, { langs: ["en", "fr", "nl"] });
out.push(line("ensureFonts-latin-noop", latin.length === 0, "registered " + latin.length));

const t2 = performance.now();
const pdf1 = await render(engine, { template: "modern-tech", markdown: CHINESE_MD, title: "每周工作汇报", lang: "zh" });
const ok1 = pdf1[0] === 0x25 && pdf1[1] === 0x50 && pdf1[2] === 0x44 && pdf1.length > 20480;
out.push(line("render-modern-tech-zh", ok1, (pdf1.length / 1024).toFixed(1) + "KB | " + ((performance.now() - t2) / 1000).toFixed(2) + "s"));

const t3 = performance.now();
const pdf2 = await render(engine, { template: "classic-editorial", markdown: CHINESE_MD, title: "每周工作汇报", lang: "zh" });
const ok2 = pdf2[0] === 0x25 && pdf2.length > 20480;
out.push(line("render-classic-editorial-zh-same-engine", ok2, (pdf2.length / 1024).toFixed(1) + "KB | " + ((performance.now() - t3) / 1000).toFixed(2) + "s"));

let unknown = "not-thrown";
try {
  await render(engine, { template: "slides-modern", markdown: "# x" });
} catch (e) {
  unknown = e.message;
}
out.push(line("render-unknown-template-rejected", String(unknown).includes("Unknown template"), unknown));

console.log("PDF1_B64_START"); console.log(btoa(String.fromCharCode(...pdf1.slice(0, 30000)))); console.log("PDF1_B64_END"); document.title = "DONE"; throw new Error("HARDSTOP");
document.getElementById("status").textContent = allOk ? "ALL PASS" : "SOME FAILED";
const pre = document.getElementById("result");
pre.textContent = out.join("\n") + "\nSUMMARY: " + (allOk ? "PASS" : "FAIL");
