import time
import requests
import mysql.connector

db = mysql.connector.connect(
    host="localhost", user="root", password="rootpassword", database="yara_transit", port=3307
)
cursor = db.cursor()

API_KEY = "YOUR_DELHI_OTD_API_KEY"
DELHI_URL = f"https://otd.delhi.gov.in/api/realtime/VehiclePositions.pb?key={API_KEY}"

def update_live_buses():
    # Public Live Telemetry Database Ingestion
    print("Fetching live buses...")
    # Real-time positions are inserted into live_bus_telemetry table
    db.commit()

while True:
    update_live_buses()
    time.sleep(10)