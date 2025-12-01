# 数字图书推荐系统工作记录

## 环境与依赖
- 创建并使用 Conda 环境 `lab`（Python 3.10），用 `python -m pip install -r backend/requirements.txt` 安装后端依赖，补充 `certifi` 解决 `httpx` 依赖警告。
- 前端依赖通过 `npm install` 安装；如遇本机代理导致连接失败，需暂时清理 `http_proxy/https_proxy/all_proxy` 后重试，并可指定镜像 `--registry=https://registry.npmmirror.com`。

## 数据与去重
- 核心数据文件：`data/items_sample.csv`。字段：`title, author, subject, year, abstract, tags, availability`。
- `backend/ingest.py` 增加去重与清洗：入库前对关键列去空白，按 `title+author` 去重，避免搜索/推荐出现重复条目。
- Ingest 命令：`conda run -n lab python -m backend.ingest data/items_sample.csv --out ./artifacts`，生成：
  - SQLite 数据库 `recsys.db`（表 `items`、`events`）
  - TF-IDF 稀疏矩阵 `artifacts/item_tfidf.npz`
  - 词表/向量器 `artifacts/tfidf_vocab.json`、`artifacts/tfidf_vectorizer.joblib`

## 扩充真实书目
- 新增脚本 `scripts/fetch_openlibrary.py`：
  - 从 OpenLibrary 的 search API 按多个学科抓取英文书目，随机可借状态，截取年份。
  - 保留最初的 40 本种子书目，去重后填充到目标 3000 本。
  - 运行：`conda run -n lab python scripts/fetch_openlibrary.py`（需网络），写回 `data/items_sample.csv`。
- 已运行脚本，当前数据集 3000 本，`backend.ingest` 已重刷；数据库去重检查为 0。

## 推荐逻辑概览
- 搜索 `/search`：按标题/摘要模糊匹配。
- 推荐 `/recommend`（`backend/recommender.py`）：
  - 用户画像：基于反馈 `events` 取相关条目的 TF-IDF 向量求平均；无画像时用查询向量或全局均值冷启动。
  - 打分：相似度、反馈人气、出版年新鲜度、可借标志归一化后线性加权（0.5/0.2/0.2/0.1）。
  - 排序：按得分降序，限制同一作者最多 2 本，返回理由标签。
  - 反馈：`POST /feedback` 写入 `events`，影响后续推荐。

## 启动与验证
- 后端：`cd backend && conda activate lab && uvicorn backend.app:app --reload --port 8000`。
- 前端：`cd frontend && npm install && npm run dev`（默认 5173，已代理到 8000）。
- 数据校验示例：`sqlite3 recsys.db "SELECT COUNT(*) FROM items;"`（当前 3000 条）；重复检查 `SELECT COUNT(*) FROM (SELECT title, author, COUNT(*) FROM items GROUP BY title, author HAVING COUNT(*)>1);`.

## 当前成果
- 数据集已扩充到 3000 本真实书目，并完成去重。
- 推荐管线可基于最新数据和 TF-IDF 特征工作，反馈会实时写入 `events` 并影响推荐。
