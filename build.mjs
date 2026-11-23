// web/index.html 한 파일로 묶습니다: node build.mjs
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const out = await build({
  entryPoints: ["src/app.js"], bundle: true, minify: true, format: "iife", target: ["es2020"], write: false,
  legalComments: "none",
  // DEMO=1 이면 Firebase 없이 이 기기에만 저장하는 체험판으로 묶습니다 (화면 확인용).
  plugins: process.env.DEMO ? [{ name: "demo", setup(bld) { bld.onLoad({ filter: /config\.js$/ }, () => ({ contents: "export const FIREBASE_CONFIG = null; export const COUNSELOR_EMAILS = [];", loader: "js" })); } }] : [],
});
const js = out.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const html = readFileSync("src/index.template.html", "utf8").replace("/*BUNDLE*/", () => js);
mkdirSync("web", { recursive: true });
const outFile = process.env.DEMO ? "web/demo.html" : "web/index.html";
writeFileSync(outFile, html);
console.log(outFile, Math.round(html.length / 1024), "KB");
