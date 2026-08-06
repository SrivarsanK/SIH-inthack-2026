# Gemini Deep Research Agent

A feature-complete workspace and application integration for the **Gemini Deep Research Agent** powered by Google GenAI Interactions API (`deep-research-preview-04-2026` & `deep-research-max-preview-04-2026`).

## 🌟 Key Features

1. **Dual Agent Support**: `deep-research-preview-04-2026` & `deep-research-max-preview-04-2026`.
2. **Asynchronous Background Execution**: Polling & SSE streaming with automatic reconnection.
3. **Collaborative Planning**: Inspect and refine plan before research execution.
4. **Visualizations**: Auto-generated charts and graphics (`visualization="auto"`).
5. **Tools & Multimodal Inputs**: Google Search, URL Context, Code Execution, MCP Servers, File Search, images, PDFs.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment
Set `GEMINI_API_KEY` in `.env`.

### 3. Web Dashboard
```bash
python server.py
# Open http://localhost:8000
```

### 4. CLI Tool
```bash
python deep_research.py "Research prompt here" --stream
```
