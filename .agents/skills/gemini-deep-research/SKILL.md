---
name: gemini-deep-research
description: Conducts multi-step deep research tasks using Gemini Deep Research Agent (Interactions API deep-research-preview-04-2026 & deep-research-max-preview-04-2026). Use when asked to perform deep research, market analysis, due diligence, competitive landscaping, literature reviews, or when the user mentions Gemini Deep Research.
---

# Gemini Deep Research Agent Skill

This skill enables Antigravity to run multi-step, autonomous research tasks using the Gemini Deep Research Agent (`deep-research-preview-04-2026` or `deep-research-max-preview-04-2026`).

## When to Use
Use this skill whenever:
- User asks for multi-step or in-depth research on any complex topic.
- User explicitly mentions "Gemini Deep Research" or "deep research agent".
- A task requires automated web searching, reading, citations, data synthesis, or chart visual generation.

## Execution Options

### Option 1: Python CLI Tool (Recommended for quick reports)

To execute a deep research task synchronously or stream output:

```bash
# Standard Deep Research
python deep_research_agent/deep_research.py "Research topic here" --output report.md

# Comprehensive Deep Research Max
python deep_research_agent/deep_research.py "Research topic here" --agent max --output report.md

# Real-time Streamed Research
python deep_research_agent/deep_research.py "Research topic here" --stream

# Collaborative Planning Mode (Inspects plan before execution)
python deep_research_agent/deep_research.py "Research topic here" --plan
```

### Option 2: Python Client Module in Custom Scripts

```python
import sys
sys.path.append("deep_research_agent")
from deep_research import DeepResearchClient

client = DeepResearchClient()

# Start background task
task = client.create_research_task(
    prompt="Your deep research query",
    agent_type="deep-research-preview-04-2026",
    visualization="auto",
)

# Poll for completion
result = client.poll_for_completion(task.id)

print(result["text"])
```

### Option 3: Launch Interactive Web Dashboard

To launch the web dashboard server for interactive research:

```bash
cd deep_research_agent && python server.py
```
Dashboard will run at `http://localhost:8000`.

## Handling Results & Output
1. Present the main markdown synthesis and citations to the user.
2. If graphics/charts are generated (`result["images"]`), save them as PNG files using `base64.b64decode()` and present clickable image links or markdown embeds.
