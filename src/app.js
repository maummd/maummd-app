import { CURRICULUM, PHASES, EVAL_POINTS, PHQ9_BANDS, GAD7_BANDS, FAM_ITEMS, HW_TYPES } from "./curriculum.js";
import { firebaseStore, localStore } from "./store.js";
import { FIREBASE_CONFIG, COUNSELOR_EMAIL } from "./config.js";

// ---------- 기본 도구 ----------
const $ = s => document.querySelector(s);
const app = () => $("#app");
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const DAY = 864e5;
const todayIso = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const days = iso => Date.parse(iso + "T00:00:00Z") / DAY;
const addDays = (iso, n) => new Date((days(iso) + n) * DAY).toISOString().slice(0, 10);
const weekday = iso => new Date(iso + "T00:00:00Z").getUTCDay();
const fmt = iso => { if (!iso) return ""; const [y, m, d] = iso.split("-"); return `${y}. ${Number(m)}. ${Number(d)}.`; };
const fmtShort = iso => { if (!iso) return ""; const [, m, d] = iso.split("-"); return `${Number(m)}/${Number(d)}`; };
const sessionDate = (fam, w) => addDays(fam.startDate, 7 * (w - 1));
const weekOf = (fam, iso = todayIso()) => Math.floor((days(iso) - days(fam.startDate)) / 7) + 1;
const nextSunday = () => { const t = todayIso(); return addDays(t, (7 - weekday(t)) % 7); };
const phaseOf = w => PHASES.find(p => w >= p.weeks[0] && w <= p.weeks[1]) || PHASES[3];
const band = (bands, total) => (bands.find(([a, b]) => total >= a && total <= b) || [0, 0, ""])[2];
const rid = (n = 8) => { const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", r = new Uint32Array(n); crypto.getRandomValues(r); return Array.from(r, x => a[x % a.length]).join(""); };
const memberName = (fam, id) => ((fam.members || []).find(m => m.id === id) || {}).alias || "구성원";

let toastT;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2400); }
async function act(fn, ok) {
  try { await fn(); if (ok) toast(ok); return true; }
  catch (e) { console.error(e); toast(e && e.code === "permission-denied" ? "권한이 없어요 (로그인 상태를 확인해 주세요)" : (e && e.message) || "저장하지 못했어요"); return false; }
}

// ---------- 상태 ----------
const store = FIREBASE_CONFIG ? firebaseStore(FIREBASE_CONFIG, COUNSELOR_EMAIL) : localStore();
const S = { user: null, families: [], fam: {}, subs: [], famSubs: {}, route: "" };
function clearSubs() { S.subs.forEach(u => u && u()); S.subs = []; }
function famData(fid) { return S.fam[fid] || (S.fam[fid] = { info: null, sessions: [], homework: [], evals: [], notes: {}, invites: [] }); }

// 가족별 구독 (상담자: 전체, 내담자: 자기 가족 · 자기 자료)
function watchFamily(fid) {
  if (S.famSubs[fid]) return;
  const d = famData(fid), u = [], r = () => renderSafe();
  u.push(store.listenDoc("families/" + fid, v => { d.info = v; r(); }));
  u.push(store.listen(`families/${fid}/sessions`, null, v => { d.sessions = v.sort((a, b) => a.week - b.week); r(); }));
  if (S.user.role === "counselor") {
    u.push(store.listen(`families/${fid}/homework`, null, v => { d.homework = v; r(); }));
    u.push(store.listen(`families/${fid}/evals`, null, v => { d.evals = v; r(); }));
    u.push(store.listen(`families/${fid}/notes`, null, v => { d.notes = Object.fromEntries(v.map(n => [n.id, n])); r(); }));
    u.push(store.listen("invites", [["familyId", fid]], v => { d.invites = v; r(); }));
  } else {
    const mid = S.user.profile.memberId;
    u.push(store.listen(`families/${fid}/homework`, [["forMember", mid]], v => { d.homework = v; r(); }));
    u.push(store.listen(`families/${fid}/evals`, [["memberId", mid], ["kind", "FAM"]], v => { d.evals = v; r(); }));
  }
  S.famSubs[fid] = u;
}
function stopAll() { Object.values(S.famSubs).flat().forEach(f => f && f()); S.famSubs = {}; S.fam = {}; clearSubs(); }

// ---------- 화면 틀 ----------
function shell(title, body, opts = {}) {
  const demo = store.mode === "demo" ? `<div class="demo">체험 모드 · 이 기기에만 저장돼요
      <span><button data-role="counselor" class="${S.user && S.user.role === "counselor" ? "on" : ""}">상담자</button><button data-role="client" class="${S.user && S.user.role !== "counselor" ? "on" : ""}">내담자</button><button data-reset>초기화</button></span></div>` : "";
  const back = opts.back ? `<a class="back" href="${opts.back}">‹</a>` : "";
  const nav = S.user && S.user.role === "counselor"
    ? `<nav><a href="#home" class="${S.route.startsWith("home") ? "on" : ""}">🏠<span>홈</span></a><a href="#families" class="${S.route.startsWith("fam") ? "on" : ""}">👨‍👩‍👧<span>가족</span></a><a href="#account" class="${S.route === "account" ? "on" : ""}">⚙️<span>설정</span></a></nav>`
    : S.user && S.user.role === "client"
      ? `<nav><a href="#home" class="${S.route === "home" ? "on" : ""}">🏠<span>홈</span></a><a href="#sched" class="${S.route === "sched" ? "on" : ""}">📅<span>일정</span></a><a href="#account" class="${S.route === "account" ? "on" : ""}">⚙️<span>설정</span></a></nav>` : "";
  app().innerHTML = `${demo}<header>${back}<div><p class="brand">마음엠디 · 마음재활정원</p><h1>${esc(title)}</h1></div></header><main>${body}</main>${nav}`;
  document.querySelectorAll("[data-role]").forEach(b => b.onclick = () => { stopAll(); store.switchRole(b.dataset.role); location.hash = "#home"; });
  const rs = document.querySelector("[data-reset]");
  if (rs) rs.onclick = () => { stopAll(); store.resetDemo(); toast("체험 데이터를 지웠어요"); location.hash = "#home"; render(); };
}

