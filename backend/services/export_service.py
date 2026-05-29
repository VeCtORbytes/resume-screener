import io
import csv
import json
import html
from datetime import datetime
from typing import List, Dict, Any

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.graphics.shapes import Drawing, Circle, Rect, String, Line
from reportlab.graphics.charts.piecharts import Pie


# Colors Palette
c_primary = colors.HexColor("#1e1b4b")   # Deep Navy
c_secondary = colors.HexColor("#4f46e5") # Indigo
c_accent = colors.HexColor("#06b6d4")    # Cyan
c_text = colors.HexColor("#1e293b")      # Slate 800
c_light = colors.HexColor("#f8fafc")     # Slate 50
c_border = colors.HexColor("#cbd5e1")    # Slate 300
c_success = colors.HexColor("#16a34a")   # Green
c_danger = colors.HexColor("#dc2626")    # Red
c_warning = colors.HexColor("#d97706")   # Amber

# Helper to clean/escape raw strings for ReportLab XML parser safety
def clean_pdf_text(text: Any) -> str:
    if text is None:
        return ""
    text_str = str(text)
    text_str = html.escape(text_str)
    text_str = text_str.replace("\n", "<br/>")
    return text_str

def get_candidate_name(filename: str) -> str:
    name = filename.split('.')[0]
    name = name.replace('_', ' ').replace('-', ' ')
    return name.title()

def get_hiring_recommendation(score: int) -> str:
    if score >= 90:
        return "🟢 Strong Hire"
    elif score >= 80:
        return "🟢 Hire"
    elif score >= 65:
        return "🟡 Needs Interview"
    elif score >= 50:
        return "🟠 Needs Review"
    else:
        return "🔴 Reject"

def get_match_tier(score: int) -> str:
    if score >= 80:
        return "Strong Match"
    elif score >= 50:
        return "Medium Match"
    else:
        return "Weak Match"

def get_risk_level(score: int) -> str:
    if score >= 80:
        return "Low Risk"
    elif score >= 60:
        return "Medium Risk"
    else:
        return "High Risk"

def parse_reasoning_composite(reasoning: str) -> Dict[str, Any]:
    clean_reasoning = reasoning
    gap_analysis = {}
    
    if "---GAP_ANALYSIS_JSON---" in reasoning:
        parts = reasoning.split("---GAP_ANALYSIS_JSON---")
        clean_reasoning = parts[0].strip()
        try:
            gap_analysis = json.loads(parts[1].strip())
        except Exception:
            gap_analysis = {}
            
    recommendation = "Moderate Match"
    for line in clean_reasoning.split("\n"):
        if "recommendation:" in line.lower() or "recommendation " in line.lower():
            recommendation = line.split(":")[-1].strip()
            break

    breakdown = {
        "skills": 0, "max_skills": 40,
        "experience": 0, "max_experience": 25,
        "projects": 0, "max_projects": 20,
        "education": 0, "max_education": 10,
        "domain": 0, "max_domain": 5
    }
    
    for line in clean_reasoning.split("\n"):
        if "skills match" in line.lower() or "skills:" in line.lower():
            try:
                breakdown["skills"] = int(line.split(":")[-1].split("/")[0].strip())
            except Exception: pass
        elif "experience relevance" in line.lower() or "experience:" in line.lower():
            try:
                breakdown["experience"] = int(line.split(":")[-1].split("/")[0].strip())
            except Exception: pass
        elif "project relevance" in line.lower() or "projects:" in line.lower():
            try:
                breakdown["projects"] = int(line.split(":")[-1].split("/")[0].strip())
            except Exception: pass
        elif "education" in line.lower():
            try:
                breakdown["education"] = int(line.split(":")[-1].split("/")[0].strip())
            except Exception: pass
        elif "domain" in line.lower():
            try:
                breakdown["domain"] = int(line.split(":")[-1].split("/")[0].strip())
            except Exception: pass
            
    return {
        "clean_reasoning": clean_reasoning,
        "recommendation": recommendation,
        "breakdown": breakdown,
        "gap_analysis": gap_analysis
    }

