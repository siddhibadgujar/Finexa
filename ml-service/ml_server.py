from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from sklearn.ensemble import IsolationForest
import pdfplumber
import re
import io
from datetime import datetime

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
        traceback.print_exc()
        return jsonify({"error": f"Failed to parse PDF: {str(e)}"}), 500


if __name__ == "__main__":
    print("Python ML Service running on port 5001...")
    app.run(host='0.0.0.0', port=5001)
