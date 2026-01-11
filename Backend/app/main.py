from typing import List, Optional
import time
from pathlib import Path

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from .config import (
    CHROMA_DIR,
    EMBEDDING_MODEL_NAME,
    COLLECTION_NAME,
    DATA_DIR,
)
from .ingest import ingest_folder


app = FastAPI(title="Personal Semantic Search Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = chromadb.Client(
    Settings(
        persist_directory=str(CHROMA_DIR),
        is_persistent=True,
    )
)
collection = client.get_or_create_collection(COLLECTION_NAME)
embedder = SentenceTransformer(EMBEDDING_MODEL_NAME)


class SearchRequest(BaseModel):
    query: str
    top_k: int = 10
    types: Optional[List[str]] = None  # ["pdf", "markdown", "notes"]
    max_age_days: Optional[int] = None  # recency filter
    recency_boost: float = 0.3  # 0–1, how strong to weight recency


def compute_recency_weight(mtime: float, max_age_days: Optional[int]) -> float:
    if max_age_days is None:
        return 1.0
    now = time.time()
    age_days = (now - mtime) / 86400
    if age_days < 0:
        return 1.0
    if age_days > max_age_days:
        return 0.2
    return 1.0 - (age_days / (max_age_days + 1e-6)) * 0.8  # 1 → 0.2


@app.post("/search")
def search(req: SearchRequest):
    q_emb = embedder.encode(req.query)

    where = {}
    if req.types:
        where["type"] = {"$in": req.types}
    if req.max_age_days is not None:
        cutoff = time.time() - req.max_age_days * 86400
        where["mtime"] = {"$gte": cutoff}

    result = collection.query(
        query_embeddings=[q_emb.tolist()],
        n_results=req.top_k,
        where=where or None,
        include=["documents", "metadatas", "distances"],
    )

    ids = result.get("ids", [[]])[0]
    docs = result.get("documents", [[]])[0]
    metas = result.get("metadatas", [[]])[0]
    distances = result.get("distances", [[]])[0]

    scored = []
    for i, d, m, dist in zip(ids, docs, metas, distances):
        base_score = 1.0 - dist
        recency_weight = compute_recency_weight(m.get("mtime", time.time()), req.max_age_days)
        final_score = (
            (1 - req.recency_boost) * base_score
            + req.recency_boost * base_score * recency_weight
        )

        scored.append(
            {
                "id": i,
                "text": d,
                "source": m.get("source"),
                "type": m.get("type"),
                "path": m.get("path"),
                "score": final_score,
            }
        )

    scored.sort(key=lambda x: x["score"], reverse=True)

    return {"results": scored}


@app.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    saved_paths: List[Path] = []
    try:
        for f in files:
            ext = Path(f.filename).suffix.lower()
            if ext not in [".pdf", ".md", ".txt"]:
                raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

            if ext == ".pdf":
                target_dir = DATA_DIR / "pdfs"
            elif ext == ".md":
                target_dir = DATA_DIR / "markdown"
            else:
                target_dir = DATA_DIR / "notes"

            target_dir.mkdir(parents=True, exist_ok=True)
            target_path = target_dir / f.filename

            content = await f.read()
            target_path.write_bytes(content)
            saved_paths.append(target_path)

        # Simple approach: re‑ingest the whole folder
        ingest_folder()

        return {"status": "ok", "files": [p.name for p in saved_paths]}
    finally:
        for f in files:
            await f.close()


# Mount static files for frontend
static_path = Path(__file__).parent.parent.parent / "Frontend" / "dist"
if static_path.exists():
    app.mount("/assets", StaticFiles(directory=static_path / "assets"), name="assets")
    
    @app.get("/")
    async def serve_frontend():
        return FileResponse(static_path / "index.html")
    
    # Catch-all route for SPA (must be last, excludes /api, /docs, /openapi.json, /redoc)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Exclude API routes from catch-all
        if full_path.startswith(("docs", "openapi.json", "redoc", "search", "upload")):
            return {"error": "Not found"}
        
        file_path = static_path / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(static_path / "index.html")
