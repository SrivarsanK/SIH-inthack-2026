from flask import Flask, request, jsonify
import mysql.connector

app = Flask(__name__)

@app.route('/api/stops', methods=['GET'])
def get_stops():
    city = request.args.get('city', 'Delhi')
    try:
        conn = mysql.connector.connect(
            host="127.0.0.1",
            user="root",
            password="rootpassword",
            database="yara_transit",
            port=3306
        )
        cursor = conn.cursor(dictionary=True)
        query = f"SELECT stop_id, stop_name, city, ST_Y(location) AS lat, ST_X(location) AS lon FROM bus_stops WHERE city='{city}'"
        cursor.execute(query)
        stops = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(stops)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)