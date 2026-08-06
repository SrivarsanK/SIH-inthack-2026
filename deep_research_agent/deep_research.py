"""
Gemini Deep Research Agent Client Module & CLI Tool
===================================================
Provides asynchronous background execution, collaborative planning, tool configuration,
multimodal input support, visualization extraction, and streaming with reconnect capability.
"""

import os
import sys
import time
import base64
import argparse
from pathlib import Path
from typing import Dict, Any, List, Optional, Union, Generator, Tuple
from dotenv import load_dotenv

load_dotenv()

try:
    from google import genai
except ImportError:
    genai = None

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

SUPPORTED_AGENTS = {
    "standard": "deep-research-preview-04-2026",
    "max": "deep-research-max-preview-04-2026",
}


class DeepResearchClient:
    """Wrapper around Gemini Interactions API for Deep Research Agent."""

    def __init__(self, api_key: Optional[str] = None):
        if genai is None:
            raise ImportError(
                "google-genai package is required. Install via `pip install google-genai`."
            )
        
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            # Fall back to default client configuration (environment variable GEMINI_API_KEY)
            self.client = genai.Client()

    def create_research_task(
        self,
        prompt: str,
        agent_type: str = "deep-research-preview-04-2026",
        collaborative_planning: bool = False,
        visualization: str = "auto",
        thinking_summaries: str = "auto",
        tools: Optional[List[Dict[str, Any]]] = None,
        multimodal_inputs: Optional[List[Dict[str, Any]]] = None,
        previous_interaction_id: Optional[str] = None,
        stream: bool = False,
    ):
        """
        Starts a background deep research task.

        Args:
            prompt: Text prompt / research query.
            agent_type: Model name ('deep-research-preview-04-2026' or 'deep-research-max-preview-04-2026').
            collaborative_planning: Enable plan review before research execution.
            visualization: Enable visual graph/chart generation ('auto' or 'off').
            thinking_summaries: Enable thought reasoning summaries ('auto' or 'none').
            tools: Specific tools override (e.g., google_search, url_context, code_execution, mcp_server, file_search).
            multimodal_inputs: Additional image or document input payloads.
            previous_interaction_id: ID for plan refinement or follow-up query.
            stream: Whether to request SSE streaming.

        Returns:
            Interaction response or Stream object.
        """
        agent_config = {
            "type": "deep-research",
            "thinking_summaries": thinking_summaries,
            "visualization": visualization,
            "collaborative_planning": collaborative_planning,
        }

        # Build input structure
        if multimodal_inputs:
            input_payload = [{"type": "text", "text": prompt}]
            input_payload.extend(multimodal_inputs)
        else:
            input_payload = prompt

        kwargs: Dict[str, Any] = {
            "agent": agent_type,
            "input": input_payload,
            "agent_config": agent_config,
            "background": True,
        }

        if tools is not None:
            kwargs["tools"] = tools

        if previous_interaction_id:
            kwargs["previous_interaction_id"] = previous_interaction_id

        if stream:
            kwargs["stream"] = True

        return self.client.interactions.create(**kwargs)

    def poll_for_completion(
        self,
        interaction_id: str,
        poll_interval: float = 5.0,
        callback: Optional[callable] = None,
    ) -> Dict[str, Any]:
        """
        Polls an interaction until completed or failed.

        Args:
            interaction_id: The ID of the research task.
            poll_interval: Time in seconds between polling calls.
            callback: Optional status update callback.

        Returns:
            Dict containing final report text, status, steps, and generated images.
        """
        while True:
            interaction = self.client.interactions.get(interaction_id)
            if callback:
                callback(interaction.status)

            if interaction.status in ("completed", "failed", "cancelled"):
                return self.parse_interaction_result(interaction)

            time.sleep(poll_interval)

    def stream_research_events(
        self,
        prompt: str,
        agent_type: str = "deep-research-preview-04-2026",
        collaborative_planning: bool = False,
        visualization: str = "auto",
        tools: Optional[List[Dict[str, Any]]] = None,
        multimodal_inputs: Optional[List[Dict[str, Any]]] = None,
        previous_interaction_id: Optional[str] = None,
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Streams research progress events with auto-reconnection logic.

        Yields dictionaries with event metadata:
        - {"type": "created", "id": interaction_id}
        - {"type": "thought", "text": thinking_delta}
        - {"type": "text", "text": text_delta}
        - {"type": "image", "data": base64_data}
        - {"type": "status", "status": status_name}
        - {"type": "completed", "result": final_parsed_result}
        """
        interaction_id = None
        last_event_id = None
        is_complete = False

        stream = self.create_research_task(
            prompt=prompt,
            agent_type=agent_type,
            collaborative_planning=collaborative_planning,
            visualization=visualization,
            thinking_summaries="auto",
            tools=tools,
            multimodal_inputs=multimodal_inputs,
            previous_interaction_id=previous_interaction_id,
            stream=True,
        )

        def handle_stream(stream_obj):
            nonlocal interaction_id, last_event_id, is_complete
            for event in stream_obj:
                if hasattr(event, "event_type") and event.event_type == "interaction.created":
                    interaction_id = event.interaction.id
                    yield {"type": "created", "id": interaction_id}

                if hasattr(event, "event_id") and event.event_id:
                    last_event_id = event.event_id

                if hasattr(event, "event_type") and event.event_type == "step.delta":
                    if hasattr(event, "delta"):
                        d_type = getattr(event.delta, "type", None)
                        if d_type == "text":
                            yield {"type": "text", "text": event.delta.text}
                        elif d_type == "thought":
                            yield {"type": "thought", "text": event.delta.text}
                        elif d_type == "image" and getattr(event.delta, "data", None):
                            yield {"type": "image", "data": event.delta.data}

                elif hasattr(event, "event_type") and event.event_type in (
                    "interaction.completed",
                    "interaction.error",
                ):
                    is_complete = True
                    yield {"type": "status", "status": event.event_type.split(".")[-1]}

        yield from handle_stream(stream)

        # Auto reconnection logic if stream drops before completion
        while not is_complete and interaction_id:
            try:
                status_obj = self.client.interactions.get(interaction_id)
                if status_obj.status != "in_progress":
                    final_result = self.parse_interaction_result(status_obj)
                    yield {"type": "completed", "result": final_result}
                    break

                resume_stream = self.client.interactions.get(
                    id=interaction_id, stream=True, last_event_id=last_event_id
                )
                yield from handle_stream(resume_stream)
            except Exception as e:
                yield {"type": "error", "error": str(e)}
                break

    def parse_interaction_result(self, interaction: Any) -> Dict[str, Any]:
        """Extracts text content, steps, and visual images from completed interaction."""
        result: Dict[str, Any] = {
            "id": getattr(interaction, "id", None),
            "status": getattr(interaction, "status", "unknown"),
            "text": "",
            "images": [],
            "steps": [],
            "error": getattr(interaction, "error", None),
        }

        steps = getattr(interaction, "steps", [])
        for step in steps:
            step_info = {
                "type": getattr(step, "type", None),
                "content": [],
            }
            content_list = getattr(step, "content", [])
            for item in content_list:
                item_type = getattr(item, "type", None)
                if item_type == "text":
                    text_val = getattr(item, "text", "")
                    result["text"] += text_val + "\n"
                    step_info["content"].append({"type": "text", "text": text_val})
                elif item_type == "image":
                    img_data = getattr(item, "data", None)
                    if img_data:
                        result["images"].append(img_data)
                        step_info["content"].append({"type": "image", "data": img_data})
            result["steps"].append(step_info)

        result["text"] = result["text"].strip()
        return result

    def get_interaction(self, interaction_id: str) -> Dict[str, Any]:
        """Fetch current status and content of an interaction by ID."""
        interaction = self.client.interactions.get(interaction_id)
        return self.parse_interaction_result(interaction)


def run_cli():
    """Command Line Interface for running Gemini Deep Research tasks."""
    parser = argparse.ArgumentParser(
        description="Gemini Deep Research Agent CLI Tool"
    )
    parser.add_argument("prompt", help="Research query / prompt")
    parser.add_argument(
        "--agent",
        choices=["standard", "max"],
        default="standard",
        help="Agent model type ('standard' = deep-research-preview-04-2026, 'max' = deep-research-max-preview-04-2026)",
    )
    parser.add_argument(
        "--plan",
        action="store_true",
        help="Enable collaborative planning mode to inspect plan before research",
    )
    parser.add_argument(
        "--stream",
        action="store_true",
        help="Stream thoughts and response in real-time",
    )
    parser.add_argument(
        "--output",
        "-o",
        help="Save report output to markdown file",
    )
    parser.add_argument(
        "--image-dir",
        default="./visualizations",
        help="Directory to save generated charts / graphics",
    )

    args = parser.parse_args()

    agent_model = SUPPORTED_AGENTS[args.agent]
    client = DeepResearchClient()

    print(f"\n🚀 Initializing Gemini Deep Research Agent ({args.agent})...")
    print(f"📌 Prompt: {args.prompt}")

    if args.plan:
        print("\n📝 Requesting Research Plan (Collaborative Planning)...")
        task = client.create_research_task(
            prompt=args.prompt,
            agent_type=agent_model,
            collaborative_planning=True,
        )
        print(f"Interaction ID: {task.id}")
        print("Waiting for plan...")
        res = client.poll_for_completion(task.id)
        print("\n--- PROPOSED RESEARCH PLAN ---")
        print(res["text"])
        print("\nTo approve or refine this plan, use python deep_research.py with --previous-id.")
        return

    if args.stream:
        print("\n⚡ Streaming Research Progress...\n")
        full_text = ""
        images = []
        for event in client.stream_research_events(
            prompt=args.prompt,
            agent_type=agent_model,
        ):
            if event["type"] == "created":
                print(f"[Research Task Started: {event['id']}]")
            elif event["type"] == "thought":
                print(f"\n💭 Thought: {event['text']}", flush=True)
            elif event["type"] == "text":
                print(event["text"], end="", flush=True)
                full_text += event["text"]
            elif event["type"] == "image":
                images.append(event["data"])
                print(f"\n🖼️ [Received Visualization: {len(event['data'])} base64 chars]")
            elif event["type"] == "completed":
                print("\n\n✅ Research Completed!")

        if args.output:
            Path(args.output).write_text(full_text, encoding="utf-8")
            print(f"Saved output to {args.output}")

        if images:
            os.makedirs(args.image_dir, exist_ok=True)
            for idx, img_b64 in enumerate(images):
                img_bytes = base64.b64decode(img_b64)
                img_path = os.path.join(args.image_dir, f"chart_{idx+1}.png")
                with open(img_path, "wb") as f:
                    f.write(img_bytes)
                print(f"Saved graphic to {img_path}")
    else:
        print("\n⏳ Research running in background...")
        task = client.create_research_task(
            prompt=args.prompt,
            agent_type=agent_model,
        )
        print(f"Interaction ID: {task.id}")
        
        def status_cb(status):
            print(f"Status: {status}...", end="\r")

        res = client.poll_for_completion(task.id, callback=status_cb)
        print("\n\n=== FINAL RESEARCH REPORT ===")
        print(res["text"])

        if args.output:
            Path(args.output).write_text(res["text"], encoding="utf-8")
            print(f"\nSaved report to {args.output}")


if __name__ == "__main__":
    run_cli()
