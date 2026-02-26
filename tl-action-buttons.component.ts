
"""
LangChain Tools for Data Sources.
Each tool wraps a data source integration.
"""

from langchain_core.tools import tool
from typing import Optional, List
import logging
import json

# from .ppt_service import PPTService

# Add to service globals


logger = logging.getLogger(__name__)

# Tool instances will be injected
_factiva_service = None
_capitaliq_service = None
_boardex_service = None
_ppt_service = None
_ai_search_service = None
_refine_service = None
_format_translator_service = None
_passage_retrieval_service = None
_tavily_service = None
_benchmarking_service = None
_css_service = None
_commercial_hub_service = None

def set_services(factiva=None, capitaliq=None, boardex=None, ppt=None, ai_search=None,
                 refine=None, format_translator=None, passage_retrieval=None, tavily=None, benchmarking=None, css=None, commercial_hub=None):
    """Inject service instances into tools."""
    global _factiva_service, _capitaliq_service, _boardex_service, _ppt_service, _ai_search_service,_refine_service, _format_translator_service, _passage_retrieval_service, _tavily_service, _benchmarking_service, _css_service, _commercial_hub_service

    _factiva_service = factiva
    _capitaliq_service = capitaliq
    _boardex_service = boardex
    _ppt_service = ppt
    _ai_search_service = ai_search
    _refine_service = refine
    _format_translator_service = format_translator
    _passage_retrieval_service = passage_retrieval
    _tavily_service = tavily
    _benchmarking_service = benchmarking
    _css_service = css
    _commercial_hub_service = commercial_hub

@tool
async def search_factiva_news(
    query: str,
    limit: int = 5
) -> str:
    """
    Search for news articles from Factiva/Dow Jones.
    
    Use this tool when the user asks about:
    - Recent news or headlines
    - Wall Street Journal (WSJ) articles
    - Press releases or media coverage
    - Company announcements in the news
    - Market news or industry news
    
    Args:
        query: Simple search terms like "Tesla", "Apple earnings", "Microsoft AI". 
               DO NOT use complex syntax - just plain keywords.
        limit: Number of articles to return (default 5)
    
    Returns:
        Formatted news articles with headlines, sources, and content summaries
    """
    if not _factiva_service:
        return "Factiva service not available"
    
    try:
        logger.info(f"[Tool:search_factiva_news] Query: {query}")
        response = await _factiva_service.fetch_content(query, response_limit=limit)
        return _factiva_service.format_response(response)
    except Exception as e:
        logger.error(f"[Tool:search_factiva_news] Error: {e}")
        return f"Error fetching news: {str(e)}"


@tool
async def query_capitaliq_financials(
    query_description: str,
    company_name: Optional[str] = None,
    data_item_name: Optional[str] = None,
    calendar_year: Optional[int] = None,
    period_type: Optional[str] = None,
    custom_where_clause: Optional[str] = None,
    select_columns: Optional[List[str]] = None,
    limit: int = 50
) -> str:
    """
    Query CapitalIQ SQL Server database for company financial data.
    
    Table: vw_CompanyIncomeStatementFinancials
    
    Available columns:
    - companyName (VARCHAR): Name of the company
    - CapIQ_Id (VARCHAR): Capital IQ identifier
    - SEC_CIK (VARCHAR): SEC CIK number
    - DUNS (VARCHAR): DUNS number
    - periodEndDate (DATETIME): End date of the financial period
    - filingDate (DATETIME): Date of filing
    - periodTypeName (VARCHAR): 'Annual' or 'Quarterly'
    - calendarYear (INT): Calendar year (e.g., 2023)
    - dataItemId (INT): ID of the financial data item
    - dataItemName (VARCHAR): Name of the metric - options include:
        * 'Net Income - (IS)'
        * 'Total Revenues'
        * 'Gross Profit'
        * 'Cost Of Revenues'
        * 'Depreciation & Amortization, Total - (IS)'
        * 'Unusual Items, Total'
    - dataItemValue (DECIMAL): Value of the financial metric
    
    Use this tool when the user asks about:
    - Revenue, income, profit, earnings
    - Financial statements or reports
    - EBITDA, gross profit, cost of revenues
    - Quarterly or annual financial data
    - Any company financial metrics
    
    Args:
        query_description: Natural language description of what data is needed
        company_name: Filter by company name (partial match with LIKE)
        data_item_name: Filter by specific metric name (exact match or partial)
        calendar_year: Filter by year (e.g., 2023)
        period_type: Filter by 'Annual' or 'Quarterly'
        custom_where_clause: Additional SQL WHERE conditions (e.g., "dataItemValue > 1000000")
        select_columns: List of columns to return. If None, returns common columns.
        limit: Max rows to return (default 50)
    
    Returns:
        Formatted financial data results
    """
    if not _capitaliq_service:
        return "CapitalIQ service not available"
    
    try:
        logger.info(f"[Tool:query_capitaliq_financials] {query_description}")
        
        results = await _capitaliq_service.execute_flexible_query(
            company_name=company_name,
            data_item_name=data_item_name,
            calendar_year=calendar_year,
            period_type=period_type,
            custom_where_clause=custom_where_clause,
            select_columns=select_columns,
            limit=limit
        )
        
        return _capitaliq_service.format_response(results)
    except Exception as e:
        logger.error(f"[Tool:query_capitaliq_financials] Error: {e}")
        return f"Error querying financial data: {str(e)}"


