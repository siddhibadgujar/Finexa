from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import numpy as np
from sklearn.ensemble import IsolationForest
import pdfplumber
import re
import io
import requests
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────────────────────────
# 1. ANOMALY DETECTION  (existing — unchanged)
# ─────────────────────────────────────────────────────────────
@app.route("/anomaly", methods=["POST"])
def detect_anomaly():
    data = request.json
    transactions = data.get("transactions", [])
    if not transactions:
        return jsonify([])

    amounts = np.array([t.get("amount", 0) for t in transactions]).reshape(-1, 1)
    contamination = min(0.1, max(0.01, 1 / len(amounts)))
    model = IsolationForest(n_estimators=100, contamination=contamination, random_state=42)
    preds = model.fit_predict(amounts)

    results = []
    for i, t in enumerate(transactions):
        results.append({
            "id": t.get("_id"),
            "date": t.get("date"),
            "amount": t.get("amount", 0),
            "type": t.get("type"),
            "category": t.get("category"),
            "anomaly": 1 if preds[i] == -1 else 0
        })
    return jsonify(results)


# ─────────────────────────────────────────────────────────────
# 2. HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────

# Regex patterns
AMOUNT_RE = re.compile(r'[\d,]+\.\d{2}')
DATE_PATTERNS = [
    (re.compile(r'\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b'), '%d/%m/%Y'),
    (re.compile(r'\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2})\b'),  '%d/%m/%y'),
    (re.compile(r'\b(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b'), '%Y/%m/%d'),
    (re.compile(r'\b(\d{1,2}\s+\w{3}\s+\d{4})\b'),          '%d %b %Y'),
    (re.compile(r'\b(\d{1,2}\-\w{3}\-\d{4})\b'),             '%d-%b-%Y'),
    (re.compile(r'\b(\d{1,2}\-\w{3}\-\d{2})\b'),             '%d-%b-%y'),
]


def parse_amount(val):
    if not val:
        return None
    s = str(val).strip().replace('\n', '').replace(' ', '')
    # Remove currency symbols
    s = re.sub(r'[₹$€£]', '', s)
    # Extract first valid amount
    m = AMOUNT_RE.search(s)
    if not m:
        # Try plain integer
        plain = re.sub(r'[^\d]', '', s)
        return float(plain) if plain and float(plain) > 0 else None
    try:
        return float(m.group().replace(',', ''))
    except ValueError:
        return None


def parse_date(val):
    if not val:
        return None
    s = str(val).strip().replace('\n', ' ')
    for pattern, fmt in DATE_PATTERNS:
        m = pattern.search(s)
        if m:
            raw = m.group(1).replace('/', '-')
            for f in [fmt, fmt.replace('/', '-')]:
                try:
                    dt = datetime.strptime(raw, f.replace('/', '-'))
                    return dt.strftime('%Y-%m-%d')
                except ValueError:
                    continue
    return None


def is_date_cell(val):
    return parse_date(val) is not None


# ─────────────────────────────────────────────────────────────
# 3. STRATEGY A — Structured table extraction (preferred)
# ─────────────────────────────────────────────────────────────

HEADER_KEYWORDS = {
    'date':   ['date', 'txn date', 'tran date', 'value date', 'posting date'],
    'desc':   ['narration', 'description', 'particular', 'details', 'remarks',
               'reference', 'transaction', 'chq', 'cheque'],
    'debit':  ['debit', 'withdrawal', 'dr', 'withdraw', 'paid out', 'debit amount'],
    'credit': ['credit', 'deposit', 'cr', 'received', 'paid in', 'credit amount'],
}


def match_header(cell_text, category):
    text = str(cell_text).lower().strip()
    return any(kw in text for kw in HEADER_KEYWORDS[category])


