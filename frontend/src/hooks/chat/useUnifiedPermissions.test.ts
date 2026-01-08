import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUnifiedPermissions } from "./useUnifiedPermissions";

describe("useUnifiedPermissions", () => {
  describe("Permission Mode State", () => {
    it("should initialize with default mode", () => {
      const { result } = renderHook(() => useUnifiedPermissions());
      expect(result.current.permissionMode).toBe("default");
      expect(result.current.isDefaultMode).toBe(true);
      expect(result.current.isPlanMode).toBe(false);
      expect(result.current.isAcceptEditsMode).toBe(false);
      expect(result.current.isBypassPermissionsMode).toBe(false);
    });

    it("should update permission mode", () => {
      const { result } = renderHook(() => useUnifiedPermissions());

      act(() => {
        result.current.setPermissionMode("plan");
      });

      expect(result.current.permissionMode).toBe("plan");
      expect(result.current.isPlanMode).toBe(true);
      expect(result.current.isDefaultMode).toBe(false);
    });

    it("should support all permission modes", () => {
      const { result } = renderHook(() => useUnifiedPermissions());

      const modes: Array<
        "default" | "plan" | "acceptEdits" | "bypassPermissions"
      > = ["default", "plan", "acceptEdits", "bypassPermissions"];

      for (const mode of modes) {
        act(() => {
          result.current.setPermissionMode(mode);
        });

        expect(result.current.permissionMode).toBe(mode);
        expect(result.current.isDefaultMode).toBe(mode === "default");
        expect(result.current.isPlanMode).toBe(mode === "plan");
        expect(result.current.isAcceptEditsMode).toBe(mode === "acceptEdits");
        expect(result.current.isBypassPermissionsMode).toBe(
          mode === "bypassPermissions",
        );
      }
    });
  });

  describe("Tool Permissions", () => {
    it("should initialize with empty allowed tools", () => {
      const { result } = renderHook(() => useUnifiedPermissions());
      expect(result.current.allowedTools).toEqual([]);
    });

    it("should allow tool temporarily without updating state", () => {
      const { result } = renderHook(() => useUnifiedPermissions());

      let tempAllowedTools: string[] = [];
      act(() => {
        tempAllowedTools = result.current.allowToolTemporary("Bash(ls:*)");
      });

      expect(tempAllowedTools).toEqual(["Bash(ls:*)"]);
      expect(result.current.allowedTools).toEqual([]);
    });

    it("should allow tool permanently and update state", () => {
      const { result } = renderHook(() => useUnifiedPermissions());

      let updatedAllowedTools: string[] = [];
      act(() => {
        updatedAllowedTools = result.current.allowToolPermanent("Bash(ls:*)");
      });

      expect(updatedAllowedTools).toEqual(["Bash(ls:*)"]);
      expect(result.current.allowedTools).toEqual(["Bash(ls:*)"]);
    });

    it("should allow multiple tools with base tools parameter", () => {
      const { result } = renderHook(() => useUnifiedPermissions());

      let updatedAllowedTools: string[] = [];

      act(() => {
        updatedAllowedTools = result.current.allowToolPermanent("Bash(ls:*)");
      });

      act(() => {
        updatedAllowedTools = result.current.allowToolPermanent(
          "Bash(grep:*)",
          updatedAllowedTools,
        );
      });

      expect(updatedAllowedTools).toEqual(["Bash(ls:*)", "Bash(grep:*)"]);
      expect(result.current.allowedTools).toEqual([
        "Bash(ls:*)",
        "Bash(grep:*)",
      ]);
    });

    it("should reset permissions", () => {
      const { result } = renderHook(() => useUnifiedPermissions());

      act(() => {
        result.current.allowToolPermanent("Bash(ls:*)");
      });

      act(() => {
        result.current.allowToolPermanent("Bash(grep:*)");
      });

      expect(result.current.allowedTools).toEqual([
        "Bash(ls:*)",
        "Bash(grep:*)",
      ]);

      act(() => {
        result.current.resetPermissions();
      });

      expect(result.current.allowedTools).toEqual([]);
    });
  });

  describe("Permission Dialog State", () => {
    it("should initialize with null permission request", () => {
      const { result } = renderHook(() => useUnifiedPermissions());
      expect(result.current.permissionRequest).toBeNull();
    });

    it("should show permission request", () => {
      const { result } = renderHook(() => useUnifiedPermissions());

      act(() => {
        result.current.showPermissionRequest(
          "Bash",
          ["Bash(ls:*)"],
          "tool-123",
        );
      });

      expect(result.current.permissionRequest).toEqual({
        isOpen: true,
        toolName: "Bash",
        patterns: ["Bash(ls:*)"],
        toolUseId: "tool-123",
      });
      expect(result.current.isPermissionDialogOpen).toBe(true);
    });

    it("should close permission request", () => {
      const { result } = renderHook(() => useUnifiedPermissions());

      act(() => {
        result.current.showPermissionRequest(
          "Bash",
          ["Bash(ls:*)"],
          "tool-123",
        );
      });

      act(() => {
        result.current.closePermissionRequest();
      });

      expect(result.current.permissionRequest).toBeNull();
      expect(result.current.isPermissionDialogOpen).toBe(false);
    });
  });

  describe("Plan Mode Dialog State", () => {
    it("should initialize with null plan mode request", () => {
      const { result } = renderHook(() => useUnifiedPermissions());
      expect(result.current.planModeRequest).toBeNull();
    });

    it("should show plan mode request", () => {
      const { result } = renderHook(() => useUnifiedPermissions());

      act(() => {
        result.current.showPlanModeRequest("Plan content here");
      });

      expect(result.current.planModeRequest).toEqual({
        isOpen: true,
        planContent: "Plan content here",
      });
      expect(result.current.isPermissionDialogOpen).toBe(true);
    });

    it("should close plan mode request", () => {
      const { result } = renderHook(() => useUnifiedPermissions());

      act(() => {
        result.current.showPlanModeRequest("Plan content");
      });

      act(() => {
        result.current.closePlanModeRequest();
      });

      expect(result.current.planModeRequest).toBeNull();
      expect(result.current.isPermissionDialogOpen).toBe(false);
    });
  });

  describe("AskUserQuestion State", () => {
    it("should initialize with null askUserQuestionRequest", () => {
      const { result } = renderHook(() => useUnifiedPermissions());
      expect(result.current.askUserQuestionRequest).toBeNull();
      expect(result.current.pendingAskUserQuestionCount).toBe(0);
    });

    it("should show AskUserQuestion request", () => {
      const { result } = renderHook(() => useUnifiedPermissions());

      const questions = [
        {
          question: "Which auth method?",
          header: "Auth",
          multiSelect: false,
          options: [
            { label: "JWT", description: "JSON Web Token" },
            { label: "OAuth", description: "OAuth 2.0" },
          ],
        },
      ];

      act(() => {
        result.current.showAskUserQuestion(questions, "toolu_12345");
      });

      expect(result.current.askUserQuestionRequest).toEqual({
        isOpen: true,
        questions,
        toolUseId: "toolu_12345",
      });
      expect(result.current.isPermissionDialogOpen).toBe(true);
      expect(result.current.pendingAskUserQuestionCount).toBe(1);
    });

    it("should close AskUserQuestion request", () => {
      const { result } = renderHook(() => useUnifiedPermissions());

      const questions = [
        {
          question: "Which feature?",
          header: "Feature",
          multiSelect: true,
          options: [{ label: "Dark mode", description: "Enable dark theme" }],
        },
      ];

      act(() => {
        result.current.showAskUserQuestion(questions, "toolu_67890");
      });

      act(() => {
        result.current.closeAskUserQuestion();
      });

      expect(result.current.askUserQuestionRequest).toBeNull();
      expect(result.current.isPermissionDialogOpen).toBe(false);
      expect(result.current.pendingAskUserQuestionCount).toBe(0);
    });

    it("should queue multiple AskUserQuestion requests", () => {
      const { result } = renderHook(() => useUnifiedPermissions());

      const questions1 = [
        {
          question: "First question?",
          header: "First",
          multiSelect: false,
          options: [{ label: "A", description: "Option A" }],
        },
      ];
      const questions2 = [
        {
          question: "Second question?",
          header: "Second",
          multiSelect: false,
          options: [{ label: "B", description: "Option B" }],
        },
      ];

      act(() => {
        result.current.showAskUserQuestion(questions1, "toolu_first");
        result.current.showAskUserQuestion(questions2, "toolu_second");
      });

      expect(result.current.askUserQuestionRequest?.toolUseId).toBe(
        "toolu_first",
      );
      expect(result.current.pendingAskUserQuestionCount).toBe(2);
    });

    it("should show next question after closing current one", () => {
      const { result } = renderHook(() => useUnifiedPermissions());

      const questions1 = [
        {
          question: "First question?",
          header: "First",
          multiSelect: false,
          options: [{ label: "A", description: "Option A" }],
        },
      ];
      const questions2 = [
        {
          question: "Second question?",
          header: "Second",
          multiSelect: false,
          options: [{ label: "B", description: "Option B" }],
        },
      ];

      act(() => {
        result.current.showAskUserQuestion(questions1, "toolu_first");
        result.current.showAskUserQuestion(questions2, "toolu_second");
      });

      act(() => {
        result.current.closeAskUserQuestion();
      });

      expect(result.current.askUserQuestionRequest?.toolUseId).toBe(
        "toolu_second",
      );
      expect(result.current.pendingAskUserQuestionCount).toBe(1);
    });
  });

  describe("handlePermissionError", () => {
    it("should show permission request for regular tools", () => {
      const { result } = renderHook(() => useUnifiedPermissions());

      act(() => {
        result.current.handlePermissionError(
          "Bash",
          ["Bash(ls:*)"],
          "tool-123",
        );
      });

      expect(result.current.permissionRequest).not.toBeNull();
      expect(result.current.planModeRequest).toBeNull();
    });

    it("should show plan mode request for ExitPlanMode", () => {
      const { result } = renderHook(() => useUnifiedPermissions());

      act(() => {
        result.current.handlePermissionError(
          "ExitPlanMode",
          ["ExitPlanMode"],
          "tool-456",
        );
      });

      expect(result.current.permissionRequest).toBeNull();
      expect(result.current.planModeRequest).not.toBeNull();
    });
  });

  describe("handleAskUserQuestion", () => {
    it("should queue AskUserQuestion requests", () => {
      const { result } = renderHook(() => useUnifiedPermissions());

      const questions = [
        {
          question: "Choose option?",
          header: "Choice",
          multiSelect: false,
          options: [{ label: "X", description: "Option X" }],
        },
      ];

      act(() => {
        result.current.handleAskUserQuestion(questions, "toolu_handle");
      });

      expect(result.current.askUserQuestionRequest?.toolUseId).toBe(
        "toolu_handle",
      );
    });
  });

  describe("isPermissionDialogOpen", () => {
    it("should be true when permission request is open", () => {
      const { result } = renderHook(() => useUnifiedPermissions());

      act(() => {
        result.current.showPermissionRequest("Bash", ["Bash(ls:*)"], "tool-1");
      });

      expect(result.current.isPermissionDialogOpen).toBe(true);
    });

    it("should be true when plan mode request is open", () => {
      const { result } = renderHook(() => useUnifiedPermissions());

      act(() => {
        result.current.showPlanModeRequest("Plan");
      });

      expect(result.current.isPermissionDialogOpen).toBe(true);
    });

    it("should be true when AskUserQuestion request is open", () => {
      const { result } = renderHook(() => useUnifiedPermissions());

      act(() => {
        result.current.showAskUserQuestion(
          [{ question: "Q?", header: "H", multiSelect: false, options: [] }],
          "toolu_ask",
        );
      });

      expect(result.current.isPermissionDialogOpen).toBe(true);
    });

    it("should be false when all dialogs are closed", () => {
      const { result } = renderHook(() => useUnifiedPermissions());

      expect(result.current.isPermissionDialogOpen).toBe(false);
    });
  });
});
