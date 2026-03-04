import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getToolLabel, ToolCallBadge } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

// getToolLabel unit tests
test("str_replace_editor create with path", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/App.jsx" })).toBe("Creating /App.jsx");
});

test("str_replace_editor str_replace with path", () => {
  expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "/App.jsx" })).toBe("Editing /App.jsx");
});

test("str_replace_editor insert with path", () => {
  expect(getToolLabel("str_replace_editor", { command: "insert", path: "/components/Button.jsx" })).toBe("Editing /components/Button.jsx");
});

test("str_replace_editor view with path", () => {
  expect(getToolLabel("str_replace_editor", { command: "view", path: "/App.jsx" })).toBe("Viewing /App.jsx");
});

test("str_replace_editor create without path", () => {
  expect(getToolLabel("str_replace_editor", { command: "create" })).toBe("Creating file…");
});

test("str_replace_editor partial-call (no command, no path)", () => {
  expect(getToolLabel("str_replace_editor", {})).toBe("Working…");
});

test("file_manager rename with path", () => {
  expect(getToolLabel("file_manager", { command: "rename", path: "/old.jsx" })).toBe("Renaming /old.jsx");
});

test("file_manager delete with path", () => {
  expect(getToolLabel("file_manager", { command: "delete", path: "/App.jsx" })).toBe("Deleting /App.jsx");
});

test("file_manager delete without path", () => {
  expect(getToolLabel("file_manager", { command: "delete" })).toBe("Deleting file…");
});

test("file_manager partial-call (no command)", () => {
  expect(getToolLabel("file_manager", {})).toBe("Working…");
});

test("unknown tool returns raw toolName", () => {
  expect(getToolLabel("my_custom_tool", { command: "create" })).toBe("my_custom_tool");
});

// ToolCallBadge render tests
test("ToolCallBadge state=call shows spinner", () => {
  render(<ToolCallBadge toolName="str_replace_editor" args={{ command: "create", path: "/App.jsx" }} state="call" />);
  expect(screen.getByTestId("tool-call-spinner")).toBeDefined();
  expect(screen.queryByTestId("tool-call-complete")).toBeNull();
});

test("ToolCallBadge state=result with result shows complete dot", () => {
  render(<ToolCallBadge toolName="str_replace_editor" args={{ command: "create", path: "/App.jsx" }} state="result" result="Success" />);
  expect(screen.getByTestId("tool-call-complete")).toBeDefined();
  expect(screen.queryByTestId("tool-call-spinner")).toBeNull();
});

test("ToolCallBadge state=result without result shows spinner", () => {
  render(<ToolCallBadge toolName="str_replace_editor" args={{ command: "create", path: "/App.jsx" }} state="result" />);
  expect(screen.getByTestId("tool-call-spinner")).toBeDefined();
  expect(screen.queryByTestId("tool-call-complete")).toBeNull();
});

test("ToolCallBadge renders label text", () => {
  render(<ToolCallBadge toolName="str_replace_editor" args={{ command: "create", path: "/App.jsx" }} state="call" />);
  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
});
