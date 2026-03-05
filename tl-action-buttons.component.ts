
from pathlib import Path
import logging
from io import BytesIO
from typing import Optional
import pandas as pd
from fastapi import HTTPException
from mailmerge import MailMerge
from docx import Document
from docx.shared import Pt, Inches
from docx.text.paragraph import Paragraph
from math import floor





logger = logging.getLogger(__name__)

# -------------------------------------------------------------------
# Configuration (paths, constants)
# -------------------------------------------------------------------

# Get path relative to current file
TEMPLATE_FOLDER = Path(__file__).parent / "template"

# -------------------------------------------------------------------

def load_template_binary(image_template_id: str) -> bytes:
    template_name = f"{image_template_id}.docx"
    template_path = TEMPLATE_FOLDER / template_name

    if not template_path.exists():
        raise FileNotFoundError(f"Template not found: {template_name}")

    logger.info(f"Loading template: {template_name} from {template_path}")
    

    with open(template_path, "rb") as f:
        return f.read()
    
def validate_template_columns(df: pd.DataFrame, config: dict, template_id: str):
    """
    Ensures Excel exactly matches template schema.
    """

    required_excel_columns = list(config["field_mapping"].values())

    # ---- Missing Columns ----
    missing_columns = [col for col in required_excel_columns if col not in df.columns]
    if missing_columns:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Uploaded Excel does not match selected template",
                "template_id": template_id,
                "missing_columns": missing_columns,
                "received_columns": list(df.columns),
            },
        )

    # ---- Empty Columns ----
    empty_columns = [
        col for col in required_excel_columns
        if df[col].dropna().astype(str).str.strip().eq("").all()
    ]

    if empty_columns:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Mandatory fields contain no data",
                "template_id": template_id,
                "empty_columns": empty_columns,
            },
        )


