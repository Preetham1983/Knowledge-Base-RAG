#  Knowledge Base RAG — Intelligent PDF Q&A

> **Interact  with your documents like you're talking to the author.**
> Upload any PDF, and this app will understand it, summarize it, and answer your questions — powered by a production-grade Retrieval-Augmented Generation pipeline running entirely on your local machine.

No API keys. No cloud dependency. Just your PDFs and a thoughtfully engineered RAG system.

##  Project Structure

```
knowledge-base-rag/
├── backend/
│   └── app.py              # Flask backend — RAG pipeline, PDF processing, LLM calls
├── my-app/
│   ├── src/
│   │   ├── App.js           # Main React component — layout and routing
│   │   ├── App.css          # Grid layout, responsive design
│   │   ├── index.css        # Global styles, CSS variables, theme
│   │   └── components/
│   │       ├── FileUpload.js   # PDF upload + summary generation
│   │       ├── FileUpload.css
│   │       ├── QueryForm.js    # Question input form
│   │       ├── QueryForm.css
│   │       ├── Response.js     # Chat-style response display
│   │       ├── Response.css
│   │    
│   ├── public/
│   ├── package.json
│   └── requirements.txt    # Python dependencies
├── faiss_index/             # Auto-generated FAISS index (after upload)
└── README.md
```

---
---

##  What This Project Does

Knowledge Base RAG is a full-stack application where you can:

- **Upload PDF** and have them instantly chunked, embedded, and indexed.
- **Ask natural language questions** about your documents and get accurate, grounded answers.
- **Generate document summaries** with a single click.
- **See the AI think in real time** — with a chat-style interface that shows user questions and AI responses.

The whole thing runs locally using **Llama 3.1** via Ollama, so your data never leaves your machine.

---

##  Why I Built the RAG Pipeline This Way

Most RAG tutorials show you the bare minimum — embed text, do a similarity search, throw it at an LLM, and call it a day. That works for demos, but it falls apart fast with real documents. Here's the thing: **a single retrieval strategy is never good enough**.

I wanted something that actually works on messy, real-world PDFs — research papers, technical docs, reports with mixed formatting. So I designed a multi-stage retrieval pipeline that combines the strengths of different search paradigms and uses a refinement loop to improve answer quality.

Here's the full flow, and *why* each piece matters:

###  Stage 1: Hybrid Search (BM25 + FAISS Vector Search)

When a user asks a question, we don't just do one type of search — we run **two fundamentally different retrieval strategies** in parallel:

| Retriever | What it does | Good at |
|-----------|-------------|---------|
| **FAISS (Vector Search)** | Converts the query into an embedding and finds semantically similar chunks | Understanding *meaning* — catches paraphrased content, synonyms, conceptual matches |
| **BM25 (Keyword Search)** | Classic TF-IDF style term-frequency matching | Exact matches — names, acronyms, IDs, specific terms that embeddings sometimes miss |

**Why hybrid?** Because neither alone is reliable enough. Vector search is amazing at "what does this mean?" but terrible at "find the paragraph that mentions GPU's RTX and H100." BM25 nails exact keyword hits but completely misses semantically related content. Together, they cover each other's blind spots.

We pull the **top 5 results from each retriever**, combine them, and deduplicate — giving us a broad, diverse candidate pool of not exactly but roughly 7-10 unique chunks.

###  Stage 2: Cross-Encoder Reranking

Here's the problem with Stage 1: we have ~7 to 10 candidate chunks, but not all of them are equally relevant. Vector similarity and BM25 scores aren't directly comparable, and both can return false positives.
there will be relevant chunks and half relevant chunks and some are completely irrelevant 

So after the initial retrieval, we run every candidate through a **Cross-Encoder reranker** (`cross-encoder/ms-marco-MiniLM-L-6-v2`). Unlike the bi-encoder used for embedding search, a cross-encoder takes the *full question-document pair* as input and scores their relevance together. It's slower (which is why we don't use it for initial retrieval), but it's dramatically more accurate at ranking.

We sort by relevance score and **keep only the top 3 chunks**. This is crucial — feeding the LLM fewer, higher-quality chunks leads to better answers than dumping everything in and hoping for the best.

