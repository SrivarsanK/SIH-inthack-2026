import json
import os
import sys

import uvicorn
from fastapi import FastAPI

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from shared.constants import SIM_CONTROL_PORT

app = FastAPI(title="CH-1 Simulator Control API")
STATE_FILE = os.path.join(os.path.dirname(__file__), 'shared_state.json')

def append_command(command: dict):
    # Simple cross-platform append
    try:
        # We read the file, append, and rewrite. Since it's low concurrency (1Hz read), 
        # a simple read/write is usually sufficient for a hackathon.
        if not os.path.exists(STATE_FILE):
            commands = []
        else:
            with open(STATE_FILE, 'r') as f:
                content = f.read()
                commands = json.loads(content) if content else []
        
        commands.append(command)
        
        with open(STATE_FILE, 'w') as f:
            json.dump(commands, f)
    except Exception as e:
        print(f"Failed to append command: {e}")

@app.post("/inject/delay")
def inject_delay(min: float):
    append_command({"type": "delay", "value": min})
    return {"status": "ok", "message": f"Delay of {min} minutes injected"}

@app.post("/inject/dropout")
def inject_dropout(sec: int):
    append_command({"type": "dropout", "value": sec})
    return {"status": "ok", "message": f"GNSS dropout for {sec} seconds injected"}

@app.post("/inject/crowd")
def inject_crowd(delta: int):
    append_command({"type": "crowd", "value": delta})
    return {"status": "ok", "message": f"Crowd spike of {delta} MAC addresses injected"}

@app.post("/reset")
def reset_simulator():
    append_command({"type": "reset", "value": 0})
    return {"status": "ok", "message": "Simulator reset"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=SIM_CONTROL_PORT)
