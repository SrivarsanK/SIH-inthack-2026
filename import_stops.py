import os
import pandas as pd
import mysql.connector

# Docker MySQL Connection
db = mysql.connector.connect(
    host="127.0.0.1",
    user="root",
    password="rootpassword",
    database="yara_transit",
    port=3307
)
cursor = db.cursor()

def load_stops_from_csv(csv_path, city_name):
    if not os.path.exists(csv_path):
        print(f"⚠️ Warning: {csv_path} file nahi mili. Skipping {city_name}.")
        return

    print(f"Loading {city_name} stops into Database...")
    try:
        df = pd.read_csv(csv_path)
        
        lon_col = 'stop_lon' if 'stop_lon' in df.columns else 'longitude'
        lat_col = 'stop_lat' if 'stop_lat' in df.columns else 'latitude'
        
        query = """
        INSERT INTO bus_stops (stop_id, stop_name, city, location)
        VALUES (%s, %s, %s, ST_SRID(ST_PointFromText(%s), 4326))
        ON DUPLICATE KEY UPDATE stop_name=VALUES(stop_name);
        """
        
        records = []
        for _, row in df.iterrows():
            point = f"POINT({row[lon_col]} {row[lat_col]})"
            records.append((str(row['stop_id']), str(row['stop_name']), city_name, point))
            
        cursor.executemany(query, records)
        db.commit()
        print(f"✅ {city_name} stops permanently saved! ({len(records)} stops loaded)")
    except Exception as e:
        print(f"Error loading {city_name} file:", e)

if __name__ == "__main__":
    # Dono cities ka data ek sath load hoga:
    load_stops_from_csv("shared/data/stops.txt", "Delhi")
    load_stops_from_csv("shared/data/bmtc_stops.txt", "Bengaluru")