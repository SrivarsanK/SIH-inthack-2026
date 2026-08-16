#!/usr/bin/env python3
"""
Download Worker - Uses requests to download publicly accessible research papers.
Faster and more reliable for direct PDF URLs.
"""

import asyncio
import json
from pathlib import Path
import aiohttp

RESEARCH_DIR = Path(__file__).parent
DOWNLOADS_DIR = RESEARCH_DIR / "downloads"
DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Publicly accessible paper sources (arXiv direct PDFs)
PAPER_SOURCES = [
    {
        "name": "arXiv - Attention Is All You Need",
        "url": "https://arxiv.org/pdf/1706.03762.pdf",
        "filename": "attention_is_all_you_need.pdf"
    },
    {
        "name": "arXiv - BERT",
        "url": "https://arxiv.org/pdf/1810.04805.pdf",
        "filename": "bert.pdf"
    },
    {
        "name": "arXiv - GPT-3",
        "url": "https://arxiv.org/pdf/2005.14165.pdf",
        "filename": "gpt3.pdf"
    },
    {
        "name": "arXiv - LoRA",
        "url": "https://arxiv.org/pdf/2106.09685.pdf",
        "filename": "lora.pdf"
    },
    {
        "name": "arXiv - Chain of Thought",
        "url": "https://arxiv.org/pdf/2201.11903.pdf",
        "filename": "chain_of_thought.pdf"
    },
    {
        "name": "arXiv - RAG",
        "url": "https://arxiv.org/pdf/2005.11401.pdf",
        "filename": "rag.pdf"
    },
    {
        "name": "arXiv - Diffusion Models",
        "url": "https://arxiv.org/pdf/2006.11239.pdf",
        "filename": "diffusion_models.pdf"
    },
    {
        "name": "arXiv - Vision Transformer",
        "url": "https://arxiv.org/pdf/2010.11929.pdf",
        "filename": "vit.pdf"
    },
]


async def download_paper(session: aiohttp.ClientSession, source: dict) -> bool:
    """Download a single paper using aiohttp."""
    url = source["url"]
    filename = source["filename"]
    filepath = DOWNLOADS_DIR / filename
    
    if filepath.exists():
        print(f"  Already exists: {filename}")
        return True
    
    print(f"  Downloading: {source['name']}")
    
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=120)) as response:
            if response.status == 200:
                content = await response.read()
                filepath.write_bytes(content)
                print(f"  Saved: {filename} ({len(content) / 1024 / 1024:.1f} MB)")
                return True
            else:
                print(f"  Failed: HTTP {response.status}")
                return False
    except Exception as e:
        print(f"  Failed: {source['name']} - {e}")
        return False


async def main():
    """Download all papers."""
    print("Starting paper downloads...")
    print(f"Download directory: {DOWNLOADS_DIR}")
    
    import ssl
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    connector = aiohttp.TCPConnector(limit=3, ssl=ssl_context)
    timeout = aiohttp.ClientTimeout(total=300)
    
    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        # Download with controlled concurrency
        semaphore = asyncio.Semaphore(3)
        
        async def bounded_download(source):
            async with semaphore:
                return await download_paper(session, source)
        
        tasks = [bounded_download(source) for source in PAPER_SOURCES]
        results = await asyncio.gather(*tasks)
    
    # Summary
    successful = sum(results)
    result_list = [{"source": s["name"], "success": r} for s, r in zip(PAPER_SOURCES, results)]
    
    print(f"\nDownloaded: {successful}/{len(results)} papers")
    
    # Save manifest
    manifest_path = DOWNLOADS_DIR / "manifest.json"
    manifest_path.write_text(json.dumps(result_list, indent=2))
    print(f"Manifest saved: {manifest_path}")


if __name__ == "__main__":
    asyncio.run(main())