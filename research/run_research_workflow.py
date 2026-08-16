#!/usr/bin/env python3
"""
Master Orchestrator - Runs the full research workflow:
1. Download Worker - fetches papers via Playwright
2. Extraction Worker - converts PDFs to Markdown via pymupdf4llm
3. Analysis Worker - extracts methodology
4. Synthesis - presents final breakdown
"""

import asyncio
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent


def run_script(script_name: str, description: str) -> bool:
    """Run a Python script and return success status."""
    print(f"\n{'='*60}")
    print(f"PHASE: {description}")
    print(f"{'='*60}")
    
    script_path = ROOT / script_name
    if not script_path.exists():
        print(f"ERROR: {script_path} not found")
        return False
    
    try:
        result = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=False,
            text=True
        )
        return result.returncode == 0
    except Exception as e:
        print(f"ERROR running {script_name}: {e}")
        return False


async def main():
    print("RESEARCH WORKFLOW ORCHESTRATOR")
    print("="*60)
    
    # Phase 1: Download papers
    print("\n[1/3] Starting Download Worker (Playwright)...")
    success = run_script("download_worker.py", "Download Papers via Playwright")
    if not success:
        print("WARNING: Download phase had issues, continuing with existing files...")
    
    # Phase 2: Extract and analyze
    print("\n[2/3] Starting Extraction & Analysis Worker (pymupdf4llm)...")
    success = run_script("research_workflow.py", "Extract & Analyze Methodologies")
    if not success:
        print("ERROR: Extraction phase failed")
        return
    
    # Phase 3: Present findings
    print("\n[3/3] Synthesis - Reading findings...")
    findings_path = ROOT / "findings" / "methodology_notes.md"
    if findings_path.exists():
        content = findings_path.read_text(encoding='utf-8')
        print("\n" + "="*60)
        print("FINAL METHODOLOGY BREAKDOWN")
        print("="*60)
        print(content[:5000] + ("..." if len(content) > 5000 else ""))
        print(f"\nFull findings saved to: {findings_path}")
    else:
        print("No findings generated")


if __name__ == "__main__":
    asyncio.run(main())