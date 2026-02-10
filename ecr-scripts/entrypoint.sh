#!/bin/bash
set -euo pipefail

# Initialization - load function handler
if ! source "$LAMBDA_TASK_ROOT/$(echo "$_HANDLER" | cut -d. -f1).sh"; then
  ERROR='{"errorMessage":"Failed to initialize the function","errorType":"Runtime.InvalidHandler"}'
  curl -X POST "http://${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/init/error" \
    -d "$ERROR" \
    --header "Lambda-Runtime-Function-Error-Type: Runtime.InitError"
  exit 1
fi

HANDLER_FUNCTION=$(echo "$_HANDLER" | cut -d. -f2)

# Processing loop
while true; do
  HEADERS="$(mktemp)"

  # Get an event. The HTTP request will block until one is received
  EVENT_DATA=$(curl -sS -LD "$HEADERS" "http://${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation/next")

  # Extract request ID by scraping response headers received above
  REQUEST_ID=$(grep -Fi Lambda-Runtime-Aws-Request-Id "$HEADERS" | tr -d '[:space:]' | cut -d: -f2)
  
  # Invoke handler and capture exit code
  set +e
  RESPONSE=$("$HANDLER_FUNCTION" "$EVENT_DATA")
  HANDLER_EXIT_CODE=$?
  set -e
  
  # Echo to CloudWatch
  echo "$RESPONSE" >&2
  
  # Send response or error
  if [ $HANDLER_EXIT_CODE -eq 0 ]; then
    curl -s -X POST "http://${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation/$REQUEST_ID/response" \
      -d "$RESPONSE"
  else
    echo "[ERROR] Handler failed with exit code $HANDLER_EXIT_CODE" >&2
    ERROR='{"errorMessage":"Handler execution failed","errorType":"Runtime.HandlerError"}'
    curl -s -X POST "http://${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation/$REQUEST_ID/error" \
      -d "$ERROR" \
      --header "Lambda-Runtime-Function-Error-Type: Runtime.HandlerError"
  fi
done