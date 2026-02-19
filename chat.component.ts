INFO:app.core.chat_history_middleware:[Guided Journey] Generated session_id: session_1771493698070_7c737df4e
INFO:app.core.chat_history_middleware:[Guided Journey] Detected: /api/v1/tl/edit-content, user_id=ranjith.gopi@dev365.pwc.com, session_id=session_1771493698070_7c737df4e, source=Cortex
INFO:app.core.deps:[ChatHistory] Enabled for session=session_1771493698070_7c737df4e, source=Cortex        
Public key retrieved for token validation.
INFO:app.core.chat_history_middleware:[Guided Journey] Response type: _StreamingResponse, is streaming: True
INFO:app.core.chat_history_middleware:[Guided Journey] Wrapping response for session session_1771493698070_7c737df4e
INFO:app.core.chat_history_middleware:[Chat History Middleware] _wrap_streaming_response called, chat_history.enabled=True, is_guided_journey=True
INFO:     127.0.0.1:63796 - "POST /api/v1/tl/edit-content HTTP/1.1" 200 OK
INFO:app.core.chat_history_middleware:[Chat History Middleware] Starting to iterate over response.body_iterator
INFO:httpx:HTTP Request: POST https://genai-sharedservice-americas.pwcinternal.com/chat/completions "HTTP/1.1 200 OK"
INFO:app.features.thought_leadership.services.edit_content.graph:RUNNING: line_copy_combined_node
INFO:app.features.thought_leadership.services.edit_content.graph:RUNNING: line_editor_tool
INFO:app.features.thought_leadership.services.edit_content.tools:AM IN EDITOR ENGINE: line_editor_tool     
INFO:httpx:HTTP Request: POST https://genai-sharedservice-americas.pwcinternal.com/chat/completions "HTTP/1.1 200 OK"
INFO:app.features.thought_leadership.services.edit_content.graph:RUNNING: copy_editor_tool
INFO:app.features.thought_leadership.services.edit_content.tools:AM IN EDITOR ENGINE: copy_editor_tool     
failed to send, dropping 1 traces to intake at http://localhost:8126/v0.4/traces: client error (Connect) [3 skipped]
ERROR:ddtrace.internal.writer.writer:failed to send, dropping 1 traces to intake at http://localhost:8126/v0.4/traces: client error (Connect) [3 skipped]
INFO:httpx:HTTP Request: POST https://genai-sharedservice-americas.pwcinternal.com/chat/completions "HTTP/1.1 200 OK"
INFO:app.features.thought_leadership.services.edit_content.graph:MERGING line + copy into line+copy
ERROR:app.features.thought_leadership.services.edit_content.edit_content_agent:Edit content workflow failed
Traceback (most recent call last):
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\app\features\thought_leadership\services\edit_content\edit_content_agent.py", line 293, in stream
    state = wait_for_interrupt(graph, graph_input, config)
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\app\features\thought_leadership\services\edit_content\edit_content_agent.py", line 210, in wait_for_interrupt
    for event in graph.stream(input_state, config=config):
                 ~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\ddtrace\contrib\internal\langgraph\patch.py", line 257, in _stream
    item = next(result)
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langgraph\pregel\main.py", line 2643, in stream
    for _ in runner.tick(
             ~~~~~~~~~~~^
        [t for t in loop.tasks.values() if not t.writes],
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<2 lines>...
        schedule_task=loop.accept_push,
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ):
    ^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langgraph\pregel\_runner.py", line 167, in tick
    run_with_retry(
    ~~~~~~~~~~~~~~^
        t,
        ^^
    ...<10 lines>...
        },
        ^^
    )
    ^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langgraph\pregel\_retry.py", line 42, in run_with_retry
    return task.proc.invoke(task.input, config)
           ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\ddtrace\contrib\internal\trace_utils.py", line 315, in wrapper
    return func(mod, pin, wrapped, instance, args, kwargs)
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\ddtrace\contrib\internal\langgraph\patch.py", line 104, in traced_runnable_seq_invoke
    result = func(*args, **kwargs)
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langgraph\_internal\_runnable.py", line 656, in invoke
    input = context.run(step.invoke, input, config, **kwargs)
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\langgraph\_internal\_runnable.py", line 400, in invoke
    ret = self.func(*args, **kwargs)
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\app\features\thought_leadership\services\edit_content\graph.py", line 670, in line_copy_combined_node
    merged_result = merge_two_editor_results(line_result, copy_result, "line+copy")
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\app\features\thought_leadership\services\edit_content\graph.py", line 596, in merge_two_editor_results
    return EditorResult(
        editor_type=combined_editor_type,
    ...<2 lines>...
        raw_output=None
    )
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\pydantic\main.py", line 212, in __init__
    validated_self = self.__pydantic_validator__.validate_python(data, self_instance=self)
pydantic_core._pydantic_core.ValidationError: 1 validation error for EditorResult
editor_type
  Input should be 'development', 'content', 'copy', 'line' or 'brand-alignment' [type=literal_error, input_value='line+copy', input_type=str]
    For further information visit https://errors.pydantic.dev/2.9/v/literal_error
During task with name 'line_copy_combined' and id 'f743c5cf-f889-ea8a-b4c7-6a6b63640994'
WARNING:app.core.chat_history_middleware:[Chat History Middleware] No content accumulated from 1 chunks
