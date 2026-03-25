"""
Run this once to generate a demo bank statement PDF.
Usage: python generate_sample.py
Output: sample_statement.pdf
"""
from fpdf import FPDF

TRANSACTIONS = [
    ("01-03-2026", "Product Sales",       "",    "5000",  "5000"),
    ("02-03-2026", "Bulk Order Payment",  "",    "12000", "17000"),
    ("03-03-2026", "Service Income",      "",    "3000",  "20000"),
    ("04-03-2026", "Raw Materials",       "4000","",      "16000"),
    ("05-03-2026", "Transport",           "500", "",      "15500"),
    ("06-03-2026", "Marketing Expense",   "1500","",      "14000"),
    ("07-03-2026", "Salary",              "3000","",      "11000"),
    ("08-03-2026", "Rent",                "5000","",      "6000"),
    ("09-03-2026", "Utility Bills",       "1000","",      "5000"),
    ("10-03-2026", "Product Sales",       "",    "4000",  "9000"),
]

class PDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 16)
        self.cell(0, 12, "Bank Statement - Shreyash Jadhav", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(4)

pdf = PDF()
pdf.add_page()
pdf.set_auto_page_break(auto=True, margin=15)

# ── Table header ──────────────────────────────────────────────
col_widths = [30, 70, 28, 28, 28]
headers    = ["Date", "Description", "Debit (Rs)", "Credit (Rs)", "Balance (Rs)"]

pdf.set_fill_color(51, 51, 102)   # dark blue
pdf.set_text_color(255, 255, 255) # white
pdf.set_font("Helvetica", "B", 10)
for w, h in zip(col_widths, headers):
    pdf.cell(w, 10, h, border=1, fill=True, align="C")
pdf.ln()

# ── Table rows ────────────────────────────────────────────────
pdf.set_text_color(0, 0, 0)
pdf.set_font("Helvetica", "", 10)
fill = False
for row in TRANSACTIONS:
    date, desc, debit, credit, balance = row
    pdf.set_fill_color(245, 245, 250) if fill else pdf.set_fill_color(255, 255, 255)
    pdf.cell(col_widths[0], 9, date,    border=1, fill=fill, align="C")
    pdf.cell(col_widths[1], 9, desc,    border=1, fill=fill, align="L")
    pdf.cell(col_widths[2], 9, debit,   border=1, fill=fill, align="R")
    pdf.cell(col_widths[3], 9, credit,  border=1, fill=fill, align="R")
    pdf.cell(col_widths[4], 9, balance, border=1, fill=fill, align="R")
    pdf.ln()
    fill = not fill

out = "sample_statement.pdf"
pdf.output(out)
print(f"✅ Generated: {out}")