def make_progress_bar(percentage: float, active_color: colors.Color, inactive_color: colors.Color = colors.HexColor("#e2e8f0")) -> Table:
    val = max(0.0, min(100.0, float(percentage)))
    width_active = max(1, int(val * 1.5)) # Width factor out of 150px
    width_inactive = max(1, 150 - width_active)
    
    t = Table([['', '']], colWidths=[width_active, width_inactive], rowHeights=[6])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), active_color),
        ('BACKGROUND', (1,0), (1,0), inactive_color),
        ('PADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    return t


def draw_donut_chart(percentage: float, size: float = 58) -> Drawing:
    d = Drawing(size, size)
    pc = Pie()
    pc.x = 1
    pc.y = 1
    pc.width = size - 2
    pc.height = size - 2
    pc.data = [max(0.1, percentage), max(0.1, 100 - percentage)]
    pc.slices[0].fillColor = c_secondary
    pc.slices[1].fillColor = colors.HexColor("#e2e8f0")
    pc.slices.strokeWidth = 0.5
    pc.slices.strokeColor = colors.white
    d.add(pc)
    d.add(Circle(size/2, size/2, size/3.2, fillColor=colors.white, strokeColor=colors.HexColor("#cbd5e1"), strokeWidth=0.5))
    d.add(String(size/2, size/2 - 3.5, f"{int(percentage)}%", fontName="Helvetica-Bold", fontSize=10, textAnchor="middle", fillColor=c_primary))
    return d

def draw_skills_pie(matched: int, partial: int, missing: int, size: float = 52) -> Drawing:
    d = Drawing(size, size)
    pc = Pie()
    pc.x = 1
    pc.y = 1
    pc.width = size - 2
    pc.height = size - 2
    pc.data = [max(0.1, matched), max(0.1, partial), max(0.1, missing)]
    pc.slices[0].fillColor = c_success
    pc.slices[1].fillColor = c_warning
    pc.slices[2].fillColor = c_danger
    pc.slices.strokeWidth = 0.5
    pc.slices.strokeColor = colors.white
    d.add(pc)
    d.add(Circle(size/2, size/2, size/3.4, fillColor=colors.white, strokeColor=colors.HexColor("#cbd5e1"), strokeWidth=0.5))
    return d

def draw_gauge_chart(score: float, width: float = 76, height: float = 30) -> Drawing:
    d = Drawing(width, height)
    d.add(Rect(2, 4, 22, 5, fillColor=c_danger, strokeColor=None))
    d.add(Rect(26, 4, 22, 5, fillColor=c_warning, strokeColor=None))
    d.add(Rect(50, 4, 22, 5, fillColor=c_success, strokeColor=None))
    pos = 2 + (max(0.0, min(100.0, score)) / 100.0) * 72
    d.add(Line(pos, 2, pos, 12, strokeColor=c_primary, strokeWidth=1.5))
    d.add(String(width/2, 18, f"{int(score)}/100", fontName="Helvetica-Bold", fontSize=8, textAnchor="middle", fillColor=c_primary))
    return d

def make_progress_bar_mini(percentage: float, active_color: colors.Color, inactive_color: colors.Color = colors.HexColor("#e2e8f0")) -> Table:
    val = max(0.0, min(100.0, float(percentage)))
    width_active = max(1, int(val * 1.2)) # Width factor out of 120px
    width_inactive = max(1, 120 - width_active)
    
    t = Table([['', '']], colWidths=[width_active, width_inactive], rowHeights=[4.5])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), active_color),
        ('BACKGROUND', (1,0), (1,0), inactive_color),
        ('PADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    return t


class ExportService:
    """Service to generate premium candidate CSV and PDF intelligence dossiers"""

    @staticmethod
    def generate_csv(results: List[Any], job_description: str) -> str:
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
        
        writer.writerow([
            "Candidate Name",
            "Resume Filename",
            "Overall Score",
            "Match Tier",
            "Matched Skills",
            "Missing Skills",
            "Critical Gaps",
            "Strength Areas",
            "Project Relevance Score",
            "Recommendation Summary"
        ])
        
        for r in results:
            parsed = parse_reasoning_composite(r.reasoning)
            gap = parsed["gap_analysis"] or r.gap_analysis or {}
            
            cand_name = get_candidate_name(r.resume_filename)
            score = r.score
            tier = get_match_tier(score)
            
            matched_skills = sorted(list(set(
                (gap.get("must_have_matched", []) or []) +
                (gap.get("good_to_have_matched", []) or [])
            )))
            matched_skills_str = ", ".join(matched_skills)
            
            missing_skills = sorted(list(set(
                (gap.get("must_have_missing", []) or []) +
                (gap.get("good_to_have_missing", []) or [])
            )))
            missing_skills_str = ", ".join(missing_skills)
            
            crit_gaps = gap.get("critical_gaps", []) or []
            crit_gaps_str = "; ".join(crit_gaps)
            
            strengths = gap.get("strength_areas", []) or []
            strengths_str = "; ".join(strengths)
            
            project_score = 0
            if gap.get("project_intelligence"):
                scores = [p.get("relevance_score", 0) for p in gap["project_intelligence"] if p]
                if scores:
                    project_score = int(sum(scores) / len(scores))
            else:
                project_score = int(parsed["breakdown"]["projects"] / 20 * 100)
                
            recommendation = parsed["recommendation"]
            
            writer.writerow([
                cand_name,
                r.resume_filename,
                score,
                tier,
                matched_skills_str,
                missing_skills_str,
                crit_gaps_str,
                strengths_str,
                f"{project_score}%",
                recommendation
            ])
            
        return output.getvalue()

    @staticmethod
    def generate_candidate_pdf(
        result: Any, 
        job_description: str,
        recruiter_notes: str = None,
        current_stage: str = None,
        interview_questions: List[str] = None
    ) -> bytes:
        """
        Generate premium, highly organized 2-PAGE candidate PDF executive brief report.
        """
        buffer = io.BytesIO()
        
        # 36pt margins for clean Greenhouse/Ashby layout spacing
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        
        styles = getSampleStyleSheet()
        styles['Normal'].textColor = c_text
        styles['Normal'].fontSize = 9.5
        styles['Normal'].leading = 13.5
        
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=15,
            leading=19,
            textColor=c_primary
        )
        
        h1_style = ParagraphStyle(
            'SectionH1',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=11,
            leading=15,
            textColor=c_primary,
            spaceBefore=8,
            spaceAfter=4,
            keepWithNext=True
        )
        
        h2_style = ParagraphStyle(
            'SubSectionH2',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9.5,
            leading=13,
            textColor=c_secondary,
            spaceBefore=4,
            spaceAfter=2,
            keepWithNext=True
        )
        
        body_style = ParagraphStyle(
            'BodyClean',
            parent=styles['Normal'],
            fontSize=9.0,
            leading=12.5,
            textColor=c_text
        )

        bold_body_style = ParagraphStyle(
            'BodyCleanBold',
            parent=body_style,
            fontName='Helvetica-Bold'
        )
        
        meta_style = ParagraphStyle(
            'MetaText',
            parent=styles['Normal'],
            fontSize=8.2,
            leading=11,
            textColor=colors.HexColor("#64748b")
        )
        
        story = []
        
        parsed = parse_reasoning_composite(result.reasoning)
        gap = parsed["gap_analysis"] or result.gap_analysis or {}
        cand_name = get_candidate_name(result.resume_filename)
        score = result.score
        
        # New recommendation badge mapping
        recommendation = get_hiring_recommendation(score)
        
        # New stage mapping (default to Applied if None)
        stage_name = current_stage or "Applied"
        
        # ----------------------------------------------------
        # PAGE 1 — RECRUITER EXECUTIVE SUMMARY & ANNOTATIONS
        # ----------------------------------------------------
        
        # Header Row
        header_data = [
            [
                Paragraph("✦ HireLens Recruiter Intelligence Dossier", ParagraphStyle('LogoStyle1', parent=title_style, textColor=c_secondary, fontSize=13)),
                Paragraph(f"<b>EVALUATED:</b> {datetime.now().strftime('%b %d, %Y')}", ParagraphStyle('RightMeta1', parent=meta_style, alignment=TA_RIGHT))
            ]
        ]
        header_table = Table(header_data, colWidths=[270, 270])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LINEBELOW', (0,0), (-1,-1), 1, c_secondary),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 8))
        
        # Candidate Info Grid Card
        info_panel = [
            Paragraph(f"<font size='13' color='{c_primary.hexval()}'><b>{clean_pdf_text(cand_name)}</b></font>", bold_body_style),
            Paragraph(f"<b>Job Title:</b> {clean_pdf_text(job_description.strip().splitlines()[0][:65])}", body_style),
        ]
        
        score_color = c_success if score >= 80 else (c_warning if score >= 60 else c_danger)
        score_panel = [
            Paragraph(f"<b>Match Score:</b> <font size='11' color='{score_color.hexval()}'><b>{score}/100</b></font>  |  <b>Stage:</b> <font color='{c_secondary.hexval()}'><b>{stage_name}</b></font>", bold_body_style),
            Spacer(1, 3),
            Paragraph(f"<b>Recommendation:</b> <b>{recommendation}</b>", bold_body_style)
        ]
        
        header_grid_data = [
            [info_panel, score_panel]
        ]
        header_grid = Table(header_grid_data, colWidths=[270, 270])
        header_grid.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), c_light),
            ('BOX', (0,0), (-1,-1), 0.5, c_border),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(header_grid)
        story.append(Spacer(1, 10))
        
        # Section 1: Executive Suitability Narrative
        import re
        split_parts = re.split(r'(?i)strengths:|gaps:', parsed["clean_reasoning"])
        first_part = split_parts[0] if split_parts else ""
        cleaned_first_part = re.sub(r'(?i)recommendation:\s*[^\n\r]+', "", first_part).strip()
        exec_narrative = clean_pdf_text(cleaned_first_part)
        exec_summary_table = Table([[Paragraph(f"<b>Executive Summary & Suitability Rationale:</b><br/>{exec_narrative}", body_style)]], colWidths=[540])
        exec_summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.white),
            ('BOX', (0,0), (-1,-1), 0.5, c_border),
            ('PADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(Paragraph("SECTION 1 — SUITABILITY SUMMARY", h1_style))
        story.append(exec_summary_table)
        story.append(Spacer(1, 10))
        
        # Section 2: Core Strengths & Areas of Gaps
        strengths = gap.get("strength_areas", []) or parsed.get("strengths", []) or []
        gaps_list = gap.get("critical_gaps", []) or parsed.get("gaps", []) or []
        
        strengths_bullets = []
        for s in strengths[:4]:
            strengths_bullets.append(Paragraph(f"🟢 {clean_pdf_text(s)}", body_style))
        if not strengths_bullets:
            strengths_bullets.append(Paragraph("General technical alignment.", body_style))
            
        gaps_bullets = []
        for g in gaps_list[:4]:
            gaps_bullets.append(Paragraph(f"🟠 {clean_pdf_text(g)}", body_style))
        if not gaps_bullets:
            gaps_bullets.append(Paragraph("No critical gaps detected.", body_style))
            
        strengths_col = [Paragraph("<b>✅ Core Suitability Strengths</b>", h2_style), Spacer(1, 4)] + strengths_bullets
        gaps_col = [Paragraph("<b>⚠️ Misalignment Areas & Gaps</b>", h2_style), Spacer(1, 4)] + gaps_bullets
        
        strengths_gaps_table = Table([[strengths_col, '', gaps_col]], colWidths=[260, 20, 260])
        strengths_gaps_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('PADDING', (0,0), (-1,-1), 0),
        ]))
        
        strengths_gaps_container = Table([[strengths_gaps_table]], colWidths=[540])
        strengths_gaps_container.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.white),
            ('BOX', (0,0), (-1,-1), 0.5, c_border),
            ('PADDING', (0,0), (-1,-1), 8),
        ]))
        
        story.append(Paragraph("SECTION 2 — STRENGTHS & KEY GAPS", h1_style))
        story.append(strengths_gaps_container)
        story.append(Spacer(1, 10))
        
        # Section 3: Recruiter Notes Callout
        notes_text = clean_pdf_text(recruiter_notes or "No recruiter notes entered for this candidate yet. You can add notes directly in the Details Drawer in the candidate workspace.")
        notes_paragraph = Paragraph(f"<b>Recruiter Decision Annotations:</b><br/><i>{notes_text}</i>", body_style)
        
        notes_table = Table([[notes_paragraph]], colWidths=[540])
        notes_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fefbf3") if recruiter_notes else c_light),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#fbcfe8") if recruiter_notes else c_border),
            ('LINELEFT', (0,0), (0,-1), 3.5, colors.HexColor("#db2777") if recruiter_notes else c_secondary),
            ('PADDING', (0,0), (-1,-1), 8),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        
        story.append(Paragraph("SECTION 3 — RECRUITER NOTES", h1_style))
        story.append(notes_table)
        
        # End of Page 1
        story.append(PageBreak())
        
        # ----------------------------------------------------
        # PAGE 2 — INTERVIEW TOOLKIT & TECHNICAL INSIGHTS
        # ----------------------------------------------------
        
        # Page 2 Header Row
        header_data_2 = [
            [
                Paragraph("✦ HireLens Interview Toolkit & Technical Analysis", ParagraphStyle('LogoStyle2', parent=title_style, textColor=c_secondary, fontSize=11)),
                Paragraph(f"<b>CANDIDATE:</b> {clean_pdf_text(cand_name)}", ParagraphStyle('RightMeta2', parent=meta_style, alignment=TA_RIGHT))
            ]
        ]
        header_table_2 = Table(header_data_2, colWidths=[300, 240])
        header_table_2.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LINEBELOW', (0,0), (-1,-1), 1, c_secondary),
        ]))
        story.append(header_table_2)
        story.append(Spacer(1, 8))
        
        # Parse questions list from frontend
        parsed_questions = []
        if interview_questions:
            if isinstance(interview_questions, list):
                parsed_questions = interview_questions
            elif isinstance(interview_questions, dict):
                for category, qs in interview_questions.items():
                    if isinstance(qs, list):
                        for q in qs:
                            parsed_questions.append(f"[{category.replace('_', ' ').title()}] {q}")
                            
        # Section 4: Tailored Interview Questions
        story.append(Paragraph("SECTION 4 — TAILORED DIAGNOSTIC INTERVIEW QUESTIONS", h1_style))
        
        if parsed_questions:
            questions_content = []
            for idx, q in enumerate(parsed_questions[:6]):  # Print up to 6 key interview questions to fit page beautifully
                questions_content.append([
                    Paragraph("❑", bold_body_style),
                    Paragraph(f"<b>Q{idx+1}:</b> {clean_pdf_text(q)}", body_style)
                ])
            questions_table = Table(questions_content, colWidths=[20, 520])
            questions_table.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                ('TOPPADDING', (0,0), (-1,-1), 6),
                ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor("#f1f5f9")),
            ]))
            
            questions_container = Table([[questions_table]], colWidths=[540])
            questions_container.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.white),
                ('BOX', (0,0), (-1,-1), 0.5, c_border),
                ('PADDING', (0,0), (-1,-1), 8),
            ]))
            story.append(questions_container)
        else:
            no_questions_card = Table([[
                Paragraph("<b>No customized interview questions generated yet.</b><br/>You can formulate tailored interview questions specific to this candidate's missing tech stack and projects directly in the candidate detailed drawer under the <i>Interview Questions</i> tab.", body_style)
            ]], colWidths=[540])
            no_questions_card.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), c_light),
                ('BOX', (0,0), (-1,-1), 0.5, c_border),
                ('PADDING', (0,0), (-1,-1), 8),
            ]))
            story.append(no_questions_card)
            
        story.append(Spacer(1, 10))
        
        # Section 5: Standard Rubric Score Breakdown & Advanced Metrics
        story.append(Paragraph("SECTION 5 — TECHNICAL ALIGNMENT BREAKDOWN & AI TRUST SIGNALS", h1_style))
        
        # Rubric breakdown metrics
        skills_score = parsed["breakdown"]["skills"]
        exp_score = parsed["breakdown"]["experience"]
        proj_score_rubric = parsed["breakdown"]["projects"]
        edu_score = parsed["breakdown"]["education"]
        dom_score = parsed["breakdown"]["domain"]
        
        # Calculate real project score if present
        project_score = 0
        if gap.get("project_intelligence"):
            scores = [p.get("relevance_score", 0) for p in gap["project_intelligence"] if p]
            if scores:
                project_score = int(sum(scores) / len(scores))
        else:
            project_score = int(proj_score_rubric / 20 * 100)
            
        rubric_breakdown_list = [
            [Paragraph("<b>Rubric Assessment Category</b>", bold_body_style), Paragraph("<b>Score</b>", bold_body_style), Paragraph("<b>Alignment Coverage</b>", bold_body_style)],
            [Paragraph("Technical Skills Alignment", body_style), Paragraph(f"{skills_score}/40", body_style), make_progress_bar_mini((skills_score/40)*100, c_success)],
            [Paragraph("Professional Experience Relevance", body_style), Paragraph(f"{exp_score}/25", body_style), make_progress_bar_mini((exp_score/25)*100, c_secondary)],
            [Paragraph("Project Portfolio Evidence", body_style), Paragraph(f"{project_score}%", body_style), make_progress_bar_mini(project_score, c_accent)],
            [Paragraph("Academic & Education Fit", body_style), Paragraph(f"{edu_score}/10", body_style), make_progress_bar_mini((edu_score/10)*100, c_warning)],
            [Paragraph("Domain & Keyword Alignment", body_style), Paragraph(f"{dom_score}/5", body_style), make_progress_bar_mini((dom_score/5)*100, colors.HexColor("#ec4899"))],
        ]
        
        rubric_breakdown_table = Table(rubric_breakdown_list, colWidths=[200, 50, 270])
        rubric_breakdown_table.setStyle(TableStyle([
            ('LINEBELOW', (0,0), (-1,0), 1, c_primary),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('GRID', (0,0), (-1,-1), 0.5, c_border),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light]),
        ]))
        
        # AI Trust and parsing signals
        reliability = gap.get("reliability_signals", {})
        ai_conf = reliability.get("ai_confidence_score", 92)
        parsing_rel = reliability.get("parsing_reliability", 95)
        ev_strength = reliability.get("evidence_strength", 88)
        
        trust_signals_content = [
            Paragraph(f"<b>🛡️ AI Confidence Score:</b> {ai_conf}%  •  <b>🔍 Parsing Reliability:</b> {parsing_rel}%  •  <b>⚡ Evidence Strength:</b> {ev_strength}%", bold_body_style)
        ]
        
        alerts_list = gap.get("recruiter_alerts", [])
        if alerts_list:
            trust_signals_content.append(Spacer(1, 2))
            trust_signals_content.append(Paragraph(f"<b>System Verification Alerts:</b> {'; '.join(alerts_list[:2])}", meta_style))
            
        trust_signals_table = Table([[trust_signals_content]], colWidths=[540])
        trust_signals_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), c_light),
            ('BOX', (0,0), (-1,-1), 0.5, c_border),
            ('PADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        
        story.append(rubric_breakdown_table)
        story.append(Spacer(1, 6))
        story.append(trust_signals_table)
        story.append(Spacer(1, 10))
        
        # Page 2 Footer
        footer_style = ParagraphStyle('FooterStyle2', parent=meta_style, fontSize=6, alignment=TA_CENTER)
        story.append(Paragraph("✦ Confidential Hiring Brief • Page 2: Interview Diagnostics & Metrics • Powered by HireLens", footer_style))
        
        doc.build(story)
        return buffer.getvalue()

    @staticmethod
    def generate_comparison_pdf(results: List[Any], job_description: str) -> bytes:
        """
        Generate premium side-by-side candidate comparison PDF report for recruiters.
        """
        buffer = io.BytesIO()
        
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        
        styles = getSampleStyleSheet()
        styles['Normal'].textColor = c_text
        styles['Normal'].fontSize = 9
        styles['Normal'].leading = 13
        
        title_style = ParagraphStyle(
            'CompareTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=16,
            leading=20,
            textColor=c_primary
        )
        
        h1_style = ParagraphStyle(
            'SectionH1Compare',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=11,
            leading=15,
            textColor=c_primary,
            spaceAfter=6,
            keepWithNext=True
        )

        body_style = ParagraphStyle(
            'BodyCleanCompare',
            parent=styles['Normal'],
            fontSize=8,
            leading=11,
            textColor=c_text
        )

        bold_body_style = ParagraphStyle(
            'BodyCleanCompareBold',
            parent=body_style,
            fontName='Helvetica-Bold'
        )
        
        meta_style = ParagraphStyle(
            'MetaTextCompare',
            parent=styles['Normal'],
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#64748b")
        )
        
        story = []
        
        # 1. HEADER
        header_data = [
            [
                Paragraph("✦ HireLens AI | Recruiter Intelligence Workspace", ParagraphStyle('LogoStyleC', parent=title_style, textColor=c_secondary, fontSize=14)),
                Paragraph(f"<b>DATE:</b> {datetime.now().strftime('%b %d, %Y')}", ParagraphStyle('RightMetaC', parent=meta_style, alignment=TA_RIGHT))
            ]
        ]
        header_table = Table(header_data, colWidths=[300, 240])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LINEBELOW', (0,0), (-1,-1), 1.5, c_secondary),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 10))
        
        jd_preview = job_description.strip().split("\n")[0]
        if len(jd_preview) > 80:
            jd_preview = jd_preview[:80] + "..."
        story.append(Paragraph(f"<b>CANDIDATE COMPARISON REPORT - ROLE:</b> {clean_pdf_text(jd_preview)}", ParagraphStyle('JDCompare', parent=bold_body_style, fontSize=9, textColor=c_primary)))
        story.append(Spacer(1, 15))
        
        # 2. COMPARISON CARDS / MATRIX TABLE
        story.append(Paragraph("⚖️ SIDE-BY-SIDE SUMMARY MATRIX", h1_style))
        
        matrix_header = [Paragraph("<b>Evaluation Metric</b>", bold_body_style)]
        col_widths = [140]
        rem_width = 400
        cand_width = int(rem_width / len(results))
        
        for r in results:
            cand_name = get_candidate_name(r.resume_filename)
            matrix_header.append(Paragraph(f"<b>{clean_pdf_text(cand_name)}</b>", bold_body_style))
            col_widths.append(cand_width)
            
        matrix_data = [matrix_header]
        
        # Overall Score Row
        score_row = [Paragraph("<b>Overall Suitability Score</b>", bold_body_style)]
        for r in results:
            score_color = c_success if r.score >= 80 else (c_warning if r.score >= 50 else c_danger)
            score_row.append(Paragraph(f"<font color='{score_color.hexval()}'><b>{r.score} / 100</b></font>", bold_body_style))
        matrix_data.append(score_row)
        
        # Match Tier Row
        tier_row = [Paragraph("<b>Match Classification</b>", bold_body_style)]
        for r in results:
            tier_row.append(Paragraph(f"<b>{get_match_tier(r.score)}</b>", body_style))
        matrix_data.append(tier_row)
        
        # Interview Readiness Index
        readiness_row = [Paragraph("<b>Interview Readiness</b>", bold_body_style)]
        for r in results:
            readiness_score = int(r.score * 1.1) if r.score >= 80 else int(r.score * 0.95)
            readiness_score = min(100, readiness_score)
            readiness_row.append(Paragraph(f"<b>{readiness_score}% Readiness</b>", body_style))
        matrix_data.append(readiness_row)

        # Recommendation
        rec_row = [Paragraph("<b>Hiring Recommendation</b>", bold_body_style)]
        for r in results:
            parsed = parse_reasoning_composite(r.reasoning)
            rec_row.append(Paragraph(clean_pdf_text(parsed["recommendation"]), body_style))
        matrix_data.append(rec_row)
        
        # Key Strengths
        strengths_row = [Paragraph("<b>Core Match Strengths</b>", bold_body_style)]
        for r in results:
            parsed = parse_reasoning_composite(r.reasoning)
            gap = parsed["gap_analysis"] or r.gap_analysis or {}
            strengths = gap.get("strength_areas", []) or parsed.get("strengths", []) or []
            strengths_clean = [f"• {s}" for s in strengths[:3]]
            strengths_row.append(Paragraph("<br/>".join([clean_pdf_text(s) for s in strengths_clean]) or "N/A", body_style))
        matrix_data.append(strengths_row)
        
        # Gaps
        gaps_row = [Paragraph("<b>Misalignment Areas / Gaps</b>", bold_body_style)]
        for r in results:
            parsed = parse_reasoning_composite(r.reasoning)
            gap = parsed["gap_analysis"] or r.gap_analysis or {}
            gaps = gap.get("critical_gaps", []) or parsed.get("gaps", []) or []
            gaps_clean = [f"• {g}" for g in gaps[:3]]
            gaps_row.append(Paragraph("<br/>".join([clean_pdf_text(g) for g in gaps_clean]) or "No major gaps", body_style))
        matrix_data.append(gaps_row)
        
        # Project Relevance
        proj_row = [Paragraph("<b>Project Fit Evidence</b>", bold_body_style)]
        for r in results:
            parsed = parse_reasoning_composite(r.reasoning)
            gap = parsed["gap_analysis"] or r.gap_analysis or {}
            proj_score = 0
            if gap.get("project_intelligence"):
                scores = [p.get("relevance_score", 0) for p in gap["project_intelligence"] if p]
                if scores:
                    proj_score = int(sum(scores) / len(scores))
            else:
                proj_score = int(parsed["breakdown"]["projects"] / 20 * 100)
            proj_row.append(Paragraph(f"<b>{proj_score}%</b> Project Fit", body_style))
        matrix_data.append(proj_row)
        
        # Create Table
        matrix_table = Table(matrix_data, colWidths=col_widths)
        matrix_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), c_primary),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('GRID', (0,0), (-1,-1), 0.5, c_border),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light]),
        ]))
        
        # Override headers style text color
        for idx in range(len(col_widths)):
            matrix_data[0][idx].style.textColor = colors.white
        story.append(matrix_table)
        story.append(Spacer(1, 15))
        
        # 3. SKILL GAP MATRIX TABLE
        story.append(Paragraph("🎯 SEMANTIC JOB DESCRIPTION SKILL MATRIX", h1_style))
        story.append(Paragraph("Direct comparison of requirements matches based on weighted skill intelligence.", meta_style))
        story.append(Spacer(1, 8))
        
        skills_map = {}
        for r in results:
            gap = r.gap_analysis or parse_reasoning_composite(r.reasoning)["gap_analysis"] or {}
            evals = gap.get("weighted_evaluations", []) or []
            for ev in evals:
                name = ev.get("name", "").strip()
                if not name: continue
                if name not in skills_map or ev.get("importance", 50) > skills_map[name]["importance"]:
                    skills_map[name] = {
                        "name": name,
                        "importance": ev.get("importance", 50),
                        "category": ev.get("category", "must_have")
                    }
                    
        if not skills_map:
            for r in results:
                gap = r.gap_analysis or parse_reasoning_composite(r.reasoning)["gap_analysis"] or {}
                for s in gap.get("must_have_matched", []):
                    skills_map[s] = {"name": s, "importance": 85, "category": "must_have"}
                for s in gap.get("must_have_missing", []):
                    skills_map[s] = {"name": s, "importance": 85, "category": "must_have"}
                for s in gap.get("good_to_have_matched", []):
                    skills_map[s] = {"name": s, "importance": 35, "category": "good_to_have"}
                for s in gap.get("good_to_have_missing", []):
                    skills_map[s] = {"name": s, "importance": 35, "category": "good_to_have"}
                    
        sorted_skills = sorted(skills_map.values(), key=lambda x: x["importance"], reverse=True)
        
        skill_headers = [Paragraph("<b>Skill / Requirement</b>", bold_body_style)]
        for r in results:
            cand_name = get_candidate_name(r.resume_filename)
            skill_headers.append(Paragraph(f"<b>{clean_pdf_text(cand_name)}</b>", bold_body_style))
            
        skill_matrix_data = [skill_headers]
        
        for sk in sorted_skills[:12]: 
            row = [Paragraph(f"<b>{clean_pdf_text(sk['name'])}</b> <font color='#64748b' size='7'>(w: {sk['importance']})</font>", body_style)]
            
            for r in results:
                gap = r.gap_analysis or parse_reasoning_composite(r.reasoning)["gap_analysis"] or {}
                evals = gap.get("weighted_evaluations", []) or []
                
                found = None
                for ev in evals:
                    if ev.get("name", "").lower().strip() == sk["name"].lower().strip():
                        found = ev
                        break
                        
                if found:
                    status = found.get("status", "missing")
                    if status == "matched":
                        row.append(Paragraph(f"<font color='{c_success.hexval()}'><b>✅ Present</b></font>", body_style))
                    else:
                        is_critical = sk["category"] == "must_have" or sk["importance"] >= 60
                        color_val = c_danger.hexval() if is_critical else c_warning.hexval()
                        text_val = "❌ Missing" if is_critical else "⚠️ Missing"
                        row.append(Paragraph(f"<font color='{color_val}'><b>{text_val}</b></font>", body_style))
                else:
                    matched_list = (gap.get("must_have_matched", []) or []) + (gap.get("good_to_have_matched", []) or [])
                    missing_must = gap.get("must_have_missing", []) or []
                    missing_good = gap.get("good_to_have_missing", []) or []
                    
                    def matches(l): return any(x.lower().strip() == sk["name"].lower().strip() for x in l)
                    
                    if matches(matched_list):
                        row.append(Paragraph(f"<font color='{c_success.hexval()}'><b>✅ Present</b></font>", body_style))
                    elif matches(missing_must):
                        row.append(Paragraph(f"<font color='{c_danger.hexval()}'><b>❌ Missing</b></font>", body_style))
                    elif matches(missing_good):
                        row.append(Paragraph(f"<font color='{c_warning.hexval()}'><b>⚠️ Missing</b></font>", body_style))
                    else:
                        row.append(Paragraph("<font color='#94a3b8'>— N/A</font>", body_style))
                        
            skill_matrix_data.append(row)
            
        skill_matrix_table = Table(skill_matrix_data, colWidths=col_widths)
        skill_matrix_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), c_secondary),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('GRID', (0,0), (-1,-1), 0.5, c_border),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light]),
        ]))
        
        for idx in range(len(col_widths)):
            skill_matrix_data[0][idx].style.textColor = colors.white
        story.append(skill_matrix_table)
        
        # Build PDF
        doc.build(story)
        return buffer.getvalue()