```
User Question
     │
     ├──→ FAISS (top 5 semantic matches)  ──┐
     │                                       ├──→ Combine + Deduplicate ──→ Cross-Encoder Rerank ──→ Top 3 Chunks
     └──→ BM25  (top 5 keyword matches)  ──┘
```

###  Stage 3: 2-Pass RAG Generation

Even after retrieving the best chunks, I don't just throw them at the LLM once and show the result. The pipeline uses a **2-pass generation** approach:

**Pass 1 — Base Answer:**
The LLM (Llama 3.1) gets the top 3 reranked chunks as context and generates an initial answer. The prompt is deliberately strict:
- Only use information from the provided context
- If the answer isn't in the context, say so explicitly
- No hallucination allowed

**Pass 2 — Refinement:**
The initial answer goes *back* to the LLM along with the original context for a refinement pass. This second pass:
- Tightens the language and removes filler
- Catches any subtle hallucinations from Pass 1
- Improves clarity and conciseness
- Double-checks against the source context

The user sees the refined answer. The raw first-pass answer is also returned to the frontend (for debugging or comparison if needed).

**Why 2-pass instead of just one?** Because LLMs often "warm up" on a topic — the first answer is usually correct but rambling or slightly off-focus. The refinement pass is like a built-in editor that cleans things up. It's a simple technique that consistently improves output quality without any extra infrastructure.

###  The Complete Pipeline

```
📄 PDF Upload
     │
     ▼
┌──────────────────┐
│  Text Extraction │  (PyPDF2)
│  + Chunking      │  (RecursiveCharacterTextSplitter, 350 chars, 120 overlap)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  FAISS Indexing   │  (sentence-transformers/all-MiniLM-L6-v2)
│  + Persist Index  │
└──────────────────┘

         ... user asks a question ...

┌──────────────────────────────────────────────────┐
│                 HYBRID RETRIEVAL                  │
│                                                   │
│  FAISS Vector Search (top 5)                      │
│       +                                           │
│  BM25 Keyword Search (top 5)                      │
│       ↓                                           │
│  Combine + Deduplicate (~7-10 unique chunks)      │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│              CROSS-ENCODER RERANKING              │
│  (cross-encoder/ms-marco-MiniLM-L-6-v2)          │
│       ↓                                           │
│  Select Top 3 highest-relevance chunks            │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│             2-PASS LLM GENERATION                 │
│                                                   │
│  Pass 1: Base answer (strict grounding prompt)    │
│  Pass 2: Refinement (cleaner, more accurate)      │
│                                                   │
│  Model: Llama 3.1 (via Ollama, runs locally)      │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
              💬 Response
```

---

##  Frontend

The frontend is a **React** application with a clean, modern interface inspired by chat applications. It has three main sections:

### Upload Panel (Left Side)
- Drag-and-drop or click to select PDF files (supports multiple file upload)
- Shows a list of selected files with clickable previews
- "Upload & Process" button triggers backend indexing
- After upload, a "Summarize PDF" button generates an AI-powered document summary

### Chat Interface (Right Side)
- Clean conversation-style layout with user and AI message bubbles
- Loading animation while the RAG pipeline processes
- Displays the retrieved PDF context below the answer for transparency

### Query Input (Bottom)
- Simple input field with "Ask Question" button
- Input validation — won't submit empty questions
- Clears after submission for fast follow-up questions

The layout is **fully responsive** — on desktop it's a two-column grid (upload panel on the left, chat + query on the right), and on mobile everything stacks vertically.


##  Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **LLM** | Llama 3.1 latest 8b (via Ollama) | Local, private language model for generation |
| **Embeddings** | `sentence-transformers/all-MiniLM-L6-v2` | Fast, lightweight sentence embeddings |
| **Vector Store** | FAISS | Facebook's  AI similarity search |
| **Keyword Search** | BM25 (via LangChain) | Classic term-frequency retrieval |
| **Reranker** | `cross-encoder/ms-marco-MiniLM-L-6-v2` | Accurate relevance scoring for candidate reranking |
| **Backend** | Flask + Flask-CORS | REST API serving the RAG pipeline |
| **Frontend** | React 19 | Modern chat-style user interface |
| **PDF Parsing** | PyPDF2 | Reliable PDF text extraction |
| **Text Splitting** | LangChain RecursiveCharacterTextSplitter | Intelligent chunking with overlap |


