import csv
import os
import sys
import time
import requests

NEON_DB_URL = "postgresql://neondb_owner:npg_ByNcDRg2r5ob@ep-dry-firefly-azh465mx-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb"
NEON_SQL_API = "https://ep-dry-firefly-azh465mx-pooler.c-3.ap-southeast-1.aws.neon.tech/sql"

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "shared", "data"))

def execute_neon_sql(query: str, params: list = None) -> dict:
    headers = {
        "Neon-Connection-String": NEON_DB_URL,
        "Content-Type": "application/json"
    }
    payload = {"query": query}
    if params:
        payload["params"] = params

    resp = requests.post(NEON_SQL_API, headers=headers, json=payload, timeout=30)
    if resp.status_code != 200:
        raise Exception(f"Neon API Error ({resp.status_code}): {resp.text}")
    return resp.json()

def main():
    print("=" * 65)
    print("[Neon DB] MTC Chennai GTFS Data Integration -> Neon Serverless HTTP API")
    print("=" * 65)

    # 1. Test Connection
    print("\n[1/5] Testing Neon DB HTTP Connection...")
    res = execute_neon_sql("SELECT NOW() as server_time;")
    server_time = res["rows"][0]["server_time"]
    print(f"[OK] Connected to Neon DB! Server Time: {server_time}")

    # 2. Create Schema
    print("\n[2/5] Creating GTFS Schema (routes, stops, trips, stop_times)...")
    schema_statements = [
        """CREATE TABLE IF NOT EXISTS routes (
            route_id VARCHAR(50) PRIMARY KEY,
            route_short_name VARCHAR(100),
            route_long_name VARCHAR(255),
            route_type INT,
            agency_id INT
        );""",
        """CREATE TABLE IF NOT EXISTS stops (
            stop_id VARCHAR(50) PRIMARY KEY,
            stop_name VARCHAR(255),
            stop_lat DOUBLE PRECISION,
            stop_lon DOUBLE PRECISION
        );""",
        """CREATE TABLE IF NOT EXISTS trips (
            trip_id VARCHAR(50) PRIMARY KEY,
            route_id VARCHAR(50),
            service_id VARCHAR(50),
            direction_id INT
        );""",
        """CREATE TABLE IF NOT EXISTS stop_times (
            trip_id VARCHAR(50),
            arrival_time VARCHAR(20),
            departure_time VARCHAR(20),
            stop_id VARCHAR(50),
            stop_sequence INT
        );""",
        "CREATE INDEX IF NOT EXISTS idx_trips_route_id ON trips(route_id);",
        "CREATE INDEX IF NOT EXISTS idx_stop_times_trip_id ON stop_times(trip_id);",
        "CREATE INDEX IF NOT EXISTS idx_stop_times_stop_id ON stop_times(stop_id);"
    ]
    for stmt in schema_statements:
        execute_neon_sql(stmt)
    print("[OK] GTFS tables and indexes created.")

    # 3. Import Routes
    routes_file = os.path.join(DATA_DIR, "routes.txt")
    print(f"\n[3/5] Importing routes from {routes_file}...")
    with open(routes_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        routes = list(reader)

    # Batch insert routes
    batch_size = 500
    for i in range(0, len(routes), batch_size):
        batch = routes[i:i+batch_size]
        values = []
        for r in batch:
            short_name = r["route_short_name"].replace("'", "''")
            long_name = r["route_long_name"].replace("'", "''")
            values.append(f"('{r['route_id']}', '{short_name}', '{long_name}', {r['route_type']}, {r['agency_id']})")

        sql = f"""
            INSERT INTO routes (route_id, route_short_name, route_long_name, route_type, agency_id)
            VALUES {','.join(values)}
            ON CONFLICT (route_id) DO UPDATE SET
                route_short_name = EXCLUDED.route_short_name,
                route_long_name = EXCLUDED.route_long_name,
                route_type = EXCLUDED.route_type,
                agency_id = EXCLUDED.agency_id;
        """
        execute_neon_sql(sql)

    print(f"[OK] Successfully imported {len(routes)} routes into Neon DB.")

    # 4. Import Stops
    stops_file = os.path.join(DATA_DIR, "stops.txt")
    print(f"\n[4/5] Importing stops from {stops_file}...")
    with open(stops_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        stops = list(reader)

    for i in range(0, len(stops), batch_size):
        batch = stops[i:i+batch_size]
        values = []
        for s in batch:
            stop_name = s["stop_name"].replace("'", "''")
            values.append(f"('{s['stop_id']}', '{stop_name}', {float(s['stop_lat'])}, {float(s['stop_lon'])})")

        sql = f"""
            INSERT INTO stops (stop_id, stop_name, stop_lat, stop_lon)
            VALUES {','.join(values)}
            ON CONFLICT (stop_id) DO UPDATE SET
                stop_name = EXCLUDED.stop_name,
                stop_lat = EXCLUDED.stop_lat,
                stop_lon = EXCLUDED.stop_lon;
        """
        execute_neon_sql(sql)

    print(f"[OK] Successfully imported {len(stops)} stops into Neon DB.")

    # 5. Import Trips
    trips_file = os.path.join(DATA_DIR, "trips.txt")
    print(f"\n[5/5] Importing trips from {trips_file}...")
    with open(trips_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        trips = list(reader)

    for i in range(0, len(trips), batch_size):
        batch = trips[i:i+batch_size]
        values = []
        for t in batch:
            values.append(f"('{t['trip_id']}', '{t['route_id']}', '{t['service_id']}', {int(t['direction_id'])})")

        sql = f"""
            INSERT INTO trips (trip_id, route_id, service_id, direction_id)
            VALUES {','.join(values)}
            ON CONFLICT (trip_id) DO UPDATE SET
                route_id = EXCLUDED.route_id,
                service_id = EXCLUDED.service_id,
                direction_id = EXCLUDED.direction_id;
        """
        execute_neon_sql(sql)
        if i % 5000 == 0 and i > 0:
            print(f"  --> Progress: {i}/{len(trips)} trips imported...")

    print(f"[OK] Successfully imported {len(trips)} trips into Neon DB.")

    # 6. Import Stop Times (Batch of 1000)
    stop_times_file = os.path.join(DATA_DIR, "stop_times.txt")
    print(f"\n[Bonus] Importing stop_times from {stop_times_file}...")
    with open(stop_times_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        stop_times = list(reader)

    st_batch_size = 1000
    for i in range(0, len(stop_times), st_batch_size):
        batch = stop_times[i:i+st_batch_size]
        values = []
        for st in batch:
            values.append(f"('{st['trip_id']}', '{st['arrival_time']}', '{st['departure_time']}', '{st['stop_id']}', {int(st['stop_sequence'])})")

        sql = f"INSERT INTO stop_times (trip_id, arrival_time, departure_time, stop_id, stop_sequence) VALUES {','.join(values)};"
        execute_neon_sql(sql)
        if i % 10000 == 0 and i > 0:
            print(f"  --> Progress: {i}/{len(stop_times)} stop_times imported...")

    print(f"[OK] Successfully imported {len(stop_times)} stop_times into Neon DB.")

    print("\n" + "=" * 65)
    print("  [SUCCESS] MTC Chennai GTFS Data Successfully Integrated into Neon DB!")
    print("=" * 65 + "\n")

if __name__ == "__main__":
    main()