@tool
async def search_benchmarking(
    query: str
)-> str:
    """
    Get benchmarking metric/KPIs for a business function.

    The metrics/KPIs are retrieved from the Benchmarking API that give details of the operational efficiency KPIs. 
    It includes Metric details and Benchmark statistics which give quantitative metrics for how companies perform 
    in all major areas/functions of business operations.

    Use this tool when user asks:
    - For benchamarking data
    - How a company is performing in a specific business function
    - Quantitative metrics for how company is performing in a function

    Args:
        query: The user query - whatever the user asked.Natural language search query.
    
    Returns:
        Benchmarking Metric/KPI details along with the definitions and display name.
    """
    if not _benchmarking_service:
        return "Benchmarking service not available"
    
    try:
        logger.info(f"[Tool:search_benchmarking] Query: {query}")
        
        metric_data = await _benchmarking_service.run_pipeline(query)
        
        # Return structured data instead of formatted text
        return metric_data
        
    except Exception as e:
        logger.error(f"[Tool:search_benchmarking] Error: {e}")
        return f"Error retrieving metrics: {str(e)}"


@tool
async def query_boardex_advisors(
    query_description: str,
    board_name: Optional[str] = None,
    advisor_name: Optional[str] = None,
    advisor_type: Optional[str] = None,
    custom_where_clause: Optional[str] = None,
    select_columns: Optional[List[str]] = None,
    limit: int = 50
) -> str:
    """
    Query BoardEx Databricks database for company advisor relationships.
    
    Table: thirdpartydata_dev.boardex.company_profile_advisors
    
    Available columns:
    - BoardID (INT): Unique board identifier
    - BoardName (VARCHAR): Name of the company/board
    - ClientCompanyID (VARCHAR): Client company identifier
    - AdvisorName (VARCHAR): Name of the advisory firm (e.g., 'PricewaterhouseCoopers (PwC)', 'Deloitte', 'KPMG', 'Ernst & Young')
    - AdvTypeDesc (VARCHAR): Type of advisor - 'Auditors', 'Corporate Advisors', 'Investor Relations Advisors'
    - OrgVisible (VARCHAR): Organization visibility flag ('Yes'/'No')
    - Last_Refreshed_Date (DATETIME): Last data refresh timestamp
    - SrcName (VARCHAR): Source file name
    
    Use this tool when the user asks about:
    - Company auditors (PwC, Deloitte, KPMG, EY)
    - Corporate advisors
    - Investor relations advisors
    - Which companies a firm audits/advises
    - Advisory relationships
    
    Args:
        query_description: Natural language description of what data is needed
        board_name: Filter by company name (partial match)
        advisor_name: Filter by advisor firm name (e.g., 'PwC', 'Deloitte')
        advisor_type: Filter by type - 'Auditors', 'Corporate Advisors', 'Investor Relations Advisors'
        custom_where_clause: Additional SQL WHERE conditions
        select_columns: List of columns to return. If None, returns common columns.
        limit: Max rows to return (default 50)
    
    Returns:
        Formatted advisor relationship data
    """
    if not _boardex_service:
        return "BoardEx service not available"
    
    try:
        logger.info(f"[Tool:query_boardex_advisors] {query_description}")
        
        results = await _boardex_service.execute_flexible_advisor_query(
            board_name=board_name,
            advisor_name=advisor_name,
            advisor_type=advisor_type,
            custom_where_clause=custom_where_clause,
            select_columns=select_columns,
            limit=limit
        )
        logger.info(f"[Tool:query_boardex_advisors] Raw results count: {len(results)}")
        logger.info(f"[Tool:query_boardex_advisors] Raw results: {results}")
        return _boardex_service.format_response(results, is_advisor=True)
    except Exception as e:
        logger.error(f"[Tool:query_boardex_advisors] Error: {e}")
        return f"Error querying advisor data: {str(e)}"


