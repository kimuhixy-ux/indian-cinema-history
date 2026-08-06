// movie-detail.js: 映画詳細ページ

import { loadMovieDetail } from "../data.js";
import { escapeHtml } from "../router.js";

export async function renderMovieDetail(view, slug) {
  view.innerHTML = `<div class="loading">読み込み中...</div>`;
  const movie = await loadMovieDetail(slug);

  if (!movie) {
    view.innerHTML = `<div class="empty-state">映画が見つかりませんでした<br><a href="#/movies">一覧に戻る</a></div>`;
    return;
  }

  const poster = movie.poster
    ? `<img class="detail-poster" src="${escapeHtml(movie.poster)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'), {className: 'detail-poster poster-placeholder'}))">`
    : `<div class="detail-poster poster-placeholder"></div>`;

  view.innerHTML = `
    <p><a href="#/movies">← 一覧に戻る</a></p>
    <div class="detail-header">
      ${poster}
      <div class="detail-header-info">
        <h1>${escapeHtml(movie.title)}</h1>
        ${movie.original_title && movie.original_title !== movie.title ? `<p class="detail-original-title">${escapeHtml(movie.original_title)}</p>` : ""}
        <div class="detail-meta">
          <span class="chip">${movie.release_year ?? "年不明"}</span>
          <span class="chip">${escapeHtml(movie.industry)}</span>
          <span class="chip">${escapeHtml(movie.language_name)}</span>
        </div>
        ${movie.overview ? `<p class="detail-overview">${escapeHtml(movie.overview)}</p>` : ""}
      </div>
    </div>

    <h2 class="section-title">主演俳優</h2>
    ${
      movie.cast && movie.cast.length
        ? `<ul class="cast-list">${movie.cast
            .map(
              (c) =>
                `<li><span class="cast-name">${escapeHtml(c.name)}</span>${c.character ? `<span class="cast-character"> - ${escapeHtml(c.character)}</span>` : ""}</li>`
            )
            .join("")}</ul>`
        : `<p class="empty-hint">出演俳優のデータがありません</p>`
    }

    <h2 class="section-title">楽曲</h2>
    ${songsHtml(movie)}
  `;
}

function songsHtml(movie) {
  if (!movie.songs || !movie.songs.length) {
    return `<p class="empty-hint">楽曲のデータがありません</p>`;
  }
  const rows = movie.songs
    .map(
      (s) => `
      <li class="song-row">
        <div class="song-info">
          <span class="song-title">${escapeHtml(s.title)}</span>
          ${s.singers ? `<span class="song-singers">${escapeHtml(s.singers)}</span>` : ""}
        </div>
        ${s.url ? `<a class="btn song-link" href="${escapeHtml(s.url)}" target="_blank" rel="noopener">再生</a>` : ""}
      </li>`
    )
    .join("");
  return `<ul class="song-list">${rows}</ul>`;
}