// ---------- 로그인 · 가입 ----------
function renderAuth() {
  shell("로그인", `<div class="card">
    <p class="muted">상담자와 가족 구성원 모두 이메일로 로그인해요.</p>
    <label>이메일<input id="em" type="email" autocomplete="username"></label>
    <label>비밀번호<input id="pw" type="password" autocomplete="current-password" minlength="8"></label>
    <div class="row"><button class="primary" id="login">로그인</button><button id="signup">처음이에요 (가입)</button></div>
    <button class="link" id="forgot">비밀번호를 잊었어요</button></div>`);
  const em = () => $("#em").value.trim(), pw = () => $("#pw").value;
  $("#login").onclick = () => act(() => store.signIn(em(), pw()));
  $("#signup").onclick = () => { if (pw().length < 8) return toast("비밀번호는 8자 이상으로 정해 주세요"); act(() => store.signUp(em(), pw()), "가입했어요"); };
  $("#forgot").onclick = () => { if (!em()) return toast("이메일을 먼저 입력해 주세요"); act(() => store.reset(em()), "비밀번호 재설정 메일을 보냈어요"); };
}
function renderJoin() {
  shell("가족 연결하기", `<div class="card">
    <p>상담 선생님께 받은 <b>초대 코드</b>를 입력해 주세요. 코드는 가족 구성원마다 다릅니다.</p>
    <label>초대 코드<input id="code" maxlength="8" style="text-transform:uppercase" placeholder="예: 7KQ2M8XA"></label>
    <label>앱에서 쓸 이름 (별칭)<input id="alias" maxlength="12" placeholder="예: 엄마, 큰딸"></label>
    <button class="primary" id="join">연결하기</button>
    ${store.mode === "demo" ? '<p class="muted">체험 모드: 상담자 화면 → 가족 → 정보 탭에서 초대 코드를 확인할 수 있어요.</p>' : ""}
    <button class="link" id="out">로그아웃</button></div>`);
  $("#join").onclick = () => {
    const code = $("#code").value.trim().toUpperCase(), alias = $("#alias").value.trim();
    if (!/^[A-Z0-9]{8}$/.test(code)) return toast("초대 코드 8자리를 확인해 주세요");
    if (!alias) return toast("별칭을 입력해 주세요");
    act(async () => { await store.joinWithInvite(S.user.uid, code, alias); location.reload(); }, "가족과 연결됐어요");
  };
  $("#out").onclick = () => store.signOut();
}

