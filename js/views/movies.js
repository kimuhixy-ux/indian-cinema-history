// movies.js: 映画一覧(検索・地域フィルタ)

import { loadData } from "../data.js";
import { movieCardHtml } from "../components/movie-card.js";
import { escapeHtml } from "../router.js";

export async function renderMovies(view, queryString) {
  view.innerHTML = `<div class="loading">読み込み中...<br><span class="loading-hint">初回読み込みは通信環境によって時間がかかる場合があります</span></div>`;
  const { movies, industries } = await loadData();
  const params = new URLSearchParams(queryString || "");

  const state = {
    q: params.get("q") || "",
    industry: params.get("industry") || "",
    yearFrom: params.get("yearFrom") || "",
    yearTo: params.get("yearTo") || "",
  };

  view.innerHTML = `
    <h1 class="page-title">インド映画データベース</h1>
    <p class="page-lead">${movies.length}本収録</p>

    <div class="filter-bar">
      <input type="search" id="qInput" placeholder="タイトルで検索" value="${escapeHtml(state.q)}">
    </div>
    <div class="filter-bar year-filter">
      <input type="number" id="yearFromInput" placeholder="公開年(から)" value="${escapeHtml(state.yearFrom)}">
      <span class="year-filter-sep">〜</span>
      <input type="number" id="yearToInput" placeholder="公開年(まで)" value="${escapeHtml(state.yearTo)}">
    </div>
    <div class="filter-row" id="industryRow"></div>
    <div class="result-count" id="resultCount"></div>
    <div class="movie-grid" id="results"></div>
  `;

  const qInput = view.querySelector("#qInput");
  const yearFromInput = view.querySelector("#yearFromInput");
  const yearToInput = view.querySelector("#yearToInput");
  const industryRow = view.querySelector("#industryRow");
  const resultsEl = view.querySelector("#results");
  const countEl = view.querySelector("#resultCount");

  const INDUSTRIES = [["", "すべて"], ...industries.map((i) => [i, i])];
  industryRow.innerHTML = INDUSTRIES.map(([v, l]) => chipHtml(v, l, state.industry)).join("");

  function chipHtml(value, label, current) {
    const active = value === current ? " active" : "";
    return `<button type="button" class="chip${active}" data-value="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
  }

  function syncUrl() {
    const p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.industry) p.set("industry", state.industry);
    if (state.yearFrom) p.set("yearFrom", state.yearFrom);
    if (state.yearTo) p.set("yearTo", state.yearTo);
    const qs = p.toString();
    history.replaceState(null, "", `#/movies${qs ? "?" + qs : ""}`);
  }

  function applyFilters() {
    let list = movies;
    if (state.industry) list = list.filter((m) => m.industry === state.industry);
    if (state.q) {
      const q = state.q.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.lead_actor || "").toLowerCase().includes(q)
      );
    }
    if (state.yearFrom) list = list.filter((m) => (m.release_year ?? 0) >= Number(state.yearFrom));
    if (state.yearTo) list = list.filter((m) => (m.release_year ?? 0) <= Number(state.yearTo));
    list = [...list].sort((a, b) => (b.release_year ?? 0) - (a.release_year ?? 0) || a.title.localeCompare(b.title));

    countEl.textContent = `${list.length}件`;
    resultsEl.innerHTML = list.length
      ? list.map((m) => movieCardHtml(m)).join("")
      : `<p class="empty-hint">該当する映画がありません</p>`;

    syncUrl();
  }

  let debounceTimer;
  qInput.addEventListener("input", () => {
    state.q = qInput.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyFilters, 200);
  });
  yearFromInput.addEventListener("input", () => {
    state.yearFrom = yearFromInput.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyFilters, 200);
  });
  yearToInput.addEventListener("input", () => {
    state.yearTo = yearToInput.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyFilters, 200);
  });

  view.querySelectorAll(".chip[data-value]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.industry = btn.dataset.value;
      view.querySelectorAll(".chip[data-value]").forEach((b) => b.classList.toggle("active", b === btn));
      applyFilters();
    });
  });

  applyFilters();
}
