#!/usr/bin/env python3
"""
Research Workflow Orchestrator
Coordinates download, extraction, and analysis workers for research papers.
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any

RESEARCH_DIR = Path(__file__).parent
FINDINGS_DIR = RESEARCH_DIR / "findings"
DOWNLOADS_DIR = RESEARCH_DIR / "downloads"
MARKDOWN_DIR = RESEARCH_DIR / "markdown"

for d in [DOWNLOADS_DIR, MARKDOWN_DIR, FINDINGS_DIR]:
    d.mkdir(parents=True, exist_ok=True)


def extract_pdf_to_markdown(pdf_path: Path) -> str:
    """Convert PDF to Markdown using pymupdf4llm."""
    import pymupdf4llm
    md_text = pymupdf4llm.to_markdown(str(pdf_path))
    return md_text


def extract_methodology(markdown_text: str) -> Dict[str, Any]:
    """Extract methodology section from markdown."""
    lines = markdown_text.split('\n')
    methodology = {
        "experimental_setup": [],
        "variables": [],
        "tools_used": [],
        "datasets": [],
        "metrics": [],
        "raw_sections": []
    }
    
    in_methodology = False
    current_section = ""
    
    for line in lines:
        lower = line.lower()
        if any(kw in lower for kw in ['methodology', 'method', 'experimental setup', 'experiment', 'approach']):
            if '#' in line or '**' in line:
                in_methodology = True
                current_section = line.strip('#* ').strip()
                methodology["raw_sections"].append(current_section)
                continue
        
        if in_methodology and line.startswith('#') and not any(kw in lower for kw in ['method', 'experiment', 'approach', 'setup', 'implementation']):
            in_methodology = False
            continue
            
        if in_methodology and line.strip():
            methodology["raw_sections"].append(line.strip())
            
            # Extract specific elements
            if any(kw in lower for kw in ['dataset', 'data set', 'corpus', 'benchmark']):
                methodology["datasets"].append(line.strip())
            if any(kw in lower for kw in ['metric', 'accuracy', 'f1', 'precision', 'recall', 'bleu', 'rouge']):
                methodology["metrics"].append(line.strip())
            if any(kw in lower for kw in ['tool', 'framework', 'library', 'model', 'gpt', 'bert', 'transformer', 'pytorch', 'tensorflow']):
                methodology["tools_used"].append(line.strip())
            if any(kw in lower for kw in ['variable', 'parameter', 'hyperparameter', 'learning rate', 'batch size', 'epoch']):
                methodology["variables"].append(line.strip())
            if any(kw in lower for kw in ['setup', 'configuration', 'environment', 'hardware', 'gpu', 'cpu']):
                methodology["experimental_setup"].append(line.strip())
    
    # Deduplicate
    for key in methodology:
        if isinstance(methodology[key], list):
            methodology[key] = list(dict.fromkeys(methodology[key]))
    
    return methodology


async def process_paper(pdf_path: Path) -> Dict[str, Any]:
    """Process a single paper: extract markdown, then methodology."""
    print(f"Processing: {pdf_path.name}")
    
    # Extract to markdown
    md_text = extract_pdf_to_markdown(pdf_path)
    
    # Save markdown
    md_path = MARKDOWN_DIR / f"{pdf_path.stem}.md"
    md_path.write_text(md_text, encoding='utf-8')
    print(f"  Saved markdown: {md_path}")
    
    # Extract methodology
    methodology = extract_methodology(md_text)
    
    return {
        "paper": pdf_path.name,
        "markdown_path": str(md_path),
        "methodology": methodology
    }


async def main():
    """Main orchestrator - finds all PDFs and processes them."""
    pdf_files = list(DOWNLOADS_DIR.glob("*.pdf"))
    
    if not pdf_files:
        print(f"No PDFs found in {DOWNLOADS_DIR}")
        print("Place PDF files in research/downloads/ and re-run")
        return
    
    print(f"Found {len(pdf_files)} PDF(s) to process")
    
    all_results = []
    for pdf in pdf_files:
        result = await process_paper(pdf)
        all_results.append(result)
    
    # Save combined findings
    findings_path = FINDINGS_DIR / "methodology_notes.md"
    with open(findings_path, 'w', encoding='utf-8') as f:
        f.write("# Methodology Breakdown\n\n")
        for result in all_results:
            f.write(f"## {result['paper']}\n\n")
            meth = result['methodology']
            
            if meth['experimental_setup']:
                f.write("### Experimental Setup\n")
                for item in meth['experimental_setup']:
                    f.write(f"- {item}\n")
                f.write("\n")
            
            if meth['variables']:
                f.write("### Variables / Hyperparameters\n")
                for item in meth['variables']:
                    f.write(f"- {item}\n")
                f.write("\n")
            
            if meth['tools_used']:
                f.write("### Tools & Frameworks\n")
                for item in meth['tools_used']:
                    f.write(f"- {item}\n")
                f.write("\n")
            
            if meth['datasets']:
                f.write("### Datasets\n")
                for item in meth['datasets']:
                    f.write(f"- {item}\n")
                f.write("\n")
            
            if meth['metrics']:
                f.write("### Metrics\n")
                for item in meth['metrics']:
                    f.write(f"- {item}\n")
                f.write("\n")
            
            f.write("---\n\n")
    
    print(f"\nFindings saved to: {findings_path}")
    
    # Also save raw JSON for programmatic access
    json_path = FINDINGS_DIR / "methodology_raw.json"
    json_path.write_text(json.dumps(all_results, indent=2))
    print(f"Raw JSON saved to: {json_path}")


if __name__ == "__main__":
    asyncio.run(main())