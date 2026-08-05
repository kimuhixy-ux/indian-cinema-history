#!/usr/bin/env python3
"""JioSaavnの内部API(api.php)を直接叩き、各映画のサントラ曲名+リンクを
data/movies.json の songs フィールドに追加する。

JioSaavn公式が非公開で提供している(キー不要の)エンドポイントを利用しているため、
予告なく仕様変更される可能性がある。中断しても songs_progress.json に処理済み
tmdb_id を記録しているので再実行すれば続きから進む。
"""
import json
import os
import re
import time
import urllib.parse
import urllib.request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MOVIES_FILE = os.path.join(BASE_DIR, "data", "movies.json")
PROGRESS_FILE = os.path.join(BASE_DIR, "songs_progress.json")

JIOSAAVN_BASE = "https://www.jiosaavn.com/api.php"
REQUEST_TIMEOUT = 15
REQUEST_INTERVAL = 0.3  # JioSaavnへの配慮(非公式APIのため)

# 私たちの language_code -> JioSaavn側の language 文字列
LANG_MAP = {
    "hi": "hindi",
    "ta": "tamil",
    "te": "telugu",
    "ml": "malayalam",
    "kn": "kannada",
    "bn": "bengali",
    "mr": "marathi",
    "pa": "punjabi",
    "gu": "gujarati",
}


def jiosaavn_get(params):
    query = dict(params)
    query.setdefault("_format", "json")
    query.setdefault("_marker", "0")
    query.setdefault("ctx", "web6dot0")
    url = f"{JIOSAAVN_BASE}?{urllib.parse.urlencode(query)}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
        return json.loads(resp.read().decode("utf-8"))


def normalize(text):
    return re.sub(r"[^a-z0-9]", "", (text or "").lower())


def search_albums(title):
    data = jiosaavn_get({"__call": "search.getAlbumResults", "q": title, "p": 1, "n": 20, "cc": "in"})
    return data.get("results", [])


def pick_best_album(movie, candidates):
    target_title = normalize(movie["title"])
    target_lang = LANG_MAP.get(movie["language_code"])
    target_year = movie.get("release_year")

    def year_diff(c):
        try:
            return abs(int(c.get("year", 0)) - target_year)
        except (TypeError, ValueError):
            return 99

    same_lang = [c for c in candidates if c.get("language") == target_lang]
    pool = same_lang or candidates

    exact = [c for c in pool if normalize(c.get("title")) == target_title]
    if exact:
        exact.sort(key=year_diff)
        return exact[0]

    close_year = [c for c in pool if target_year is not None and year_diff(c) <= 1]
    if close_year:
        close_year.sort(key=year_diff)
        return close_year[0]

    return None


def fetch_album_songs(albumid):
    data = jiosaavn_get({"__call": "content.getAlbumDetails", "albumid": albumid})
    songs = []
    for s in data.get("songs", []):
        songs.append({
            "title": s.get("song"),
            "url": s.get("perma_url"),
            "singers": s.get("singers") or s.get("primary_artists") or "",
        })
    return songs


def load_json(path, default):
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return default


def atomic_write_json(path, data):
    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp_path, path)


def main():
    movies = load_json(MOVIES_FILE, [])
    progress = load_json(PROGRESS_FILE, {"processed_ids": []})
    processed = set(progress["processed_ids"])

    targets = [m for m in movies if m["tmdb_id"] not in processed]
    print(f"対象: {len(targets)}本(処理済み{len(processed)}本はスキップ)")

    matched = 0
    for i, movie in enumerate(targets, 1):
        try:
            candidates = search_albums(movie["title"])
            time.sleep(REQUEST_INTERVAL)
            best = pick_best_album(movie, candidates)
            if best:
                songs = fetch_album_songs(best["albumid"])
                time.sleep(REQUEST_INTERVAL)
                movie["songs"] = songs
                movie["jiosaavn_album_url"] = best.get("perma_url")
                if songs:
                    matched += 1
        except Exception as e:
            print(f"  警告: {movie['title']} の楽曲取得に失敗: {e}")

        processed.add(movie["tmdb_id"])

        if i % 25 == 0:
            print(f"  {i}/{len(targets)}件処理済み(マッチ{matched}件)")
            atomic_write_json(MOVIES_FILE, movies)
            progress["processed_ids"] = list(processed)
            atomic_write_json(PROGRESS_FILE, progress)

    atomic_write_json(MOVIES_FILE, movies)
    progress["processed_ids"] = list(processed)
    atomic_write_json(PROGRESS_FILE, progress)
    print(f"完了。{len(targets)}本中{matched}本でサントラが見つかりました。")


if __name__ == "__main__":
    main()