def extract_from_tables(pdf):
    transactions = []

    for page in pdf.pages:
        tables = page.extract_tables()
        for table in tables:
            if not table or len(table) < 2:
                continue

            # ── Find header row ──────────────────────────────
            header_idx = None
            date_col = desc_col = debit_col = credit_col = None

            for row_i, row in enumerate(table):
                if not row:
                    continue
                has_date   = any(match_header(c, 'date')   for c in row if c)
                has_debit  = any(match_header(c, 'debit')  for c in row if c)
                has_credit = any(match_header(c, 'credit') for c in row if c)

                if has_date and (has_debit or has_credit):
                    header_idx = row_i
                    for col_i, cell in enumerate(row):
                        if not cell:
                            continue
                        if match_header(cell, 'date')   and date_col   is None: date_col   = col_i
                        if match_header(cell, 'desc')   and desc_col   is None: desc_col   = col_i
                        if match_header(cell, 'debit')  and debit_col  is None: debit_col  = col_i
                        if match_header(cell, 'credit') and credit_col is None: credit_col = col_i
                    break

            # ── Parse data rows ──────────────────────────────
            if header_idx is not None and date_col is not None:
                for row in table[header_idx + 1:]:
                    if not row or all(not c for c in row):
                        continue
                    if len(row) <= date_col:
                        continue

                    date_str = parse_date(row[date_col])
                    if not date_str:
                        continue

                    desc = str(row[desc_col]).strip() if desc_col is not None and desc_col < len(row) else ''
                    debit  = parse_amount(row[debit_col])  if debit_col  is not None and debit_col  < len(row) else None
                    credit = parse_amount(row[credit_col]) if credit_col is not None and credit_col < len(row) else None

                    if debit or credit:
                        transactions.append({
                            'date': date_str,
                            'description': desc,
                            'debit':  debit,
                            'credit': credit
                        })
                continue  # done with this table

            # ── No header found: heuristic row scan ──────────
            for row in table:
                if not row:
                    continue

                # Find date cell
                date_str = None
                date_col_i = None
                for ci, cell in enumerate(row):
                    d = parse_date(cell)
                    if d:
                        date_str = d
                        date_col_i = ci
                        break

                if not date_str:
                    continue

                # Collect amounts (skip date cell and last cell — likely balance)
                cell_amounts = []
                desc_parts = []
                for ci, cell in enumerate(row):
                    if ci == date_col_i or not cell:
                        continue
                    a = parse_amount(cell)
                    if a and a > 0:
                        cell_amounts.append(a)
                    elif str(cell).strip():
                        desc_parts.append(str(cell).strip())

                if not cell_amounts:
                    continue

                description = ' '.join(desc_parts)
                # Last amount is usually balance — ignore it
                usable = cell_amounts[:-1] if len(cell_amounts) > 1 else cell_amounts

                if len(usable) >= 2:
                    debit, credit = usable[0] or None, usable[1] or None
                elif len(usable) == 1:
                    debit, credit = usable[0], None
                else:
                    continue

                transactions.append({
                    'date': date_str,
                    'description': description,
                    'debit': debit,
                    'credit': credit
                })

    return transactions


# ─────────────────────────────────────────────────────────────
# 4. STRATEGY B — Raw text line-by-line fallback
# ─────────────────────────────────────────────────────────────

def extract_from_text(text):
    transactions = []

    for line in text.splitlines():
        line = line.strip()
        if len(line) < 10:
            continue

        # Find date anywhere in line
        date_str = None
        date_end = 0
        for pattern, _ in DATE_PATTERNS:
            m = pattern.search(line)
            if m:
                date_str = parse_date(m.group())
                date_end = m.end()
                break

        if not date_str:
            continue

        rest = line[date_end:]
        amounts = AMOUNT_RE.findall(rest)
        if not amounts:
            continue

        first_amt_pos = rest.find(amounts[0])
        description = rest[:first_amt_pos].strip()
        description = re.sub(r'\s+', ' ', description)

        rest_upper = rest.upper()
        debit = credit = None

        dr_match = re.search(r'(\d[\d,]*\.\d{2})\s*(DR|D)\b', rest_upper)
        cr_match = re.search(r'(\d[\d,]*\.\d{2})\s*(CR|C)\b', rest_upper)

        if dr_match:
            debit = parse_amount(dr_match.group(1))
        if cr_match:
            credit = parse_amount(cr_match.group(1))

        if not debit and not credit:
            if len(amounts) >= 3:
                debit  = parse_amount(amounts[-3])
                credit = parse_amount(amounts[-2])
            elif len(amounts) == 2:
                debit = parse_amount(amounts[0])
            elif len(amounts) == 1:
                debit = parse_amount(amounts[0])

        if debit or credit:
            transactions.append({
                'date': date_str,
                'description': description,
                'debit': debit,
                'credit': credit
            })

    return transactions


# ─────────────────────────────────────────────────────────────
# 4.5 GROQ AI FALLBACK (For GPay)
# ─────────────────────────────────────────────────────────────

