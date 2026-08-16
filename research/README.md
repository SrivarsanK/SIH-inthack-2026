# Yara Transit Intelligence — Research & Literature Toolkit

This folder contains background research, literature review extraction pipelines, and synthesized methodology findings for the Yara project.

## Directory Structure

`
research/
├── download_worker.py       # Paper downloader (direct arXiv PDF fetcher)
├── research_workflow.py     # Methodology extractor & parser (PDF -> Markdown -> Structure)
├── run_research_workflow.py # Master orchestrator for full research extraction workflow
├── downloads/               # Raw downloaded academic PDF papers
├── markdown/                # Converted Markdown versions of papers (via pymupdf4llm)
├── findings/                # Extracted methodology notes and structured raw JSON
│   ├── methodology_notes.md
│   └── methodology_raw.json
├── visualizations/          # Generated charts and research figures
│   └── chart_1.png
└── test_report.md           # Benchmark and sample report output
`

## How to Run

`ash
# Run complete research extraction pipeline:
python research/run_research_workflow.py

# Or run individual steps:
python research/download_worker.py
python research/research_workflow.py
`
