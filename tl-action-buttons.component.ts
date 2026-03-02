
from pathlib import Path
import logging
from io import BytesIO
from typing import Optional
import pandas as pd
from fastapi import HTTPException
from mailmerge import MailMerge
from docx import Document
from docx.shared import Pt
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
) -> bytes:

    doc = Document(BytesIO(docx_bytes))

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

        if estimated_width > cell_limit:

            new_size = floor(cell_limit / score)
            new_size = max(new_size, min_font)

            logger.info(f"Shrinking '{text}' from {current_size} → {new_size}")

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
    # python-docx does not expose these via doc.paragraphs/doc.tables,
    # so we walk the XML tree and look for w:p elements whose ancestors
    # include a txbxContent node, then wrap them as Paragraph objects.
    # Walk the whole document XML tree (body, headers, footers, shapes)
    root_element = doc.element
    for p_elem in root_element.iter():
        # localname check without hard-coded namespace URL
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

    # Also handle paragraphs inside text boxes (shapes), so that
    # name tags rendered using text boxes get the same autosizing.
    # Walk the whole document XML tree (body, headers, footers, shapes)
    root_element = doc.element
    for p_elem in root_element.iter():
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

        progressive_shrink(Paragraph(p_elem, None))

    output = BytesIO()
    doc.save(output)
    output.seek(0)
    return output.read()

def shrink_merge_name_tag_combined(
    docx_bytes: bytes,
    records: list,
    font_config: dict,
    cell_limit: int,
    min_font: int = 12
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

    # Process paragraphs
    for p in doc.paragraphs:
        progressive_shrink(p)

    # Process tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    progressive_shrink(p)

    # Also process paragraphs inside text boxes (shapes), so that
    # both left and right name tags in templates that use text boxes
    # get the same autosizing behaviour.
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

        progressive_shrink(Paragraph(p_elem, None))

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
        "min_font": 10,
        "cell_limit": 380
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
            "min_font": 12,
            "cell_limit": 400
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
            "cell_limit": 1500,
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
            "min_font": 25,
        "cell_limit": 920,
        
    },
        "table_tent_template_03": {
            "required_column": "First_Name\n**Mandatory field",
            "merge_type": "pages",
            "field_mapping": {"First_Name": "First_Name\n**Mandatory field", "Last_Name": "Last_Name\n**Mandatory field"},
            "mandatory_fields": ["First_Name\n**Mandatory field", "Last_Name\n**Mandatory field"],
            "min_font": 25,
            "cell_limit": 940,
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
                config.get("min_font", 12)
            )

        elif template_id.startswith("name_tag"):
            print("tempid:", template_id)
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
            font_config = config.get("font_config")
            if font_config:
                try:
                    default_font = max(font_config.values())
                except Exception:
                    default_font = None

            if default_font is None:
                default_font = config.get("default_font", 45)

            merged_bytes = shrink_on_wrap_only(
                merged_bytes,
                config["cell_limit"],
                config.get("min_font", 25),
                default_font,
            )
    except Exception as e:
        logger.warning(f"Post processing failed, returning original file: {e}")

    return merged_bytes