@tool
async def query_boardex_achievements(
    query_description: str,
    director_name: Optional[str] = None,
    company_name: Optional[str] = None,
    achievement_keyword: Optional[str] = None,
    custom_where_clause: Optional[str] = None,
    select_columns: Optional[List[str]] = None,
    limit: int = 50
) -> str:
    """
    Query BoardEx Databricks database for director achievements and awards.
    
    Table: thirdpartydata_dev.boardex.director_profile_achievements
    
    Available columns:
    - PrimaryKeyID (INT): Primary key identifier
    - RowType (VARCHAR): Type of row (e.g., 'Achievements')
    - DirectorID (INT): Unique director identifier
    - DirectorName (VARCHAR): Name of the director
    - ClientDirectorID (VARCHAR): Client director identifier
    - CompanyID (INT): Company identifier
    - CompanyName (VARCHAR): Name of the company
    - ClientCompanyID (VARCHAR): Client company identifier
    - AchievementDate (DATE): Date of achievement
    - AchievementDateFlag (INT): Flag for achievement date precision
    - AchievementDateDisplay (VARCHAR): Display format of achievement date
    - Achievement (VARCHAR): Description of the achievement/award (e.g., 'Meritorious Service Medal', 'Hall of Fame Induction')
    - Last_Refreshed_Date (DATETIME): Last data refresh timestamp
    - SrcName (VARCHAR): Source file name
    
    Use this tool when the user asks about:
    - Executive awards or achievements
    - Director recognitions or honors
    - Leadership medals or accolades
    - Board member accomplishments
    - CEO/CFO/executive achievements
    
    Args:
        query_description: Natural language description of what data is needed
        director_name: Filter by director name (partial match)
        company_name: Filter by company name (partial match)
        achievement_keyword: Filter achievements containing this keyword
        custom_where_clause: Additional SQL WHERE conditions
        select_columns: List of columns to return. If None, returns common columns.
        limit: Max rows to return (default 50)
    
    Returns:
        Formatted achievement data
    """
    if not _boardex_service:
        return "BoardEx service not available"
    
    try:
        logger.info(f"[Tool:query_boardex_achievements] {query_description}")
        
        results = await _boardex_service.execute_flexible_achievement_query(
            director_name=director_name,
            company_name=company_name,
            achievement_keyword=achievement_keyword,
            custom_where_clause=custom_where_clause,
            select_columns=select_columns,
            limit=limit
        )
        
        return _boardex_service.format_response(results, is_advisor=False)
    except Exception as e:
        logger.error(f"[Tool:query_boardex_achievements] Error: {e}")
        return f"Error querying achievement data: {str(e)}"


@tool
async def execute_raw_capitaliq_sql(
    sql_query: str,
    query_description: str
) -> str:
    """
    Execute a raw SQL query against CapitalIQ SQL Server database.
    
    USE WITH CAUTION - Only for complex queries that can't be done with query_capitaliq_financials.
    
    Table available: vw_CompanyIncomeStatementFinancials
    
    Columns: companyName, CapIQ_Id, SEC_CIK, DUNS, periodEndDate, filingDate, 
             periodTypeName, calendarYear, dataItemId, dataItemName, dataItemValue
    
    Args:
        sql_query: Raw SQL SELECT query (must be SELECT only, no INSERT/UPDATE/DELETE)
        query_description: Description of what this query does
    
    Returns:
        Query results formatted as text
    """
    if not _capitaliq_service:
        return "CapitalIQ service not available"
    
    try:
        # Security: Only allow SELECT queries
        if not sql_query.strip().upper().startswith("SELECT"):
            return "Error: Only SELECT queries are allowed"
        
        logger.info(f"[Tool:execute_raw_capitaliq_sql] {query_description}")
        logger.info(f"[Tool:execute_raw_capitaliq_sql] Query: {sql_query}")
        
        results = await _capitaliq_service.execute_query(sql_query)
        return _capitaliq_service.format_response(results)
    except Exception as e:
        logger.error(f"[Tool:execute_raw_capitaliq_sql] Error: {e}")
        return f"Error executing SQL query: {str(e)}"


@tool
async def execute_raw_boardex_sql(
    sql_query: str,
    query_description: str
) -> str:
    """
    Execute a raw SQL query against BoardEx Databricks database.
    
    USE WITH CAUTION - Only for complex queries that can't be done with other BoardEx tools.
    
    Tables available:
    - thirdpartydata_dev.boardex.company_profile_advisors
    - thirdpartydata_dev.boardex.director_profile_achievements
    
    Args:
        sql_query: Raw SQL SELECT query (must be SELECT only)
        query_description: Description of what this query does
    
    Returns:
        Query results formatted as text
    """
    if not _boardex_service:
        return "BoardEx service not available"
    
    try:
        # Security: Only allow SELECT queries
        if not sql_query.strip().upper().startswith("SELECT"):
            return "Error: Only SELECT queries are allowed"
        
        logger.info(f"[Tool:execute_raw_boardex_sql] {query_description}")
        logger.info(f"[Tool:execute_raw_boardex_sql] Query: {sql_query}")
        
        results = await _boardex_service.execute_query(sql_query)
        return _boardex_service.format_response(results, is_advisor=True)
    except Exception as e:
        logger.error(f"[Tool:execute_raw_boardex_sql] Error: {e}")
        return f"Error executing SQL query: {str(e)}"


