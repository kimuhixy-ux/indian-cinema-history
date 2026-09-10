// main.js: アプリのエントリーポイント

import { addRoute, startRouter } from "./router.js";
import { renderMovies } from "./views/movies.js";
import { renderMovieDetail } from "./views/movie-detail.js";
import { renderTimeline } from "./views/timeline.js";

addRoute(/^#\/movies(?:\?(.*))?$/, renderMovies);
addRoute(/^#\/movie\/([^/]+)$/, renderMovieDetail);
addRoute(/^#\/timeline$/, renderTimeline);
addRoute(/^#\/?$/, renderMovies);

startRouter();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.warn("Service Workerの登録に失敗しました:", err);
    });
  });
}
