// 그래프 (외부 라이브러리 없이 SVG로 그립니다)
const e = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const PHASE_COLORS = ["#5B8C7A", "#4F7CAC", "#C07A3A", "#8A6BB0"];
export const SERIES = ["#2F6B5E", "#D98C4A", "#4F7CAC", "#8A6BB0", "#B4556B", "#6E8B3D"];

// 진행 고리
export function ring(pct, big, small, color = "#2F6B5E", size = 104) {
  const r = 46, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
  return `<svg class="ring" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="${e(big)} ${e(small)}">
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="#E9E3D8" stroke-width="12"/>
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 60 60)"/>
    <text x="60" y="60" text-anchor="middle" font-size="24" font-weight="800" fill="#2B2A28">${e(big)}</text>
    <text x="60" y="80" text-anchor="middle" font-size="11" fill="#7A746A">${e(small)}</text></svg>`;
}

// 52주 단계 띠 (현재 주차 표시)
export function phaseStrip(week, names) {
  const W = 340, cell = W / 52;
  const segs = Array.from({ length: 52 }, (_, i) => {
    const ph = Math.floor(i / 13), done = i + 1 < week;
    return `<rect x="${(i * cell).toFixed(2)}" y="14" width="${(cell - 1).toFixed(2)}" height="16" rx="2" fill="${PHASE_COLORS[ph]}" opacity="${done ? 1 : 0.28}"/>`;
  }).join("");
  const mark = week >= 1 && week <= 52 ? `<path d="M${((week - 0.5) * cell).toFixed(1)} 12 l-5 -8 h10 z" fill="#2B2A28"/>` : "";
  const labels = (names || []).map((n, i) => `<text x="${(i * 13 * cell + 2).toFixed(1)}" y="46" font-size="10" fill="${PHASE_COLORS[i]}" font-weight="700">${i + 1}단계</text>`).join("");
  return `<svg viewBox="0 0 ${W} 52" width="100%" role="img" aria-label="52주 진행">${segs}${mark}${labels}</svg>`;
}

// 가로 막대 (0~1)
export function hbars(rows) {
  if (!rows.length) return '<p class="muted">자료가 아직 없어요.</p>';
  return `<div class="hbars">${rows.map(r => `<div class="hb"><span class="hl">${e(r.label)}</span><span class="ht"><i style="width:${Math.round(Math.max(0, Math.min(1, r.value)) * 100)}%;background:${r.color || "#2F6B5E"}"></i></span><b>${e(r.text)}</b></div>`).join("")}</div>`;
}

