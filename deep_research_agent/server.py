"""
FastAPI Server for Gemini Deep Research Agent Workspace
======================================================
Provides REST endpoints, SSE streaming, file uploads, and Web UI static serving.
"""

import os
import json
import asyncio
import base64
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from deep_research import DeepResearchClient, SUPPORTED_AGENTS

load_dotenv()

app = FastAPI(
    title="Gemini Deep Research Agent API",
    description="API and Workspace for Gemini Deep Research Agent",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared client instance
client = DeepResearchClient()

# Temp upload directory for multimodal inputs
UPLOAD_DIR = Path("./uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


class ResearchRequest(BaseModel):
    prompt: str = Field(..., description="Research query or instruction")
    agent: str = Field("standard", description="'standard' or 'max'")
    collaborative_planning: bool = Field(False, description="Enable plan approval flow")
    visualization: str = Field("auto", description="'auto' or 'off'")
    thinking_summaries: str = Field("auto", description="'auto' or 'none'")
    enable_google_search: bool = True
    enable_url_context: bool = True
    enable_code_execution: bool = True
    mcp_servers: Optional[List[Dict[str, Any]]] = None
    file_search_store_names: Optional[List[str]] = None
    multimodal_attachments: Optional[List[Dict[str, Any]]] = None
    previous_interaction_id: Optional[str] = None


class RefinePlanRequest(BaseModel):
    previous_interaction_id: str
    feedback: str
    collaborative_planning: bool = Field(True, description="Keep True to stay in planning, False to approve & execute")
    agent: str = "standard"


def build_tools_list(req: ResearchRequest) -> Optional[List[Dict[str, Any]]]:
    """Construct tools array based on request payload."""
    tools = []
    if req.enable_google_search:
        tools.append({"type": "google_search"})
    if req.enable_url_context:
        tools.append({"type": "url_context"})
    if req.enable_code_execution:
        tools.append({"type": "code_execution"})

    if req.mcp_servers:
        for mcp in req.mcp_servers:
            tools.append({
                "type": "mcp_server",
                "name": mcp.get("name", "MCP Server"),
                "url": mcp.get("url"),
                "headers": mcp.get("headers", {}),
            })

    if req.file_search_store_names:
        tools.append({
            "type": "file_search",
            "file_search_store_names": req.file_search_store_names,
        })

    return tools if tools else None


@app.post("/api/research/start")
async def start_research(req: ResearchRequest):
    """Start a new deep research background task or request a plan."""
    agent_model = SUPPORTED_AGENTS.get(req.agent, SUPPORTED_AGENTS["standard"])
    tools = build_tools_list(req)

    try:
        interaction = client.create_research_task(
            prompt=req.prompt,
            agent_type=agent_model,
            collaborative_planning=req.collaborative_planning,
            visualization=req.visualization,
            thinking_summaries=req.thinking_summaries,
            tools=tools,
            multimodal_inputs=req.multimodal_attachments,
            previous_interaction_id=req.previous_interaction_id,
        )
        return {
            "status": "success",
            "interaction_id": interaction.id,
            "agent": agent_model,
            "collaborative_planning": req.collaborative_planning,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/research/refine")
async def refine_plan(req: RefinePlanRequest):
    """Refine an existing plan or approve and start research."""
    agent_model = SUPPORTED_AGENTS.get(req.agent, SUPPORTED_AGENTS["standard"])

    try:
        interaction = client.create_research_task(
            prompt=req.feedback,
            agent_type=agent_model,
            collaborative_planning=req.collaborative_planning,
            previous_interaction_id=req.previous_interaction_id,
        )
        return {
            "status": "success",
            "interaction_id": interaction.id,
            "collaborative_planning": req.collaborative_planning,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/research/status/{interaction_id}")
async def check_status(interaction_id: str):
    """Poll interaction status and return result if ready."""
    try:
        result = client.get_interaction(interaction_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/research/stream")
async def sse_stream(
    prompt: str,
    agent: str = "standard",
    collaborative_planning: bool = False,
    visualization: str = "auto",
    previous_interaction_id: Optional[str] = None,
):
    """Server-Sent Events endpoint streaming research thoughts, text, and images."""
    agent_model = SUPPORTED_AGENTS.get(agent, SUPPORTED_AGENTS["standard"])

    async def event_generator():
        try:
            for event in client.stream_research_events(
                prompt=prompt,
                agent_type=agent_model,
                collaborative_planning=collaborative_planning,
                visualization=visualization,
                previous_interaction_id=previous_interaction_id,
            ):
                payload = json.dumps(event)
                yield f"data: {payload}\n\n"
                await asyncio.sleep(0.01)
        except Exception as e:
            error_payload = json.dumps({"type": "error", "error": str(e)})
            yield f"data: {error_payload}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/api/upload")
async def upload_attachment(file: UploadFile = File(...)):
    """Upload multimodal asset (Image / PDF document)."""
    file_path = UPLOAD_DIR / file.filename
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Determine type and mime
    mime_type = file.content_type or "application/octet-stream"
    if mime_type.startswith("image/"):
        item_type = "image"
    elif mime_type == "application/pdf":
        item_type = "document"
    else:
        item_type = "document"

    b64_data = base64.b64encode(content).decode("utf-8")

    return {
        "filename": file.filename,
        "mime_type": mime_type,
        "type": item_type,
        "data": f"data:{mime_type};base64,{b64_data}",
        # Format for Gemini Interactions API:
        "attachment_item": {
            "type": item_type,
            "mime_type": mime_type,
            "data": b64_data,
        },
    }


# Serve static web frontend
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/")
async def root():
    """Serve main dashboard page."""
    index_file = static_dir / "index.html"
    if index_file.exists():
        return HTMLResponse(content=index_file.read_text(encoding="utf-8"))
    return HTMLResponse(
        "<h2>Gemini Deep Research Agent API is Running. UI static files loading...</h2>"
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"\n✨ Launching Gemini Deep Research Dashboard on http://localhost:{port}\n")
    uvicorn.run("server:app", host=host, port=port, reload=True)