@tool
async def generate_powerpoint_presentation(
    user_request: str,
    enhanced_guidelines: Optional[str] = None
) -> str:
    """
    Generate a PowerPoint presentation based on user request.
    
    Use this tool when the user asks to:
    - Create a PowerPoint presentation
    - Generate a PPT or deck
    - Prepare slides
    - Make a presentation
    - Create a slideshow
    
    Keywords to trigger this tool:
    - "create/generate/make/prepare a ppt"
    - "create/generate/make/prepare a presentation"
    - "create/generate/make/prepare a deck"
    - "create/generate/make/prepare slides"
    - "powerpoint"
    
    Args:
        user_request: The original user request/query
        enhanced_guidelines: Optional enhanced version of the request with more details.
                           Only provide this if the original request is too vague or needs clarification.
                           For example, if user says "create a ppt", you might enhance it to 
                           "create a professional presentation about [topic] with key points on [aspects]"
    
    Returns:
        Markdown formatted message with download link to the generated presentation
    
    Examples:
        - "create a ppt on wildfire in Australia" → Use as-is
        - "make a presentation about Tesla" → Enhance to "create a presentation about Tesla including company overview, financial performance, and recent developments"
        - "prepare a deck" → Enhance to add specific topic if context allows
    """
    if not _ppt_service:
        return "PowerPoint generation service not available"
    
    try:
        logger.info(f"[Tool:generate_powerpoint_presentation] Request: {user_request}")
        
        if enhanced_guidelines:
            logger.info(f"[Tool:generate_powerpoint_presentation] Enhanced: {enhanced_guidelines}")
        
        # Note: generate_presentation is now async but handles blocking operations internally
        result = await _ppt_service.generate_presentation(
            user_query=user_request,
            additional_guidelines=enhanced_guidelines
        )
        
        return _ppt_service.format_response(result)
        
    except Exception as e:
        logger.error(f"[Tool:generate_powerpoint_presentation] Error: {e}")
        return f"❌ Error generating presentation: {str(e)}\n\nPlease try again or contact support if the issue persists."
    

@tool
async def query_capitaliq_balance_sheet(
    query_description: str,
    company_name: Optional[str] = None,
    data_item_name: Optional[str] = None,
    calendar_year: Optional[int] = None,
    custom_where_clause: Optional[str] = None,
    select_columns: Optional[List[str]] = None,
    limit: int = 50
) -> str:
    """
    Query CapitalIQ SQL Server database for company balance sheet data.
    
    Table: vw_CompanyBalanceSheetFinancials
    
    Available columns:
    - companyName (VARCHAR): Name of the company
    - CapIQ_Id (INT): Capital IQ identifier
    - SEC_CIK (VARCHAR): SEC CIK number
    - DUNS (VARCHAR): DUNS number
    - periodEndDate (DATETIME): End date of the financial period
    - filingDate (DATETIME): Date of filing
    - periodTypeName (VARCHAR): 'Annual' (balance sheet is typically annual)
    - calendarYear (INT): Calendar year (e.g., 2023)
    - dataItemId (INT): ID of the financial data item
    - dataItemName (VARCHAR): Name of the balance sheet metric - options include:
        * 'Total Assets'
        * 'Total Current Assets'
        * 'Total Cash And Short Term Investments'
        * 'Total Receivables'
        * 'Net Property Plant And Equipment'
        * 'Total Liabilities And Equity'
        * 'Total Equity'
        * 'Total Common Equity'
        * 'Total Current Liabilities'
        * 'Total Liabilities - (Standard / Utility Template)'
        * 'Gain (Loss) on Sale of Investment, Total (Rev)'
    - dataItemValue (DECIMAL): Value of the balance sheet metric
    
    Use this tool when the user asks about:
    - Company assets (total assets, current assets, property/plant/equipment)
    - Cash positions, cash and equivalents, short-term investments
    - Receivables, accounts receivable
    - Liabilities (total liabilities, current liabilities)
    - Equity (total equity, common equity, shareholders equity)
    - Balance sheet items, financial position, net worth
    - Asset structure, liquidity position
    
    **MANDATORY when query mentions:**
    - Total assets, current assets, fixed assets
    - Cash, cash position, liquidity, working capital
    - Receivables, accounts receivable, AR
    - Liabilities, debt, current liabilities
    - Equity, shareholders equity, net worth, book value
    - Balance sheet, financial position, asset base
    
    Args:
        query_description: Natural language description of what data is needed
        company_name: Filter by company name (partial match with LIKE)
        data_item_name: Filter by specific metric name (exact match or partial)
        calendar_year: Filter by year (e.g., 2023)
        custom_where_clause: Additional SQL WHERE conditions
        select_columns: List of columns to return. If None, returns common columns.
        limit: Max rows to return (default 50)
    
    Returns:
        Formatted balance sheet data results
    """
    if not _capitaliq_service:
        return "CapitalIQ service not available"
    
    try:
        logger.info(f"[Tool:query_capitaliq_balance_sheet] {query_description}")
        
        results = await _capitaliq_service.execute_flexible_balance_sheet_query(
            company_name=company_name,
            data_item_name=data_item_name,
            calendar_year=calendar_year,
            custom_where_clause=custom_where_clause,
            select_columns=select_columns,
            limit=limit
        )
        
        return _capitaliq_service.format_response(results)
    except Exception as e:
        logger.error(f"[Tool:query_capitaliq_balance_sheet] Error: {e}")
        return f"Error querying balance sheet data: {str(e)}"