def analyze_with_groq(text):
    if not GROQ_API_KEY:
        print("[groq] Missing GROQ_API_KEY")
        return build_analysis([])

    print("[analyze-statement] Calling Groq API...")
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    # Prompt as specified by User
    prompt = f"""Extract structured financial data from this bank statement text.

{text[:6000]}

IMPORTANT RULES:

1. Identify transaction type:
* "Paid to" → DEBIT
* "Sent to" → DEBIT
* "Transferred to" → DEBIT
* "Received from" → CREDIT
* "Credited by" → CREDIT

2. Extract person names:
* If transaction contains a person name (not company like Amazon, Swiggy, etc)
* Then mark it as person

3. Return JSON in this exact format:
{{
"transactions": [
{{
"date": "string",
"amount": number,
"type": "debit" or "credit",
"category": "food | rent | shopping | transfer | salary | other",
"person": "name or null"
}}
],
"peopleSummary": [
{{
"name": "person name",
"totalSent": number,
"totalReceived": number
}}
],
"totalSpent": number,
"totalReceived": number
}}

4. Rules for people:
* Only include if it is person-to-person transfer
* Ignore companies (Amazon, Flipkart, Swiggy, etc)

5. Be accurate with Indian names and UPI patterns

Return ONLY JSON. No explanation.
"""

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0,
        "response_format": {"type": "json_object"}
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=25)
        
        # Debugging logs as requested
        print(f"[groq] Response Status Code: {resp.status_code}")
        # print(f"[groq] Response Body: {resp.text}") # Keeping it commented for cleaner logs unless needed

        if resp.status_code != 200:
            print(f"[groq] API Error: {resp.status_code}")
            return build_analysis([])

        data = resp.json()
        ai_content = data['choices'][0]['message']['content']
        ai_json = json.loads(ai_content)
        
        # Format for final response (matching build_analysis structure)
        ai_transactions = ai_json.get("transactions", [])
        people_summary = ai_json.get("peopleSummary", [])
        
        total_spent = ai_json.get("totalSpent", 0)
        total_received = ai_json.get("totalReceived", 0)
        
        # Prepare people list matching build_analysis format
        people_list = [
            {'name': p.get('name'), 'sent': p.get('totalSent', 0), 'received': p.get('totalReceived', 0)}
            for p in people_summary
        ]
        
        # Re-calc categories map
        cat_map = {"food":0, "travel":0, "shopping":0, "bills":0, "salary":0, "rent":0, 
                   "transfers":0, "income":0, "healthcare":0, "education":0, "insurance":0, "others":0}
        
        for t in ai_transactions:
            cat = str(t.get("category", "other")).lower()
            if cat == 'other': cat = 'others'
            if cat == 'transfer': cat = 'transfers'
            if cat in cat_map:
                cat_map[cat] += t.get("amount", 0)
            else:
                cat_map["others"] += t.get("amount", 0)

        # Ensure all transactions follow the frontend's expected keys
        formatted_txns = []
        for t in ai_transactions:
            formatted_txns.append({
                'date': t.get("date"),
                'description': t.get("person") or "Transaction",
                'amount': t.get("amount"),
                'type': t.get("type"),
                'category': t.get("category"),
                'person': t.get("person")
            })

        return {
            'totalReceived': round(total_received, 2),
            'totalSpent': round(total_spent, 2),
            'netBalance': round(total_received - total_spent, 2),
            'transactionCount': len(ai_transactions),
            'categories': cat_map,
            'people': people_list,
            'transactions': formatted_txns
        }
        
    except Exception as e:
        print(f"[groq] AI Extraction failed with exception: {e}")
        return build_analysis([])


# ─────────────────────────────────────────────────────────────


# ─────────────────────────────────────────────────────────────
# 5. /parse-pdf ENDPOINT
# ─────────────────────────────────────────────────────────────

@app.route("/parse-pdf", methods=["POST"])
def parse_pdf():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({"error": "Only PDF files are supported"}), 400

    try:
        pdf_bytes = file.read()
        transactions = []
        raw_text = ""

        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            # Strategy A: structured tables
            transactions = extract_from_tables(pdf)

            # Strategy B: raw text fallback
            if not transactions:
                print("[parse-pdf] No table transactions — trying raw text fallback")
                for page in pdf.pages:
                    t = page.extract_text()
                    if t:
                        raw_text += t + "\n"
                transactions = extract_from_text(raw_text)

        print(f"[parse-pdf] Extracted {len(transactions)} transactions")

        if not transactions:
            # Return a descriptive error with sample of what was extracted
            preview = raw_text[:500] if raw_text else "(no text extracted)"
            print(f"[parse-pdf] Raw text preview:\n{preview}")
            return jsonify({
                "error": "No transactions found. Ensure the PDF is a readable bank statement (not a scanned image). Preview of extracted text: " + preview[:200]
            }), 422

        return jsonify(transactions)

    except Exception as e:
        import traceback
        with open("ml_error.log", "a", encoding="utf-8") as f:
            f.write(f"\n--- ERROR IN /parse-pdf ({datetime.now()}) ---\n")
            traceback.print_exc(file=f)
        return jsonify({"error": f"Failed to parse PDF: {str(e)}"}), 500


