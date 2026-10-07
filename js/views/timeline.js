// timeline.js: 1年ごとの一覧ビュー
// 全件(18000本超)を一度にサムネ表示すると重いため、表示は選んだ1年分だけに絞る
// (最多の年でも700本程度で、画像は loading="lazy" なので見える分しか読み込まれない)

import { loadData } from "../data.js";
import { movieCardHtml } from "../components/movie-card.js";
import { escapeHtml } from "../router.js";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function countByYear(movies) {
  const counts = new Map();
  for (const m of movies) {
    if (!m.release_year) continue;
    counts.set(m.release_year, (counts.get(m.release_year) || 0) + 1);
  }
  // 新しい年を先頭にするのは、利用者が最近の作品から探すことが多いため
  return [...counts.entries()].sort((a, b) => b[0] - a[0]);
}

function chipHtml(value, label, current) {
  const active = value === current ? " active" : "";
  return `<button type="button" class="chip${active}" data-value="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
}

export async function renderTimeline(view, queryString) {
  view.innerHTML = `<div class="loading">読み込み中...<br><span class="loading-hint">初回読み込みは通信環境によって時間がかかる場合があります</span></div>`;
  const { movies } = await loadData();
  const yearCounts = countByYear(movies);
  const years = yearCounts.map(([y]) => y);
  const params = new URLSearchParams(queryString || "");

  const requestedYear = Number(params.get("year"));
  const state = {
    year: years.includes(requestedYear) ? requestedYear : years[0],
    actorLetter: params.get("actorLetter") || "",
  };

  view.innerHTML = `
    <h1 class="page-title">年別</h1>
    <p class="page-lead">公開年を選ぶと、その年の映画をサムネイルで表示します。</p>
    <div class="filter-bar year-picker">
      <button type="button" class="btn year-step" id="olderBtn" aria-label="前の年">◀</button>
      <select id="yearSelect">
        ${yearCounts.map(([y, n]) => `<option value="${y}">${y}年(${n}本)</option>`).join("")}
      </select>
      <button type="button" class="btn year-step" id="newerBtn" aria-label="次の年">▶</button>
    </div>
    <p class="filter-label">主演俳優(頭文字)</p>
    <div class="filter-row letter-row" id="letterRow">
      ${[chipHtml("", "すべて", state.actorLetter)].concat(LETTERS.map((l) => chipHtml(l, l, state.actorLetter))).join("")}
    </div>
    <div class="result-count" id="resultCount"></div>
    <div class="movie-grid" id="results"></div>
  `;

  const yearSelect = view.querySelector("#yearSelect");
  const olderBtn = view.querySelector("#olderBtn");
  const newerBtn = view.querySelector("#newerBtn");
  const letterRow = view.querySelector("#letterRow");
  const resultsEl = view.querySelector("#results");
  const countEl = view.querySelector("#resultCount");

  function applyFilters() {
    yearSelect.value = String(state.year);
    const idx = years.indexOf(state.year);
    // years は新しい順なので、末尾が最も古い年
    olderBtn.disabled = idx === years.length - 1;
    newerBtn.disabled = idx === 0;

    let list = movies.filter((m) => m.release_year === state.year);
    if (state.actorLetter) {
      list = list.filter((m) => (m.lead_actor || "").trim().charAt(0).toUpperCase() === state.actorLetter);
    }
    list = [...list].sort((a, b) => a.title.localeCompare(b.title));

    countEl.textContent = `${state.year}年 ${list.length}件`;
    resultsEl.innerHTML = list.length
      ? list.map((m) => movieCardHtml(m)).join("")
      : `<p class="empty-hint">該当する映画がありません</p>`;

    const p = new URLSearchParams({ year: String(state.year) });
    if (state.actorLetter) p.set("actorLetter", state.actorLetter);
    // replaceState にするのは、年を切り替えるたびに戻るボタンの履歴が増えないようにするため
    history.replaceState(null, "", `#/timeline?${p}`);
  }

  function stepYear(delta) {
    const idx = years.indexOf(state.year) + delta;
    if (idx < 0 || idx >= years.length) return;
    state.year = years[idx];
    applyFilters();
  }

  yearSelect.addEventListener("change", () => {
    state.year = Number(yearSelect.value);
    applyFilters();
  });
  olderBtn.addEventListener("click", () => stepYear(1));
  newerBtn.addEventListener("click", () => stepYear(-1));

  letterRow.querySelectorAll(".chip[data-value]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.actorLetter = btn.dataset.value;
      letterRow.querySelectorAll(".chip[data-value]").forEach((b) => b.classList.toggle("active", b === btn));
      applyFilters();
    });
  });

  applyFilters();
}