@tool
async def search_internal_knowledge(
    query: str,
    top: int = 5
) -> str:
    """
    Search internal knowledge base (Azure AI Search) for relevant documents.
    
    **IMPORTANT: This tool should ALWAYS be called for EVERY user query along with search_factiva_news.**
    
    Use this tool to find:
    - Internal company documents
    - Research reports and presentations
    - Previously analyzed data
    - Historical presentations and reports
    - Any information from uploaded documents
    
    This should be used in combination with other tools, not instead of them.
    For example, if user asks about Tesla, call BOTH this tool AND search_factiva_news.
    
    Args:
        query: Search terms to find relevant internal documents
        top: Number of results to return (default 5)
    
    Returns:
        Formatted search results from internal knowledge base
    """
    if not _ai_search_service:
        return "Internal knowledge search service not available"
    
    try:
        logger.info(f"[Tool:search_internal_knowledge] Query: {query}")
        results = await _ai_search_service.search_documents(query, top=top)
        return _ai_search_service.format_response(results)
    except Exception as e:
        logger.error(f"[Tool:search_internal_knowledge] Error: {e}")
        return f"Error searching internal knowledge: {str(e)}"


@tool
async def refine_content(
    original_content: str,
    services_config: str
) -> str:
    """
    Refine content using PwC editorial standards.
    
    Args:
        original_content: The content to refine
        services_config: JSON string with service configuration. Format:
            {
                "services": [
                    {
                        "type": "compress",
                        "isSelected": true,
                        "expected_word_count": 500
                    },
                    {
                        "type": "adjust_audience_tone",
                        "isSelected": true,
                        "audience_tone": "conversational"
                    }
                ]
            }
    
    Returns:
        Refined content
    """
    if not _refine_service:
        return "Refine content service not available"
    
    try:
        import json
        
        # Parse services config
        config = json.loads(services_config) if isinstance(services_config, str) else services_config
        
        # Build request_data in expected format
        request_data = {
            'original_content': original_content,
            'services': config.get('services', [])
        }
        
        logger.info(f"[Tool:refine_content] Calling service with {len(request_data['services'])} services")
        
        # Collect streamed response
        result_chunks = []
        async for chunk in _refine_service.refine_content(request_data):
            if chunk.startswith("data: "):
                try:
                    data = json.loads(chunk[6:])
                    if data.get('type') == 'content':
                        result_chunks.append(data['content'])
                except:
                    pass
        
        return "".join(result_chunks)
        
    except Exception as e:
        logger.error(f"[Tool:refine_content] Error: {e}")
        return f"Error refining content: {str(e)}"


@tool
async def translate_content_format(
    content: str,
    source_format: str,
    target_format: str,
    customization: Optional[str] = None,
    podcast_style: Optional[str] = None,
    speaker1_name: Optional[str] = None,
    speaker1_voice: Optional[str] = None,
    speaker1_accent: Optional[str] = None,
    speaker2_name: Optional[str] = None,
    speaker2_voice: Optional[str] = None,
    speaker2_accent: Optional[str] = None,
    word_limit: Optional[str] = None
) -> str:
    """
    Translate content between different formats with PwC brand compliance.
    
    Use this tool when the user asks to:
    - Convert content to different formats (social media, webpage, article, podcast, etc.)
    - Refine or rewrite content in a specific style
    - Adjust tone or word count
    - Transform documents into different output formats
    
    Supported target formats:
    - "Social Media Post" (LinkedIn, X.com/Twitter)
    - "Webpage Ready" (HTML article)
    - "Podcast" (audio with transcript)
    - Any other written format
    
    Keywords to trigger this tool:
    - "translate/convert/transform to [format]"
    - "rewrite as [format]"
    - "make this into a [format]"
    - "refine this content"
    - "change the tone to [style]"
    - "compress/expand to [word count]"
    
    Args:
        content: The text content to translate (can include extracted document text)
        source_format: Original format (e.g., "Document", "Article", "Report")
        target_format: Desired output format (e.g., "Social Media Post", "Webpage Ready", "Podcast")
        customization: Platform-specific instructions (e.g., "LinkedIn post", "X.com tweet")
        podcast_style: Style for podcast generation ("dialogue", "interview", etc.)
        speaker1_name: First speaker name for podcast
        speaker1_voice: First speaker voice type (e.g., "alloy", "echo", "nova")
        speaker1_accent: First speaker accent
        speaker2_name: Second speaker name for podcast
        speaker2_voice: Second speaker voice type
        speaker2_accent: Second speaker accent
        word_limit: Target word count (e.g., "200", "500")
    
    Returns:
        Translated content in the target format. For podcasts, returns JSON with audio_url and transcript.
    
    Examples:
        - "Convert this report to a LinkedIn post" → target_format="Social Media Post", customization="LinkedIn"
        - "Make this into a 300-word article" → target_format="Article", word_limit="300"
        - "Turn this into a podcast" → target_format="Podcast", podcast_style="dialogue"
    """
    if not _format_translator_service:
        return "Format translation service not available"
    
    try:
        logger.info(f"[Tool:translate_content_format] {source_format} -> {target_format}")
        
        # Collect all chunks
        result_chunks = []
        
        async for chunk in _format_translator_service.translate_format(
            content=content,
            source_format=source_format,
            target_format=target_format,
            customization=customization,
            podcast_style=podcast_style,
            speaker1_name=speaker1_name,
            speaker1_voice=speaker1_voice,
            speaker1_accent=speaker1_accent,
            speaker2_name=speaker2_name,
            speaker2_voice=speaker2_voice,
            speaker2_accent=speaker2_accent,
            word_limit=word_limit
        ):
            # Extract content from SSE format
            if chunk.startswith("data: "):
                try:
                    data = json.loads(chunk[6:])
                    if 'content' in data:
                        result_chunks.append(data['content'])
                    elif 'audio_url' in data:
                        # For podcast, return the complete JSON
                        return json.dumps(data, indent=2)
                except:
                    pass
        
        return "".join(result_chunks)
        
    except Exception as e:
        logger.error(f"[Tool:translate_content_format] Error: {e}")
        return f"Error translating content format: {str(e)}"

