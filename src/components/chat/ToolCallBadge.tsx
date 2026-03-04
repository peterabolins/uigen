"use client";

import { Loader2 } from "lucide-react";

export function getToolLabel(toolName: string, args: Record<string, any>): string {
  const path = args.path || undefined;
  const command = args.command || undefined;

  if (toolName === "str_replace_editor") {
    if (!command) return "Working…";
    if (command === "create") return path ? `Creating ${path}` : "Creating file…";
    if (command === "view") return path ? `Viewing ${path}` : "Viewing file…";
    return path ? `Editing ${path}` : "Editing file…";
  }

  if (toolName === "file_manager") {
    if (!command) return "Working…";
    if (command === "rename") return path ? `Renaming ${path}` : "Renaming file…";
    if (command === "delete") return path ? `Deleting ${path}` : "Deleting file…";
    return "Working…";
  }

  return toolName;
}

interface ToolCallBadgeProps {
  toolName: string;
  args: Record<string, any>;
  state: string;
  result?: any;
}

export function ToolCallBadge({ toolName, args, state, result }: ToolCallBadgeProps) {
  const label = getToolLabel(toolName, args);
  const isComplete = state === "result" && result != null;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isComplete ? (
        <div data-testid="tool-call-complete" className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 data-testid="tool-call-spinner" className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