// ---------- 상담자: 홈 ----------
function alertsFor(fid) {
  const d = famData(fid), fam = d.info, out = [];
  if (!fam) return out;
  const w = weekOf(fam);
  // PHQ-9 9번 문항
  d.evals.filter(e => e.kind === "PHQ9" && Array.isArray(e.items) && Number(e.items[8]) > 0)
    .forEach(e => out.push({ lv: "red", t: `${memberName(fam, e.memberId)} PHQ-9 9번 문항 응답 (${(EVAL_POINTS.find(p => p.key === e.point) || {}).name || ""}) — 안전 평가 확인`, href: `#fam/${fid}/eval` }));
  const waiting = d.homework.filter(h => h.submission && !h.feedback);
  if (waiting.length) out.push({ lv: "amber", t: `피드백 기다리는 과제 ${waiting.length}건`, href: `#fam/${fid}/hw` });
  EVAL_POINTS.forEach(p => {
    if (w >= p.week && w <= 53) {
      const need = (fam.members || []).filter(m => !d.evals.some(e => e.point === p.key && e.memberId === m.id && e.kind === "PHQ9"));
      if (need.length) out.push({ lv: "blue", t: `${p.name} 미입력 ${need.length}명`, href: `#fam/${fid}/eval` });
    }
  });
  return out;
}
function renderCounselorHome() {
  const sun = nextSunday();
  const fams = S.families.filter(f => f.status !== "closed");
  fams.forEach(f => watchFamily(f.id));
  const rows = fams.map(f => {
    const d = famData(f.id), fam = d.info || f, w = Math.floor((days(sun) - days(fam.startDate)) / 7) + 1;
    const s = d.sessions.find(x => x.week === w);
    return { f, fam, w, s };
  }).filter(x => x.w >= 1 && x.w <= 52);
  const alerts = fams.flatMap(f => alertsFor(f.id).map(a => ({ ...a, fam: (famData(f.id).info || f).alias })));
  const verify = store.mode === "firebase" && !S.user.verified ? `<div class="card warn">상담자 이메일 인증이 필요해요. 인증 전에는 기록을 저장할 수 없어요. <button id="vf">인증 메일 보내기</button></div>` : "";
  shell("상담자 홈", `${verify}
    <div class="card"><div class="spread"><h2>이번 일요일 ${fmt(sun)}</h2><span class="pill">${rows.length}가족</span></div>
      ${rows.length ? rows.map(({ f, fam, w, s }) => `<a class="item" href="#fam/${f.id}/s/${w}"><span class="dot" style="background:${phaseOf(w).color}"></span><div><b>${esc(fam.alias)}</b> · ${w}주차<div class="muted">${esc(s ? s.topic : "")}</div></div><span class="go">›</span></a>`).join("") : '<p class="muted">이번 일요일에 예정된 회기가 없어요.</p>'}
    </div>
    <div class="card"><h2>확인할 일</h2>
      ${alerts.length ? alerts.map(a => `<a class="alert ${a.lv}" href="${a.href}"><b>${esc(a.fam)}</b> ${esc(a.t)}</a>`).join("") : '<p class="muted">지금 확인할 일이 없어요.</p>'}
    </div>
    <a class="btn primary block" href="#newfam">+ 새 가족 등록</a>`);
  const vf = $("#vf"); if (vf) vf.onclick = () => act(() => store.verify(), "인증 메일을 보냈어요. 메일의 링크를 누른 뒤 다시 로그인해 주세요");
}
function renderFamilies() {
  S.families.forEach(f => watchFamily(f.id));
  const list = S.families.slice().sort((a, b) => (a.status === "closed") - (b.status === "closed") || String(b.startDate).localeCompare(String(a.startDate)));
  shell("가족 목록", `<div class="card">${list.length ? list.map(f => {
    const fam = famData(f.id).info || f, w = weekOf(fam);
    return `<a class="item" href="#fam/${f.id}"><span class="dot" style="background:${w >= 1 && w <= 52 ? phaseOf(w).color : "#bbb"}"></span><div><b>${esc(fam.alias)}</b>${fam.status === "closed" ? ' <span class="pill">종결</span>' : ""}<div class="muted">시작 ${fmt(fam.startDate)} · ${w < 1 ? "시작 전" : w > 52 ? "1년 과정 종료" : w + "주차"} · ${(fam.members || []).length}명</div></div><span class="go">›</span></a>`;
  }).join("") : '<p class="muted">등록된 가족이 없어요.</p>'}</div><a class="btn primary block" href="#newfam">+ 새 가족 등록</a>`);
}

// ---------- 상담자: 새 가족 ----------
function renderNewFamily() {
  const sun = nextSunday();
  shell("새 가족 등록", `<div class="card">
    <label>가족 별칭 (실명 대신)<input id="alias" maxlength="20" placeholder="예: 정○○ 가족, A가족"></label>
    <label>첫 회기 날짜 (일요일)<input id="start" type="date" value="${sun}"></label>
    <h3>구성원 (최대 6명)</h3><p class="muted">별칭과 이번 상담의 초점을 적어 주세요.</p>
    <div id="mems"></div><button id="addm">+ 구성원 추가</button></div>
    <button class="primary block" id="save">등록하고 52주 회기표 만들기</button>`, { back: "#families" });
  const mems = [{ alias: "", focus: "인지 개선" }, { alias: "", focus: "인지 개선" }];
  const draw = () => {
    $("#mems").innerHTML = mems.map((m, i) => `<div class="row mem"><input data-i="${i}" data-f="alias" maxlength="12" placeholder="별칭 (예: 정○연)" value="${esc(m.alias)}"><select data-i="${i}" data-f="focus">${["인지 개선", "행동 개선", "정서 조절", "의사소통", "기타"].map(o => `<option${o === m.focus ? " selected" : ""}>${o}</option>`).join("")}</select><button data-del="${i}" aria-label="삭제">✕</button></div>`).join("");
    document.querySelectorAll("#mems [data-f]").forEach(el => el.oninput = el.onchange = () => { mems[el.dataset.i][el.dataset.f] = el.value; });
    document.querySelectorAll("#mems [data-del]").forEach(b => b.onclick = () => { mems.splice(Number(b.dataset.del), 1); draw(); });
    $("#addm").disabled = mems.length >= 6;
  };
  draw();
  $("#addm").onclick = () => { if (mems.length < 6) { mems.push({ alias: "", focus: "인지 개선" }); draw(); } };
  $("#save").onclick = async () => {
    const alias = $("#alias").value.trim(), start = $("#start").value;
    const members = mems.filter(m => m.alias.trim()).map((m, i) => ({ id: "m" + (i + 1) + rid(3).toLowerCase(), alias: m.alias.trim(), focus: m.focus }));
    if (!alias) return toast("가족 별칭을 입력해 주세요");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || weekday(start) !== 0) return toast("첫 회기는 일요일 날짜로 골라 주세요");
    if (!members.length) return toast("구성원을 한 명 이상 입력해 주세요");
    const fid = "f" + Date.now().toString(36) + rid(4).toLowerCase();
    $("#save").disabled = true; $("#save").textContent = "회기표 만드는 중…";
    const ok = await act(async () => {
      await store.put("families/" + fid, { alias, startDate: start, members, status: "active", createdAt: new Date().toISOString() });
      for (let w = 1; w <= 52; w++) {
        const [topic, goal, hwTitle, hwType] = CURRICULUM[w - 1];
        await store.put(`families/${fid}/sessions/${w}`, { week: w, date: sessionDate({ startDate: start }, w), topic, goal, hwTitle, hwType, status: "planned", attendance: [] });
      }
      for (const m of members) await store.put("invites/" + rid(), { familyId: fid, memberId: m.id, active: true, createdAt: new Date().toISOString() });
    }, "가족을 등록했어요");
    if (ok) location.hash = `#fam/${fid}`; else { $("#save").disabled = false; $("#save").textContent = "등록하고 52주 회기표 만들기"; }
  };
}