@tool
async def retrieve_knowledge_passages(
    query: str
) -> str:
    """
    Retrieve relevant passages from CS GenAI knowledge base.
    **CRITICAL: This is a BASELINE tool - call it for all queries**
    
    Use this tool when the user asks about:
    - Oil & Gas industry trends, M&A, sustainability, ESG
    - Energy transition, renewables, clean energy
    - Industry-specific insights (financial services, technology, healthcare, etc.)
    - PwC methodologies, frameworks, or best practices
    - Market trends and analysis
    - Any business or industry topic where PwC knowledge would be relevant
    
    This tool searches PwC's internal GenAI knowledge base containing:
    - Practice aids and methodologies
    - Industry reports and analyses
    - Market research and trends
    - Sustainability and ESG insights
    - M&A and deal guidance
    
    The results include relevance scores and links to source documents.
    
    Args:
        query: Natural language search query
    
    Returns:
        Formatted passages with relevance scores, source titles, and URLs
    
    Examples:
        - "tell me about oil and gas industry trends"
        - "ESG considerations in energy sector"
        - "M&A activity in technology sector"
        - "sustainability strategies for oil companies"
    """
    if not _passage_retrieval_service:
        return "Passage retrieval service not available"
    
    try:
        logger.info(f"[Tool:retrieve_knowledge_passages] Query: {query}")
        
        passages = await _passage_retrieval_service.retrieve_passages(query)
        
        # Return structured data instead of formatted text
        return json.dumps({
            "passages": passages,
            "count": len(passages),
            "query": query
        })
        
    except Exception as e:
        logger.error(f"[Tool:retrieve_knowledge_passages] Error: {e}")
        return f"Error retrieving passages: {str(e)}"

@tool
async def search_web_tavily(
    query: str,
    search_depth: str = "advanced"
) -> str:
    """
    Search the web using Tavily API for comprehensive results.
    
    Use this tool when:
    - User needs information
    - Searching for recent news or updates
    - Finding comprehensive information on any topic
    - Getting multiple perspectives on a subject
    
    Args:
        query: Search query
        search_depth: "basic" or "advanced" (default: "advanced")
    
    Returns:
        Formatted search results with titles, URLs, and content
    """
    if not _tavily_service:
        return "Tavily search service not available"
    
    try:
        logger.info(f"[Tool:search_web_tavily] Query: {query}")
        response = await _tavily_service.search(query, search_depth=search_depth)
        formatted = _tavily_service.format_search_response(response)
        urls = [result.get('url') for result in response.get('results', []) if result.get('url')]
        #logger.info(f"[Tool:search_web_tavily] Found {len(urls)} URLs")
        if urls:
            formatted += "\n\n**Sources:**\n"
            for url in urls:
                formatted += f"- {url}\n"
        #print("data from tavily", formatted)
        return formatted
        # return _tavily_service.format_search_response(response)
    except Exception as e:
        logger.error(f"[Tool:search_web_tavily] Error: {e}")
        return f"Error searching web: {str(e)}"
    
