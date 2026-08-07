FROM node:22-alpine

# Install Python3, pip, and Mosquitto MQTT Broker
RUN apk add --no-cache python3 py3-pip mosquitto mosquitto-clients bash

WORKDIR /app

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages || pip3 install --no-cache-dir -r requirements.txt

# Copy complete project source code
COPY . .

# Build Dashboard frontend
WORKDIR /app/dashboard
RUN npm install
RUN npm run build

WORKDIR /app

# Expose TransitSense pipeline ports
# 4321 - Dashboard UI
# 8001 - CH-1 Simulator Control API
# 8002 - CH-3 ETA & Density Engine (SSE / REST)
# 1883 - Mosquitto MQTT Broker
EXPOSE 4321 8001 8002 1883

RUN chmod +x entrypoint.sh

ENTRYPOINT ["/bin/sh", "entrypoint.sh"]