// 꺾은선 (평가 시점별 점수)
export function lineChart({ labels, series, max, bands = [], height = 180 }) {
  const W = 340, H = height, L = 30, R = 26, T = 12, B = 26, iw = W - L - R, ih = H - T - B;
  const x = i => L + (labels.length === 1 ? iw / 2 : (iw * i) / (labels.length - 1));
  const y = v => T + ih - (ih * v) / max;
  const bandRects = bands.map(([a, b, col, name]) => `<rect x="${L}" y="${y(b).toFixed(1)}" width="${iw}" height="${(y(a) - y(b)).toFixed(1)}" fill="${col}" opacity=".35"/><text x="${W - R + 2}" y="${(y(b) + 11).toFixed(1)}" text-anchor="start" font-size="9" fill="#7A746A">${e(name)}</text>`).join("");
  const ticks = [0, Math.round(max / 2), max].map(v => `<text x="${L - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="#7A746A">${v}</text><line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#E4DED3"/>`).join("");
  const xl = labels.map((l, i) => `<text x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#7A746A">${e(l)}</text>`).join("");
  const lines = series.map(s => {
    const pts = s.values.map((v, i) => v == null ? null : [x(i), y(v), v]).filter(Boolean);
    const path = pts.length > 1 ? `<polyline points="${pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round"/>` : "";
    return path + pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4.5" fill="#fff" stroke="${s.color}" stroke-width="2.5"><title>${e(s.name)} ${p[2]}</title></circle>`).join("");
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img">${bandRects}${ticks}${xl}${lines}</svg>${legend(series)}`;
}

// 방사형 (가족기능 10문항, 1~5)
export function radar({ labels, series, max = 5, size = 300 }) {
  const C = size / 2, R = C - 46, n = labels.length;
  const pt = (i, v) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / n, r = (R * v) / max; return [C + r * Math.cos(a), C + r * Math.sin(a)]; };
  const grid = [1, 2, 3, 4, 5].map(l => `<polygon points="${labels.map((_, i) => pt(i, l).map(v => v.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="#E4DED3"/>`).join("");
  const axes = labels.map((lb, i) => { const [x2, y2] = pt(i, max), [tx, ty] = pt(i, max + 0.9); return `<line x1="${C}" y1="${C}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#E4DED3"/><text x="${tx.toFixed(1)}" y="${(ty + 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="#5F5A52">${e(lb)}</text>`; }).join("");
  const polys = series.map(s => `<polygon points="${s.values.map((v, i) => pt(i, v || 0).map(q => q.toFixed(1)).join(",")).join(" ")}" fill="${s.color}" fill-opacity=".16" stroke="${s.color}" stroke-width="2"/>`).join("");
  return `<svg viewBox="0 0 ${size} ${size}" width="100%" style="max-width:${size}px;display:block;margin:0 auto" role="img">${grid}${axes}${polys}</svg>${legend(series)}`;
}

// 월별 세로 막대 (완료 · 불참)
export function monthCols(months) {
  if (!months.length) return '<p class="muted">자료가 아직 없어요.</p>';
  const W = 340, H = 150, T = 10, B = 24, ih = H - T - B, max = Math.max(5, ...months.map(m => m.done + m.absent));
  const bw = Math.min(22, (W - 10) / months.length - 6);
  const cols = months.map((m, i) => {
    const cx = 5 + ((W - 10) * (i + 0.5)) / months.length, hd = (ih * m.done) / max, ha = (ih * m.absent) / max;
    return `<rect x="${(cx - bw / 2).toFixed(1)}" y="${(T + ih - hd).toFixed(1)}" width="${bw.toFixed(1)}" height="${hd.toFixed(1)}" rx="3" fill="#2F6B5E"><title>${e(m.label)} 완료 ${m.done}</title></rect>
      <rect x="${(cx - bw / 2).toFixed(1)}" y="${(T + ih - hd - ha).toFixed(1)}" width="${bw.toFixed(1)}" height="${ha.toFixed(1)}" rx="3" fill="#D9776A"><title>${e(m.label)} 불참 ${m.absent}</title></rect>
      <text x="${cx.toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="#7A746A">${e(m.label)}</text>`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img"><line x1="0" x2="${W}" y1="${T + ih}" y2="${T + ih}" stroke="#E4DED3"/>${cols}</svg>${legend([{ name: "완료", color: "#2F6B5E" }, { name: "불참", color: "#D9776A" }])}`;
}

// 도넛 (구성 비율)
export function donut(parts, center, size = 120) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1, r = 44, c = 2 * Math.PI * r;
  let off = 0;
  const arcs = parts.filter(p => p.value > 0).map(p => { const len = (c * p.value) / total, s = `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${p.color}" stroke-width="16" stroke-dasharray="${len.toFixed(1)} ${(c - len).toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}" transform="rotate(-90 60 60)"/>`; off += len; return s; }).join("");
  return `<div class="donut"><svg viewBox="0 0 120 120" width="${size}" height="${size}"><circle cx="60" cy="60" r="${r}" fill="none" stroke="#EEE8DE" stroke-width="16"/>${arcs}<text x="60" y="66" text-anchor="middle" font-size="20" font-weight="800" fill="#2B2A28">${e(center)}</text></svg>${legend(parts.map(p => ({ name: `${p.name} ${p.value}`, color: p.color })))}</div>`;
}

export function legend(series) {
  return `<div class="legend">${series.map(s => `<span><i style="background:${s.color}"></i>${e(s.name)}</span>`).join("")}</div>`;
}
