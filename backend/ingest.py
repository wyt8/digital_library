import pandas as pd
import numpy as np
import scipy.sparse as sp
from sklearn.feature_extraction.text import TfidfVectorizer
from sqlalchemy.orm import Session
from .database import engine, Base, SessionLocal
from .models import Item
from pathlib import Path
import argparse, json
from joblib import dump  # ✅ 新增

def build_corpus(rows):
    return (rows['title'].fillna('') + ' ' +
            rows['abstract'].fillna('') + ' ' +
            rows['tags'].fillna('')).tolist()

def main(csv_path: str, out_dir: str = "./artifacts"):
    Base.metadata.create_all(bind=engine)
    df = pd.read_csv(csv_path)

    # 先做去重与去空白，避免 CSV 中重复条目导致检索时看到重复结果
    for col in ["title","author","subject","abstract","tags","availability"]:
        if col in df.columns:
            df[col] = df[col].fillna("").astype(str).str.strip()
    df = df.drop_duplicates(subset=["title","author"], keep="first").reset_index(drop=True)

    with SessionLocal() as db:
        db.query(Item).delete()
        db.commit()
        for r in df.to_dict(orient="records"):
            db.add(Item(**{
                "title": r.get("title",""),
                "author": r.get("author",""),
                "subject": r.get("subject",""),
                "year": r.get("year"),
                "abstract": r.get("abstract",""),
                "tags": r.get("tags",""),
                "availability": r.get("availability","available")
            }))
        db.commit()

    corpus = build_corpus(df)
    vec = TfidfVectorizer(max_features=50000, ngram_range=(1,2))
    X = vec.fit_transform(corpus)  # ✅ 这里 fit 了，vec 里有 idf_

    Path(out_dir).mkdir(parents=True, exist_ok=True)
    sp.save_npz(f"{out_dir}/item_tfidf.npz", X)

    # 若你还想单独保留词表也行（已处理 np.int64）
    with open(f"{out_dir}/tfidf_vocab.json", "w", encoding="utf-8") as f:
        json.dump(vec.vocabulary_, f, ensure_ascii=False, default=int)

    # ✅ 关键：把“已拟合”的 vectorizer 一并保存
    dump(vec, f"{out_dir}/tfidf_vectorizer.joblib")

    print("Ingest done:", X.shape)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("csv", help="path to items csv")
    parser.add_argument("--out", default="./artifacts")
    args = parser.parse_args()
    main(args.csv, args.out)
