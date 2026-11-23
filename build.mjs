// web/index.html 한 파일로 묶습니다: node build.mjs
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const out = await build({
  entryPoints: ["src/app.js"], bundle: true, minify: true, format: "iife", target: ["es2020"], write: false,
  legalComments: "none",
});
const js = out.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const html = readFileSync("src/index.template.html", "utf8").replace("/*BUNDLE*/", () => js);
mkdirSync("web", { recursive: true });
writeFileSync("web/index.html", html);
console.log("web/index.html", Math.round(html.length / 1024), "KB");