def shrink_on_wrap_only(
    docx_bytes: bytes,
    cell_limit: int,
    min_font: int,
    default_font: Optional[int] = None,
    records: Optional[list] = None,
    shrink_margin: float = 0.0,
    shrink_bias_pts: int = 0,
) -> bytes:

    doc = Document(BytesIO(docx_bytes))
    name_shrunk_sizes_by_company: dict[str, list[int]] = {}

    def shrink_if_wrapping(paragraph):
        text = paragraph.text.strip()
        if not text:
            return

        if not paragraph.runs:
            return

        first_run = paragraph.runs[0]

        # 🔥 DO NOT EXIT if font.size is None
        if first_run.font.size:
            current_size = first_run.font.size.pt
        else:
            # Fallback to template-configured table tent font (or legacy default)
            current_size = default_font if default_font is not None else 45

        score = text_length_score(text)
        estimated_width = score * current_size

        logger.info("----- SHRINK DEBUG -----")
        logger.info(f"Text: {text}")
        logger.info(f"Current font size: {current_size}")
        logger.info(f"Score: {score}")
        logger.info(f"Estimated width: {estimated_width}")
        logger.info(f"Cell limit: {cell_limit}")
        logger.info("------------------------")

        # Apply optional margin so we only shrink when clearly beyond the limit
        effective_limit = cell_limit * (1 + max(shrink_margin, 0.0))

        if estimated_width > effective_limit:

            base_new_size = floor(cell_limit / score)

            # Bias slightly back toward the original size for borderline cases
            if shrink_bias_pts > 0:
                new_size = min(current_size, base_new_size + shrink_bias_pts)
            else:
                new_size = base_new_size

            new_size = max(new_size, min_font)

            if records and not is_company_paragraph(text):
                # Try to find the matching record for this name line
                company_key: Optional[str] = None
                for record in records:
                    first_val = record.get("First_name_Mandatory_field") or record.get("First_Name") or ""
                    last_val = record.get("Last_name_Mandatory_field") or record.get("Last_Name") or ""
                    full_name = f"{first_val} {last_val}".strip()
                    if full_name and (text.strip() == full_name or full_name in text.strip()):
                        company_key = (record.get("Company_Mandatory_field") or
                                       record.get("Company_Name") or "").strip()
                        break

                if company_key:
                    name_shrunk_sizes_by_company.setdefault(company_key, []).append(new_size)

            logger.info(f"Shrinking '{text}' from {current_size} → {new_size}")

            for run in paragraph.runs:
                if run.text.strip():
                    run.font.size = Pt(new_size)

    def is_company_paragraph(text: str) -> bool:
        if not records or not text:
            return False
        for record in records:
            company_val = record.get("Company_Mandatory_field") or record.get("Company_Name") or ""
            if company_val and (text.strip() == company_val.strip() or company_val.strip() in text.strip()):
                return True
        return False

    def cap_company_if_name_shrunk(paragraph):
        text = paragraph.text.strip()
        if not text or not paragraph.runs or not records:
            return
        if not is_company_paragraph(text):
            return

        company_key = text.strip()
        if company_key not in name_shrunk_sizes_by_company:
            return

        first_run = paragraph.runs[0]
        current = first_run.font.size.pt if first_run.font.size else (default_font if default_font is not None else 45)
        min_name_size = min(name_shrunk_sizes_by_company[company_key])
        new_size = min(current, min_name_size - 2)
        new_size = max(new_size, min_font)
        if new_size < current:
            for run in paragraph.runs:
                if run.text.strip():
                    run.font.size = Pt(new_size)

    for p in doc.paragraphs:
        shrink_if_wrapping(p)

    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    shrink_if_wrapping(p)

    # Also shrink paragraphs that live inside text boxes (shapes).
    body_element = doc.element.body
    for p_elem in body_element.iter():
        if not p_elem.tag.endswith("}p"):
            continue

        parent = p_elem.getparent()
        inside_textbox = False
        while parent is not None:
            if parent.tag.endswith("}txbxContent"):
                inside_textbox = True
                break
            parent = parent.getparent()

        if not inside_textbox:
            continue
        shrink_if_wrapping(Paragraph(p_elem, None))

    # If any name was shrunk, reduce its matching company so it stays below that name size
    if records and name_shrunk_sizes_by_company:
        for p in doc.paragraphs:
            cap_company_if_name_shrunk(p)
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for p in cell.paragraphs:
                        cap_company_if_name_shrunk(p)
        for p_elem in body_element.iter():
            if not p_elem.tag.endswith("}p"):
                continue
            parent = p_elem.getparent()
            inside_textbox = False
            while parent is not None:
                if parent.tag.endswith("}txbxContent"):
                    inside_textbox = True
                    break
                parent = parent.getparent()
            if not inside_textbox:
                continue
            cap_company_if_name_shrunk(Paragraph(p_elem, None))

    output = BytesIO()
    doc.save(output)
    output.seek(0)
    return output.read()

def text_length_score(text: str) -> float:
    score = 0
    for ch in text:
        if ch in "W@#%M":
            score += 1.8
        elif ch in "il.,' ":
            score += 0.5
        else:
            score += 1
    return score

def shrink_merge_name_tag(docx_bytes: bytes,records: list,font_config: dict,cell_limit: int,min_font: int = 12) -> bytes:    

    doc = Document(BytesIO(docx_bytes))

    merged_values = set()
    for r in records:
        for v in r.values():
            if v:
                merged_values.add(str(v))

    def progressive_shrink(paragraph):
        text = paragraph.text.strip()
        if not text:
            return

        # detect which field this text belongs to
        current_size = None
        for record in records:
            for field, value in record.items():
                if value and text.strip() == value.strip() and field in font_config:
                    current_size = font_config[field]
                    break
            if current_size:
                break

        if not current_size:
            return
        

        score = text_length_score(text)

        # Special handling for Event_Name
        if field == "Event_Name":
            base_size = current_size  # should be 9
            if score * base_size > cell_limit:
                size = 8
            else:
                size = 9

            for run in paragraph.runs:
                if run.text.strip():
                    run.font.size = Pt(size)
            return

        score = text_length_score(text)

        if score * current_size <= cell_limit:
            for run in paragraph.runs:
                if run.text.strip():
                    run.font.size = Pt(current_size)
            return

        size = current_size

        # Shrink gradually
        while score * size > cell_limit and size > min_font:
            size -= 1

        size = max(size, min_font)
        for run in paragraph.runs:
            if run.text.strip():
                run.font.size = Pt(size)

    # paragraphs
    for p in doc.paragraphs:
        progressive_shrink(p)

    # tables (name tags)
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    progressive_shrink(p)

    output = BytesIO()
    doc.save(output)
    output.seek(0)
    return output.read()

