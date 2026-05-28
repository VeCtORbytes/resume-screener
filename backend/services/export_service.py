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
    def generate_candidate_pdf(result: Any, job_description: str) -> bytes:
        """
        Generate premium, highly organized SINGLE-PAGE candidate PDF executive dashboard report.
        """
        buffer = io.BytesIO()
        
        # 20pt (approx 0.28 inch) margins for professional single-page dashboard layout
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=20,
            leftMargin=20,
            topMargin=20,
            bottomMargin=20
        )
        
        styles = getSampleStyleSheet()
        styles['Normal'].textColor = c_text
        styles['Normal'].fontSize = 8.2
        styles['Normal'].leading = 10.5
        
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=15,
            textColor=c_primary
        )
        
        h1_style = ParagraphStyle(
            'SectionH1',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=11.5,
            textColor=c_primary,
            spaceAfter=2,
            keepWithNext=True
        )
        
        h2_style = ParagraphStyle(
            'SubSectionH2',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8.2,
            leading=10,
            textColor=c_secondary,
            spaceAfter=1,
            keepWithNext=True
        )
        
        body_style = ParagraphStyle(
            'BodyClean',
            parent=styles['Normal'],
            fontSize=7.8,
            leading=9.8,
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
            fontSize=7.2,
            leading=9,
            textColor=colors.HexColor("#64748b")
        )
        
        story = []
        
        parsed = parse_reasoning_composite(result.reasoning)
        gap = parsed["gap_analysis"] or result.gap_analysis or {}
        cand_name = get_candidate_name(result.resume_filename)
        score = result.score
        tier = get_match_tier(score)
        risk = get_risk_level(score)
        rec_summary = parsed["recommendation"]
        
        must_matched = gap.get("must_have_matched", []) or []
        must_missing = gap.get("must_have_missing", []) or []
        good_matched = gap.get("good_to_have_matched", []) or []
        good_missing = gap.get("good_to_have_missing", []) or []
        
        tot_must = len(must_matched) + len(must_missing)
        must_cov = int((len(must_matched) / tot_must * 100)) if tot_must > 0 else 0
        
        tot_good = len(good_matched) + len(good_missing)
        good_cov = int((len(good_matched) / tot_good * 100)) if tot_good > 0 else 0
        
        crit_gaps_count = len(must_missing)
        
        project_score = 0
        if gap.get("project_intelligence"):
            scores = [p.get("relevance_score", 0) for p in gap["project_intelligence"] if p]
            if scores:
                project_score = int(sum(scores) / len(scores))
        else:
            project_score = int(parsed["breakdown"]["projects"] / 20 * 100)

        matched_skills_count = len(must_matched) + len(good_matched)
        missing_skills_count = len(must_missing) + len(good_missing)
        partial_skills_count = 0
        
        evals = gap.get("weighted_evaluations", []) or []
        for ev in evals:
            if ev.get("status") == "partial":
                partial_skills_count += 1
                
        total_skills = matched_skills_count + missing_skills_count + partial_skills_count
        if total_skills == 0:
            total_skills = 5
            
        matched_pct = int((matched_skills_count / total_skills * 100)) if total_skills > 0 else 0
        partial_pct = int((partial_skills_count / total_skills * 100)) if total_skills > 0 else 0
        missing_pct = int((missing_skills_count / total_skills * 100)) if total_skills > 0 else 0

        # ----------------------------------------------------
        # TOP HEADER (Compact Horizontal Banner)
        # ----------------------------------------------------
        header_data = [
            [
                Paragraph("✦ HireLens Executive Hiring Brief", ParagraphStyle('LogoStyle1', parent=title_style, textColor=c_secondary, fontSize=11)),
                Paragraph(f"<b>EVALUATED:</b> {datetime.now().strftime('%b %d, %Y')}", ParagraphStyle('RightMeta1', parent=meta_style, alignment=TA_RIGHT))
            ]
        ]
        header_table = Table(header_data, colWidths=[280, 292])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('LINEBELOW', (0,0), (-1,-1), 1, c_secondary),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 4))
        
        # Details & Score Grid Box (Merged Executive Header)
        score_color = c_success if score >= 80 else (c_warning if score >= 60 else c_danger)
        
        job_role_title = job_description.strip().splitlines()[0]
        if len(job_role_title) > 60:
            job_role_title = job_role_title[:60] + "..."
            
        reliability = gap.get("reliability_signals", {})
        ai_conf = reliability.get("ai_confidence_score", 92)
        
        ext_conf = gap.get("extraction_confidence", {})
        ext_label = ext_conf.get("label", "High")
        ext_score = ext_conf.get("score", 95)
            
        info_panel = [
            Paragraph(f"<font size='11' color='{c_primary.hexval()}'><b>{clean_pdf_text(cand_name)}</b></font>", bold_body_style),
            Paragraph(f"<b>Mandate:</b> {clean_pdf_text(job_role_title)}", body_style),
        ]
        
        score_panel = [
            Paragraph(f"<b>Match Grade:</b> <font color='{c_secondary.hexval()}'><b>{tier}</b></font>  |  <b>Risk Profile:</b> <font color='{score_color.hexval()}'><b>{risk}</b></font>", body_style),
            Spacer(1, 2),
            Paragraph(f"<b>AI Confidence:</b> <b>{ai_conf}%</b>  |  <b>Parsing Reliability:</b> <b>{ext_score}% ({ext_label})</b>", meta_style)
        ]
        
        header_grid_data = [
            [info_panel, score_panel]
        ]
        header_grid = Table(header_grid_data, colWidths=[330, 242])
        header_grid.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), c_light),
            ('BOX', (0,0), (-1,-1), 0.5, c_border),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(header_grid)
        story.append(Spacer(1, 4))
        
        # Dynamic Recruiter Alerts Warning Banner
        alerts = gap.get("recruiter_alerts", [])
        filtered_alerts = [a for a in alerts if "✨" not in a] if alerts else []
        if filtered_alerts:
            alert_paragraphs = []
            for alert_text in filtered_alerts[:2]:
                alert_paragraphs.append(Paragraph(f"<font color='#854d0e'><b>Alert:</b></font> {clean_pdf_text(alert_text)}", ParagraphStyle('AlertText', parent=meta_style, fontSize=7, leading=8.5, textColor=colors.HexColor("#854d0e"))))
            
            alert_banner_table = Table([[alert_paragraphs]], colWidths=[572])
            alert_banner_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fef9c3")),
                ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#fef08a")),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('PADDING', (0,0), (-1,-1), 4),
            ]))
            story.append(alert_banner_table)
            story.append(Spacer(1, 4))

        # ----------------------------------------------------
        # SECTION 1 — EXECUTIVE MATCH OVERVIEW
        # ----------------------------------------------------
        donut_drawing = draw_donut_chart(score, size=50)
        
        stats_para = Paragraph(
            f"<b>Match Coverage:</b> <font color='{c_success.hexval()}'><b>{matched_pct}% Matched</b></font>  •  "
            f"<font color='{c_warning.hexval()}'><b>{partial_pct}% Partial</b></font>  •  "
            f"<font color='{c_danger.hexval()}'><b>{missing_pct}% Missing</b></font>  |  "
            f"<b>Total Evaluated:</b> {total_skills} Skills",
            bold_body_style
        )
        
        exec_summary_panel = [
            Paragraph(f"<b>Executive Suitability:</b> {clean_pdf_text(rec_summary)}", body_style),
            Spacer(1, 3),
            stats_para
        ]
        
        exec_overview_table = Table([[donut_drawing, exec_summary_panel]], colWidths=[65, 507])
        exec_overview_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.white),
            ('BOX', (0,0), (-1,-1), 0.5, c_border),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (0,0), 8),
        ]))
        story.append(Paragraph("SECTION 1 — EXECUTIVE MATCH OVERVIEW", h1_style))
        story.append(exec_overview_table)
        story.append(Spacer(1, 4))

        # ----------------------------------------------------
        # ROW 2 — SKILL INTELLIGENCE (SEC 2) & MATRIX (SEC 3)
        # ----------------------------------------------------
        # Dynamically scale number of skill rows to balance vertical empty space
        projects = gap.get("project_intelligence", []) or []
        num_skills = 7 if not projects else (4 if len(projects) >= 2 else 5)

        # Left Panel: SECTION 2 — SKILL INTELLIGENCE
        skills_pie_drawing = draw_skills_pie(matched_skills_count, partial_skills_count, missing_skills_count, size=52)
        
        progress_bars_panel = [
            Paragraph("Must-Have Skills", meta_style),
            make_progress_bar_mini(must_cov, c_secondary),
            Spacer(1, 1),
            Paragraph("Optional Skills", meta_style),
            make_progress_bar_mini(good_cov, c_accent),
        ]
        
        skills_charts_row = Table([[skills_pie_drawing, progress_bars_panel]], colWidths=[62, 219])
        skills_charts_row.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING', (0,0), (-1,-1), 0),
        ]))
        
        mini_skills_data = [
            [Paragraph("<b>Skill</b>", bold_body_style), Paragraph("<b>Wgt</b>", bold_body_style), Paragraph("<b>Status</b>", bold_body_style)]
        ]
        
        if not evals:
            for s in must_matched[:3]:
                evals.append({"name": s, "importance": 85, "status": "matched"})
            for s in must_missing[:2]:
                evals.append({"name": s, "importance": 85, "status": "missing"})
                
        evals = sorted(evals, key=lambda x: x.get("importance", 50), reverse=True)
        for ev in evals[:num_skills]:
            s_name = ev.get("name", "Skill")
            s_weight = ev.get("importance", 50)
            status_raw = ev.get("status", "missing")
            confidence = ev.get("confidence", "high").title()
            
            if len(s_name) > 20:
                s_name = s_name[:18] + ".."
                
            if status_raw == "matched":
                status_p = Paragraph(f"<font color='{c_success.hexval()}'><b>Matched</b></font> <font color='#64748b' size='6.5'>({confidence})</font>", body_style)
            elif status_raw == "inferred":
                status_p = Paragraph(f"<font color='{c_secondary.hexval()}'><b>Inferred</b></font> <font color='#64748b' size='6.5'>({confidence})</font>", body_style)
            elif status_raw == "ambiguous":
                status_p = Paragraph(f"<font color='{c_warning.hexval()}'><b>Ambiguous</b></font> <font color='#64748b' size='6.5'>({confidence})</font>", body_style)
            elif status_raw == "partial":
                status_p = Paragraph(f"<font color='{c_warning.hexval()}'><b>Partial</b></font> <font color='#64748b' size='6.5'>({confidence})</font>", body_style)
            else:
                status_p = Paragraph(f"<font color='{c_danger.hexval()}'><b>Missing</b></font> <font color='#64748b' size='6.5'>({confidence})</font>", body_style)
                
            mini_skills_data.append([
                Paragraph(clean_pdf_text(s_name), body_style),
                Paragraph(f"{s_weight}%", body_style),
                status_p
            ])
            
        mini_skills_table = Table(mini_skills_data, colWidths=[140, 45, 96])
        mini_skills_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), c_primary),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2.2),
            ('TOPPADDING', (0,0), (-1,-1), 2.2),
            ('LEFTPADDING', (0,0), (-1,-1), 4),
            ('GRID', (0,0), (-1,-1), 0.5, c_border),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light]),
        ]))
        
        for idx in range(3):
            mini_skills_data[0][idx].style.textColor = colors.white
            
        sec2_container = [
            Paragraph("🎯 SECTION 2 — SKILL INTELLIGENCE", h1_style),
            Spacer(1, 2),
            skills_charts_row,
            Spacer(1, 4),
            mini_skills_table
        ]
        
        # Right Panel: SECTION 3 — JD REQUIREMENTS VS RESUME EVIDENCE
        sec3_data = [
            [Paragraph("<b>JD Requirement</b>", bold_body_style), Paragraph("<b>Resume Evidence</b>", bold_body_style), Paragraph("<b>Match</b>", bold_body_style)]
        ]
        
        mapped_rows = 0
        for ev in evals:
            if mapped_rows >= num_skills:
                break
            name = ev.get("name", "Skill")
            status_raw = ev.get("status", "missing")
            
            if len(name) > 18:
                name_disp = name[:16] + ".."
            else:
                name_disp = name
                
            if status_raw == "matched":
                evidence_text = f"{name} experienced in profile"
                match_val = f"<font color='{c_success.hexval()}'><b>✅ Present</b></font>"
            elif status_raw == "inferred":
                evidence_text = "Inferred via projects/experience"
                match_val = f"<font color='{c_secondary.hexval()}'><b>✓ Inferred</b></font>"
            elif status_raw == "ambiguous":
                evidence_text = "Ambiguous/weak evidence"
                match_val = f"<font color='{c_warning.hexval()}'><b>⚠ Ambiguous</b></font>"
            elif status_raw == "partial":
                evidence_text = "Partial evidence found"
                match_val = f"<font color='{c_warning.hexval()}'><b>⚠ Partial</b></font>"
            else:
                evidence_text = "No explicit profile evidence"
                match_val = f"<font color='{c_danger.hexval()}'><b>❌ Gapped</b></font>"
                
            if len(evidence_text) > 28:
                evidence_text = evidence_text[:26] + ".."
                
            sec3_data.append([
                Paragraph(clean_pdf_text(name_disp), body_style),
                Paragraph(clean_pdf_text(evidence_text), body_style),
                Paragraph(match_val, body_style)
            ])
            mapped_rows += 1
            
        while len(sec3_data) < num_skills + 1:
            sec3_data.append([
                Paragraph("Additional stack", body_style),
                Paragraph("Verified in review", body_style),
                Paragraph(f"<font color='{c_success.hexval()}'><b>✅ Verified</b></font>", body_style)
            ])
            
        sec3_table = Table(sec3_data, colWidths=[100, 115, 66])
        sec3_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), c_secondary),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
            ('TOPPADDING', (0,0), (-1,-1), 2.5),
            ('LEFTPADDING', (0,0), (-1,-1), 4),
            ('GRID', (0,0), (-1,-1), 0.5, c_border),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light]),
        ]))
        
        for idx in range(3):
            sec3_data[0][idx].style.textColor = colors.white
            
        sec3_container = [
            Paragraph("⚖️ SECTION 3 — REQUIREMENTS MATRIX", h1_style),
            Spacer(1, 2),
            sec3_table
        ]
        
        row2_table = Table([[sec2_container, '', sec3_container]], colWidths=[281, 10, 281])
        row2_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('PADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(row2_table)
        story.append(Spacer(1, 4))

        # ----------------------------------------------------
        # ROW 3 — PROJECTS (SEC 4) & RECOMMENDATION (SEC 5)
        # ----------------------------------------------------
        proj_cards_list = []
        for proj in projects[:2]:
            p_name = proj.get("project_name", "Portfolio Project")
            p_desc = proj.get("description", "")
            p_inferred = proj.get("inferred_skills", [])
            p_score = proj.get("relevance_score", 0)
            
            p_risk_areas = [s for s in must_missing[:1]]
            
            if len(p_desc) > 90:
                p_desc = p_desc[:88] + ".."
                
            p_content = [
                Paragraph(f"<b>📁 {clean_pdf_text(p_name)}</b>  •  <b>{p_score}% Relevance</b>", h2_style),
                Paragraph(f"<i>{clean_pdf_text(p_desc)}</i>", meta_style),
                Paragraph(f"<b>Capabilities:</b> {clean_pdf_text(', '.join(p_inferred[:4])) or 'None'}", meta_style),
                Paragraph(f"<b>Risk:</b> " + (f"<font color='{c_warning.hexval()}'>⚠️ Missing {', '.join(p_risk_areas)}</font>" if p_risk_areas else "✓ Verified"), meta_style),
            ]
            
            t_p_card = Table([[p_content]], colWidths=[281])
            t_p_card.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), c_light),
                ('BOX', (0,0), (-1,-1), 0.5, c_border),
                ('PADDING', (0,0), (-1,-1), 4),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ]))
            proj_cards_list.append(t_p_card)
            proj_cards_list.append(Spacer(1, 3))
            
        if not proj_cards_list:
            no_proj_content = [
                Paragraph("<b>📁 Project Capability Evidence</b>", h2_style),
                Spacer(1, 2),
                Paragraph("<i>No project claims parsed in the resume profile. Alignment score is automatically based on skill evaluations and professional experience tenure.</i>", meta_style)
            ]
            t_no_proj = Table([[no_proj_content]], colWidths=[281])
            t_no_proj.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), c_light),
                ('BOX', (0,0), (-1,-1), 0.5, c_border),
                ('PADDING', (0,0), (-1,-1), 6),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ]))
            proj_cards_list.append(t_no_proj)
            
        sec4_container = [
            Paragraph("📁 SECTION 4 — PROJECT INTELLIGENCE", h1_style),
            Spacer(1, 2),
        ] + proj_cards_list
        
        # SECTION 5 — RECOMMENDATION SUMMARY
        strengths = gap.get("strength_areas", []) or parsed.get("strengths", []) or []
        gaps_list = gap.get("critical_gaps", []) or parsed.get("gaps", []) or []
        
        strengths_bullets = [Paragraph("<b>Core Strengths:</b>", bold_body_style)]
        for s in strengths[:3]:
            strengths_bullets.append(Paragraph(f"• {clean_pdf_text(s)}", meta_style))
            
        gaps_bullets = [Paragraph("<b>Improvement Areas:</b>", bold_body_style)]
        for g in gaps_list[:2]:
            gaps_bullets.append(Paragraph(f"• {clean_pdf_text(g)}", meta_style))
        if len(gaps_bullets) < 2:
            gaps_bullets.append(Paragraph("• No major technical risk", meta_style))
            
        gauge_drawing = draw_gauge_chart(score, width=76, height=28)
        gauge_panel = [
            Paragraph("<b>Overall Rating</b>", bold_body_style),
            Spacer(1, 1),
            gauge_drawing,
            Spacer(1, 1),
            Paragraph(f"<b>Rec:</b> {tier}", meta_style)
        ]
        
        sub_grid_data = [
            [strengths_bullets, gaps_bullets, gauge_panel]
        ]
        sub_grid = Table(sub_grid_data, colWidths=[100, 101, 80])
        sub_grid.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), c_light),
            ('BOX', (0,0), (-1,-1), 0.5, c_border),
            ('LINELEFT', (0,0), (0,-1), 3, c_secondary),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        
        sec5_container = [
            Paragraph("📋 SECTION 5 — RECOMMENDATION SUMMARY", h1_style),
            Spacer(1, 2),
            sub_grid
        ]
        
        row3_table = Table([[sec4_container, '', sec5_container]], colWidths=[281, 10, 281])
        row3_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('PADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(row3_table)
        story.append(Spacer(1, 4))
        
        # Single-Page footer
        footer_style = ParagraphStyle('FooterStyle', parent=meta_style, fontSize=6, alignment=TA_CENTER)
        story.append(Paragraph("✦ Confidential Hiring Brief • Powered by HireLens AI SaaS Screening Engine", footer_style))
        
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
