import csv
import os

STOPS_FILE = os.path.join(os.path.dirname(__file__), 'gtfs_static', 'stops.txt')

def load_stops():
    stops = {}
    with open(STOPS_FILE, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            stops[row['stop_id']] = {
                'lat': float(row['stop_lat']),
                'lon': float(row['stop_lon'])
            }
    return stops

def interpolate_position(progress, start_coords, end_coords):
    """
    Linearly interpolates between two coordinate pairs based on progress (0.0 to 1.0)
    """
    progress = max(0.0, min(1.0, progress))
    lat = start_coords['lat'] + (end_coords['lat'] - start_coords['lat']) * progress
    lon = start_coords['lon'] + (end_coords['lon'] - start_coords['lon']) * progress
    return lat, lon

# Load at startup
STOPS = load_stops()
STOP_A = STOPS.get('stop_A', {'lat': 13.0827, 'lon': 80.2707})
STOP_B = STOPS.get('stop_B', {'lat': 12.9815, 'lon': 80.2223})

def get_position(leg, progress):
    """
    Helper function to get position based on the leg and progress.
    """
    if leg == 'outbound':
        return interpolate_position(progress, STOP_A, STOP_B)
    elif leg == 'inbound':
        return interpolate_position(progress, STOP_B, STOP_A)
    else:
        # Default fallback
        return STOP_A['lat'], STOP_A['lon']
