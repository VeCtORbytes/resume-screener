# HireLens — AI Resume Screener
**HireLens** is an AI-powered resume screening platform that analyzes resumes against a job description, scores each candidate, and generates hiring insights to help recruiters shortlist faster.

🔗 **Live demo:** https://resume-screener-cyan-xi.vercel.app

---

## ✨ Features

- Upload a resume (PDF) and match it against any job description
- AI-generated match score and fit analysis for each candidate
- Highlights of matched skills, gaps, and hiring recommendations
- PDF text extraction and parsing on the backend
- Persistent storage of screenings with PostgreSQL / Supabase

---

## 🛠 Tech Stack

- **Frontend:** Next.js, React
- **Backend:** FastAPI (Python)
- **Database:** PostgreSQL, Supabase
- **AI / LLM:** Groq
- **Hosting:** Vercel

---

## 📁 Project Structure

- `frontend/` — Next.js client (upload UI, results dashboard)
- `backend/` — FastAPI service (PDF parsing, scoring, LLM calls)
- `docs/migrations/` — database schema and migrations
---

## ⚙️ Getting Started

### Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```
