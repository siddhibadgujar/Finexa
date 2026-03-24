from flask import Flask, request, jsonify
from flask_cors import CORS
from model import detect_anomalies

app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

@app.route('/detect-anomaly', methods=['POST'])
def anomaly_detection():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Call the anomaly detection function
        results = detect_anomalies(data)
        
        return jsonify(results)
        
    except Exception as e:
        print(f"Error in /detect-anomaly: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    # Run Flask server on port 5001 to avoid conflict with Node.js backend
    app.run(host='0.0.0.0', port=5001, debug=True)