# ─────────────────────────────────────────────────────────────
# 6. STATEMENT ANALYSIS ENGINE
#    Returns structured financial intelligence:
#      totalReceived, totalSpent, categories{}, people[], transactions[]
# ─────────────────────────────────────────────────────────────

# ── Category keyword map ─────────────────────────────────────
CATEGORY_RULES = [
    ('Food',       re.compile(r'swiggy|zomato|food|restaurant|cafe|hotel|domino|mcdonald|kfc|pizza|biryani|dhaba|barbeque|haldiram|burger|dine|eatery|mess', re.I)),
    ('Travel',     re.compile(r'uber|ola|rapido|auto|taxi|cab|petrol|fuel|diesel|irctc|train|flight|indigo|spicejet|makemytrip|goibibo|redbus|toll|metro|bus', re.I)),
    ('Shopping',   re.compile(r'amazon|flipkart|myntra|meesho|ajio|nykaa|shopping|mart|bigbasket|grofers|blinkit|zepto|instamart|mall|store|retail', re.I)),
    ('Bills',      re.compile(r'electricity|electric|eb |msedcl|bses|bescom|tneb|light bill|water bill|gas|lpg|pipe|maintenance|society|flat|jio bill|airtel bill|postpaid|broadband|internet|recharge', re.I)),
    ('Salary',     re.compile(r'salary|sal |payroll|ctc|stipend|wages|payslip', re.I)),
    ('Rent',       re.compile(r'\brent\b|landlord|pg |hostel|accommodation|lease', re.I)),
    ('Healthcare', re.compile(r'hospital|clinic|pharmacy|medical|doctor|health|apollo|fortis|medplus|pharmeasy|1mg|thyrocare|diagnostic', re.I)),
    ('Education',  re.compile(r'school|tuition|college|fees|education|course|udemy|coursera|byju|unacademy', re.I)),
    ('Insurance',  re.compile(r'insurance|lic |premium|policy|bajaj allianz|hdfc ergo|star health', re.I)),
    ('Transfers',  re.compile(r'upi|neft|imps|rtgs|transfer|send|sent|paid to|payment to|trf|p2p', re.I)),
    ('Income',     re.compile(r'credit|received|deposit|refund|cashback|reward|interest|dividend|bonus', re.I)),
]

# ── Person name extraction from UPI / transfer descriptions ──
# Captures names in patterns like:
#   "Paid to Rahul Sharma", "UPI/Priya/9876...",
#   "To: John Doe", "From AMIT KUMAR"
_PERSON_SKIP = re.compile(
    r'^(upi|neft|imps|rtgs|atm|hdfc|sbi|icici|axis|kotak|pnb|canara|google|phonepe|paytm|amazon|flipkart|zomato|swiggy|uber|jio|airtel|vi |bsnl|irctc|\d)'
    , re.I
)
_PAID_TO_RE   = re.compile(r'(?:paid to|payment to|to[:\s]+|send to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', re.I)
_FROM_RE      = re.compile(r'(?:received from|from[:\s]+)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', re.I)
_UPI_NAME_RE  = re.compile(r'upi[/\-@]([A-Za-z][A-Za-z\s]{1,30}?)[/\-@0-9@]', re.I)
_SLASH_NAME   = re.compile(r'/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/', re.I)

def extract_person(description, tx_type):
    """Return (name, direction) or (None, None). direction = 'sent' | 'received'."""
    if not description:
        return None, None

    # Pattern: "Paid to Rahul Sharma" / "To: Priya"
    m = _PAID_TO_RE.search(description)
    if m:
        name = m.group(1).strip().title()
        if not _PERSON_SKIP.match(name):
            return name, 'sent'

    # Pattern: "Received from Amit Kumar" / "From: JOHN"
    m = _FROM_RE.search(description)
    if m:
        name = m.group(1).strip().title()
        if not _PERSON_SKIP.match(name):
            return name, 'received'

    # Pattern: UPI/Name/...
    m = _UPI_NAME_RE.search(description)
    if m:
        name = m.group(1).strip().title()
        if not _PERSON_SKIP.match(name) and len(name) > 3:
            direction = 'received' if tx_type == 'credit' else 'sent'
            return name, direction

    # Pattern: /First Last/
    m = _SLASH_NAME.search(description)
    if m:
        name = m.group(1).strip().title()
        if not _PERSON_SKIP.match(name):
            direction = 'received' if tx_type == 'credit' else 'sent'
            return name, direction

    return None, None


