// router.js: シンプルなハッシュルーター

const routes = [];

export function addRoute(pattern, handler) {
  routes.push({ pattern, handler });
}

export async function render() {
  const hash = location.hash || "#/movies";
  const view = document.getElementById("view");

  for (const { pattern, handler } of routes) {
    const m = hash.match(pattern);
    if (m) {
      view.scrollTop = 0;
      window.scrollTo(0, 0);
      try {
        await handler(view, ...m.slice(1).map((s) => (s ? decodeURIComponent(s) : s)));
      } catch (err) {
        console.error(err);
        view.innerHTML = `<div class="empty-state">読み込みに失敗しました: ${escapeHtml(String(err.message || err))}</div>`;
      }
      return;
    }
  }
  view.innerHTML = `<div class="empty-state">ページが見つかりません</div>`;
}

export function startRouter() {
  window.addEventListener("hashchange", render);
  render();
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
