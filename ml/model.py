import pandas as pd
from sklearn.ensemble import IsolationForest
import numpy as np

def detect_anomalies(data):
    """
    Detects unusual spikes in expenses and drops in revenue using Isolation Forest.
    
    Args:
        data (list): List of dictionaries containing 'date', 'amount', and 'type'.
        
    Returns:
        list: The original data with an extra 'anomaly' key (1 for anomaly, 0 for normal).
    """
    if not data or len(data) < 5:
        # isolation forest needs some data to work with, if data is too small, return no anomalies
        for item in data:
            item['anomaly'] = 0
        return data

    df = pd.DataFrame(data)
    
    # Preprocess: Ensure numeric amount and normalize sign based on type
    # Using raw amount for Isolation Forest to detect spikes/drops
    # We create a feature set: [amount]
    # To detect spikes in expense and drops in revenue separately might be better,
    # but for a simple "Isolation Forest" approach, we look for global outliers first.
    
    # More advanced: normalize revenue as positive and expense as negative? 
    # Or just treat them as separate datasets. 
    # The requirement says: sudden spike in expenses, sudden drop in revenue.
    
    results = []
    
    for t_type in ['expense', 'income']:
        subset = df[df['type'] == t_type].copy()
        
        if len(subset) < 5:
            # Not enough data for this specific type
            for _, row in subset.iterrows():
                row_dict = row.to_dict()
                row_dict['anomaly'] = 0
                results.append(row_dict)
            continue
            
        # Initialize Isolation Forest
        # contamination='auto' or a fixed value like 0.1 (10%)
        model = IsolationForest(contamination=0.1, random_state=42)
        
        # Fit on amount
        subset['anomaly_score'] = model.fit_predict(subset[['amount']])
        
        # IsolationForest returns -1 for outliers, 1 for inliers.
        # We need to map -1 -> 1 (anomaly) and 1 -> 0 (normal).
        subset['anomaly'] = subset['anomaly_score'].apply(lambda x: 1 if x == -1 else 0)
        
        # Filter for "spike in expense" or "drop in revenue" if needed, 
        # but Isolation Forest naturally finds extremes.
        
        results.extend(subset.drop(columns=['anomaly_score']).to_dict('records'))
        
    # Combine back and handle items that might not have been in 'expense' or 'income' categories if any
    other_types = df[~df['type'].isin(['expense', 'income'])]
    if not other_types.empty:
        for _, row in other_types.iterrows():
            row_dict = row.to_dict()
            row_dict['anomaly'] = 0
            results.append(row_dict)

    return results
