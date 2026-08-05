#!/usr/bin/env python3
"""TMDb APIからインド各言語圏の映画・出演俳優を取得し data/movies.json を作る。

再実行すると movies_progress.json (取得済み言語コードを記録) を見て
未取得の言語だけを追加取得する。api_key.txt (1行目にTMDbのAPIキー) が必要。
"""
import concurrent.futures
import json
import os
import time
import urllib.parse
import urllib.request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
API_KEY_FILE = os.path.join(BASE_DIR, "api_key.txt")
MOVIES_FILE = os.path.join(BASE_DIR, "data", "movies.json")
PROGRESS_FILE = os.path.join(BASE_DIR, "movies_progress.json")

TMDB_BASE = "https://api.themoviedb.org/3"
IMAGE_BASE = "https://image.tmdb.org/t/p/w500"

# 言語コード: (言語名, 通称)
LANGUAGES = {
    "hi": ("ヒンディー語", "ボリウッド"),
    "ta": ("タミル語", "コリウッド"),
    "te": ("テルグ語", "トリウッド"),
    "ml": ("マラヤーラム語", "モリウッド"),
    "kn": ("カンナダ語", "サンダルウッド"),
    "bn": ("ベンガル語", "ベンガル映画"),
    "mr": ("マラーティー語", "マラーティー映画"),
    "pa": ("パンジャーブ語", "パンジャーブ映画"),
    "gu": ("グジャラート語", "グジャラート映画"),
}

# あまりに無名な作品(投票0件)は除外する目安。網羅性を優先しつつノイズを減らす
MIN_VOTE_COUNT = 1
MAX_WORKERS = 8
REQUEST_TIMEOUT = 15


def load_api_key():
    if os.environ.get("TMDB_API_KEY"):
        return os.environ["TMDB_API_KEY"].strip()
    if os.path.exists(API_KEY_FILE):
        with open(API_KEY_FILE, "r", encoding="utf-8") as f:
            key = f.readline().strip()
            if key:
                return key
    raise SystemExit(
        f"TMDb APIキーが見つかりません。{API_KEY_FILE} の1行目に書くか、"
        "環境変数 TMDB_API_KEY を設定してください。"
    )


def tmdb_get(path, params, api_key):
    query = dict(params)
    query["api_key"] = api_key
    url = f"{TMDB_BASE}{path}?{urllib.parse.urlencode(query)}"
    req = urllib.request.Request(url, headers={"User-Agent": "indian-cinema-history/1.0"})
    with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
        return json.loads(resp.read().decode("utf-8"))


def discover_movies(lang_code, api_key):
    """指定言語・インド原産の映画を全ページ取得する"""
    results = []
    page = 1
    total_pages = 1
    while page <= total_pages and page <= 500:
        data = tmdb_get(
            "/discover/movie",
            {
                "with_original_language": lang_code,
                "region": "IN",
                "with_origin_country": "IN",
                "sort_by": "popularity.desc",
                "page": page,
                "vote_count.gte": MIN_VOTE_COUNT,
            },
            api_key,
        )
        total_pages = data.get("total_pages", 1)
        results.extend(data.get("results", []))
        page += 1
        time.sleep(0.05)
    return results


def fetch_cast(tmdb_id, api_key, limit=8):
    data = tmdb_get(f"/movie/{tmdb_id}/credits", {}, api_key)
    cast = []
    for c in sorted(data.get("cast", []), key=lambda c: c.get("order", 999))[:limit]:
        cast.append({"name": c.get("name"), "character": c.get("character") or ""})
    return cast


def build_movie_record(raw, lang_code, api_key):
    language_name, industry = LANGUAGES[lang_code]
    release_date = raw.get("release_date") or ""
    try:
        cast = fetch_cast(raw["id"], api_key)
    except Exception as e:
        print(f"  警告: cast取得失敗 tmdb_id={raw['id']}: {e}")
        cast = []
    return {
        "tmdb_id": raw["id"],
        "title": raw.get("title"),
        "original_title": raw.get("original_title"),
        "release_year": int(release_date[:4]) if release_date[:4].isdigit() else None,
        "language_code": lang_code,
        "language_name": language_name,
        "industry": industry,
        "poster": f"{IMAGE_BASE}{raw['poster_path']}" if raw.get("poster_path") else None,
        "overview": raw.get("overview") or "",
        "cast": cast,
        "songs": [],
    }


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
    api_key = load_api_key()
    os.makedirs(os.path.dirname(MOVIES_FILE), exist_ok=True)

    movies_by_id = {m["tmdb_id"]: m for m in load_json(MOVIES_FILE, [])}
    progress = load_json(PROGRESS_FILE, {"done_languages": []})
    done = set(progress["done_languages"])

    for lang_code, (language_name, industry) in LANGUAGES.items():
        if lang_code in done:
            print(f"[{lang_code}] {industry} は取得済みのためスキップ")
            continue

        print(f"[{lang_code}] {industry}({language_name})の映画一覧を取得中...")
        raw_movies = discover_movies(lang_code, api_key)
        print(f"[{lang_code}] {len(raw_movies)}件見つかりました。出演俳優を取得します...")

        new_ids = [r["id"] for r in raw_movies if r["id"] not in movies_by_id]
        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
            future_to_raw = {
                pool.submit(build_movie_record, r, lang_code, api_key): r
                for r in raw_movies
                if r["id"] in new_ids
            }
            count = 0
            for future in concurrent.futures.as_completed(future_to_raw):
                record = future.result()
                movies_by_id[record["tmdb_id"]] = record
                count += 1
                if count % 50 == 0:
                    print(f"  {count}/{len(new_ids)}件処理済み")
                    atomic_write_json(MOVIES_FILE, list(movies_by_id.values()))

        atomic_write_json(MOVIES_FILE, list(movies_by_id.values()))
        done.add(lang_code)
        progress["done_languages"] = list(done)
        atomic_write_json(PROGRESS_FILE, progress)
        print(f"[{lang_code}] 完了。現在の総映画数: {len(movies_by_id)}")

    print(f"すべて完了。合計 {len(movies_by_id)} 本を data/movies.json に保存しました。")


if __name__ == "__main__":
    main()
