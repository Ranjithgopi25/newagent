pydantic_core._pydantic_core.ValidationError: 1 validation error for ResearchSignals
citations.0
  Input should be a valid dictionary or instance of Citation [type=model_type, input_value='No valid proprietary tools', input_type=str]
    For further information visit https://errors.pydantic.dev/2.9/v/model_type
Traceback (most recent call last):
  File "/usr/local/lib/python3.12/site-packages/ddtrace/contrib/internal/langgraph/patch.py", line 257, in _stream
    item = next(result)
           ^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langgraph/pregel/main.py", line 2643, in stream
    for _ in runner.tick(
             ^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langgraph/pregel/_runner.py", line 258, in tick
    _panic_or_proceed(
  File "/usr/local/lib/python3.12/site-packages/langgraph/pregel/_runner.py", line 520, in _panic_or_proceed
    raise exc
  File "/usr/local/lib/python3.12/site-packages/langgraph/pregel/_executor.py", line 80, in done
    task.result()
  File "/usr/local/lib/python3.12/concurrent/futures/_base.py", line 449, in result
    return self.__get_result()
           ^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/concurrent/futures/_base.py", line 401, in __get_result
    raise self._exception
  File "/usr/local/lib/python3.12/concurrent/futures/thread.py", line 59, in run
    result = self.fn(*self.args, **self.kwargs)
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/ddtrace/contrib/internal/futures/threading.py", line 43, in _wrap_execution
    return fn(*args, **kwargs)
           ^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langgraph/pregel/_retry.py", line 42, in run_with_retry
    return task.proc.invoke(task.input, config)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/ddtrace/contrib/internal/trace_utils.py", line 315, in wrapper
    return func(mod, pin, wrapped, instance, args, kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/ddtrace/contrib/internal/langgraph/patch.py", line 104, in traced_runnable_seq_invoke
    result = func(*args, **kwargs)
             ^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langgraph/_internal/_runnable.py", line 656, in invoke
    input = context.run(step.invoke, input, config, **kwargs)
            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langgraph/_internal/_runnable.py", line 400, in invoke
    ret = self.func(*args, **kwargs)
          ^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/app/app/utils/market_intelligence_agent/graph.py", line 167, in proprietary_tools_node
    "error": ResearchSignals(citations=["No valid proprietary tools"])
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/pydantic/main.py", line 212, in __init__
    validated_self = self.__pydantic_validator__.validate_python(data, self_instance=self)
                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
pydantic_core._pydantic_core.ValidationError: 1 validation error for ResearchSignals
citations.0
  Input should be a valid dictionary or instance of Citation [type=model_type, input_value='No valid proprietary tools', input_type=str]
    For further information visit https://errors.pydantic.dev/2.9/v/model_type
During task with name 'proprietary' and id '4ea86b35-89e5-bfa3-aea1-b0e38a2be193'
