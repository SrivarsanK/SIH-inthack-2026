import asyncio
import logging
from amqtt.broker import Broker

# Silence noisy DEBUG logs
logging.getLogger("amqtt").setLevel(logging.WARNING)

config = {
    "listeners": {
        "default": {
            "type": "tcp",
            "bind": "0.0.0.0:1883",
        },
    },
    "sys_interval": 0,
    "auth": {
        "allow-anonymous": True,
    },
}

async def main():
    print("=" * 60)
    print("[MQTT Broker] Starting Embedded Python MQTT Broker on localhost:1883...")
    print("=" * 60)
    broker = Broker(config)
    await broker.start()
    print("[MQTT Broker] Active and listening on port 1883.")
    while True:
        await asyncio.sleep(3600)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[MQTT Broker] Stopped.")
