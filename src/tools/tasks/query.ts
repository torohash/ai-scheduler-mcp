import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OAuth2Client } from "google-auth-library";
import { google, tasks_v1 } from "googleapis";
import { z } from "zod";
import { Task, TasksResponse } from "../../models/task/index.js";

/**
 * Registers task query tools.
 * @param server The MCP server instance.
 * @param authClient The authenticated OAuth2 client.
 */
export function registerQueryTaskTools(
  server: McpServer,
  authClient: OAuth2Client,
): void {
  const tasksClient = google.tasks({ version: "v1", auth: authClient });

  // タスク一覧取得ツール
  server.tool(
    "listTasks",
    {
      status: z.enum(["needsAction", "completed"]).optional(),
      dueMin: z.string().optional(),
      dueMax: z.string().optional(),
      maxResults: z.number().optional(),
      pageToken: z.string().optional(),
    },
    async ({ status, dueMin, dueMax, maxResults, pageToken }) => {
      try {
        const params: tasks_v1.Params$Resource$Tasks$List = {
          tasklist: "@default",
          maxResults,
          pageToken,
        };

        if (status) params.showCompleted = status === "completed";
        if (dueMin) params.dueMin = dueMin;
        if (dueMax) params.dueMax = dueMax;

        const response = await tasksClient.tasks.list(params);

        const tasksResponse: TasksResponse = {
          items: (response.data?.items || []) as Task[],
          nextPageToken: response.data?.nextPageToken || undefined,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(tasksResponse, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Add other query-related task tools here (e.g., searchTasksByTitle)
}