// ---------- 상담자: 가족 상세 ----------
function famTabs(fid, tab) {
  return `<div class="tabs">${[["", "회기"], ["hw", "과제"], ["eval", "평가"], ["info", "정보"]].map(([k, n]) => `<a href="#fam/${fid}${k ? "/" + k : ""}" class="${tab === k ? "on" : ""}">${n}</a>`).join("")}</div>`;
}
function renderFamily(fid, tab) {
  watchFamily(fid);
  const d = famData(fid), fam = d.info;
  if (!fam) return shell("불러오는 중", '<p class="muted">가족 정보를 불러오고 있어요…</p>', { back: "#families" });
  const w = weekOf(fam);
  let body = "";
  if (tab === "") {
    body = PHASES.map(p => `<div class="card"><h3 style="color:${p.color}">${p.name}</h3>${d.sessions.filter(s => s.week >= p.weeks[0] && s.week <= p.weeks[1]).map(s => `<a class="item ${s.week === w ? "now" : ""}" href="#fam/${fid}/s/${s.week}"><span class="wk">${s.week}</span><div><b>${esc(s.topic)}</b><div class="muted">${fmtShort(s.date)} (일)${d.notes[String(s.week)] ? " · 기록 있음" : ""}</div></div><span class="st ${s.status}">${({ planned: "예정", done: "완료", absent: "불참", moved: "변경" })[s.status] || ""}</span></a>`).join("")}</div>`).join("");
  } else if (tab === "hw") {
    const hw = d.homework.slice().sort((a, b) => b.week - a.week || String(b.assignedAt).localeCompare(String(a.assignedAt)));
    body = `<div class="card"><h2>과제 ${hw.length}건</h2>${hw.length ? hw.map(h => `<a class="item" href="#fam/${fid}/h/${h.id}"><span class="wk">${h.week}</span><div><b>${esc(h.title)}</b><div class="muted">${esc(memberName(fam, h.forMember))} · ${HW_TYPES[h.type] ? HW_TYPES[h.type].name : ""}</div></div><span class="st ${h.feedback ? "done" : h.submission ? "moved" : "planned"}">${h.feedback ? "피드백 완료" : h.submission ? "제출됨" : "미제출"}</span></a>`).join("") : '<p class="muted">회기 화면에서 과제를 낼 수 있어요.</p>'}</div>`;
  } else if (tab === "eval") {
    body = evalSummary(fam, d) + `<div class="card"><h2>평가 입력</h2><p class="muted">PHQ-9 · GAD-7은 종이 검사지로 실시한 뒤 문항별 점수를 입력하세요.</p>${EVAL_POINTS.map(p => `<h3>${p.name} <span class="muted">(${p.week}주차 · ${fmtShort(sessionDate(fam, p.week))})</span></h3><div class="row wrap">${(fam.members || []).map(m => `<a class="btn small" href="#fam/${fid}/e/${p.key}/${m.id}">${esc(m.alias)}</a>`).join("")}</div>`).join("")}</div>`;
  } else if (tab === "info") {
    body = familyInfo(fid, fam, d);
  }
  shell(fam.alias, famTabs(fid, tab) + `<p class="muted center">시작 ${fmt(fam.startDate)} · ${w < 1 ? "시작 전" : w > 52 ? "1년 과정 종료" : `지금 ${w}주차`}</p>` + body, { back: "#families" });
  if (tab === "info") bindFamilyInfo(fid, fam, d);
}
function evalSummary(fam, d) {
  const cell = (m, p, kind, bands) => {
    const e = d.evals.find(x => x.kind === kind && x.point === p.key && x.memberId === m.id);
    if (!e) return "<td class='muted'>-</td>";
    return `<td><b>${e.total}</b><div class="muted">${kind === "FAM" ? "평균 " + Number(e.avg).toFixed(1) : band(bands, e.total)}</div>${kind === "PHQ9" && Number(e.items[8]) > 0 ? '<div class="red">9번 응답</div>' : ""}</td>`;
  };
  const table = (kind, label, bands) => `<h3>${label}</h3><table><tr><th>구성원</th>${EVAL_POINTS.map(p => `<th>${p.name.replace(" 평가", "")}</th>`).join("")}</tr>${(fam.members || []).map(m => `<tr><td>${esc(m.alias)}</td>${EVAL_POINTS.map(p => cell(m, p, kind, bands)).join("")}</tr>`).join("")}</table>`;
  return `<div class="card"><h2>평가 결과</h2>${table("PHQ9", "PHQ-9 (우울, 0~27)", PHQ9_BANDS)}${table("GAD7", "GAD-7 (불안, 0~21)", GAD7_BANDS)}${table("FAM", "가족기능 자체 평가 (10~50, 높을수록 좋음)")}</div>`;
}
function completion(fam, d) {
  const done = d.sessions.filter(s => s.status === "done").length;
  const start = fam.startDate, end = todayIso() < addDays(start, 364) ? todayIso() : addDays(start, 364);
  const months = []; let y = Number(start.slice(0, 4)), m = Number(start.slice(5, 7));
  while (`${y}-${String(m).padStart(2, "0")}` <= end.slice(0, 7)) { months.push(`${y}-${String(m).padStart(2, "0")}`); m++; if (m > 12) { m = 1; y++; } }
  const per = (fam.members || []).map(mem => {
    const subs = d.homework.filter(h => h.forMember === mem.id && h.submission && h.submission.submittedAt);
    const met = months.filter(mo => subs.some(h => String(h.submission.submittedAt).slice(0, 7) === mo)).length;
    return { mem, met, total: months.length };
  });
  return { done, per, ok: done >= 16 && per.every(p => p.met >= p.total) };
}
function familyInfo(fid, fam, d) {
  const c = completion(fam, d);
  return `<div class="card"><h2>구성원과 초대 코드</h2><p class="muted">구성원마다 코드를 전달하면, 그 사람만 자기 과제와 일정을 볼 수 있어요.</p>
    ${(fam.members || []).map(m => { const inv = d.invites.find(i => i.memberId === m.id && i.active); return `<div class="item"><div><b>${esc(m.alias)}</b> <span class="pill">${esc(m.focus)}</span><div class="muted">초대 코드: <b class="code">${inv ? esc(inv.id) : "없음"}</b></div></div>${inv ? `<button data-copy="${esc(inv.id)}">복사</button>` : `<button data-newinv="${esc(m.id)}">발급</button>`}</div>`; }).join("")}</div>
    <div class="card"><h2>수료 조건</h2><p class="muted">16주 이상 진행 + 구성원별 매월 과제 1회 이상 제출 (계약서 제3조 5항)</p>
      <div class="item"><div>완료한 회기</div><b>${c.done} / 16주 ${c.done >= 16 ? "✓" : ""}</b></div>
      ${c.per.map(p => `<div class="item"><div>${esc(p.mem.alias)} 과제 제출한 달</div><b>${p.met} / ${p.total}개월 ${p.met >= p.total && p.total ? "✓" : ""}</b></div>`).join("")}
      <p class="${c.ok ? "green" : "muted"}">${c.ok ? "수료 조건을 충족했어요." : "아직 수료 조건을 채우는 중이에요."}</p></div>
    <div class="card"><h2>가족 관리</h2><div class="row wrap"><button id="close">${fam.status === "closed" ? "종결 취소" : "종결 처리"}</button></div></div>`;
}
function bindFamilyInfo(fid, fam) {
  document.querySelectorAll("[data-copy]").forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.copy); toast("초대 코드를 복사했어요"); } catch (e) { toast("코드를 길게 눌러 복사해 주세요"); } });
  document.querySelectorAll("[data-newinv]").forEach(b => b.onclick = () => act(() => store.put("invites/" + rid(), { familyId: fid, memberId: b.dataset.newinv, active: true, createdAt: new Date().toISOString() }), "초대 코드를 발급했어요"));
  $("#close").onclick = () => act(() => store.set("families/" + fid, { status: fam.status === "closed" ? "active" : "closed" }), "저장했어요");
}