def shrink_merge_name_tag_combined(
    docx_bytes: bytes,
    records: list,
    font_config: dict,
    cell_limit: int,
    min_font: int = 7
) -> bytes:

    doc = Document(BytesIO(docx_bytes))

    def progressive_shrink(paragraph):
        text = paragraph.text.strip()
        if not text:
            return

        matched_fields = []
        base_size = None

        # Detect fields present in this paragraph
        for record in records:
            for field, value in record.items():
                if value and value.strip() in text and field in font_config:
                    
                    matched_fields.append(field)

        if not matched_fields:
            return

        # Use largest configured font for that line
        base_size = max(font_config[field] for field in matched_fields)

        score = text_length_score(text)

        if score * base_size <= cell_limit:
            for run in paragraph.runs:
                if run.text.strip():
                    run.font.size = Pt(base_size)
            return

        size = base_size

        while score * size > cell_limit and size > min_font:
            size -= 1

        size = max(size, min_font)

        for run in paragraph.runs:
            if run.text.strip():
                run.font.size = Pt(size)

    def process_table_paragraphs(table):
        """Process all paragraphs in a table and in any nested tables."""
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    progressive_shrink(p)
                for nested in cell.tables:
                    process_table_paragraphs(nested)

    # Process paragraphs
    for p in doc.paragraphs:
        progressive_shrink(p)

    # Process tables (including nested tables, so both columns are covered)
    for table in doc.tables:
        process_table_paragraphs(table)

    # def process_textbox_paragraphs_in_body(body_element):
    #     """Run progressive_shrink on every paragraph inside text boxes (VML or DrawingML)."""
    #     for p_elem in body_element.iter():
    #         if not p_elem.tag.endswith("}p"):
    #             continue
    #         parent = p_elem.getparent()
    #         inside_textbox = False
    #         while parent is not None:
    #             tag = parent.tag
    #             if tag.endswith("}txbxContent") or tag.endswith("}txbx"):
    #                 inside_textbox = True
    #                 break
    #             parent = parent.getparent()
    #         if not inside_textbox:
    #             continue
    #         progressive_shrink(Paragraph(p_elem, None))

    # # Process text boxes in main document body
    # process_textbox_paragraphs_in_body(doc.element.body)

    # # Process text boxes in headers and footers (name tag 2 may place second column there)
    # for section in doc.sections:
    #     for story_name in ("header", "footer"):
    #         story = getattr(section, story_name, None)
    #         if story is None:
    #             continue
    #         body_el = getattr(story, "_element", None) or getattr(story, "_body", None)
    #         if body_el is not None:
    #             process_textbox_paragraphs_in_body(body_el)

    def process_textbox_paragraphs_in_body(body_element):
        """
        Special handling for Event_Name inside text boxes.
        Other fields use progressive shrink.
        """
        for p_elem in body_element.iter():
            if not p_elem.tag.endswith("}p"):
                continue

            parent = p_elem.getparent()
            inside_textbox = False
            while parent is not None:
                tag = parent.tag
                if tag.endswith("}txbxContent") or tag.endswith("}txbx"):
                    inside_textbox = True
                    break
                parent = parent.getparent()

            if not inside_textbox:
                continue

            paragraph = Paragraph(p_elem, None)
            text = paragraph.text.strip()

            if not text:
                continue

            # 🔥 EXPLICIT Event_Name detection
            event_value = None
            for record in records:
                if record.get("Event_Name"):
                    event_value = record["Event_Name"].strip()
                    break

            if event_value and text.strip() == event_value:

                base_size = font_config.get("Event_Name", 9)
                score = text_length_score(text)

                size = base_size

                while score * size > cell_limit and size > min_font:
                    size -= 1

                size = max(size, min_font)

                for run in paragraph.runs:
                    if run.text.strip():
                        run.font.size = Pt(size)

            else:
                progressive_shrink(paragraph)

    output = BytesIO()
    doc.save(output)
    output.seek(0)
    return output.read()