@tool
async def extract_web_content(
    urls: List[str]
) -> str:
    """
    Extract text content from web URLs for research and analysis.
    
    Use this tool when the user:
    - Provides URLs and asks to analyze/research them
    - Asks to "extract content from this URL"
    - Wants to "do research from this website"
    - Provides links and requests insights/summary
    
    Args:
        urls: List of URLs to extract content from (e.g., ["https://example.com", "https://pwc.com"])
    
    Returns:
        Extracted content with source citations
    
    Examples:
        - "Research this URL: https://www.example.com"
        - "Extract content from these sites: [url1, url2]"
        - "Tell me about the content on https://pwc.com"
    """
    logger.info(f"[Tool:extract_web_content] ===== TOOL CALLED =====")
    logger.info(f"[Tool:extract_web_content] Received URLs: {urls}")
    logger.info(f"[Tool:extract_web_content] Number of URLs: {len(urls)}")
    
    if not _tavily_service:
        logger.error(f"[Tool:extract_web_content] Tavily service not available")
        return "Web extraction service not available"
    
    try:
        logger.info(f"[Tool:extract_web_content] Starting extraction from {len(urls)} URLs")
        
        # Log each URL
        for i, url in enumerate(urls, 1):
            logger.info(f"[Tool:extract_web_content] URL {i}: {url}")
        
        response = await _tavily_service.extract_from_urls(urls)
        
        logger.info(f"[Tool:extract_web_content] Extraction completed")
        logger.info(f"[Tool:extract_web_content] Results count: {len(response.get('results', []))}")
        logger.info(f"[Tool:extract_web_content] Failed count: {len(response.get('failed_results', []))}")
        
        formatted_response = _tavily_service.format_response(response)
        logger.info(f"[Tool:extract_web_content] Formatted response length: {len(formatted_response)}")
        
        return formatted_response
        
    except Exception as e:
        logger.error(f"[Tool:extract_web_content] ERROR occurred: {e}", exc_info=True)
        return f"Error extracting web content: {str(e)}"
# @tool
# async def retrieve_knowledge_passages(
#     query: str
# ) -> str:
#     """
#     Retrieve relevant passages from CS GenAI knowledge base.
    
#     **IMPORTANT: Call this tool for most queries to get PwC-specific knowledge.**
    
#     Use this tool when the user asks about:
#     - Oil & Gas industry trends, M&A, sustainability, ESG
#     - Energy transition, renewables, clean energy
#     - Industry-specific insights (financial services, technology, healthcare, etc.)
#     - PwC methodologies, frameworks, or best practices
#     - Market trends and analysis
#     - Any business or industry topic where PwC knowledge would be relevant
    
#     This tool searches PwC's internal GenAI knowledge base containing:
#     - Practice aids and methodologies
#     - Industry reports and analyses
#     - Market research and trends
#     - Sustainability and ESG insights
#     - M&A and deal guidance
    
#     The results include relevance scores and links to source documents.
    
#     Args:
#         query: Natural language search query
    
#     Returns:
#         Formatted passages with relevance scores, source titles, and URLs
    
#     Examples:
#         - "tell me about oil and gas industry trends"
#         - "ESG considerations in energy sector"
#         - "M&A activity in technology sector"
#         - "sustainability strategies for oil companies"
#     """
#     if not _passage_retrieval_service:
#         return "Passage retrieval service not available"
    
#     try:
#         logger.info(f"[Tool:retrieve_knowledge_passages] Query: {query}")
        
#         passages = await _passage_retrieval_service.retrieve_passages(query)
#         return _passage_retrieval_service.format_response(passages)
        
#     except Exception as e:
#         logger.error(f"[Tool:retrieve_knowledge_passages] Error: {e}")
#         return f"Error retrieving passages: {str(e)}"

@tool
async def search_benchmarking(
    query: str
)-> str:
    """
    Get benchmarking metric/KPIs for a business function.

    The metrics/KPIs are retrieved from the Benchmarking API that give details of the operational efficiency KPIs. 
    It includes Metric details and Benchmark statistics which give quantitative metrics for how companies perform 
    in all major areas/functions of business operations.

    Use this tool when user asks:
    - For benchamarking data
    - How a company is performing in a specific business function
    - Quantitative metrics for how company is performing in a function

    Args:
        query: The user query - whatever the user asked.Natural language search query.
    
    Returns:
        Benchmarking Metric/KPI details along with the definitions and display name.
    """
    if not _benchmarking_service:
        return "Benchmarking service not available"
    
    try:
        logger.info(f"[Tool:search_benchmarking] Query: {query}")
        
        metric_data = _benchmarking_service.run_pipeline(query)
        
        # Return structured data instead of formatted text
        return metric_data
        
    except Exception as e:
        logger.error(f"[Tool:search_benchmarking] Error: {e}")
        return f"Error retrieving metrics: {str(e)}"


