// data.js: movies.jsonの読み込みとキャッシュ

let cache = null;

export async function loadData() {
  if (cache) return cache;
  const movies = await fetch("data/movies.json").then((r) => r.json());

  // tmdb_idは一意なのでそのままslugとして使う(同名映画・リメイクでの衝突を避けるため)
  for (const movie of movies) {
    movie.slug = String(movie.tmdb_id);
  }

  const industries = [...new Set(movies.map((m) => m.industry))].sort();

  cache = { movies, industries };
  return cache;
}

export function findMovieBySlug(movies, slug) {
  return movies.find((m) => m.slug === slug);
}