def group_records_for_two_column_layout(records: list) -> list:
    """
    Groups records into pairs for any 2-column name tag template.
    Automatically detects base fields and their duplicate '1' fields.
    Ignores last record if count is odd.
    """

    if not records:
        return records

    # Detect duplicate fields (ending with '1')
    sample_record = records[0]
    base_fields = []
    duplicate_fields = {}
    for key in sample_record.keys():
        if key.endswith("1"):
            base_key = key[:-1]
            duplicate_fields[base_key] = key
        elif key + "1" in sample_record:
            base_fields.append(key)

    paired_records = []

    # Ignore last if odd
    limit = len(records) - (len(records) % 2)

    for i in range(0, limit, 2):
        first = records[i]
        second = records[i + 1]

        combined = {}

        for base in base_fields:
            combined[base] = first.get(base, "")
            combined[duplicate_fields[base]] = second.get(base, "")

        paired_records.append(combined)

    return paired_records


def apply_section_margins(docx_bytes: bytes, margin_inches: dict[str, float]) -> bytes:
    """Set section margins (inches). Dict keys: left, right, top, bottom."""
    doc = Document(BytesIO(docx_bytes))
    for section in doc.sections:
        if "left" in margin_inches:
            section.left_margin = Inches(margin_inches["left"])
        if "right" in margin_inches:
            section.right_margin = Inches(margin_inches["right"])
        if "top" in margin_inches:
            section.top_margin = Inches(margin_inches["top"])
        if "bottom" in margin_inches:
            section.bottom_margin = Inches(margin_inches["bottom"])
    output = BytesIO()
    doc.save(output)
    output.seek(0)
    return output.read()


