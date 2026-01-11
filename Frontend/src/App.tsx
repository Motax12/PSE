import {
  useState,
  useMemo,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import type { ReactElement } from "react";
import axios from "axios";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

type ResultItem = {
  id: string;
  type?: string;
  source: string;
  score: number;
  text: string;
};

const DOC_TYPES = ["pdf", "markdown", "notes"] as const;

function App(): ReactElement {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [types, setTypes] = useState<string[]>([...DOC_TYPES]);
  const [maxAgeDays, setMaxAgeDays] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFilters = useMemo(
    () => types.length !== DOC_TYPES.length || maxAgeDays > 0,
    [types, maxAgeDays],
  );

  const toggleType = (t: string): void => {
    setTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const runSearch = async (): Promise<void> => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const payload = {
        query,
        top_k: 10,
        types: types.length ? types : null,
        max_age_days: maxAgeDays > 0 ? maxAgeDays : null,
        recency_boost: 0.3,
      };

      const res = await axios.post<{ results: ResultItem[] }>(
        `${API_BASE}/search`,
        payload,
        { timeout: 15000 },
      );

      setResults(res.data.results || []);
    } catch (err) {
      console.error(err);
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    if (!e.target.files) return;
    setFiles(Array.from(e.target.files));
  };

  const uploadFiles = async (): Promise<void> => {
    if (!files.length || uploading) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));

      const res = await axios.post<{ files: string[] }>(
        `${API_BASE}/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 60000,
        },
      );
      console.info("Uploaded files:", res.data.files);
      setFiles([]);
    } catch (err) {
      console.error(err);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      void runSearch();
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        margin: 0,
        backgroundColor: "#020617",
        color: "#e5e7eb",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          padding: "16px 16px 32px",
        }}
      >
        {/* Header */}
        <header
          style={{
            padding: "16px 0 24px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(1.8rem, 3vw, 2.4rem)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              marginBottom: 8,
            }}
          >
            Personal Semantic Search Engine
          </h1>
          <p
            style={{
              fontSize: "0.9rem",
              color: "#9ca3af",
              maxWidth: 620,
              margin: "0 auto",
            }}
          >
            Upload your PDFs, markdown files, and notes, then query them with
            semantic search and recency‑aware ranking.
          </p>
        </header>

        {/* Layout */}
        <main
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "1fr",
          }}
        >
          <style>
            {`
              @media (min-width: 900px) {
                main {
                  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.3fr);
                }
              }
            `}
          </style>

          {/* Left column: upload + search */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Upload */}
            <section
              style={{
                padding: 16,
                borderRadius: 12,
                backgroundColor: "#020617",
                border: "1px solid #1f2937",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <h2
                  style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  Upload documents
                </h2>
                <span
                  style={{
                    fontSize: "0.7rem",
                    padding: "2px 8px",
                    borderRadius: 999,
                    backgroundColor: "#022c22",
                    color: "#6ee7b7",
                  }}
                >
                  PDF · MD · TXT
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#9ca3af",
                  marginBottom: 10,
                }}
              >
                New files are indexed into the vector database and become
                searchable within seconds.
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <input
                  type="file"
                  multiple
                  onChange={onFileChange}
                  style={{ fontSize: "0.8rem" }}
                />
                <button
                  onClick={uploadFiles}
                  disabled={uploading || !files.length}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: "none",
                    backgroundColor:
                      uploading || !files.length ? "#4b5563" : "#22c55e",
                    color: "#020617",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor:
                      uploading || !files.length ? "not-allowed" : "pointer",
                  }}
                >
                  {uploading ? "Uploading…" : "Upload & index"}
                </button>
              </div>
              {files.length > 0 && (
                <p
                  style={{
                    marginTop: 6,
                    fontSize: "0.75rem",
                    color: "#a5b4fc",
                    wordBreak: "break-all",
                  }}
                >
                  {files.length} file(s) selected
                </p>
              )}
            </section>

            {/* Search */}
            <section
              style={{
                padding: 16,
                borderRadius: 12,
                backgroundColor: "#020617",
                border: "1px solid #1f2937",
              }}
            >
              <h2
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  margin: "0 0 8px",
                }}
              >
                Search
              </h2>
              <div style={{ marginBottom: 10 }}>
                <input
                  type="text"
                  value={query}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setQuery(e.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  placeholder="Ask something from your uploaded knowledge…"
                  autoComplete="off"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 999,
                    border: "1px solid #374151",
                    backgroundColor: "#020617",
                    color: "#e5e7eb",
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 10,
                  alignItems: "center",
                }}
              >
                {DOC_TYPES.map((t) => (
                  <label
                    key={t}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: "0.8rem",
                      padding: "4px 8px",
                      borderRadius: 999,
                      border: "1px solid #374151",
                      backgroundColor: types.includes(t)
                        ? "#1d4ed8"
                        : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={types.includes(t)}
                      onChange={() => toggleType(t)}
                    />
                    <span>{t.toUpperCase()}</span>
                  </label>
                ))}
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "#9ca3af",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span>Max age (days):</span>
                  <input
                    type="number"
                    min={0}
                    value={maxAgeDays}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setMaxAgeDays(Number(e.target.value) || 0)
                    }
                    style={{
                      width: 70,
                      padding: "2px 4px",
                      borderRadius: 6,
                      border: "1px solid #374151",
                      backgroundColor: "#020617",
                      color: "#e5e7eb",
                      fontSize: "0.8rem",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <button
                  onClick={runSearch}
                  disabled={loading || !query.trim()}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 999,
                    border: "none",
                    backgroundColor:
                      loading || !query.trim() ? "#4b5563" : "#22c55e",
                    color: "#020617",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    cursor:
                      loading || !query.trim()
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {loading ? "Searching…" : "Search"}
                </button>
                {hasFilters && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "#9ca3af",
                    }}
                  >
                    Filters active
                  </span>
                )}
              </div>

              {error && (
                <p
                  style={{
                    marginTop: 8,
                    fontSize: "0.8rem",
                    color: "#f97373",
                  }}
                >
                  {error}
                </p>
              )}
            </section>
          </div>

          {/* Right column: results */}
          <div>
            <section
              style={{
                padding: 16,
                borderRadius: 12,
                backgroundColor: "#020617",
                border: "1px solid #1f2937",
                minHeight: 220,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <h2
                  style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  Results
                </h2>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#9ca3af",
                  }}
                >
                  {results.length
                    ? `${results.length} chunks`
                    : loading
                    ? "Searching…"
                    : "No results"}
                </span>
              </div>

              {!results.length && !loading && (
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "#9ca3af",
                  }}
                >
                  Run a query to see semantic matches from your uploaded
                  documents.
                </p>
              )}

              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {results.map((r) => (
                  <li
                    key={r.id}
                    style={{
                      borderRadius: 10,
                      padding: 10,
                      backgroundColor: "#020617",
                      border: "1px solid #374151",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: 4,
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "#9ca3af",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 6px",
                            borderRadius: 999,
                            backgroundColor: "#1d4ed8",
                            color: "#e5e7eb",
                            fontSize: "0.7rem",
                            marginRight: 6,
                          }}
                        >
                          {r.type?.toUpperCase() || "DOC"}
                        </span>
                        <span>{r.source}</span>
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#a5b4fc",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {r.score.toFixed(3)}
                      </div>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.9rem",
                        color: "#e5e7eb",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {r.text.length > 400
                        ? `${r.text.slice(0, 400)}…`
                        : r.text}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
