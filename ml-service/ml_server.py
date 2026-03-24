from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/anomaly", methods=["POST"])
def detect_anomaly():
    data = request.json
    transactions = data.get("transactions", [])
    
    # Process transactions and mark anomalies
    results = []
    for t in transactions:
        amount = t.get("amount", 0)
        is_anomaly = 1 if amount > 50000 else 0
        
        # We return the transaction object plus the anomaly status
        # and a basic message for the decision engine in the controller
        results.append({
            "id": t.get("_id"),
            "date": t.get("date"),
            "amount": amount,
            "type": t.get("type"),
            "category": t.get("category"),
            "anomaly": is_anomaly
        })

    return jsonify(results)

if __name__ == "__main__":
    print("Python ML Service running on port 5001...")
    app.run(host='0.0.0.0', port=5001)
