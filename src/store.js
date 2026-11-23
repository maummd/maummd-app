// 데이터 저장소: Firebase(실사용) 또는 체험 모드(이 기기에만 저장). 두 방식 모두 같은 함수를 제공합니다.
import { initializeApp } from "firebase/app";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendEmailVerification, sendPasswordResetEmail,
} from "firebase/auth";
import {
  initializeFirestore, persistentLocalCache, doc, getDoc, setDoc, deleteDoc, collection,
  query, where, onSnapshot, writeBatch,
} from "firebase/firestore";

// ---------- Firebase ----------
export function firebaseStore(config, counselorEmails) {
  const COUNSELORS = counselorEmails.map(x => x.toLowerCase());
  const app = initializeApp(config);
  const auth = getAuth(app);
  let db;
  try { db = initializeFirestore(app, { localCache: persistentLocalCache() }); }
  catch (e) { db = initializeFirestore(app, {}); }
  const toRef = p => doc(db, ...p.split("/"));
  const toCol = p => collection(db, ...p.split("/"));
  return {
    mode: "firebase",
    onAuth(cb) {
      return onAuthStateChanged(auth, async u => {
        if (!u) return cb(null);
        const email = (u.email || "").toLowerCase();
        if (COUNSELORS.includes(email)) {
          // 메일 링크로 인증한 뒤에도 앱의 로그인 정보는 예전 상태일 수 있어, 새로 받아 옵니다.
          if (!u.emailVerified) { try { await u.reload(); if (auth.currentUser && auth.currentUser.emailVerified) await auth.currentUser.getIdToken(true); } catch (e) { /* 오프라인 */ } }
          return cb({ uid: u.uid, email, role: "counselor", verified: !!(auth.currentUser || u).emailVerified });
        }
        const snap = await getDoc(toRef("users/" + u.uid)).catch(() => null);
        const prof = snap && snap.exists() ? snap.data() : null;
        cb({ uid: u.uid, email, role: prof ? "client" : "new", profile: prof, verified: u.emailVerified });
      });
    },
    signIn: (e, p) => signInWithEmailAndPassword(auth, e, p),
    signUp: (e, p) => createUserWithEmailAndPassword(auth, e, p),
    signOut: () => signOut(auth),
    verify: () => auth.currentUser && sendEmailVerification(auth.currentUser),
    // 인증 상태와 권한 정보를 서버에서 다시 받아 옵니다. 인증되어 있으면 true.
    async refresh() {
      const u = auth.currentUser; if (!u) return false;
      await u.reload(); await auth.currentUser.getIdToken(true);
      return !!auth.currentUser.emailVerified;
    },
    // 여러 문서를 한 번에 저장합니다 (최대 450건씩).
    async batch(ops) {
      for (let i = 0; i < ops.length; i += 450) {
        const b = writeBatch(db);
        ops.slice(i, i + 450).forEach(([path, data]) => b.set(toRef(path), data));
        await b.commit();
      }
    },
    reset: e => sendPasswordResetEmail(auth, e),
    async get(path) { const s = await getDoc(toRef(path)); return s.exists() ? s.data() : null; },
    set: (path, data) => setDoc(toRef(path), data, { merge: true }),
    put: (path, data) => setDoc(toRef(path), data),
    del: path => deleteDoc(toRef(path)),
    listen(colPath, filter, cb, onErr) {
      const q = filter && filter.length ? query(toCol(colPath), ...filter.map(([f, v]) => where(f, "==", v))) : toCol(colPath);
      return onSnapshot(q, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), e => onErr && onErr(e));
    },
    listenDoc(path, cb, onErr) {
      return onSnapshot(toRef(path), s => cb(s.exists() ? s.data() : null), e => onErr && onErr(e));
    },
    async joinWithInvite(uid, code, alias) {
      const inv = await getDoc(toRef("invites/" + code));
      if (!inv.exists() || inv.data().active !== true) throw new Error("초대 코드를 확인해 주세요");
      const { familyId, memberId } = inv.data();
      await setDoc(toRef("users/" + uid), { role: "client", familyId, memberId, alias, inviteCode: code, createdAt: new Date().toISOString() });
      return { familyId, memberId };
    },
  };
}

// ---------- 체험 모드 (이 기기의 브라우저 저장소) ----------
export function localStore() {
  const KEY = "maummd-demo-v1";
  let data = {};
  try { data = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { data = {}; }
  const subs = new Set();
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 저장 공간 부족 */ } };
  const notify = () => subs.forEach(f => f());
  const children = (colPath, filter) => {
    const depth = colPath.split("/").length + 1;
    return Object.keys(data)
      .filter(k => k.startsWith(colPath + "/") && k.split("/").length === depth)
      .map(k => ({ id: k.split("/").pop(), ...data[k] }))
      .filter(d => !filter || filter.every(([f, v]) => d[f] === v));
  };
  let role = "counselor";
  try { role = localStorage.getItem(KEY + "-role") || "counselor"; } catch (e) { /* */ }
  let authCb = null;
  const userFor = r => r === "counselor"
    ? { uid: "demo-counselor", email: "demo@maummd", role: "counselor", verified: true }
    : { uid: "demo-client", email: "client@maummd", role: data["users/demo-client"] ? "client" : "new", profile: data["users/demo-client"] || null, verified: true };
  return {
    mode: "demo",
    onAuth(cb) { authCb = cb; setTimeout(() => cb(userFor(role)), 0); return () => { authCb = null; }; },
    switchRole(r) { role = r; try { localStorage.setItem(KEY + "-role", r); } catch (e) { /* */ } if (authCb) authCb(userFor(r)); },
    signIn: async () => {}, signUp: async () => {}, signOut: async () => {}, verify: async () => {}, reset: async () => {}, refresh: async () => true,
    async batch(ops) { ops.forEach(([path, d]) => { data[path] = JSON.parse(JSON.stringify(d)); }); persist(); notify(); },
    async get(path) { return data[path] ? { ...data[path] } : null; },
    async set(path, d) { data[path] = Object.assign({}, data[path] || {}, JSON.parse(JSON.stringify(d))); persist(); notify(); },
    async put(path, d) { data[path] = JSON.parse(JSON.stringify(d)); persist(); notify(); },
    async del(path) { delete data[path]; persist(); notify(); },
    listen(colPath, filter, cb) { const f = () => cb(children(colPath, filter)); subs.add(f); setTimeout(f, 0); return () => subs.delete(f); },
    listenDoc(path, cb) { const f = () => cb(data[path] ? { ...data[path] } : null); subs.add(f); setTimeout(f, 0); return () => subs.delete(f); },
    async joinWithInvite(uid, code, alias) {
      const inv = data["invites/" + code];
      if (!inv || inv.active !== true) throw new Error("초대 코드를 확인해 주세요");
      data["users/" + uid] = { role: "client", familyId: inv.familyId, memberId: inv.memberId, alias, inviteCode: code, createdAt: new Date().toISOString() };
      persist(); notify();
      if (authCb) authCb(userFor("client"));
      return inv;
    },
    resetDemo() { data = {}; persist(); notify(); },
  };
}
