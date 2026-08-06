// data.js: movies-index.json(一覧用の軽量データ)の読み込みと、
// 映画ごとの詳細JSON(data/movies/<tmdb_id>.json)の個別取得を行う

let indexCache = null;
const detailCache = new Map();

export async function loadData() {
  if (indexCache) return indexCache;
  const movies = await fetch("data/movies-index.json").then((r) => r.json());

  for (const movie of movies) {
    movie.slug = String(movie.tmdb_id);
  }

  const industries = [...new Set(movies.map((m) => m.industry))].sort();

  indexCache = { movies, industries };
  return indexCache;
}

export async function loadMovieDetail(tmdbId) {
  if (detailCache.has(tmdbId)) return detailCache.get(tmdbId);
  const movie = await fetch(`data/movies/${encodeURIComponent(tmdbId)}.json`).then((r) => {
    if (!r.ok) return null;
    return r.json();
  });
  if (movie) detailCache.set(tmdbId, movie);
  return movie;
}
