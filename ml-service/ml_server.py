from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from sklearn.ensemble import IsolationForest

app = Flask(__name__)
CORS(app)

@app.route("/anomaly", methods=["POST"])
def detect_anomaly():
    data = request.json
    transactions = data.get("transactions", [])

    if not transactions:
        return jsonify([])

    amounts = np.array([t.get("amount", 0) for t in transactions]).reshape(-1, 1)

    # Use Isolation Forest — trains on this user's own data only
    # contamination: expected fraction of anomalies (max 10%)
    contamination = min(0.1, max(0.01, 1 / len(amounts)))
    model = IsolationForest(n_estimators=100, contamination=contamination, random_state=42)
    preds = model.fit_predict(amounts)  # -1 = anomaly, 1 = normal

    results = []
    for i, t in enumerate(transactions):
        results.append({
            "id": t.get("_id"),
            "date": t.get("date"),
            "amount": t.get("amount", 0),
            "type": t.get("type"),
            "category": t.get("category"),
            # Convert IsolationForest output: -1 → 1 (anomaly), 1 → 0 (normal)
            "anomaly": 1 if preds[i] == -1 else 0
        })

    return jsonify(results)

if __name__ == "__main__":
    print("Python ML Service running on port 5001...")
    app.run(host='0.0.0.0', port=5001)
