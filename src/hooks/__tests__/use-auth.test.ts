import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";
import * as actions from "@/actions";
import * as anonTracker from "@/lib/anon-work-tracker";
import * as getProjectsAction from "@/actions/get-projects";
import * as createProjectAction from "@/actions/create-project";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

const mockSignIn = vi.mocked(actions.signIn);
const mockSignUp = vi.mocked(actions.signUp);
const mockGetAnonWorkData = vi.mocked(anonTracker.getAnonWorkData);
const mockClearAnonWork = vi.mocked(anonTracker.clearAnonWork);
const mockGetProjects = vi.mocked(getProjectsAction.getProjects);
const mockCreateProject = vi.mocked(createProjectAction.createProject);

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "new-project-id" } as any);
  });

  describe("initial state", () => {
    test("returns isLoading as false initially", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    test("returns signIn and signUp functions", () => {
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
    });
  });

  describe("signIn", () => {
    test("sets isLoading to true during sign in, false after", async () => {
      let resolveSignIn!: (v: any) => void;
      mockSignIn.mockReturnValue(new Promise((res) => (resolveSignIn = res)));

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.signIn("user@test.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn({ success: false, error: "Invalid credentials" });
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns the result from signInAction", async () => {
      const expectedResult = { success: false, error: "Invalid credentials" };
      mockSignIn.mockResolvedValue(expectedResult);

      const { result } = renderHook(() => useAuth());
      let returnValue: any;

      await act(async () => {
        returnValue = await result.current.signIn("user@test.com", "wrongpass");
      });

      expect(returnValue).toEqual(expectedResult);
    });

    test("calls signInAction with email and password", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "error" });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "password123");
      });

      expect(mockSignIn).toHaveBeenCalledWith("user@test.com", "password123");
    });

    test("does not navigate when sign in fails", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "wrongpass");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("sets isLoading to false even when signInAction throws", async () => {
      mockSignIn.mockRejectedValue(new Error("Network error"));
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "password123").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    test("sets isLoading to true during sign up, false after", async () => {
      let resolveSignUp!: (v: any) => void;
      mockSignUp.mockReturnValue(new Promise((res) => (resolveSignUp = res)));

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.signUp("user@test.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignUp({ success: false, error: "Email already registered" });
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns the result from signUpAction", async () => {
      const expectedResult = { success: false, error: "Email already registered" };
      mockSignUp.mockResolvedValue(expectedResult);

      const { result } = renderHook(() => useAuth());
      let returnValue: any;

      await act(async () => {
        returnValue = await result.current.signUp("existing@test.com", "password123");
      });

      expect(returnValue).toEqual(expectedResult);
    });

    test("calls signUpAction with email and password", async () => {
      mockSignUp.mockResolvedValue({ success: false, error: "error" });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@test.com", "password123");
      });

      expect(mockSignUp).toHaveBeenCalledWith("new@test.com", "password123");
    });

    test("does not navigate when sign up fails", async () => {
      mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("existing@test.com", "password123");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("sets isLoading to false even when signUpAction throws", async () => {
      mockSignUp.mockRejectedValue(new Error("Network error"));
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("user@test.com", "password123").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("post sign-in: anonymous work migration", () => {
    test("creates project with anon work and navigates to it when anon messages exist", async () => {
      const anonWork = {
        messages: [{ id: "1", role: "user", content: "Hello" }],
        fileSystemData: { "/App.jsx": { type: "file", content: "..." } },
      };
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockSignIn.mockResolvedValue({ success: true });
      mockCreateProject.mockResolvedValue({ id: "anon-project-id" } as any);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "password123");
      });

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: anonWork.messages,
          data: anonWork.fileSystemData,
        })
      );
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
      expect(mockGetProjects).not.toHaveBeenCalled();
    });

    test("project name includes current time when migrating anon work", async () => {
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ id: "1", role: "user", content: "Hello" }],
        fileSystemData: {},
      });
      mockSignIn.mockResolvedValue({ success: true });
      mockCreateProject.mockResolvedValue({ id: "anon-project-id" } as any);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "password123");
      });

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({ name: expect.stringMatching(/^Design from /) })
      );
    });

    test("does not migrate anon work when messages array is empty", async () => {
      mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
      mockSignIn.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([{ id: "existing-project" }] as any);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "password123");
      });

      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockCreateProject).not.toHaveBeenCalled();
    });

    test("does not migrate anon work when getAnonWorkData returns null", async () => {
      mockGetAnonWorkData.mockReturnValue(null);
      mockSignIn.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([{ id: "existing-project" }] as any);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "password123");
      });

      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockClearAnonWork).not.toHaveBeenCalled();
    });
  });

  describe("post sign-in: project routing", () => {
    test("navigates to most recent project when user has existing projects", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([
        { id: "recent-project" },
        { id: "older-project" },
      ] as any);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/recent-project");
      expect(mockCreateProject).not.toHaveBeenCalled();
    });

    test("creates a new project and navigates to it when user has no projects", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "brand-new-project" } as any);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "password123");
      });

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({ messages: [], data: {} })
      );
      expect(mockPush).toHaveBeenCalledWith("/brand-new-project");
    });

    test("new project name matches expected pattern", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "new-project-id" } as any);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "password123");
      });

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({ name: expect.stringMatching(/^New Design #\d+$/) })
      );
    });

    test("post sign-in also works after successful signUp", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([{ id: "user-project" }] as any);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("newuser@test.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/user-project");
    });
  });
});