def categorise(description, tx_type):
    """Return best matching category string."""
    if not description:
        return 'Others'
    for cat_name, pattern in CATEGORY_RULES:
        if pattern.search(description):
            return cat_name
    # Fallback on transaction type
    return 'Income' if tx_type == 'credit' else 'Others'


def build_analysis(raw_transactions):
    """
    Given a list of {date, description, debit, credit} dicts,
    return the full structured analysis JSON.
    """
    total_received  = 0.0
    total_spent     = 0.0
    categories      = {}
    people_map      = {}   # name -> {sent: float, received: float}
    transactions    = []

    for entry in raw_transactions:
        date        = entry.get('date') or ''
        description = (entry.get('description') or '').strip()
        debit       = entry.get('debit')  or 0
        credit      = entry.get('credit') or 0

        is_credit = credit and float(credit) > 0
        is_debit  = debit  and float(debit)  > 0
        if not is_credit and not is_debit:
            continue

        tx_type  = 'credit' if is_credit else 'debit'
        amount   = float(credit if is_credit else debit)
        category = categorise(description, tx_type)

        # Totals
        if is_credit:
            total_received += amount
        else:
            total_spent += amount

        # Category aggregation
        categories[category] = categories.get(category, 0.0) + amount

        # Person extraction
        person_name, direction = extract_person(description, tx_type)
        if person_name:
            if person_name not in people_map:
                people_map[person_name] = {'sent': 0.0, 'received': 0.0}
            if direction == 'sent':
                people_map[person_name]['sent'] += amount
            else:
                people_map[person_name]['received'] += amount

        transactions.append({
            'date':        date,
            'description': description,
            'amount':      round(amount, 2),
            'type':        tx_type,
            'category':    category,
            'person':      person_name
        })

    # Normalise categories to the 8 standard buckets
    standard_cats = {
        'food':      categories.get('Food', 0),
        'travel':    categories.get('Travel', 0),
        'shopping':  categories.get('Shopping', 0),
        'bills':     categories.get('Bills', 0) + categories.get('Utilities', 0) + categories.get('Telecom', 0),
        'salary':    categories.get('Salary', 0),
        'rent':      categories.get('Rent', 0),
        'transfers': categories.get('Transfers', 0),
        'income':    categories.get('Income', 0),
        'healthcare':categories.get('Healthcare', 0),
        'education': categories.get('Education', 0),
        'insurance': categories.get('Insurance', 0),
        'others':    categories.get('Others', 0),
    }

    people_list = [
        {'name': name, 'sent': round(vals['sent'], 2), 'received': round(vals['received'], 2)}
        for name, vals in sorted(people_map.items(), key=lambda x: -(x[1]['sent'] + x[1]['received']))
    ]

    return {
        'totalReceived':  round(total_received, 2),
        'totalSpent':     round(total_spent, 2),
        'netBalance':     round(total_received - total_spent, 2),
        'transactionCount': len(transactions),
        'categories':     {k: round(v, 2) for k, v in standard_cats.items()},
        'people':         people_list,
        'transactions':   transactions
    }


# ─────────────────────────────────────────────────────────────
# 7. /analyze-statement ENDPOINT
#    Full pipeline: PDF → extract → analyse → structured JSON
# ─────────────────────────────────────────────────────────────

@app.route("/analyze-statement", methods=["POST"])
def analyze_statement():
    print("--- [NEW] /analyze-statement request received ---")
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({"error": "Only PDF files are supported"}), 400

    try:
        pdf_bytes  = file.read()
        raw_txns   = []
        raw_text   = ""

        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            # Full text for fallback search
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    raw_text += t + "\n"

            # Strategy A — tables
            print("[analyze-statement] Using table parser")
            raw_txns = extract_from_tables(pdf)

            # Strategy B — AI Fallback (if tables failed)
            if len(raw_txns) == 0:
                print("[analyze-statement] Using AI fallback (Groq)")
                ai_result = analyze_with_groq(raw_text)
                return jsonify(ai_result)

        print(f"[analyze-statement] Extracted {len(raw_txns)} raw transactions")
        analysis = build_analysis(raw_txns)
        return jsonify(analysis)

    except Exception as e:
        import traceback
        with open("ml_error.log", "a", encoding="utf-8") as f:
            f.write(f"\n--- ERROR IN /analyze-statement ({datetime.now()}) ---\n")
            traceback.print_exc(file=f)
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500


if __name__ == "__main__":
    banner = """
    =========================================
    FINEXA ML SERVER BOOTED: v2.0 - FIX_LOGS
    PORT: 5001 | CWD: %s
    =========================================
    """ % os.getcwd()
    print(banner)
    app.run(host='0.0.0.0', port=5001)
