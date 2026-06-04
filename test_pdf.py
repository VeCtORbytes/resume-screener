from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

c = canvas.Canvas("/tmp/test_resume.pdf", pagesize=letter)

y = 750

resume_text = """
ALICE SMITH
Senior React Developer

EXPERIENCE:
- 7 years React development at Google
- Built dashboards with TypeScript
- GraphQL APIs with Node.js
- PostgreSQL optimization
- Docker deployment

SKILLS:
React, TypeScript, JavaScript, Node.js, PostgreSQL, Docker
"""

for line in resume_text.split("\n"):
    c.drawString(50, y, line)
    y -= 15

c.save()

print("PDF created")