// ---------- 상담자: 회기 상세 ----------
function renderSession(fid, w) {
  watchFamily(fid);
  const d = famData(fid), fam = d.info, s = d.sessions.find(x => x.week === w);
  if (!fam || !s) return shell("불러오는 중", '<p class="muted">회기를 불러오고 있어요…</p>', { back: `#fam/${fid}` });
  const n = d.notes[String(w)] || {}, p = phaseOf(w);
  const evalP = EVAL_POINTS.find(e => e.week === w);
  shell(`${w}주차 · ${fmtShort(s.date)} (일)`, `
    <div class="card"><span class="pill" style="background:${p.color};color:#fff">${p.name}</span>
      ${evalP ? `<a class="alert blue" href="#fam/${fid}/eval">${evalP.name} 회기예요 — 평가 입력하기</a>` : ""}
      <label>주제<input id="topic" value="${esc(s.topic)}"></label>
      <label>회기 목표<textarea id="goal" rows="2">${esc(s.goal)}</textarea></label>
      <label>상태<select id="status">${[["planned", "예정"], ["done", "완료"], ["absent", "불참"], ["moved", "일정 변경"]].map(([k, v]) => `<option value="${k}"${s.status === k ? " selected" : ""}>${v}</option>`).join("")}</select></label>
      <label>날짜<input id="date" type="date" value="${esc(s.date)}"></label>
      <div class="lbl">출석</div><div class="row wrap">${(fam.members || []).map(m => `<label class="chk"><input type="checkbox" data-att="${m.id}"${(s.attendance || []).includes(m.id) ? " checked" : ""}> ${esc(m.alias)}</label>`).join("")}</div>
      <button class="primary" id="saveS">회기 저장</button></div>
    <div class="card"><h2>상담 기록 <span class="muted">(상담자만 볼 수 있어요)</span></h2>
      <label>S · 주관적 호소<textarea id="nS" rows="3">${esc(n.s)}</textarea></label>
      <label>O · 관찰<textarea id="nO" rows="3">${esc(n.o)}</textarea></label>
      <label>A · 평가<textarea id="nA" rows="3">${esc(n.a)}</textarea></label>
      <label>P · 계획<textarea id="nP" rows="3">${esc(n.p)}</textarea></label>
      <label class="chk"><input type="checkbox" id="risk"${n.risk ? " checked" : ""}> 안전 관련 확인이 필요한 내용이 있었어요</label>
      <button class="primary" id="saveN">기록 저장</button></div>
    <div class="card"><h2>이번 주 과제 내기</h2>
      <label>과제 제목<input id="hwT" value="${esc(s.hwTitle)}"></label>
      <label>유형<select id="hwY">${Object.entries(HW_TYPES).map(([k, v]) => `<option value="${k}"${s.hwType === k ? " selected" : ""}>${v.name}</option>`).join("")}</select></label>
      <label>안내<textarea id="hwI" rows="2" placeholder="과제 방법을 간단히 적어 주세요"></textarea></label>
      <div class="lbl">받는 사람</div><div class="row wrap">${(fam.members || []).map(m => `<label class="chk"><input type="checkbox" data-to="${m.id}" checked> ${esc(m.alias)}</label>`).join("")}</div>
      <button class="primary" id="giveHw">과제 보내기</button>
      ${d.homework.filter(h => h.week === w).map(h => `<a class="item" href="#fam/${fid}/h/${h.id}"><div>${esc(memberName(fam, h.forMember))} · ${esc(h.title)}</div><span class="st ${h.feedback ? "done" : h.submission ? "moved" : "planned"}">${h.feedback ? "피드백 완료" : h.submission ? "제출됨" : "미제출"}</span></a>`).join("")}</div>`, { back: `#fam/${fid}` });
  $("#saveS").onclick = () => act(() => store.set(`families/${fid}/sessions/${w}`, {
    topic: $("#topic").value.trim(), goal: $("#goal").value.trim(), status: $("#status").value, date: $("#date").value,
    attendance: Array.from(document.querySelectorAll("[data-att]")).filter(x => x.checked).map(x => x.dataset.att),
  }), "회기를 저장했어요");
  $("#saveN").onclick = () => act(() => store.set(`families/${fid}/notes/${w}`, { week: w, s: $("#nS").value, o: $("#nO").value, a: $("#nA").value, p: $("#nP").value, risk: $("#risk").checked, updatedAt: new Date().toISOString() }), "상담 기록을 저장했어요");
  $("#giveHw").onclick = async () => {
    const to = Array.from(document.querySelectorAll("[data-to]")).filter(x => x.checked).map(x => x.dataset.to);
    const title = $("#hwT").value.trim();
    if (!title) return toast("과제 제목을 입력해 주세요");
    if (!to.length) return toast("받는 사람을 골라 주세요");
    await act(async () => { for (const m of to) await store.put(`families/${fid}/homework/h${Date.now().toString(36)}${rid(4).toLowerCase()}`, { week: w, title, type: $("#hwY").value, instructions: $("#hwI").value.trim(), forMember: m, assignedAt: new Date().toISOString(), submission: null, feedback: "" }); }, `과제를 ${to.length}명에게 보냈어요`);
  };
}