---

##  Getting Started

### Prerequisites

Make sure you have these installed:

- **Node.js** (v16 or later) — [Download](https://nodejs.org/)
- **Python** (3.9 or later) — [Download](https://www.python.org/)
- **Ollama** — [Download](https://ollama.com/) — for running Llama 3.1 locally
- **MongoDB** (optional, for query history) — [Download](https://www.mongodb.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/Preetham1983/knowledge-base-rag.git
cd knowledge-base-rag
```

### 2. Pull the Llama 3.1 Model

```bash
ollama pull llama3.1
```

> This downloads the Llama 3.1 model (4.9 GB). It runs entirely on your machine — no internet needed after the initial download.

### 3. Set Up the Backend

```bash
cd my-app

# Create a virtual environment (recommended)
python -m venv venv

# Activate it
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### 4. Install Frontend Dependencies

```bash
# Still inside my-app/
npm install
```

### 5. (Optional) Set Up MongoDB for Query History

If you want to persist question-answer history:

```bash
# Make sure MongoDB is running locally on port 27017
cd ../mongobackend
npm install
node server.js
```

### 6. Start the App

Open **two terminals**:

**Terminal 1 — Backend (Flask):**
```bash
cd my-app
python ../backend/app.py
```
> The backend starts on `http://localhost:5000`

**Terminal 2 — Frontend (React):**
```bash
cd my-app
npm start
```
> The frontend opens at `http://localhost:3000`

---

##  How to Use

1. **Upload a PDF** — Click "Choose File(s)" in the left panel, select one or more PDFs, then hit "Upload & Process." The app will extract text, chunk it, and build the FAISS index.

2. **Generate a Summary** *(optional)* — After uploading, click "Summarize PDF" to get an AI-generated overview of your document.

3. **Ask Questions** — Type your question in the input box at the bottom and click "Ask Question." The RAG pipeline will retrieve relevant chunks, rerank them, and generate a grounded answer.

4. **Read the Response** — The AI's answer appears in a chat bubble. If the answer isn't in in the document, the AI will tell you honestly instead of making something up.

---



##  Why Hybrid Search + Reranking Instead of Graph RAG?

I specifically chose **Hybrid RAG with reranking** over something more complex like Graph RAG, and here's my honest reasoning:

**1. The use case doesn't need entity graphs.**
Graph RAG shines when you need to trace relationships between entities (people, places, events) across large knowledge bases. For querying PDF documents where you need factual answers from specific passages, a strong retrieval + reranking pipeline is more effective and way simpler to build and debug.

**2. Speed matters.**
Graph RAG adds significant overhead — entity extraction, graph construction, traversal queries. My hybrid pipeline processes queries in seconds on a modest machine. For an interactive Q&A tool, response time is everything.

**3. BM25 + Vector + Reranking is genuinely powerful.**
This isn't a shortcut. Research papers ([Nogueira et al.](https://arxiv.org/abs/1901.04085), [MS MARCO benchmarks](https://microsoft.github.io/msmarco/)) consistently show that a hybrid first-stage retriever paired with a cross-encoder reranker matches or outperforms much more complex systems on passage retrieval tasks. Adding the 2-pass generation on top pushes answer quality even further.

**4. It's debuggable.**
When something goes wrong (and it will), I can inspect each stage independently — check what BM25 returned, what FAISS returned, how the reranker scored them, what the first pass generated vs. the refinement. With Graph RAG, debugging is a nightmare.

---

##  Contributing

This is a personal project, but I'm always open to ideas. If you find a bug or have a suggestion:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-idea`)
3. Commit your changes
4. Push and open a Pull Request

---

##  License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built with ☕ and a lot of reading about retrieval strategies.<br/>
  If you found this useful, feel free to ⭐ the repo!
</p>
