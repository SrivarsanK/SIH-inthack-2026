import time
import random
import mysql.connector

try:
    db = mysql.connector.connect(
    host="127.0.0.1",
    user="root",
    password="rootpassword",
    database="yara_transit",
    port=3307
)    
    cursor = db.cursor()

    # Ensure table exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS live_bus_telemetry (
            bus_id VARCHAR(50) PRIMARY KEY,
            city VARCHAR(50),
            lat DOUBLE,
            lon DOUBLE,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    """)

    def update_live_buses():
        print("Ingesting Live Telemetry for Delhi & Bengaluru...")

        # Delhi Mock Coordinates
        d_lat = 28.6315 + random.uniform(-0.015, 0.015)
        d_lon = 77.2167 + random.uniform(-0.015, 0.015)

        # Bengaluru Mock Coordinates
        b_lat = 12.9716 + random.uniform(-0.015, 0.015)
        b_lon = 77.5946 + random.uniform(-0.015, 0.015)

        # Update Delhi Bus
        cursor.execute("""
            INSERT INTO live_bus_telemetry (bus_id, city, lat, lon) 
            VALUES ('DL-BUS-101', 'Delhi', %s, %s)
            ON DUPLICATE KEY UPDATE lat=%s, lon=%s
        """, (d_lat, d_lon, d_lat, d_lon))

        # Update Bengaluru Bus
        cursor.execute("""
            INSERT INTO live_bus_telemetry (bus_id, city, lat, lon) 
            VALUES ('KA-BMTC-502', 'Bengaluru', %s, %s)
            ON DUPLICATE KEY UPDATE lat=%s, lon=%s
        """, (b_lat, b_lon, b_lat, b_lon))

        db.commit()

    while True:
        update_live_buses()
        time.sleep(10)

except mysql.connector.Error as err:
    print(f"Database Connection Error: {err}")