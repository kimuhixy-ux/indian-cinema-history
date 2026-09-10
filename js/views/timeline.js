// timeline.js: 年代別の一覧ビュー
// 18000本超あるため、初期表示は画像なしのタイトル一覧にして負荷を抑え、
// タップした行だけポスター画像を読み込む(<details>で閉じた年代は描画コストも省く)

import { loadData } from "../data.js";
import { yearListItemHtml } from "../components/year-list-item.js";
import { escapeHtml } from "../router.js";

export async function renderTimeline(view) {
  view.innerHTML = `<div class="loading">読み込み中...<br><span class="loading-hint">初回読み込みは通信環境によって時間がかかる場合があります</span></div>`;
  const { movies } = await loadData();

  const decadeMap = new Map();
  const unknown = [];
  for (const m of movies) {
    const y = m.release_year;
    if (!y) {
      unknown.push(m);
      continue;
    }
    const decade = Math.floor(y / 10) * 10;
    if (!decadeMap.has(decade)) decadeMap.set(decade, []);
    decadeMap.get(decade).push(m);
  }
  const decades = [...decadeMap.keys()].sort((a, b) => a - b);

  function decadeBlockHtml(label, list) {
    const sorted = [...list].sort(
      (a, b) => (a.release_year ?? 0) - (b.release_year ?? 0) || a.title.localeCompare(b.title)
    );
    return `
      <details class="decade-block">
        <summary class="decade-header">
          <span class="decade-year">${escapeHtml(label)}</span>
          <span class="chip">${sorted.length}本</span>
        </summary>
        <ul class="year-list">
          ${sorted.map((m) => yearListItemHtml(m)).join("")}
        </ul>
      </details>
    `;
  }

  view.innerHTML = `
    <h1 class="page-title">年代別</h1>
    <p class="page-lead">${movies.length}本を公開年代ごとに表示します。年代をタップして開き、タイトルをタップすると画像が表示されます。</p>
    <div id="decadeList">
      ${decades.map((d) => decadeBlockHtml(`${d}年代`, decadeMap.get(d))).join("")}
      ${unknown.length ? decadeBlockHtml("年代不明", unknown) : ""}
    </div>
  `;

  const container = view.querySelector("#decadeList");
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".year-item-title");
    if (!btn) return;
    const preview = btn.nextElementSibling;

    if (!preview.hidden) {
      preview.hidden = true;
      return;
    }
    if (!preview.dataset.loaded) {
      const id = btn.dataset.id;
      const poster = btn.dataset.poster;
      preview.innerHTML = poster
        ? `<a href="#/movie/${encodeURIComponent(id)}"><img class="year-item-poster" src="${escapeHtml(poster)}" alt="" loading="lazy"></a>`
        : `<a class="btn" href="#/movie/${encodeURIComponent(id)}">詳細を見る</a>`;
      preview.dataset.loaded = "1";
    }
    preview.hidden = false;
  });
}