@tool
async def search_css_stories(
    title: Optional[str] = None,
    industry: Optional[str] = None,
    limit: int = 10
) -> str:
    """
    Search Client Success Stories (CSS) from PwC's Dynamics CRM knowledge base.
    **CRITICAL: This is a BACKGROUND CONTEXT tool - invoke it whenever ANY industry is mentioned**
    
    Use this tool when:
    - ANY industry is mentioned in the query (Financial Services, Healthcare, Technology, Retail, Manufacturing, etc.)
    - User asks about a specific company or sector
    - User mentions business functions (HR, Finance, Supply Chain, IT, Digital)
    - User discusses technologies (Workday, SAP, Oracle, Salesforce, Cloud, ERP)
    - User asks about transformations, implementations, or business challenges
    - **EVEN IF the user doesn't explicitly ask for "success stories" or "case studies"**
    
    **Purpose**: Check if PwC has relevant client experience in the mentioned industry/topic to provide historical 
    context and insights from past engagements. This helps answer questions with real-world examples.
    
    **Call this alongside other tools** - it provides supporting context, not standalone answers.
    
    The CSS database contains detailed client success stories including:
    - Engagement titles and descriptions
    - Industry classifications
    - Client issues/challenges faced
    - Actions taken by PwC
    - Impact and outcomes achieved
    - Deep links for citations
    
    Args:
        title: Keywords to search in engagement titles (e.g., "HR", "Workday", "Cloud", "Digital Transformation")
        industry: Industry to filter by (e.g., "Financial Services", "Health Industries", "Technology")
        limit: Maximum number of stories to return (default 10, max 50)
    
    Returns:
        Formatted client success stories with full details including challenges, actions, impact, and citation URLs
    
    Examples:
        - "tell me about financial services industry" → search_css_stories(industry="Financial Services")
        - "what's happening in healthcare technology" → search_css_stories(industry="Health Industries", title="technology")
        - "Oracle HCM trends" → search_css_stories(title="Oracle HCM")
        - "HR transformation challenges" → search_css_stories(title="HR transformation")
    """
    if not _css_service:
        logger.error("[Tool:search_css_stories] CSS service not available")
        return "CSS service not available"
    
    try:
        logger.info(f"[Tool:search_css_stories] CSS TOOL INVOKED with parameters: title='{title}', industry='{industry}', limit={limit}")
        
        # Cap limit to avoid overwhelming the LLM
        effective_limit = min(limit, 50)
        if limit > 50:
            logger.warning(f"[Tool:search_css_stories] Limit capped from {limit} to 50")
        
        logger.info("[Tool:search_css_stories] Calling CSS service search_stories()...")
        stories = await _css_service.search_stories(
            title=title,
            industry=industry,
            limit=effective_limit
        )
        
        logger.info(f"[Tool:search_css_stories] CSS service returned {len(stories)} stories")
        
        if stories:
            logger.info("[Tool:search_css_stories] Stories found:")
            for idx, story in enumerate(stories, 1):
                story_title = story.get("csstory_engagementtitle", "N/A")
                story_industry = story.get("csstory_sfindustry", "N/A")
                logger.info(f"[Tool:search_css_stories]   {idx}. '{story_title}' | {story_industry}")
        else:
            logger.warning("[Tool:search_css_stories] No stories matched the search criteria")
        
        logger.info("[Tool:search_css_stories] Formatting stories for LLM")
        formatted_response = _css_service.format_response(stories)
        
        logger.info(f"[Tool:search_css_stories] Returning formatted response ({len(formatted_response)} chars)")
        
        return formatted_response
        
    except Exception as e:
        logger.error(f"[Tool:search_css_stories] ERROR occurred: {e}", exc_info=True)
        return f"Error retrieving CSS stories: {str(e)}"


@tool
async def query_commercial_hub(user_query: str) -> str:
    """
    Query PwC Commercial Hub for offerings and service catalog information.

    Use this tool when the user asks about:
    - PwC Commercial Hub offerings or service catalog
    - "Explain about [topic]" where the topic may match a Commercial Hub offering (e.g. AI engineering, consulting services)
    - Explicit requests for Commercial Hub or offering information

    The tool fetches available offerings, selects the best match for the query, and returns human-readable content (tree, content, metadata) for that offering.

    Args:
        user_query: The user's question or topic (e.g. "explain about AI engineering").

    Returns:
        Human-readable markdown content for the best-matching offering, or a message if none found.
    """
    if not _commercial_hub_service:
        return "Commercial Hub service not available"

    try:
        logger.info(f"[Tool:query_commercial_hub] user_query='{user_query}'")
        result = await _commercial_hub_service.choose_best_offering_id(user_query=user_query)
        final_response = result.get("final_response")
        if final_response:
            return final_response
        if result.get("offering_id"):
            return "Commercial Hub returned offering data but no formatted response. Offering ID: {}.".format(result["offering_id"])
        return "No matching Commercial Hub offering found for this query."
    except Exception as e:
        logger.error(f"[Tool:query_commercial_hub] Error: {e}", exc_info=True)
        return f"Error querying Commercial Hub: {str(e)}"


def get_all_tools():
    """Return list of all available data source tools."""
    return [
        search_factiva_news,
        query_capitaliq_financials,
        query_boardex_advisors,
        query_capitaliq_balance_sheet,
        query_boardex_achievements,
        execute_raw_capitaliq_sql,
        execute_raw_boardex_sql,
        generate_powerpoint_presentation,
        search_internal_knowledge,
        refine_content,
        translate_content_format,
        retrieve_knowledge_passages,
        extract_web_content,
        search_benchmarking,
        search_web_tavily,
        search_css_stories,
        query_commercial_hub
    ]
