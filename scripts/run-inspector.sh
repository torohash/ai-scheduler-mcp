#!/bin/bash

# ai-scheduler-mcpサーバーをビルド
echo "Building ai-scheduler-mcp server..."
npm run build

# MCP Inspectorを使ってai-scheduler-mcpサーバーを起動
echo "Starting MCP Inspector with ai-scheduler-mcp server..."
echo "Access the MCP Inspector UI at: http://localhost:6274"
npx @modelcontextprotocol/inspector