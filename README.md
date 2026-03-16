# TaskArena 2.0

> **A high-performance productivity ecosystem for students.**

TaskArena 2.0 is a next-generation desktop application designed to streamline student workflows through AI-powered tutoring, smart scheduling, integrated task management, and gamified learning experiences. Built with a CLI-first philosophy and a robust Tauri frontend, it provides a seamless, offline-capable productivity environment.

---

## 🚀 Vision

Empowering students with a unified toolkit that combines organizational efficiency with advanced AI assistance, ensuring focus and academic excellence.

## ✨ Core Features

- **AI Tutor (Jarvis):** A RAG-powered chatbot utilizing local (Qwen) or cloud (Groq/Ollama) LLMs for context-aware assistance.
- **Smart Scheduling:** Advanced algorithm to balance study, tasks, and personal time.
- **Knowledge Base:** Dynamic note-taking and quiz generation from course materials.
- **Gamification:** Leaderboards and performance tracking to maintain motivation.
- **Cross-Platform:** High-performance desktop experience built on Tauri 2 and React.

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui.
- **Desktop Bridge:** [Tauri 2](https://tauri.app/) (Rust).
- **Backend:** FastAPI, SQLAlchemy, SQLite, Alembic.
- **AI Infrastructure:** Python-based RAG pipeline with support for Qwen2.5, Groq, and Ollama.

## 📖 Documentation

Detailed documentation is available in the `docs/` directory:

- [Project Plan](docs/PLAN.md) - Goals, scope, and non-negotiables.
- [Architecture](docs/ARCHITECTURE.md) - System design and folder structure.
- [Database Schema](docs/DATABASE.md) - Relationships and data flow.
- [AI & RAG Guide](docs/AI_GUIDE.md) - LLM setup and tuning details.
- [API Reference](docs/API.md) - FastAPI endpoint documentation.
- [Legacy README (v1/Internal)](docs/README_OLD.md) - Detailed internal setup and CLI guides.

## ⚖️ License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

Developed by **Raghav Sethi**