// ---------- 과제 (상담자 · 내담자 공통) ----------
function renderHomework(fid, hid) {
  watchFamily(fid);
  const d = famData(fid), fam = d.info || {}, h = d.homework.find(x => x.id === hid);
  const back = S.user.role === "counselor" ? `#fam/${fid}/hw` : "#home";
  if (!h) return shell("과제", '<p class="muted">과제를 불러오고 있어요…</p>', { back });
  const type = HW_TYPES[h.type] || HW_TYPES.free, sub = h.submission || {};
  const isClient = S.user.role === "client";
  const form = type.fields.map(([k, label]) => isClient && !h.feedback
    ? `<label>${label}<textarea data-k="${k}" rows="3">${esc(sub[k])}</textarea></label>`
    : `<div class="lbl">${label}</div><p class="answer">${esc(sub[k]) || '<span class="muted">-</span>'}</p>`).join("");
  shell(h.title, `<div class="card"><p class="muted">${h.week}주차 · ${esc(memberName(fam, h.forMember))} · ${type.name}</p>${h.instructions ? `<p>${esc(h.instructions)}</p>` : ""}</div>
    <div class="card"><h2>${isClient ? (h.feedback ? "내가 쓴 내용" : "작성하기") : "제출 내용"}</h2>${h.submission || isClient ? form : '<p class="muted">아직 제출하지 않았어요.</p>'}
      ${isClient && !h.feedback ? '<button class="primary" id="submit">제출하기</button><p class="muted">제출한 뒤에도 피드백을 받기 전까지 고칠 수 있어요.</p>' : ""}
      ${sub.submittedAt ? `<p class="muted">제출: ${fmt(String(sub.submittedAt).slice(0, 10))}</p>` : ""}</div>
    <div class="card"><h2>선생님 피드백</h2>${S.user.role === "counselor" ? `<textarea id="fb" rows="4" placeholder="서면 피드백을 적어 주세요">${esc(h.feedback)}</textarea><button class="primary" id="saveFb">피드백 저장</button>` : (h.feedback ? `<p class="answer">${esc(h.feedback)}</p>` : '<p class="muted">피드백을 기다리고 있어요.</p>')}</div>`, { back });
  const sb = $("#submit");
  if (sb) sb.onclick = () => {
    const out = { submittedAt: new Date().toISOString(), by: S.user.uid };
    document.querySelectorAll("[data-k]").forEach(t => { out[t.dataset.k] = t.value.trim().slice(0, 2000); });
    if (type.fields.every(([k]) => !out[k])) return toast("내용을 적어 주세요");
    act(() => store.set(`families/${fid}/homework/${hid}`, { submission: out }), "과제를 제출했어요");
  };
  const fb = $("#saveFb");
  if (fb) fb.onclick = () => act(() => store.set(`families/${fid}/homework/${hid}`, { feedback: $("#fb").value.trim(), feedbackAt: new Date().toISOString() }), "피드백을 저장했어요");
}