def generate_branding_docx(excel_binary: bytes, template_id: str, event_name: str) -> bytes:
    # ----------------------------------------------------
    # Read Excel
    # ----------------------------------------------------
    df = pd.read_excel(BytesIO(excel_binary))
    df.columns = df.columns.str.strip()
    df = df.dropna(how="all")

    if df.empty:
        raise HTTPException(status_code=400, detail="Excel file contains no valid records.")

 
    # ----------------------------------------------------
    # TEMPLATE CONFIGURATION
    # ----------------------------------------------------
    TEMPLATE_CONFIG = {

        "name_tag_template_01": {
        "required_column": "First name\n**Mandatory field",
        "merge_field": "First_name",
        "merge_type": "rows",
        "field_mapping": {
            "First_name": "First name\n**Mandatory field",
            "Last_name": "Last name\n**Mandatory field",
            "Company_name": "Company",
            "First_name1": "First name\n**Mandatory field",
            "Last_name1": "Last name\n**Mandatory field",
            "Company_name1": "Company",
            
        },
        "mandatory_fields": [
            "First name\n**Mandatory field",
            "Last name\n**Mandatory field",

        ],
        "font_config": {
            "First_name": 28,
            "Last_name": 18,
            "Company_name": 12,
            "First_name1": 28,
            "Last_name1": 18,
            "Company_name1": 12,
            "Event_Name": 9,
        },
        "min_font": 7,
        "cell_limit": 380,
        "page_margins_inches": {"left": 0.8, "top": 0.4, "right": 0.5, "bottom": 0.3},
    },
            "name_tag_template_02": {
            "required_column": "First name\n**Mandatory field",
            "merge_field": "First_name_Mandatory_field",
            "merge_type": "rows",
            "field_mapping": {
                "First_name_Mandatory_field": "First name\n**Mandatory field",
                "Last_name_Mandatory_field": "Last name\n**Mandatory field",
                "LoS_Mandatory_field": "LoS\n**Mandatory field",
                "Participant_Location_Mandatory_field": "Participant Location\n**Mandatory field",
                "First_name_Mandatory_field1": "First name\n**Mandatory field",
                "Last_name_Mandatory_field1": "Last name\n**Mandatory field",
                "LoS_Mandatory_field1": "LoS\n**Mandatory field",
                "Participant_Location_Mandatory_field1": "Participant Location\n**Mandatory field",
            },
            "mandatory_fields": [
                "First name\n**Mandatory field",
                "Last name\n**Mandatory field",
                "LoS\n**Mandatory field",
                "Participant Location\n**Mandatory field"
            ],
            "font_config": {
                "First_name_Mandatory_field": 20,
                "Last_name_Mandatory_field": 20,
                "LoS_Mandatory_field": 12,
                "Participant_Location_Mandatory_field": 12,
                "First_name_Mandatory_field1": 20,
                "Last_name_Mandatory_field1": 20,
                "LoS_Mandatory_field1": 12,
                "Participant_Location_Mandatory_field1": 12,
                "Event_Name": 9,
            },
            "min_font": 7,
            "cell_limit": 440
    },
        "name_tag_template_03": {
            "required_column": "First Name\n**Mandatory field",
            "merge_field": "First_Name",
            "merge_type": "rows",
            "field_mapping": {
                "First_Name": "First Name\n**Mandatory field",
                "Last_Name": "Last Name\n**Mandatory field",
                "Company_Name": "Company Name\n**Mandatory field",
                "First_Name1": "First Name\n**Mandatory field",
                "Last_Name1": "Last Name\n**Mandatory field",
                "Company_Name1": "Company Name\n**Mandatory field",
            },
            "mandatory_fields": ["First Name\n**Mandatory field", "Last Name\n**Mandatory field", "Company Name\n**Mandatory field"],
            "font_config": {
                "First_Name": 40,
                "Last_Name": 24,
                "Company_Name": 14,
                "First_Name1": 40,
                "Last_Name1": 24,
                "Company_Name1": 14
            },
            "min_font": 14,
            "cell_limit": 500
        },
        "table_tent_template_01": {
        "required_column": "First name\n**Mandatory field",
        "merge_type": "pages",
        "field_mapping": {
            "First_name_Mandatory_field": "First name\n**Mandatory field",
            "Last_name_Mandatory_field": "Last name\n**Mandatory field",
            "Company_Mandatory_field": "Company\n**Mandatory field"
        },
        "mandatory_fields": [
            "First name\n**Mandatory field",
            "Last name\n**Mandatory field",
            "Company\n**Mandatory field"
        ],
        "font_config": {
                "First_Name": 40,
                "Last_Name": 24,
                "Company_Name": 14,
            },
            "min_font": 14,
            "cell_limit": 700,
    },
        "table_tent_template_02": {
        "required_column": "First name\n**Mandatory field",
        "merge_type": "pages",
        "field_mapping": {"First_name_Mandatory_field": "First name\n**Mandatory field","Last_name_Mandatory_field": "Last name\n**Mandatory field","Title_Mandatory_field": "Title\n**Mandatory field"},
        "mandatory_fields": ["First name\n**Mandatory field","Last name\n**Mandatory field","Title\n**Mandatory field"],
        
        "font_config": {
                "First_Name_Mandatory_field": 45,
                "Last_Name_Mandatory_field": 45,
                "Title_Mandatory_field": 32,
            },
            "min_font": 18,
        "cell_limit": 970,
        # Tuning for heuristic shrink behaviour so we more closely
        # match Word's no-wrap behaviour for borderline long names.
        "shrink_margin": 0.03,      # allow ~3% over the nominal width
        "shrink_bias_pts": 2,       # bias the computed new size slightly upward
        
    },
        "table_tent_template_03": {
            "required_column": "First_Name\n**Mandatory field",
            "merge_type": "pages",
            "field_mapping": {"First_Name": "First_Name\n**Mandatory field", "Last_Name": "Last_Name\n**Mandatory field"},
            "mandatory_fields": ["First_Name\n**Mandatory field", "Last_Name\n**Mandatory field"],
            "min_font": 18,
            "cell_limit": 1100,
        },
        "banner_template_01": {
        "required_column": "Industry\n**Mandatory field",
        "merge_type": "pages",
        "field_mapping": {
            "Industry_Mandatory_field": "Industry\n**Mandatory field",
            "Client_Mandatory_field": "Client\n**Mandatory field",
            "Market_Mandatory_field": "Market\n**Mandatory field",
        },
        "mandatory_fields": [
            "Industry\n**Mandatory field",
            "Client\n**Mandatory field",
            "Market\n**Mandatory field",
        ],
    }

    }

    if template_id not in TEMPLATE_CONFIG:
        raise HTTPException(status_code=400, detail=f"Unsupported template_id '{template_id}'.")

    config = TEMPLATE_CONFIG[template_id]

    # ----------------------------------------------------
    # Validate Columns Exist
    # ----------------------------------------------------
    validate_template_columns(df, config, template_id)

    # ----------------------------------------------------
    # STRICT MANDATORY FIELD VALIDATION 
    # ----------------------------------------------------
    mandatory_fields = config["mandatory_fields"]

    for column in mandatory_fields:

        invalid_rows = df[
            df[column].isna() |
            (df[column].astype(str).str.strip() == "")
        ]

        if not invalid_rows.empty:
            first_invalid_index = invalid_rows.index[0]

            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Mandatory value missing",
                    "template_id": template_id,
                    "column": column,
                    "row_number": int(first_invalid_index + 2),
                },
            )     
    # ----------------------------------------------------
    # Build Records (No nan possible)
    # ----------------------------------------------------
    records = []
    for _, row in df.iterrows():
        record = {}

        for merge_field, excel_column in config["field_mapping"].items():
            raw_value = row[excel_column]
            record[merge_field] = "" if pd.isna(raw_value) else str(raw_value).strip()

        records.append(record)

    # ----------------------------------------------------
    # Group records for 2-column name tag layout
    # ----------------------------------------------------
    if template_id.startswith("name_tag"):
        records = group_records_for_two_column_layout(records)

    # ----------------------------------------------------
    # Inject Event Name (Only for Name Tag 1 & 2)
    # ----------------------------------------------------
    
    if template_id in ["name_tag_template_01", "name_tag_template_02"]:
        clean_event_name = (event_name or "").strip()
        for record in records:
            record["Event_Name"] = clean_event_name

    # ----------------------------------------------------
    # Merge
    # ----------------------------------------------------
    template_binary = load_template_binary(template_id)
    document = MailMerge(BytesIO(template_binary))

    if config["merge_type"] == "rows":
        document.merge_rows(config["merge_field"], records)
    else:
        document.merge_pages(records)

    # -------------------------
    # Save merged docx
    # -------------------------
    output = BytesIO()
    document.write(output)
    output.seek(0)

    merged_bytes = output.read()

    # Apply config-driven section margins so layout is consistent (e.g. 8 per page)
    margin_inches = config.get("page_margins_inches")
    if margin_inches is not None:
        merged_bytes = apply_section_margins(merged_bytes, margin_inches)

    # -------------------------
    # POST PROCESSING
    # -------------------------
    try:

        if template_id == "name_tag_template_02":
            merged_bytes = shrink_merge_name_tag_combined(
                merged_bytes,
                records,
                config["font_config"],
                config["cell_limit"],
                config.get("min_font", 7)
            )

        elif template_id.startswith("name_tag"):
            logger.info("tempid:", template_id)
            merged_bytes = shrink_merge_name_tag(
                merged_bytes,
                records,
                config["font_config"],
                config["cell_limit"],
                config.get("min_font", 12)
            )

        elif template_id.startswith("table_tent"):
            print("tempid:", template_id)

            default_font: Optional[int] = None
            if template_id != "table_tent_template_01":
                font_config = config.get("font_config")
                if font_config:
                    try:
                        default_font = max(font_config.values())
                    except Exception:
                        default_font = None
            if default_font is None:
                default_font = config.get("default_font", 45)

            shrink_margin = config.get("shrink_margin", 0.0)
            shrink_bias_pts = config.get("shrink_bias_pts", 0)

            merged_bytes = shrink_on_wrap_only(
                merged_bytes,
                config["cell_limit"],
                config.get("min_font", 25),
                default_font,
                records=records if template_id == "table_tent_template_01" else None,
                shrink_margin=shrink_margin,
                shrink_bias_pts=shrink_bias_pts,
            )
    except Exception as e:
        logger.warning(f"Post processing failed, returning original file: {e}")

    return merged_bytes
