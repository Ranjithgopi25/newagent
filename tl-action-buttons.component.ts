INFO:app.features.chat.services.data_source_agent.langgraph_agent:[DataSourceAgent] Tools registered: ['search_factiva_news', 'query_capitaliq_financials', 'query_boardex_advisors', 'query_capitaliq_balance_sheet', 'query_boardex_achievements', 'execute_raw_capitaliq_sql', 'execute_raw_boardex_sql', 'generate_powerpoint_presentation', 'search_internal_knowledge', 'refine_content', 'translate_content_format', 'retrieve_knowledge_passages', 'extract_web_content', 'search_benchmarking', 'search_web_tavily', 'search_css_stories', 'query_commercial_hub']
INFO:app.features.chat.services.data_source_agent.langgraph_agent:[DataSourceAgent] Processing 1 messages
INFO:httpx:HTTP Request: POST https://genai-sharedservice-americas.pwcinternal.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-08-01-preview "HTTP/1.1 401 Unauthorized"
INFO:app.features.chat.services.data_source_agent.langgraph_agent:[DataSourceAgent] Query failed after 2.65 seconds
ERROR:app.features.chat.services.data_source_agent.langgraph_agent:[DataSourceAgent] Error: Error code: 401 - {'error': {'message': "key not allowed to access model. This key can only access models=['azure.dall-e-3', 'azure.gpt-4.1', 'azure.gpt-4.1-2025-04-14', 'azure.gpt-4.1-mini', 'azure.gpt-4.1-mini-2025-04-14', 'azure.gpt-4.1-nano', 'azure.gpt-4.1-nano-2025-04-14', 'azure.gpt-4o', 'azure.gpt-4o-2024-05-13', 'azure.gpt-4o-2024-08-06', 'azure.gpt-4o-2024-11-20', 'azure.gpt-4o-mini', 'azure.gpt-5', 'azure.gpt-5-2025-08-07', 'azure.gpt-5-mini', 'azure.gpt-5-mini-2025-08-07', 'azure.gpt-5-nano', 'azure.gpt-5-nano-2025-08-07', 'azure.gpt-5.1', 'azure.gpt-5.1-2025-11-13', 'azure.gpt-5.2', 'azure.gpt-5.2-2025-12-11', 'azure.o1', 'azure.o1-2024-12-17', 'azure.o3', 'azure.o3-2025-04-16', 'azure.o3-mini', 'azure.o3-mini-2025-01-31', 'azure.o4-mini', 'azure.o4-mini-2025-04-16', 'azure.text-embedding-3-large', 'azure.text-embedding-3-small', 'azure.text-embedding-ada-002', 'bedrock.amazon.nova-canvas-v1', 'bedrock.amazon.nova-lite-v1', 'bedrock.amazon.nova-micro-v1', 'bedrock.amazon.nova-pro-v1', 'bedrock.amazon.titan-embed-image-v1', 'bedrock.amazon.titan-embed-text-v1', 'bedrock.amazon.titan-embed-text-v2', 'bedrock.anthropic.claude-3-5-haiku', 'bedrock.anthropic.claude-3-5-sonnet', 'bedrock.anthropic.claude-3-5-sonnet-v2', 'bedrock.anthropic.claude-3-7-sonnet-v1', 'bedrock.anthropic.claude-3-haiku', 'bedrock.anthropic.claude-3-opus', 'bedrock.anthropic.claude-haiku-4-5', 'bedrock.anthropic.claude-opus-4', 'bedrock.anthropic.claude-opus-4-1', 'bedrock.anthropic.claude-sonnet-4', 'bedrock.anthropic.claude-sonnet-4-5', 'bedrock.cohere.command-r-plus-v1', 'bedrock.cohere.embed-v4', 'bedrock.cohere.rerank-3-5', 'bedrock.meta.llama3-3-70b-instruct-v1', 'bedrock.meta.llama3-70b-instruct-v1', 'bedrock.meta.llama3-8b-instruct-v1', 'bedrock.meta.llama4-maverick-17b-instruct-v1', 'bedrock.mistral.mistral-7b-instruct-v0', 'bedrock.mistral.mistral-large-2402-v1', 'bedrock.mistral.mistral-large-2407-v1', 'bedrock.mistral.mistral-small-2402-v1', 'bedrock.mistral.mixtral-8x7b-instruct-v0', 'bedrock.mistral.pixtral-large-2502-v1', 'bedrock.openai.gpt-oss-120b', 'bedrock.openai.gpt-oss-20b', 'gpt-realtime', 'gpt-realtime-2025-08-28', 'gpt-realtime-mini', 'gpt-realtime-mini-2025-10-06', 'openai.gpt-4.1', 'openai.gpt-4.1-2025-04-14', 'openai.gpt-4.1-mini', 'openai.gpt-4.1-mini-2025-04-14', 'openai.gpt-4.1-nano', 'openai.gpt-4.1-nano-2025-04-14', 'openai.gpt-4o', 'openai.gpt-4o-2024-11-20', 'openai.gpt-4o-mini', 'openai.gpt-4o-mini-transcribe', 'openai.gpt-4o-mini-tts', 'openai.gpt-4o-transcribe', 'openai.gpt-5', 'openai.gpt-5-2025-08-07', 'openai.gpt-5-chat-latest', 'openai.gpt-5-codex', 'openai.gpt-5-mini', 'openai.gpt-5-mini-2025-08-07', 'openai.gpt-5-nano', 'openai.gpt-5-nano-2025-08-07', 'openai.gpt-5-pro', 'openai.gpt-5-pro-2025-10-06', 'openai.gpt-5.1', 'openai.gpt-5.1-2025-11-13', 'openai.gpt-5.1-codex', 'openai.gpt-5.1-codex-mini', 'openai.gpt-5.2', 'openai.gpt-5.2-2025-12-11', 'openai.gpt-5.2-chat-latest', 'openai.gpt-5.2-pro', 'openai.gpt-5.2-pro-2025-12-11', 'openai.gpt-image-1', 'openai.gpt-image-1-mini', 'openai.gpt-image-1.5', 'openai.o1', 'openai.o1-2024-12-17', 'openai.o3', 'openai.o3-2025-04-16', 'openai.o3-deep-research', 'openai.o3-deep-research-2025-06-26', 'openai.o3-mini', 'openai.o3-mini-2025-01-31', 'openai.o4-mini', 'openai.o4-mini-2025-04-16', 'openai.whisper', 'vertex_ai.anthropic.claude-3-5-haiku', 'vertex_ai.anthropic.claude-3-5-sonnet', 'vertex_ai.anthropic.claude-3-5-sonnet-v2', 'vertex_ai.anthropic.claude-3-7-sonnet', 'vertex_ai.anthropic.claude-3-haiku', 'vertex_ai.anthropic.claude-3-opus', 'vertex_ai.anthropic.claude-haiku-4-5', 'vertex_ai.anthropic.claude-opus-4', 'vertex_ai.anthropic.claude-opus-4-1', 'vertex_ai.anthropic.claude-opus-4-5', 'vertex_ai.anthropic.claude-sonnet-4', 'vertex_ai.anthropic.claude-sonnet-4-5', 'vertex_ai.gemini-2.0-flash', 'vertex_ai.gemini-2.0-flash-001', 'vertex_ai.gemini-2.0-flash-lite', 'vertex_ai.gemini-2.0-flash-lite-001', 'vertex_ai.gemini-2.5-flash', 'vertex_ai.gemini-2.5-flash-image', 'vertex_ai.gemini-2.5-flash-lite', 'vertex_ai.gemini-2.5-pro', 'vertex_ai.gemini-3-flash-preview', 'vertex_ai.gemini-3-pro-image-preview', 'vertex_ai.gemini-3-pro-preview', 'vertex_ai.gemini-embedding', 'vertex_ai.gemini-embedding-001', 'vertex_ai.imagen-3.0-fast-generate-001', 'vertex_ai.imagen-3.0-generate-001', 'vertex_ai.imagen-4.0-fast-generate-001', 'vertex_ai.imagen-4.0-generate-001', 'vertex_ai.meta.llama-4-maverick-17b-128e-instruct', 'vertex_ai.meta.llama-4-scout-17b-16e-instruct', 'vertex_ai.text-embedding-005']. Tried to access gpt-4o", 'type': 'key_model_access_denied', 'param': 'model', 'code': '401'}}
Traceback (most recent call last):
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\app\features\chat\services\data_source_agent\langgraph_agent.py", line 358, in process_query
    result = await self.graph.ainvoke({
             ^^^^^^^^^^^^^^^^^^^^^^^^^^
        "messages": langchain_messages
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    })
    ^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langgraph\pregel\main.py", line 3158, in ainvoke
    async for chunk in self.astream(
    ...<29 lines>...
            chunks.append(chunk)
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\ddtrace\contrib\internal\langgraph\patch.py", line 310, in _astream
    item = await result.__anext__()
           ^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langgraph\pregel\main.py", line 2971, in astream
    async for _ in runner.atick(
    ...<13 lines>...
            yield o
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langgraph\pregel\_runner.py", line 304, in atick
    await arun_with_retry(
    ...<15 lines>...
    )
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langgraph\pregel\_retry.py", line 137, in arun_with_retry
    return await task.proc.ainvoke(task.input, config)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\ddtrace\contrib\internal\langgraph\patch.py", line 131, in traced_runnable_seq_ainvoke
    result = await func(*args, **kwargs)
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langgraph\_internal\_runnable.py", line 705, in ainvoke
    input = await asyncio.create_task(
            ^^^^^^^^^^^^^^^^^^^^^^^^^^
        step.ainvoke(input, config, **kwargs), context=context
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\ddtrace\contrib\internal\asyncio\patch.py", line 68, in traced_coro
    return await coro
           ^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langgraph\_internal\_runnable.py", line 473, in ainvoke
    ret = await self.afunc(*args, **kwargs)
          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\app\features\chat\services\data_source_agent\langgraph_agent.py", line 218, in _agent_node
    response = await self.llm_with_tools.ainvoke(messages)
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langchain_core\runnables\base.py", line 5570, in ainvoke
    return await self.bound.ainvoke(
           ^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<3 lines>...
    )
    ^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\ddtrace\contrib\internal\langchain\patch.py", line 522, in patched_language_model_ainvoke
    return await func(*args, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langchain_core\language_models\chat_models.py", line 421, in ainvoke
    llm_result = await self.agenerate_prompt(
                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<8 lines>...
    )
    ^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langchain_core\language_models\chat_models.py", line 1128, in agenerate_prompt
    return await self.agenerate(
           ^^^^^^^^^^^^^^^^^^^^^
        prompt_messages, stop=stop, callbacks=callbacks, **kwargs
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\ddtrace\contrib\internal\langchain\patch.py", line 178, in traced_chat_model_agenerate
    chat_completions = await func(*args, **kwargs)
                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langchain_core\language_models\chat_models.py", line 1086, in agenerate
    raise exceptions[0]
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\ddtrace\contrib\internal\asyncio\patch.py", line 68, in traced_coro
    return await coro
           ^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langchain_core\language_models\chat_models.py", line 1296, in _agenerate_with_cache
    async for chunk in self._astream(messages, stop=stop, **kwargs):
    ...<21 lines>...
        yielded = True
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langchain_openai\chat_models\azure.py", line 830, in _astream
    async for chunk in super()._astream(*args, **kwargs):
        yield chunk
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langchain_openai\chat_models\base.py", line 1534, in _astream
    response = await self.async_client.create(**payload)
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\ddtrace\contrib\internal\openai\patch.py", line 372, in async_wrapper
    resp = await result
           ^^^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\openai\resources\chat\completions\completions.py", line 2678, in create
    return await self._post(
           ^^^^^^^^^^^^^^^^^
    ...<49 lines>...
    )
    ^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\openai\_base_client.py", line 1797, in post
    return await self.request(cast_to, opts, stream=stream, stream_cls=stream_cls)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\openai\_base_client.py", line 1597, in request
    raise self._make_status_error_from_response(err.response) from None
openai.AuthenticationError: Error code: 401 - {'error': {'message': "key not allowed to access model. This key can only access models=['azure.dall-e-3', 'azure.gpt-4.1', 'azure.gpt-4.1-2025-04-14', 'azure.gpt-4.1-mini', 'azure.gpt-4.1-mini-2025-04-14', 'azure.gpt-4.1-nano', 'azure.gpt-4.1-nano-2025-04-14', 'azure.gpt-4o', 'azure.gpt-4o-2024-05-13', 'azure.gpt-4o-2024-08-06', 'azure.gpt-4o-2024-11-20', 'azure.gpt-4o-mini', 'azure.gpt-5', 'azure.gpt-5-2025-08-07', 'azure.gpt-5-mini', 'azure.gpt-5-mini-2025-08-07', 'azure.gpt-5-nano', 'azure.gpt-5-nano-2025-08-07', 'azure.gpt-5.1', 'azure.gpt-5.1-2025-11-13', 'azure.gpt-5.2', 'azure.gpt-5.2-2025-12-11', 'azure.o1', 'azure.o1-2024-12-17', 'azure.o3', 'azure.o3-2025-04-16', 'azure.o3-mini', 'azure.o3-mini-2025-01-31', 'azure.o4-mini', 'azure.o4-mini-2025-04-16', 'azure.text-embedding-3-large', 'azure.text-embedding-3-small', 'azure.text-embedding-ada-002', 'bedrock.amazon.nova-canvas-v1', 'bedrock.amazon.nova-lite-v1', 'bedrock.amazon.nova-micro-v1', 'bedrock.amazon.nova-pro-v1', 'bedrock.amazon.titan-embed-image-v1', 'bedrock.amazon.titan-embed-text-v1', 'bedrock.amazon.titan-embed-text-v2', 'bedrock.anthropic.claude-3-5-haiku', 'bedrock.anthropic.claude-3-5-sonnet', 'bedrock.anthropic.claude-3-5-sonnet-v2', 'bedrock.anthropic.claude-3-7-sonnet-v1', 'bedrock.anthropic.claude-3-haiku', 'bedrock.anthropic.claude-3-opus', 'bedrock.anthropic.claude-haiku-4-5', 'bedrock.anthropic.claude-opus-4', 'bedrock.anthropic.claude-opus-4-1', 'bedrock.anthropic.claude-sonnet-4', 'bedrock.anthropic.claude-sonnet-4-5', 'bedrock.cohere.command-r-plus-v1', 'bedrock.cohere.embed-v4', 'bedrock.cohere.rerank-3-5', 'bedrock.meta.llama3-3-70b-instruct-v1', 'bedrock.meta.llama3-70b-instruct-v1', 'bedrock.meta.llama3-8b-instruct-v1', 'bedrock.meta.llama4-maverick-17b-instruct-v1', 'bedrock.mistral.mistral-7b-instruct-v0', 'bedrock.mistral.mistral-large-2402-v1', 'bedrock.mistral.mistral-large-2407-v1', 'bedrock.mistral.mistral-small-2402-v1', 'bedrock.mistral.mixtral-8x7b-instruct-v0', 'bedrock.mistral.pixtral-large-2502-v1', 'bedrock.openai.gpt-oss-120b', 'bedrock.openai.gpt-oss-20b', 'gpt-realtime', 'gpt-realtime-2025-08-28', 'gpt-realtime-mini', 'gpt-realtime-mini-2025-10-06', 'openai.gpt-4.1', 'openai.gpt-4.1-2025-04-14', 'openai.gpt-4.1-mini', 'openai.gpt-4.1-mini-2025-04-14', 'openai.gpt-4.1-nano', 'openai.gpt-4.1-nano-2025-04-14', 'openai.gpt-4o', 'openai.gpt-4o-2024-11-20', 'openai.gpt-4o-mini', 'openai.gpt-4o-mini-transcribe', 'openai.gpt-4o-mini-tts', 'openai.gpt-4o-transcribe', 'openai.gpt-5', 'openai.gpt-5-2025-08-07', 'openai.gpt-5-chat-latest', 'openai.gpt-5-codex', 'openai.gpt-5-mini', 'openai.gpt-5-mini-2025-08-07', 'openai.gpt-5-nano', 'openai.gpt-5-nano-2025-08-07', 'openai.gpt-5-pro', 'openai.gpt-5-pro-2025-10-06', 'openai.gpt-5.1', 'openai.gpt-5.1-2025-11-13', 'openai.gpt-5.1-codex', 'openai.gpt-5.1-codex-mini', 'openai.gpt-5.2', 'openai.gpt-5.2-2025-12-11', 'openai.gpt-5.2-chat-latest', 'openai.gpt-5.2-pro', 'openai.gpt-5.2-pro-2025-12-11', 'openai.gpt-image-1', 'openai.gpt-image-1-mini', 'openai.gpt-image-1.5', 'openai.o1', 'openai.o1-2024-12-17', 'openai.o3', 'openai.o3-2025-04-16', 'openai.o3-deep-research', 'openai.o3-deep-research-2025-06-26', 'openai.o3-mini', 'openai.o3-mini-2025-01-31', 'openai.o4-mini', 'openai.o4-mini-2025-04-16', 'openai.whisper', 'vertex_ai.anthropic.claude-3-5-haiku', 'vertex_ai.anthropic.claude-3-5-sonnet', 'vertex_ai.anthropic.claude-3-5-sonnet-v2', 'vertex_ai.anthropic.claude-3-7-sonnet', 'vertex_ai.anthropic.claude-3-haiku', 'vertex_ai.anthropic.claude-3-opus', 'vertex_ai.anthropic.claude-haiku-4-5', 'vertex_ai.anthropic.claude-opus-4', 'vertex_ai.anthropic.claude-opus-4-1', 'vertex_ai.anthropic.claude-opus-4-5', 'vertex_ai.anthropic.claude-sonnet-4', 'vertex_ai.anthropic.claude-sonnet-4-5', 'vertex_ai.gemini-2.0-flash', 'vertex_ai.gemini-2.0-flash-001', 'vertex_ai.gemini-2.0-flash-lite', 'vertex_ai.gemini-2.0-flash-lite-001', 'vertex_ai.gemini-2.5-flash', 'vertex_ai.gemini-2.5-flash-image', 'vertex_ai.gemini-2.5-flash-lite', 'vertex_ai.gemini-2.5-pro', 'vertex_ai.gemini-3-flash-preview', 'vertex_ai.gemini-3-pro-image-preview', 'vertex_ai.gemini-3-pro-preview', 'vertex_ai.gemini-embedding', 'vertex_ai.gemini-embedding-001', 'vertex_ai.imagen-3.0-fast-generate-001', 'vertex_ai.imagen-3.0-generate-001', 'vertex_ai.imagen-4.0-fast-generate-001', 'vertex_ai.imagen-4.0-generate-001', 'vertex_ai.meta.llama-4-maverick-17b-128e-instruct', 'vertex_ai.meta.llama-4-scout-17b-16e-instruct', 'vertex_ai.text-embedding-005']. Tried to access gpt-4o", 'type': 'key_model_access_denied', 'param': 'model', 'code': '401'}}
During task with name 'agent' and id '64ac4238-72e0-fea9-cf9c-1ae4908fc144'
ERROR:app.features.thought_leadership.workflows.conduct_research:[Conduct Research] LangGraph Agent error: Error code: 401 - {'error': {'message': "key not allowed to access model. This key can only access models=['azure.dall-e-3', 'azure.gpt-4.1', 'azure.gpt-4.1-2025-04-14', 'azure.gpt-4.1-mini', 'azure.gpt-4.1-mini-2025-04-14', 'azure.gpt-4.1-nano', 'azure.gpt-4.1-nano-2025-04-14', 'azure.gpt-4o', 'azure.gpt-4o-2024-05-13', 'azure.gpt-4o-2024-08-06', 'azure.gpt-4o-2024-11-20', 'azure.gpt-4o-mini', 'azure.gpt-5', 'azure.gpt-5-2025-08-07', 'azure.gpt-5-mini', 'azure.gpt-5-mini-2025-08-07', 'azure.gpt-5-nano', 'azure.gpt-5-nano-2025-08-07', 'azure.gpt-5.1', 'azure.gpt-5.1-2025-11-13', 'azure.gpt-5.2', 'azure.gpt-5.2-2025-12-11', 'azure.o1', 'azure.o1-2024-12-17', 'azure.o3', 'azure.o3-2025-04-16', 'azure.o3-mini', 'azure.o3-mini-2025-01-31', 'azure.o4-mini', 'azure.o4-mini-2025-04-16', 'azure.text-embedding-3-large', 'azure.text-embedding-3-small', 'azure.text-embedding-ada-002', 'bedrock.amazon.nova-canvas-v1', 'bedrock.amazon.nova-lite-v1', 'bedrock.amazon.nova-micro-v1', 'bedrock.amazon.nova-pro-v1', 'bedrock.amazon.titan-embed-image-v1', 'bedrock.amazon.titan-embed-text-v1', 'bedrock.amazon.titan-embed-text-v2', 'bedrock.anthropic.claude-3-5-haiku', 'bedrock.anthropic.claude-3-5-sonnet', 'bedrock.anthropic.claude-3-5-sonnet-v2', 'bedrock.anthropic.claude-3-7-sonnet-v1', 'bedrock.anthropic.claude-3-haiku', 'bedrock.anthropic.claude-3-opus', 'bedrock.anthropic.claude-haiku-4-5', 'bedrock.anthropic.claude-opus-4', 'bedrock.anthropic.claude-opus-4-1', 'bedrock.anthropic.claude-sonnet-4', 'bedrock.anthropic.claude-sonnet-4-5', 'bedrock.cohere.command-r-plus-v1', 'bedrock.cohere.embed-v4', 'bedrock.cohere.rerank-3-5', 'bedrock.meta.llama3-3-70b-instruct-v1', 'bedrock.meta.llama3-70b-instruct-v1', 'bedrock.meta.llama3-8b-instruct-v1', 'bedrock.meta.llama4-maverick-17b-instruct-v1', 'bedrock.mistral.mistral-7b-instruct-v0', 'bedrock.mistral.mistral-large-2402-v1', 'bedrock.mistral.mistral-large-2407-v1', 'bedrock.mistral.mistral-small-2402-v1', 'bedrock.mistral.mixtral-8x7b-instruct-v0', 'bedrock.mistral.pixtral-large-2502-v1', 'bedrock.openai.gpt-oss-120b', 'bedrock.openai.gpt-oss-20b', 'gpt-realtime', 'gpt-realtime-2025-08-28', 'gpt-realtime-mini', 'gpt-realtime-mini-2025-10-06', 'openai.gpt-4.1', 'openai.gpt-4.1-2025-04-14', 'openai.gpt-4.1-mini', 'openai.gpt-4.1-mini-2025-04-14', 'openai.gpt-4.1-nano', 'openai.gpt-4.1-nano-2025-04-14', 'openai.gpt-4o', 'openai.gpt-4o-2024-11-20', 'openai.gpt-4o-mini', 'openai.gpt-4o-mini-transcribe', 'openai.gpt-4o-mini-tts', 'openai.gpt-4o-transcribe', 'openai.gpt-5', 'openai.gpt-5-2025-08-07', 'openai.gpt-5-chat-latest', 'openai.gpt-5-codex', 'openai.gpt-5-mini', 'openai.gpt-5-mini-2025-08-07', 'openai.gpt-5-nano', 'openai.gpt-5-nano-2025-08-07', 'openai.gpt-5-pro', 'openai.gpt-5-pro-2025-10-06', 'openai.gpt-5.1', 'openai.gpt-5.1-2025-11-13', 'openai.gpt-5.1-codex', 'openai.gpt-5.1-codex-mini', 'openai.gpt-5.2', 'openai.gpt-5.2-2025-12-11', 'openai.gpt-5.2-chat-latest', 'openai.gpt-5.2-pro', 'openai.gpt-5.2-pro-2025-12-11', 'openai.gpt-image-1', 'openai.gpt-image-1-mini', 'openai.gpt-image-1.5', 'openai.o1', 'openai.o1-2024-12-17', 'openai.o3', 'openai.o3-2025-04-16', 'openai.o3-deep-research', 'openai.o3-deep-research-2025-06-26', 'openai.o3-mini', 'openai.o3-mini-2025-01-31', 'openai.o4-mini', 'openai.o4-mini-2025-04-16', 'openai.whisper', 'vertex_ai.anthropic.claude-3-5-haiku', 'vertex_ai.anthropic.claude-3-5-sonnet', 'vertex_ai.anthropic.claude-3-5-sonnet-v2', 'vertex_ai.anthropic.claude-3-7-sonnet', 'vertex_ai.anthropic.claude-3-haiku', 'vertex_ai.anthropic.claude-3-opus', 'vertex_ai.anthropic.claude-haiku-4-5', 'vertex_ai.anthropic.claude-opus-4', 'vertex_ai.anthropic.claude-opus-4-1', 'vertex_ai.anthropic.claude-opus-4-5', 'vertex_ai.anthropic.claude-sonnet-4', 'vertex_ai.anthropic.claude-sonnet-4-5', 'vertex_ai.gemini-2.0-flash', 'vertex_ai.gemini-2.0-flash-001', 'vertex_ai.gemini-2.0-flash-lite', 'vertex_ai.gemini-2.0-flash-lite-001', 'vertex_ai.gemini-2.5-flash', 'vertex_ai.gemini-2.5-flash-image', 'vertex_ai.gemini-2.5-flash-lite', 'vertex_ai.gemini-2.5-pro', 'vertex_ai.gemini-3-flash-preview', 'vertex_ai.gemini-3-pro-image-preview', 'vertex_ai.gemini-3-pro-preview', 'vertex_ai.gemini-embedding', 'vertex_ai.gemini-embedding-001', 'vertex_ai.imagen-3.0-fast-generate-001', 'vertex_ai.imagen-3.0-generate-001', 'vertex_ai.imagen-4.0-fast-generate-001', 'vertex_ai.imagen-4.0-generate-001', 'vertex_ai.meta.llama-4-maverick-17b-128e-instruct', 'vertex_ai.meta.llama-4-scout-17b-16e-instruct', 'vertex_ai.text-embedding-005']. Tried to access gpt-4o", 'type': 'key_model_access_denied', 'param': 'model', 'code': '401'}}
Traceback (most recent call last):
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\app\features\thought_leadership\workflows\conduct_research.py", line 259, in conduct_research_workflow
    agent_response = await langgraph_agent.process_query(agent_messages)
                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\app\features\chat\services\data_source_agent\langgraph_agent.py", line 358, in process_query
    result = await self.graph.ainvoke({
             ^^^^^^^^^^^^^^^^^^^^^^^^^^
        "messages": langchain_messages
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    })
    ^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langgraph\pregel\main.py", line 3158, in ainvoke
    async for chunk in self.astream(
    ...<29 lines>...
            chunks.append(chunk)
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\ddtrace\contrib\internal\langgraph\patch.py", line 310, in _astream
    item = await result.__anext__()
           ^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langgraph\pregel\main.py", line 2971, in astream
    async for _ in runner.atick(
    ...<13 lines>...
            yield o
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langgraph\pregel\_runner.py", line 304, in atick
    await arun_with_retry(
    ...<15 lines>...
    )
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langgraph\pregel\_retry.py", line 137, in arun_with_retry
    return await task.proc.ainvoke(task.input, config)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\ddtrace\contrib\internal\langgraph\patch.py", line 131, in traced_runnable_seq_ainvoke
    result = await func(*args, **kwargs)
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langgraph\_internal\_runnable.py", line 705, in ainvoke
    input = await asyncio.create_task(
            ^^^^^^^^^^^^^^^^^^^^^^^^^^
        step.ainvoke(input, config, **kwargs), context=context
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\ddtrace\contrib\internal\asyncio\patch.py", line 68, in traced_coro
    return await coro
           ^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langgraph\_internal\_runnable.py", line 473, in ainvoke
    ret = await self.afunc(*args, **kwargs)
          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\app\features\chat\services\data_source_agent\langgraph_agent.py", line 218, in _agent_node
    response = await self.llm_with_tools.ainvoke(messages)
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langchain_core\runnables\base.py", line 5570, in ainvoke
    return await self.bound.ainvoke(
           ^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<3 lines>...
    )
    ^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\ddtrace\contrib\internal\langchain\patch.py", line 522, in patched_language_model_ainvoke
    return await func(*args, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langchain_core\language_models\chat_models.py", line 421, in ainvoke
    llm_result = await self.agenerate_prompt(
                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<8 lines>...
    )
    ^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langchain_core\language_models\chat_models.py", line 1128, in agenerate_prompt
    return await self.agenerate(
           ^^^^^^^^^^^^^^^^^^^^^
        prompt_messages, stop=stop, callbacks=callbacks, **kwargs
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\ddtrace\contrib\internal\langchain\patch.py", line 178, in traced_chat_model_agenerate
    chat_completions = await func(*args, **kwargs)
                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langchain_core\language_models\chat_models.py", line 1086, in agenerate
    raise exceptions[0]
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\ddtrace\contrib\internal\asyncio\patch.py", line 68, in traced_coro
    return await coro
           ^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langchain_core\language_models\chat_models.py", line 1296, in _agenerate_with_cache
    async for chunk in self._astream(messages, stop=stop, **kwargs):
    ...<21 lines>...
        yielded = True
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langchain_openai\chat_models\azure.py", line 830, in _astream
    async for chunk in super()._astream(*args, **kwargs):
        yield chunk
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langchain_openai\chat_models\base.py", line 1534, in _astream
    response = await self.async_client.create(**payload)
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\ddtrace\contrib\internal\openai\patch.py", line 372, in async_wrapper
    resp = await result
           ^^^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\openai\resources\chat\completions\completions.py", line 2678, in create
    return await self._post(
           ^^^^^^^^^^^^^^^^^
    ...<49 lines>...
    )
    ^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\openai\_base_client.py", line 1797, in post
    return await self.request(cast_to, opts, stream=stream, stream_cls=stream_cls)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\openai\_base_client.py", line 1597, in request
    raise self._make_status_error_from_response(err.response) from None
openai.AuthenticationError: Error code: 401 - {'error': {'message': "key not allowed to access model. This key can only access models=['azure.dall-e-3', 'azure.gpt-4.1', 'azure.gpt-4.1-2025-04-14', 'azure.gpt-4.1-mini', 'azure.gpt-4.1-mini-2025-04-14', 'azure.gpt-4.1-nano', 'azure.gpt-4.1-nano-2025-04-14', 'azure.gpt-4o', 'azure.gpt-4o-2024-05-13', 'azure.gpt-4o-2024-08-06', 'azure.gpt-4o-2024-11-20', 'azure.gpt-4o-mini', 'azure.gpt-5', 'azure.gpt-5-2025-08-07', 'azure.gpt-5-mini', 'azure.gpt-5-mini-2025-08-07', 'azure.gpt-5-nano', 'azure.gpt-5-nano-2025-08-07', 'azure.gpt-5.1', 'azure.gpt-5.1-2025-11-13', 'azure.gpt-5.2', 'azure.gpt-5.2-2025-12-11', 'azure.o1', 'azure.o1-2024-12-17', 'azure.o3', 'azure.o3-2025-04-16', 'azure.o3-mini', 'azure.o3-mini-2025-01-31', 'azure.o4-mini', 'azure.o4-mini-2025-04-16', 'azure.text-embedding-3-large', 'azure.text-embedding-3-small', 'azure.text-embedding-ada-002', 'bedrock.amazon.nova-canvas-v1', 'bedrock.amazon.nova-lite-v1', 'bedrock.amazon.nova-micro-v1', 'bedrock.amazon.nova-pro-v1', 'bedrock.amazon.titan-embed-image-v1', 'bedrock.amazon.titan-embed-text-v1', 'bedrock.amazon.titan-embed-text-v2', 'bedrock.anthropic.claude-3-5-haiku', 'bedrock.anthropic.claude-3-5-sonnet', 'bedrock.anthropic.claude-3-5-sonnet-v2', 'bedrock.anthropic.claude-3-7-sonnet-v1', 'bedrock.anthropic.claude-3-haiku', 'bedrock.anthropic.claude-3-opus', 'bedrock.anthropic.claude-haiku-4-5', 'bedrock.anthropic.claude-opus-4', 'bedrock.anthropic.claude-opus-4-1', 'bedrock.anthropic.claude-sonnet-4', 'bedrock.anthropic.claude-sonnet-4-5', 'bedrock.cohere.command-r-plus-v1', 'bedrock.cohere.embed-v4', 'bedrock.cohere.rerank-3-5', 'bedrock.meta.llama3-3-70b-instruct-v1', 'bedrock.meta.llama3-70b-instruct-v1', 'bedrock.meta.llama3-8b-instruct-v1', 'bedrock.meta.llama4-maverick-17b-instruct-v1', 'bedrock.mistral.mistral-7b-instruct-v0', 'bedrock.mistral.mistral-large-2402-v1', 'bedrock.mistral.mistral-large-2407-v1', 'bedrock.mistral.mistral-small-2402-v1', 'bedrock.mistral.mixtral-8x7b-instruct-v0', 'bedrock.mistral.pixtral-large-2502-v1', 'bedrock.openai.gpt-oss-120b', 'bedrock.openai.gpt-oss-20b', 'gpt-realtime', 'gpt-realtime-2025-08-28', 'gpt-realtime-mini', 'gpt-realtime-mini-2025-10-06', 'openai.gpt-4.1', 'openai.gpt-4.1-2025-04-14', 'openai.gpt-4.1-mini', 'openai.gpt-4.1-mini-2025-04-14', 'openai.gpt-4.1-nano', 'openai.gpt-4.1-nano-2025-04-14', 'openai.gpt-4o', 'openai.gpt-4o-2024-11-20', 'openai.gpt-4o-mini', 'openai.gpt-4o-mini-transcribe', 'openai.gpt-4o-mini-tts', 'openai.gpt-4o-transcribe', 'openai.gpt-5', 'openai.gpt-5-2025-08-07', 'openai.gpt-5-chat-latest', 'openai.gpt-5-codex', 'openai.gpt-5-mini', 'openai.gpt-5-mini-2025-08-07', 'openai.gpt-5-nano', 'openai.gpt-5-nano-2025-08-07', 'openai.gpt-5-pro', 'openai.gpt-5-pro-2025-10-06', 'openai.gpt-5.1', 'openai.gpt-5.1-2025-11-13', 'openai.gpt-5.1-codex', 'openai.gpt-5.1-codex-mini', 'openai.gpt-5.2', 'openai.gpt-5.2-2025-12-11', 'openai.gpt-5.2-chat-latest', 'openai.gpt-5.2-pro', 'openai.gpt-5.2-pro-2025-12-11', 'openai.gpt-image-1', 'openai.gpt-image-1-mini', 'openai.gpt-image-1.5', 'openai.o1', 'openai.o1-2024-12-17', 'openai.o3', 'openai.o3-2025-04-16', 'openai.o3-deep-research', 'openai.o3-deep-research-2025-06-26', 'openai.o3-mini', 'openai.o3-mini-2025-01-31', 'openai.o4-mini', 'openai.o4-mini-2025-04-16', 'openai.whisper', 'vertex_ai.anthropic.claude-3-5-haiku', 'vertex_ai.anthropic.claude-3-5-sonnet', 'vertex_ai.anthropic.claude-3-5-sonnet-v2', 'vertex_ai.anthropic.claude-3-7-sonnet', 'vertex_ai.anthropic.claude-3-haiku', 'vertex_ai.anthropic.claude-3-opus', 'vertex_ai.anthropic.claude-haiku-4-5', 'vertex_ai.anthropic.claude-opus-4', 'vertex_ai.anthropic.claude-opus-4-1', 'vertex_ai.anthropic.claude-opus-4-5', 'vertex_ai.anthropic.claude-sonnet-4', 'vertex_ai.anthropic.claude-sonnet-4-5', 'vertex_ai.gemini-2.0-flash', 'vertex_ai.gemini-2.0-flash-001', 'vertex_ai.gemini-2.0-flash-lite', 'vertex_ai.gemini-2.0-flash-lite-001', 'vertex_ai.gemini-2.5-flash', 'vertex_ai.gemini-2.5-flash-image', 'vertex_ai.gemini-2.5-flash-lite', 'vertex_ai.gemini-2.5-pro', 'vertex_ai.gemini-3-flash-preview', 'vertex_ai.gemini-3-pro-image-preview', 'vertex_ai.gemini-3-pro-preview', 'vertex_ai.gemini-embedding', 'vertex_ai.gemini-embedding-001', 'vertex_ai.imagen-3.0-fast-generate-001', 'vertex_ai.imagen-3.0-generate-001', 'vertex_ai.imagen-4.0-fast-generate-001', 'vertex_ai.imagen-4.0-generate-001', 'vertex_ai.meta.llama-4-maverick-17b-128e-instruct', 'vertex_ai.meta.llama-4-scout-17b-16e-instruct', 'vertex_ai.text-embedding-005']. Tried to access gpt-4o", 'type': 'key_model_access_denied', 'param': 'model', 'code': '401'}}
During task with name 'agent' and id '64ac4238-72e0-fea9-cf9c-1ae4908fc144'
WARNING:app.features.thought_leadership.workflows.conduct_research:[Conduct Research] Continuing research without LangGraph Agent data
INFO:app.features.thought_leadership.services.conduct_research_service:[Conduct Research] Fetching content from 0 URLs...
INFO:app.features.thought_leadership.services.conduct_research_service:[Conduct Research] Total sources loaded: 0
INFO:app.features.thought_leadership.services.conduct_research_service:>>>>User input conduct research on:ai in healthcare
INFO:app.core.chat_history_middleware:[Guided Journey] Response type: _StreamingResponse, is streaming: True 
INFO:app.core.chat_history_middleware:[Guided Journey] Wrapping response for session session_1772093541128_a47d2dff1
INFO:app.core.chat_history_middleware:[Chat History Middleware] _wrap_streaming_response called, chat_history.enabled=True, is_guided_journey=True
INFO:     127.0.0.1:50124 - "POST /api/v1/tl/conduct-research HTTP/1.1" 200 OK
INFO:app.core.chat_history_middleware:[Chat History Middleware] Starting to iterate over response.body_iterator
INFO:httpx:HTTP Request: POST https://genai-sharedservice-americas.pwcinternal.com/openai/deployments/azure.gpt-5.2/chat/completions?api-version=2024-08-01-preview "HTTP/1.1 200 OK"
failed to send, dropping 1 traces to intake at http://localhost:8126/v0.4/traces: client error (Connect) [2 skipped]
ERROR:ddtrace.internal.writer.writer:failed to send, dropping 1 traces to intake at http://localhost:8126/v0.4/traces: client error (Connect) [2 skipped]
INFO:app.core.performance_monitoring_middleware:[Performance Monitor] END (STREAMING) | Module: Market_Intelligence | Journey: Guided_Journey | Endpoint: /api/v1/tl/conduct-research | User: ranjith.gopi@dev365.pwc.com | Session: N/A | Start: 2026-02-26 13:42:21 | End: 2026-02-26 13:42:50 | Duration: 29.26s (29260ms) | Chunks: 1291 | Size: 61545 bytes
INFO:app.core.chat_history_middleware:[Guided Journey] Saving first assistant message (7156 chars)
INFO:app.common.chat_history_helper:[SaveAssistant] Queueing assistant message for async save (session: session_1772093541128_a47d2dff1)
INFO:app.core.chat_history_middleware:[Guided Journey] Saved first assistant message (7156 chars) for session session_1772093541128_a47d2dff1
INFO:app.common.chat_history_helper:[LocalCache] Using local cache for session session_1772093541128_a47d2dff1
INFO:app.infrastructure.database.pool_manager:✅ SQL Server connection pool already initialized
INFO:app.infrastructure.database.pool_manager:✅ DatabasePoolManager initialized successfully
INFO:app.repositories.chat_history_repository:ChatHistoryRepository initialized with SQL Server connection
INFO:app.services.chat_history_service:ChatHistoryService initialized
INFO:app.common.chat_history_helper:ChatHistoryHelper successfully initialized service with connection pool  
ERROR:app.repositories.chat_history_repository:Error getting session session_1772093541128_a47d2dff1: (pyodbc.OperationalError) ('08001', '[08001] [Microsoft][ODBC Driver 17 for SQL Server]Named Pipes Provider: Could not open a connection to SQL Server [64].  (64) (SQLDriverConnect); [08001] [Microsoft][ODBC Driver 17 for SQL Server]Login timeout expired (0); [08001] [Microsoft][ODBC Driver 17 for SQL Server]Invalid connection string attribute (0); [08001] [Microsoft][ODBC Driver 17 for SQL Server]A network-related or instance-specific error has occurred while establishing a connection to SQL Server. Server is not found or not accessible. Check if instance name is correct and if SQL Server is configured to allow remote connections. For more information see SQL Server Books Online. (64)')
(Background on this error at: https://sqlalche.me/e/14/e3q8)
ERROR:app.services.chat_history_service:Error retrieving session session_1772093541128_a47d2dff1: (pyodbc.OperationalError) ('08001', '[08001] [Microsoft][ODBC Driver 17 for SQL Server]Named Pipes Provider: Could not open a connection to SQL Server [64].  (64) (SQLDriverConnect); [08001] [Microsoft][ODBC Driver 17 for SQL Server]Login timeout expired (0); [08001] [Microsoft][ODBC Driver 17 for SQL Server]Invalid connection string attribute (0); [08001] [Microsoft][ODBC Driver 17 for SQL Server]A network-related or instance-specific error has occurred while establishing a connection to SQL Server. Server is not found or not accessible. Check if instance name is correct and if SQL Server is configured to allow remote connections. For more information see SQL Server Books Online. (64)')
(Background on this error at: https://sqlalche.me/e/14/e3q8)
INFO:app.common.chat_history_helper:[LocalCache] Cached assistant message for session session_1772093541128_a47d2dff1 (total: 1 messages)
INFO:app.common.chat_history_helper:[Sync] Starting sync to database for session session_1772093541128_a47d2dff1
INFO:app.common.chat_history_helper:[Sync] Syncing 1 NEW messages to database (total: 1, synced: 0)
ERROR:app.repositories.chat_history_repository:Error appending/creating session session_1772093541128_a47d2dff1: (pyodbc.OperationalError) ('08001', '[08001] [Microsoft][ODBC Driver 17 for SQL Server]Named Pipes Provider: Could not open a connection to SQL Server [53].  (53) (SQLDriverConnect); [08001] [Microsoft][ODBC DriverERROR:app.repositories.chat_history_repository:Error appending/creating session session_1772093541128_a47d2dff1: (pyodbc.OperationalError) ('08001', '[08001] [Microsoft][ODBC Driver 17 for SQL Server]Named Pipes Provider: Could not open a connection to SQL Server [53].  (53) (SQLDriverConnect); [08001] [Microsoft][ODBC Driverf1: (pyodbc.OperationalError) ('08001', '[08001] [Microsoft][ODBC Driver 17 for SQL Server]Named Pipes Provider: Could not open a connection to SQL Server [53].  (53) (SQLDriverConnect); [08001] [Microsoft][ODBC Driverer: Could not open a connection to SQL Server [53].  (53) (SQLDriverConnect); [08001] [Microsoft][ODBC Driver 17 for SQL Server]Login timeout expired (0); [08001] [Microsoft][ODBC Driver 17 for SQL Server]Invalid connection string attribute (0); [08001] [Microsoft][ODBC Driver 17 for SQL Server]A network-related or instance-specific error has occurred while establishing a connection to SQL Server. Server is not found or not accessibction string attribute (0); [08001] [Microsoft][ODBC Driver 17 for SQL Server]A network-related or instance-specific error has occurred while establishing a connection to SQL Server. Server is not found or not accessibpecific error has occurred while establishing a connection to SQL Server. Server is not found or not accessible. Check if instance name is correct and if SQL Server is configured to allow remote connections. For more ile. Check if instance name is correct and if SQL Server is configured to allow remote connections. For more information see SQL Server Books Online. (53)')
nformation see SQL Server Books Online. (53)')
(Background on this error at: https://sqlalche.me/e/14/e3q8)
(Background on this error at: https://sqlalche.me/e/14/e3q8)
ERROR:app.services.chat_history_service:Error adding/creating message for session session_1772093541128_a47d2ERROR:app.services.chat_history_service:Error adding/creating message for session session_1772093541128_a47d2dff1: (pyodbc.OperationalError) ('08001', '[08001] [Microsoft][ODBC Driver 17 for SQL Server]Named Pipes Provdff1: (pyodbc.OperationalError) ('08001', '[08001] [Microsoft][ODBC Driver 17 for SQL Server]Named Pipes Provider: Could not open a connection to SQL Server [53].  (53) (SQLDriverConnect); [08001] [Microsoft][ODBC Driver 17 for SQL Server]Login timeout expired (0); [08001] [Microsoft][ODBC Driver 17 for SQL Server]Invalid conider: Could not open a connection to SQL Server [53].  (53) (SQLDriverConnect); [08001] [Microsoft][ODBC Driver 17 for SQL Server]Login timeout expired (0); [08001] [Microsoft][ODBC Driver 17 for SQL Server]Invalid coner 17 for SQL Server]Login timeout expired (0); [08001] [Microsoft][ODBC Driver 17 for SQL Server]Invalid connection string attribute (0); [08001] [Microsoft][ODBC Driver 17 for SQL Server]A network-related or instancenection string attribute (0); [08001] [Microsoft][ODBC Driver 17 for SQL Server]A network-related or instance-specific error has occurred while establishing a connection to SQL Server. Server is not found or not access-specific error has occurred while establishing a connection to SQL Server. Server is not found or not accessible. Check if instance name is correct and if SQL Server is configured to allow remote connections. For more information see SQL Server Books Online. (53)')
(Background on this error at: https://sqlalche.me/e/14/e3q8)
(Background on this error at: https://sqlalche.me/e/14/e3q8)
(Background on this error at: https://sqlalche.me/e/14/e3q8)
(Background on this error at: https://sqlalche.me/e/14/e3q8)
(Background on this error at: https://sqlalche.me/e/14/e3q8)
WARNING:app.common.chat_history_helper:[Sync] Error saving message 1: (pyodbc.OperationalError) ('08001', '[08001] [Microsoft][ODBC Driver 17 for SQL Server]Named Pipes Provider: Could not open a connection to SQL Server [53].  (53) (SQLDriverConnect); [08001] [Microsoft][ODBC Driver 17 for SQL Server]Login timeout expired (0); [08001] [Microsoft][ODBC Driver 17 for SQL Server]Invalid connection string attribute (0); [08001] [Microsoft][ODBC Driver 17 for SQL Server]A network-related or instance-specific error has occurred while establishing a connection to SQL Server. Server is not found or not accessible. Check if instance name is correct and if SQL Server is configured to
