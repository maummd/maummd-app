// 마음재활정원 그림 (SVG) — 씨앗에서 꽃나무까지, 가족이 함께 자라는 정원
import { PHASE_COLORS } from "./charts.js";

// 단계 아이콘: 1 씨앗 · 2 새싹 · 3 잎이 무성한 나무 · 4 꽃나무
export function phaseIcon(n, size = 44) {
  const c = PHASE_COLORS[(n - 1) % 4];
  const soil = `<ellipse cx="32" cy="54" rx="22" ry="5" fill="#E7DCCB"/>`;
  const art = {
    1: `${soil}<ellipse cx="32" cy="46" rx="8" ry="6" fill="#B08655"/><path d="M32 41 q2 -6 6 -8" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    2: `${soil}<path d="M32 54 V34" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/><path d="M32 40 q-12 -2 -14 -12 q12 0 14 12z" fill="${c}"/><path d="M32 36 q10 -4 12 -14 q-11 2 -12 14z" fill="${c}" opacity=".8"/>`,
    3: `${soil}<rect x="29.5" y="34" width="5" height="20" rx="2" fill="#9A7350"/><circle cx="32" cy="26" r="15" fill="${c}"/><circle cx="22" cy="31" r="9" fill="${c}" opacity=".85"/><circle cx="42" cy="31" r="9" fill="${c}" opacity=".85"/>`,
    4: `${soil}<rect x="29.5" y="34" width="5" height="20" rx="2" fill="#9A7350"/><circle cx="32" cy="26" r="15" fill="#7FA88F"/><circle cx="22" cy="31" r="9" fill="#7FA88F"/><circle cx="42" cy="31" r="9" fill="#7FA88F"/>${[[26, 20], [38, 22], [32, 30], [21, 32], [43, 33], [33, 15]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="${c}"/><circle cx="${x}" cy="${y}" r="1.2" fill="#FFE7A8"/>`).join("")}`,
  }[n] || "";
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">${art}</svg>`;
}

// 머리 그림: 언덕 위 나무 아래 모인 가족
export function gardenHero(h = 120) {
  return `<svg viewBox="0 0 360 130" width="100%" height="${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E4EFEB"/><stop offset="1" stop-color="#F5F2EC"/></linearGradient></defs>
    <rect width="360" height="130" fill="url(#sky)"/>
    <circle cx="300" cy="34" r="16" fill="#F6D28B" opacity=".9"/>
    <path d="M0 98 Q90 70 180 92 T360 86 V130 H0z" fill="#CFE0D6"/>
    <path d="M0 112 Q120 92 220 108 T360 104 V130 H0z" fill="#B7D0C2"/>
    <rect x="96" y="60" width="7" height="40" rx="3" fill="#9A7350"/>
    <circle cx="100" cy="50" r="24" fill="#5B8C7A"/><circle cx="82" cy="60" r="14" fill="#6E9C88"/><circle cx="118" cy="60" r="14" fill="#6E9C88"/>
    ${[[92, 44], [108, 48], [100, 58], [86, 56]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#E9A3A0"/>`).join("")}
    <g transform="translate(150 70)">
      <circle cx="10" cy="8" r="7" fill="#D98C4A"/><path d="M0 40 q0 -22 10 -22 q10 0 10 22z" fill="#D98C4A"/>
      <circle cx="34" cy="6" r="8" fill="#2F6B5E"/><path d="M22 40 q0 -24 12 -24 q12 0 12 24z" fill="#2F6B5E"/>
      <circle cx="55" cy="16" r="5.5" fill="#4F7CAC"/><path d="M48 40 q0 -16 7 -16 q7 0 7 16z" fill="#4F7CAC"/>
    </g>
    <path d="M250 104 q4 -10 8 0 M262 106 q4 -12 8 0 M240 108 q3 -8 6 0" stroke="#5B8C7A" stroke-width="2" fill="none"/>
  </svg>`;
}

// 1년 여정: 네 단계를 지나는 길과 현재 위치
export function journey(week, names) {
  const xs = [42, 132, 222, 312];
  const pos = week < 1 ? 14 : week > 52 ? 340 : 14 + (326 * (week - 0.5)) / 52;
  return `<svg viewBox="0 0 360 120" width="100%" aria-label="1년 여정">
    <path d="M10 92 C80 60, 120 108, 180 84 S290 56, 350 80" fill="none" stroke="#E0D6C6" stroke-width="10" stroke-linecap="round"/>
    <path d="M10 92 C80 60, 120 108, 180 84 S290 56, 350 80" fill="none" stroke="#2F6B5E" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(pos * 1.08).toFixed(0)} 900"/>
    ${xs.map((x, i) => `<g transform="translate(${x - 22} 6)">${phaseIcon(i + 1, 44)}</g><text x="${x}" y="114" text-anchor="middle" font-size="10" fill="${PHASE_COLORS[i]}" font-weight="700">${i + 1}단계</text>`).join("")}
    <g transform="translate(${pos.toFixed(1)} ${week < 1 ? 92 : 78})"><circle r="9" fill="#fff" stroke="#D98C4A" stroke-width="3"/><circle r="3.5" fill="#D98C4A"/></g>
  </svg>`;
}

// 프로그램 아이콘
export function programIcon(key, size = 46) {
  const bg = { std: "#E4EFEB", parent: "#FCEBD7", teen: "#E2ECF7", couple: "#F6E1E6", psyedu: "#EDE6F5", craft: "#E8F0DC", blank: "#EEE9E0" }[key] || "#EEE";
  const g = {
    leaf: `<path d="M18 44 C18 26 30 16 46 16 C46 32 36 44 18 44z" fill="#2F6B5E"/><path d="M18 44 L38 24" stroke="#E4EFEB" stroke-width="2"/>`,
    hands: `<circle cx="24" cy="22" r="7" fill="#D98C4A"/><path d="M12 46 q0 -16 12 -16 q12 0 12 16z" fill="#D98C4A"/><circle cx="42" cy="30" r="5" fill="#C07A3A"/><path d="M34 46 q0 -11 8 -11 q8 0 8 11z" fill="#C07A3A"/>`,
    wave: `<path d="M10 36 q8 -10 16 0 t16 0 t16 0" stroke="#4F7CAC" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M10 26 q8 -8 16 0 t16 0 t16 0" stroke="#4F7CAC" stroke-width="3" fill="none" opacity=".5" stroke-linecap="round"/>`,
    rings: `<circle cx="25" cy="32" r="11" stroke="#B4556B" stroke-width="4" fill="none"/><circle cx="39" cy="32" r="11" stroke="#D98C4A" stroke-width="4" fill="none"/>`,
    book: `<path d="M12 18 h18 v28 h-18z" fill="#8A6BB0"/><path d="M34 18 h18 v28 h-18z" fill="#A58BC7"/><path d="M30 18 h4 v28 h-4z" fill="#6E5592"/>`,
    bridge: `<path d="M8 40 Q32 14 56 40" stroke="#6E8B3D" stroke-width="4" fill="none"/><path d="M8 40 H56" stroke="#6E8B3D" stroke-width="4"/>${[18, 26, 32, 38, 46].map(x => `<path d="M${x} 40 V${40 - 16 * Math.sin(Math.PI * (x - 8) / 48)}" stroke="#6E8B3D" stroke-width="2"/>`).join("")}`,
    pencil: `<path d="M16 46 l4 -12 l22 -22 l8 8 l-22 22z" fill="#9A8F7E"/><path d="M16 46 l4 -12 l8 8z" fill="#E7DCCB"/>`,
  }[{ std: "leaf", parent: "hands", teen: "wave", couple: "rings", psyedu: "book", craft: "bridge", blank: "pencil" }[key] || "leaf"];
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true"><rect width="64" height="64" rx="16" fill="${bg}"/>${g}</svg>`;
}

// 빈 화면 그림
export function emptyArt(text) {
  return `<div class="empty"><svg viewBox="0 0 120 80" width="120" aria-hidden="true"><ellipse cx="60" cy="68" rx="40" ry="7" fill="#E7DCCB"/><path d="M60 68 V44" stroke="#5B8C7A" stroke-width="4" stroke-linecap="round"/><path d="M60 52 q-16 -2 -18 -16 q16 0 18 16z" fill="#5B8C7A"/><path d="M60 48 q14 -4 16 -18 q-15 2 -16 18z" fill="#7FA88F"/></svg><p class="muted">${text}</p></div>`;
}
