// year-list-item.js: 年代別ビュー用の軽量な行(画像はタップ時に遅延表示)

import { escapeHtml } from "../router.js";

export function yearListItemHtml(movie) {
  return `
    <li class="year-item">
      <button
        type="button"
        class="year-item-title"
        data-id="${escapeHtml(String(movie.tmdb_id))}"
        data-poster="${escapeHtml(movie.poster || "")}"
      >
        <span class="year-item-name">${escapeHtml(movie.title)}</span>
        <span class="year-item-year">${movie.release_year ?? "年不明"}</span>
      </button>
      <div class="year-item-preview" hidden></div>
    </li>
  `;
}