// ---------- 상담자: 평가 입력 ----------
function renderEvalEntry(fid, point, mid) {
  watchFamily(fid);
  const d = famData(fid), fam = d.info, p = EVAL_POINTS.find(x => x.key === point);
  if (!fam || !p) return shell("평가", '<p class="muted">불러오는 중…</p>', { back: `#fam/${fid}/eval` });
  const get = kind => d.evals.find(e => e.kind === kind && e.point === point && e.memberId === mid);
  const block = (kind, label, n, bands) => {
    const e = get(kind), items = e ? e.items : Array(n).fill("");
    return `<div class="card"><h2>${label}</h2><div class="items">${items.map((v, i) => `<label class="it">${i + 1}<select data-kind="${kind}" data-i="${i}"><option value=""></option>${[0, 1, 2, 3].map(x => `<option${String(v) === String(x) ? " selected" : ""}>${x}</option>`).join("")}</select></label>`).join("")}</div>
      <p>총점 <b id="tot-${kind}">${e ? e.total : "-"}</b> · <span id="band-${kind}">${e ? band(bands, e.total) : ""}</span></p>
      ${kind === "PHQ9" ? '<p class="muted">9번 문항(죽음 · 자해에 대한 생각)이 1점 이상이면 홈 화면에 안전 평가 알림이 떠요.</p>' : ""}
      <button class="primary" data-save="${kind}">${label.split(" ")[0]} 저장</button></div>`;
  };
  const fe = get("FAM");
  shell(`${p.name} · ${memberName(fam, mid)}`, `<p class="muted center">문항 점수: 0 전혀 없음 · 1 며칠 동안 · 2 일주일 이상 · 3 거의 매일</p>
    ${block("PHQ9", "PHQ-9 우울 (9문항)", 9, PHQ9_BANDS)}${block("GAD7", "GAD-7 불안 (7문항)", 7, GAD7_BANDS)}
    <div class="card"><h2>가족기능 자체 평가</h2>${fe ? `<p>총점 <b>${fe.total}</b> / 50 (평균 ${Number(fe.avg).toFixed(1)})</p>${fe.better ? `<div class="lbl">가장 달라진 점</div><p class="answer">${esc(fe.better)}</p>` : ""}${fe.hope ? `<div class="lbl">앞으로 바라는 점</div><p class="answer">${esc(fe.hope)}</p>` : ""}` : '<p class="muted">구성원이 앱에서 직접 작성해요. 아직 제출하지 않았어요.</p>'}</div>`, { back: `#fam/${fid}/eval` });
  const recalc = kind => {
    const vals = Array.from(document.querySelectorAll(`[data-kind="${kind}"]`)).map(s => s.value);
    const total = vals.reduce((a, v) => a + (v === "" ? 0 : Number(v)), 0);
    $("#tot-" + kind).textContent = vals.some(v => v === "") ? `${total} (미완성)` : total;
    $("#band-" + kind).textContent = vals.some(v => v === "") ? "" : band(kind === "PHQ9" ? PHQ9_BANDS : GAD7_BANDS, total);
    return { vals, total };
  };
  document.querySelectorAll("[data-kind]").forEach(s => s.onchange = () => recalc(s.dataset.kind));
  document.querySelectorAll("[data-save]").forEach(b => b.onclick = () => {
    const kind = b.dataset.save, { vals, total } = recalc(kind);
    if (vals.some(v => v === "")) return toast("모든 문항에 점수를 넣어 주세요");
    act(() => store.put(`families/${fid}/evals/${point}-${kind}-${mid}`, { kind, point, memberId: mid, items: vals.map(Number), total, by: S.user.uid, createdAt: new Date().toISOString() }), "평가를 저장했어요");
  });
}

// ---------- 내담자 ----------
function renderClientHome() {
  const prof = S.user.profile, fid = prof.familyId;
  watchFamily(fid);
  const d = famData(fid), fam = d.info;
  if (!fam) return shell("마음엠디", '<p class="muted">가족 정보를 불러오고 있어요…</p>');
  const w = weekOf(fam), sun = nextSunday(), nw = Math.floor((days(sun) - days(fam.startDate)) / 7) + 1;
  const next = d.sessions.find(s => s.week === nw);
  const todo = d.homework.filter(h => !h.submission).sort((a, b) => b.week - a.week);
  const doneHw = d.homework.filter(h => h.submission).sort((a, b) => b.week - a.week).slice(0, 5);
  const due = EVAL_POINTS.filter(p => w >= p.week && w <= 53 && !d.evals.some(e => e.point === p.key));
  shell(`${prof.alias}님, 안녕하세요`, `
    <div class="card hero"><p class="muted">다음 상담 · 일요일</p>${next ? `<h2>${fmt(next.date)} · ${nw}주차</h2><p><b>${esc(next.topic)}</b></p><p class="muted">${esc(next.goal)}</p>` : `<h2>${w < 1 ? "곧 시작해요" : "1년 과정을 마쳤어요"}</h2><p class="muted">시작일 ${fmt(fam.startDate)}</p>`}</div>
    ${due.map(p => `<a class="alert blue" href="#selfeval/${p.key}">${p.name} 자체 평가를 작성해 주세요 ›</a>`).join("")}
    <div class="card"><h2>해야 할 과제 ${todo.length}</h2>${todo.length ? todo.map(h => `<a class="item" href="#h/${h.id}"><span class="wk">${h.week}</span><div><b>${esc(h.title)}</b><div class="muted">${HW_TYPES[h.type] ? HW_TYPES[h.type].name : ""}</div></div><span class="go">›</span></a>`).join("") : '<p class="muted">밀린 과제가 없어요.</p>'}</div>
    <div class="card"><h2>제출한 과제</h2>${doneHw.length ? doneHw.map(h => `<a class="item" href="#h/${h.id}"><span class="wk">${h.week}</span><div>${esc(h.title)}</div><span class="st ${h.feedback ? "done" : "moved"}">${h.feedback ? "피드백 도착" : "검토 중"}</span></a>`).join("") : '<p class="muted">아직 없어요.</p>'}</div>`);
}
function renderClientSchedule() {
  const fid = S.user.profile.familyId;
  watchFamily(fid);
  const d = famData(fid), fam = d.info;
  if (!fam) return shell("일정", '<p class="muted">불러오는 중…</p>');
  const w = weekOf(fam);
  shell("1년 상담 일정", PHASES.map(p => `<div class="card"><h3 style="color:${p.color}">${p.name}</h3>${d.sessions.filter(s => s.week >= p.weeks[0] && s.week <= p.weeks[1]).map(s => `<div class="item ${s.week === w ? "now" : ""}"><span class="wk">${s.week}</span><div><b>${esc(s.topic)}</b><div class="muted">${fmtShort(s.date)} (일)</div></div></div>`).join("")}</div>`).join(""));
}
function renderSelfEval(point) {
  const prof = S.user.profile, fid = prof.familyId, p = EVAL_POINTS.find(x => x.key === point);
  watchFamily(fid);
  const d = famData(fid);
  const mine = d.evals.find(e => e.point === point);
  if (!p) return (location.hash = "#home");
  if (mine) return shell(p.name, `<div class="card"><p>제출해 주셔서 고마워요. 결과는 다음 상담에서 함께 이야기해요.</p><p class="muted">총점 ${mine.total} / 50</p></div>`, { back: "#home" });
  shell(p.name, `<div class="card"><p>요즘 우리 가족을 떠올리며 가장 가까운 번호를 골라 주세요.</p><p class="muted">1 전혀 아니다 · 2 아니다 · 3 보통 · 4 그렇다 · 5 매우 그렇다</p></div>
    <div class="card">${FAM_ITEMS.map((q, i) => `<div class="q"><p>${i + 1}. ${esc(q)}</p><div class="scale">${[1, 2, 3, 4, 5].map(v => `<label><input type="radio" name="q${i}" value="${v}"><span>${v}</span></label>`).join("")}</div></div>`).join("")}
      <label>상담을 시작한 뒤 가장 달라진 점<textarea id="better" rows="3"></textarea></label>
      <label>앞으로 바라는 점<textarea id="hope" rows="3"></textarea></label>
      <button class="primary" id="send">제출하기</button></div>`, { back: "#home" });
  $("#send").onclick = () => {
    const vals = FAM_ITEMS.map((_, i) => { const c = document.querySelector(`input[name="q${i}"]:checked`); return c ? Number(c.value) : null; });
    if (vals.some(v => v === null)) return toast("모든 문항에 답해 주세요");
    const total = vals.reduce((a, v) => a + v, 0);
    act(() => store.set(`families/${fid}/evals/${point}-FAM-${prof.memberId}`, { kind: "FAM", point, memberId: prof.memberId, items: vals, total, avg: total / vals.length, better: $("#better").value.trim().slice(0, 1000), hope: $("#hope").value.trim().slice(0, 1000), by: S.user.uid, createdAt: new Date().toISOString() }), "평가를 제출했어요");
  };
}

