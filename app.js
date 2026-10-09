const $ = (s) => document.querySelector(s);
const modal = $("#adminModal");
const loginPanel = $("#loginPanel");
const uploadPanel = $("#uploadPanel");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const fmtSize = n => n < 1024*1024 ? `${Math.max(1,Math.round(n/1024))} KB` : `${(n/1024/1024).toFixed(1)} MB`;
$("#year").textContent = new Date().getFullYear();
$("#adminOpen").addEventListener("click", async () => { modal.classList.remove("hidden"); await checkSession(); });
$("#closeModal").addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", e => { if (e.target === modal) modal.classList.add("hidden"); });
async function checkSession() {
  try { const r = await fetch("/api/session"); const d = await r.json(); loginPanel.classList.toggle("hidden", d.isAdmin); uploadPanel.classList.toggle("hidden", !d.isAdmin); if (d.isAdmin) await loadManage(); }
  catch { $("#loginMsg").textContent = "Could not connect to server."; }
}
async function loadApks() {
  const list = $("#apkList");
  try {
    const r = await fetch("/api/apks"); const apks = await r.json();
    $("#count").textContent = `${apks.length} FILE${apks.length === 1 ? "" : "S"}`;
    if (!apks.length) { list.innerHTML = '<div class="empty"><div class="empty-icon">↓</div><h3>No APKs uploaded yet</h3><p>New downloads will appear here when the site admin uploads them.</p></div>'; return; }
    list.innerHTML = apks.map(a => `<article class="apk-card"><div class="apk-top"><div class="apk-icon">⬇</div><div><h3>${esc(a.title)}</h3><div class="meta">${fmtSize(a.size)} · ${new Date(a.uploadedAt).toLocaleDateString()}</div></div></div><p>${esc(a.description || "Android application package.")}</p><a class="download-btn" href="${esc(a.downloadUrl)}">DOWNLOAD APK ↓</a></article>`).join("");
  } catch { list.innerHTML = '<div class="empty"><h3>Downloads are temporarily unavailable</h3><p>Please try again later.</p></div>'; }
}
$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault(); $("#loginMsg").textContent = "Signing in…";
  const form = new FormData(e.currentTarget);
  try {
    const r = await fetch("/api/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({username:form.get("username"),password:form.get("password")}) });
    const d = await r.json(); if (!r.ok) throw new Error(d.error || "Login failed.");
    e.currentTarget.reset(); $("#loginMsg").textContent = ""; await checkSession();
  } catch (err) { $("#loginMsg").textContent = err.message; }
});
$("#uploadForm").addEventListener("submit", async e => {
  e.preventDefault(); const msg = $("#uploadMsg"); const data = new FormData(e.currentTarget); msg.textContent = "Uploading…";
  try {
    const r = await fetch("/api/upload", { method:"POST", body:data }); const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Upload failed.");
    msg.textContent = "APK uploaded successfully."; e.currentTarget.reset(); await loadApks(); await loadManage();
  } catch (err) { msg.textContent = err.message; }
});
async function loadManage() {
  const host = $("#manageList");
  try {
    const r = await fetch("/api/apks"); const apks = await r.json();
    host.innerHTML = apks.length ? apks.map(a => `<div class="manage-item"><span>${esc(a.title)} <span class="meta">(${fmtSize(a.size)})</span></span><button class="delete-btn" data-id="${esc(a.id)}">Delete</button></div>`).join("") : '<p class="muted">No uploads yet.</p>';
    host.querySelectorAll("[data-id]").forEach(btn => btn.addEventListener("click", async () => {
      if (!confirm("Delete this APK from the website?")) return;
      const res = await fetch(`/api/apks/${encodeURIComponent(btn.dataset.id)}`, {method:"DELETE"});
      const out = await res.json(); if (!res.ok) { alert(out.error || "Could not delete."); return; }
      await loadApks(); await loadManage();
    }));
  } catch { host.textContent = "Could not load uploads."; }
}
$("#logout").addEventListener("click", async () => { await fetch("/api/logout", {method:"POST"}); await checkSession(); });
loadApks();