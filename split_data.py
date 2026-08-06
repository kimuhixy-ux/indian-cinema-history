#!/usr/bin/env python3
"""data/movies.json(全項目入りのマスターデータ)から、フロントエンド用の
軽量ファイル群を生成する。

- data/movies-index.json: 一覧画面用。タイトル・年・地域・ポスター・主演1名のみ
- data/movies/<tmdb_id>.json: 詳細画面用。俳優全員・楽曲を含むフルデータ

一覧画面の初期ロードを軽くするため、俳優全員の名前やあらすじなど
サイズの大きいフィールドはindexに含めない(詳細ページを開いたときだけ
該当する1本分のJSONを取得する)。
"""
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MOVIES_FILE = os.path.join(BASE_DIR, "data", "movies.json")
INDEX_FILE = os.path.join(BASE_DIR, "data", "movies-index.json")
DETAIL_DIR = os.path.join(BASE_DIR, "data", "movies")


def atomic_write_json(path, data):
    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp_path, path)


def main():
    with open(MOVIES_FILE, "r", encoding="utf-8") as f:
        movies = json.load(f)

    os.makedirs(DETAIL_DIR, exist_ok=True)

    index = []
    for movie in movies:
        lead_actor = movie["cast"][0]["name"] if movie.get("cast") else None
        index.append({
            "tmdb_id": movie["tmdb_id"],
            "title": movie["title"],
            "release_year": movie["release_year"],
            "language_code": movie["language_code"],
            "industry": movie["industry"],
            "poster": movie["poster"],
            "lead_actor": lead_actor,
        })
        atomic_write_json(os.path.join(DETAIL_DIR, f"{movie['tmdb_id']}.json"), movie)

    atomic_write_json(INDEX_FILE, index)
    print(f"{len(movies)}本を data/movies-index.json + data/movies/*.json に出力しました。")


if __name__ == "__main__":
    main()
