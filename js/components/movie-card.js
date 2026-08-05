// movie-card.js: 一覧表示用の映画カード

import { escapeHtml } from "../router.js";

export function movieCardHtml(movie) {
  const poster = movie.poster
    ? `<img class="poster" src="${escapeHtml(movie.poster)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'), {className: 'poster poster-placeholder'}))">`
    : `<div class="poster poster-placeholder"></div>`;
  return `
    <a class="movie-card" href="#/movie/${encodeURIComponent(movie.slug)}">
      ${poster}
      <div class="movie-card-body">
        <span class="movie-card-title">${escapeHtml(movie.title)}</span>
        <span class="movie-card-meta">${movie.release_year ?? "年不明"} ・ ${escapeHtml(movie.industry)}</span>
      </div>
    </a>
  `;
}