// ---------- 설정 ----------
function renderAccount() {
  shell("설정", `<div class="card"><h2>계정</h2><p>${esc(S.user.email)}</p><p class="muted">${S.user.role === "counselor" ? "상담자 계정" : "가족 구성원 계정 · " + esc(S.user.profile && S.user.profile.alias)}</p>
    ${store.mode === "firebase" ? '<button id="out">로그아웃</button>' : '<p class="muted">체험 모드에서는 로그인 없이 상담자 · 내담자 화면을 바꿔 볼 수 있어요.</p>'}</div>
    <div class="card"><h2>개인정보 안내</h2><p class="muted">상담 기록은 상담자만 볼 수 있고, 가족 구성원은 자신의 과제와 평가만 볼 수 있어요. 앱에는 실명 대신 별칭을 사용해 주세요.</p></div>
    <div class="card"><h2>문의</h2><p class="muted">가족상담연구소 마음재활정원 · maumm.org</p></div>`);
  const o = $("#out"); if (o) o.onclick = () => { stopAll(); store.signOut(); };
}

// ---------- 라우터 ----------
function render() {
  const h = location.hash.slice(1) || "home", parts = h.split("/");
  S.route = h;
  const u = S.user;
  if (!u) return renderAuth();
  if (u.role === "new") return renderJoin();
  if (h === "account") return renderAccount();
  if (u.role === "counselor") {
    if (parts[0] === "families") return renderFamilies();
    if (parts[0] === "newfam") return renderNewFamily();
    if (parts[0] === "fam" && parts[1]) {
      if (parts[2] === "s") return renderSession(parts[1], Number(parts[3]));
      if (parts[2] === "h") return renderHomework(parts[1], parts[3]);
      if (parts[2] === "e") return renderEvalEntry(parts[1], parts[3], parts[4]);
      return renderFamily(parts[1], parts[2] || "");
    }
    return renderCounselorHome();
  }
  if (parts[0] === "sched") return renderClientSchedule();
  if (parts[0] === "h") return renderHomework(u.profile.familyId, parts[1]);
  if (parts[0] === "selfeval") return renderSelfEval(parts[1]);
  return renderClientHome();
}
// 입력 중에는 실시간 갱신으로 화면을 다시 그리지 않습니다.
let pending = false;
const renderSafe = () => {
  const a = document.activeElement;
  if (a && ["INPUT", "TEXTAREA", "SELECT"].includes(a.tagName)) { if (!pending) { pending = true; a.addEventListener("blur", () => { pending = false; setTimeout(render, 0); }, { once: true }); } return; }
  render();
};
window.addEventListener("hashchange", () => { window.scrollTo(0, 0); render(); });

store.onAuth(u => {
  stopAll();
  S.user = u;
  if (u && u.role === "counselor") {
    S.subs.push(store.listen("families", null, v => { S.families = v; renderSafe(); }, () => toast("가족 목록을 불러오지 못했어요")));
  }
  render();
});
