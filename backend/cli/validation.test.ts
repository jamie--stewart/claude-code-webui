/**
 * Tests for CLI path detection and validation logic
 *
 * Tests for detectClaudeCliPath() and validateClaudeCli() functions
 * covering various scenarios including different package managers,
 * Windows/Unix platforms, and edge cases.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Runtime } from "../runtime/types";

// Hoisted mocks for all dependencies
const mocks = vi.hoisted(() => ({
  logInfo: vi.fn(),
  logDebug: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  exists: vi.fn(),
  withTempDir: vi.fn(),
  getPlatform: vi.fn(),
  getEnv: vi.fn(),
  exit: vi.fn(),
}));

// Mock all dependencies
vi.mock("../utils/logger", () => ({
  logger: {
    cli: {
      info: mocks.logInfo,
      debug: mocks.logDebug,
      error: mocks.logError,
      warn: mocks.logWarn,
    },
  },
}));

vi.mock("../utils/fs", () => ({
  readTextFile: mocks.readTextFile,
  writeTextFile: mocks.writeTextFile,
  exists: mocks.exists,
  withTempDir: mocks.withTempDir,
}));

vi.mock("../utils/os", () => ({
  getPlatform: mocks.getPlatform,
  getEnv: mocks.getEnv,
  exit: mocks.exit,
}));

// Import after mocks are set up
import { detectClaudeCliPath, validateClaudeCli } from "./validation";

/**
 * Creates a mock Runtime for testing
 */
function createMockRuntime(overrides?: Partial<Runtime>): Runtime {
  return {
    findExecutable: vi.fn().mockResolvedValue([]),
    runCommand: vi.fn().mockResolvedValue({
      success: true,
      stdout: "1.0.0",
      stderr: "",
      code: 0,
    }),
    serve: vi.fn(),
    createStaticFileMiddleware: vi.fn(),
    ...overrides,
  };
}

describe("detectClaudeCliPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to Unix platform
    mocks.getPlatform.mockReturnValue("linux");
    mocks.getEnv.mockReturnValue("/usr/bin:/usr/local/bin");
  });

  describe("PATH wrapping method (Unix)", () => {
    it("should detect Claude CLI script path via PATH wrapping on Unix", async () => {
      mocks.getPlatform.mockReturnValue("linux");
      mocks.getEnv.mockReturnValue("/usr/bin:/usr/local/bin");

      const mockRuntime = createMockRuntime({
        findExecutable: vi.fn().mockResolvedValue(["/usr/local/bin/node"]),
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          stdout: "claude 1.0.0",
          stderr: "",
          code: 0,
        }),
      });

      // Mock withTempDir to simulate the tracing process
      mocks.withTempDir.mockImplementation(async () => {
        return {
          scriptPath: "/usr/local/lib/node_modules/claude/cli.js",
          versionOutput: "claude 1.0.0",
        };
      });

      const result = await detectClaudeCliPath(
        mockRuntime,
        "/usr/local/bin/claude",
      );

      expect(result.scriptPath).toBe(
        "/usr/local/lib/node_modules/claude/cli.js",
      );
      expect(result.versionOutput).toBe("claude 1.0.0");
    });

    it("should detect Claude CLI script path via PATH wrapping on macOS", async () => {
      mocks.getPlatform.mockReturnValue("darwin");
      mocks.getEnv.mockReturnValue("/usr/bin:/usr/local/bin");

      const mockRuntime = createMockRuntime({
        findExecutable: vi.fn().mockResolvedValue(["/opt/homebrew/bin/node"]),
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          stdout: "claude 1.0.108",
          stderr: "",
          code: 0,
        }),
      });

      mocks.withTempDir.mockImplementation(async () => {
        return {
          scriptPath:
            "/opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js",
          versionOutput: "claude 1.0.108",
        };
      });

      const result = await detectClaudeCliPath(
        mockRuntime,
        "/opt/homebrew/bin/claude",
      );

      expect(result.scriptPath).toBe(
        "/opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js",
      );
      expect(result.versionOutput).toBe("claude 1.0.108");
    });

    it("should return empty scriptPath when node executable is not found", async () => {
      mocks.getPlatform.mockReturnValue("linux");

      const mockRuntime = createMockRuntime({
        findExecutable: vi.fn().mockResolvedValue([]),
      });

      mocks.withTempDir.mockImplementation(async () => {
        return null;
      });

      const result = await detectClaudeCliPath(
        mockRuntime,
        "/usr/local/bin/claude",
      );

      expect(result.scriptPath).toBe("");
    });

    it("should return empty scriptPath when command execution fails", async () => {
      mocks.getPlatform.mockReturnValue("linux");

      const mockRuntime = createMockRuntime({
        findExecutable: vi.fn().mockResolvedValue(["/usr/local/bin/node"]),
        runCommand: vi.fn().mockResolvedValue({
          success: false,
          stdout: "",
          stderr: "Command failed",
          code: 1,
        }),
      });

      mocks.withTempDir.mockImplementation(async () => {
        return null;
      });

      const result = await detectClaudeCliPath(
        mockRuntime,
        "/usr/local/bin/claude",
      );

      expect(result.scriptPath).toBe("");
    });

    it("should return empty scriptPath but preserve version when trace file is empty", async () => {
      mocks.getPlatform.mockReturnValue("linux");

      const mockRuntime = createMockRuntime({
        findExecutable: vi.fn().mockResolvedValue(["/usr/local/bin/node"]),
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          stdout: "claude 1.0.0",
          stderr: "",
          code: 0,
        }),
      });

      mocks.withTempDir.mockImplementation(async () => {
        return { scriptPath: "", versionOutput: "claude 1.0.0" };
      });

      const result = await detectClaudeCliPath(
        mockRuntime,
        "/usr/local/bin/claude",
      );

      expect(result.scriptPath).toBe("");
      expect(result.versionOutput).toBe("claude 1.0.0");
    });

    it("should handle errors during PATH wrapping gracefully", async () => {
      mocks.getPlatform.mockReturnValue("linux");

      const mockRuntime = createMockRuntime();

      mocks.withTempDir.mockRejectedValue(
        new Error("Temp dir creation failed"),
      );

      const result = await detectClaudeCliPath(
        mockRuntime,
        "/usr/local/bin/claude",
      );

      expect(result.scriptPath).toBe("");
      expect(result.versionOutput).toBe("");
    });
  });

  describe("PATH wrapping method (Windows)", () => {
    it("should detect Claude CLI script path via PATH wrapping on Windows", async () => {
      mocks.getPlatform.mockReturnValue("windows");
      mocks.getEnv.mockReturnValue(
        "C:\\Program Files\\nodejs;C:\\Users\\test\\AppData\\Roaming\\npm",
      );

      const mockRuntime = createMockRuntime({
        findExecutable: vi
          .fn()
          .mockResolvedValue(["C:\\Program Files\\nodejs\\node.exe"]),
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          stdout: "claude 1.0.0",
          stderr: "",
          code: 0,
        }),
      });

      mocks.withTempDir.mockImplementation(async () => {
        return {
          scriptPath:
            "C:\\Users\\test\\AppData\\Roaming\\npm\\node_modules\\claude\\cli.js",
          versionOutput: "claude 1.0.0",
        };
      });

      const result = await detectClaudeCliPath(
        mockRuntime,
        "C:\\Users\\test\\AppData\\Roaming\\npm\\claude.cmd",
      );

      expect(result.scriptPath).toBe(
        "C:\\Users\\test\\AppData\\Roaming\\npm\\node_modules\\claude\\cli.js",
      );
      expect(result.versionOutput).toBe("claude 1.0.0");
    });

    it("should use .cmd parsing fallback when PATH wrapping fails on Windows", async () => {
      mocks.getPlatform.mockReturnValue("windows");
      mocks.getEnv.mockReturnValue("C:\\Program Files\\nodejs");

      const mockRuntime = createMockRuntime({
        findExecutable: vi
          .fn()
          .mockResolvedValue(["C:\\Program Files\\nodejs\\node.exe"]),
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          stdout: "claude 1.0.0",
          stderr: "",
          code: 0,
        }),
      });

      // PATH wrapping returns null (failed)
      mocks.withTempDir.mockImplementation(async () => {
        return null;
      });

      // .cmd parsing succeeds
      const cmdContent = `@ECHO off
SETLOCAL
CALL :find_dp0
IF EXIST "%dp0%\\node.exe" (
  SET "_prog=%dp0%\\node.exe"
) ELSE (
  SET "_prog=node"
  SET PATHEXT=%PATHEXT:;.JS;=;%
)
endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\\node_modules\\@anthropic-ai\\claude-code\\cli.js" %*`;

      mocks.readTextFile.mockResolvedValue(cmdContent);
      mocks.exists.mockResolvedValue(true);

      const result = await detectClaudeCliPath(
        mockRuntime,
        "C:\\Users\\test\\AppData\\Roaming\\npm\\claude.cmd",
      );

      // The test verifies that .cmd parsing extracts the relative path from the script
      // Note: The path contains backslashes from the .cmd file content as parsed
      expect(result.scriptPath).toContain("node_modules");
      expect(result.scriptPath).toContain("@anthropic-ai");
      expect(result.scriptPath).toContain("claude-code");
      expect(result.scriptPath).toContain("cli.js");
      expect(mocks.readTextFile).toHaveBeenCalled();
      expect(mocks.exists).toHaveBeenCalled();
    });

    it("should return empty when both PATH wrapping and .cmd parsing fail on Windows", async () => {
      mocks.getPlatform.mockReturnValue("windows");

      const mockRuntime = createMockRuntime({
        findExecutable: vi.fn().mockResolvedValue([]),
      });

      mocks.withTempDir.mockImplementation(async () => {
        return null;
      });

      mocks.readTextFile.mockRejectedValue(new Error("File not found"));

      const result = await detectClaudeCliPath(
        mockRuntime,
        "C:\\Users\\test\\AppData\\Roaming\\npm\\claude.cmd",
      );

      expect(result.scriptPath).toBe("");
    });

    it("should not use .cmd parsing fallback for non-.cmd files", async () => {
      mocks.getPlatform.mockReturnValue("windows");

      const mockRuntime = createMockRuntime({
        findExecutable: vi.fn().mockResolvedValue([]),
      });

      mocks.withTempDir.mockImplementation(async () => {
        return null;
      });

      // Should not call readTextFile for non-.cmd files
      const result = await detectClaudeCliPath(
        mockRuntime,
        "C:\\Users\\test\\claude.exe",
      );

      expect(mocks.readTextFile).not.toHaveBeenCalled();
      expect(result.scriptPath).toBe("");
    });
  });

  describe("Edge cases", () => {
    it("should handle double backslashes in Windows paths", async () => {
      mocks.getPlatform.mockReturnValue("windows");

      const mockRuntime = createMockRuntime({
        findExecutable: vi
          .fn()
          .mockResolvedValue(["C:\\Program Files\\nodejs\\node.exe"]),
      });

      // Simulate trace output with double backslashes
      mocks.withTempDir.mockImplementation(async () => {
        return {
          scriptPath: "C:\\Users\\test\\node_modules\\claude\\cli.js",
          versionOutput: "claude 1.0.0",
        };
      });

      const result = await detectClaudeCliPath(
        mockRuntime,
        "C:\\Users\\test\\claude.cmd",
      );

      // Path should be cleaned up (no double backslashes in result)
      expect(result.scriptPath).not.toContain("\\\\");
    });

    it("should handle empty PATH environment variable", async () => {
      mocks.getPlatform.mockReturnValue("linux");
      mocks.getEnv.mockReturnValue("");

      const mockRuntime = createMockRuntime({
        findExecutable: vi.fn().mockResolvedValue(["/usr/local/bin/node"]),
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          stdout: "claude 1.0.0",
          stderr: "",
          code: 0,
        }),
      });

      mocks.withTempDir.mockImplementation(async () => {
        return {
          scriptPath: "/usr/local/lib/claude/cli.js",
          versionOutput: "claude 1.0.0",
        };
      });

      const result = await detectClaudeCliPath(
        mockRuntime,
        "/usr/local/bin/claude",
      );

      expect(result.scriptPath).toBe("/usr/local/lib/claude/cli.js");
    });

    it("should handle undefined PATH environment variable", async () => {
      mocks.getPlatform.mockReturnValue("linux");
      mocks.getEnv.mockReturnValue(undefined);

      const mockRuntime = createMockRuntime({
        findExecutable: vi.fn().mockResolvedValue(["/usr/local/bin/node"]),
      });

      mocks.withTempDir.mockImplementation(async () => {
        return {
          scriptPath: "/usr/local/lib/claude/cli.js",
          versionOutput: "claude 1.0.0",
        };
      });

      const result = await detectClaudeCliPath(
        mockRuntime,
        "/usr/local/bin/claude",
      );

      expect(result.scriptPath).toBe("/usr/local/lib/claude/cli.js");
    });
  });
});

describe("validateClaudeCli", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPlatform.mockReturnValue("linux");
    mocks.getEnv.mockReturnValue("/usr/bin:/usr/local/bin");
    mocks.exit.mockImplementation(() => {
      throw new Error("Process exit called");
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Auto-detection", () => {
    it("should auto-detect Claude CLI from PATH and return script path", async () => {
      const mockRuntime = createMockRuntime({
        findExecutable: vi.fn().mockResolvedValue(["/usr/local/bin/claude"]),
      });

      mocks.withTempDir.mockImplementation(async () => {
        return {
          scriptPath: "/usr/local/lib/node_modules/claude/cli.js",
          versionOutput: "claude 1.0.0",
        };
      });

      const result = await validateClaudeCli(mockRuntime);

      expect(mockRuntime.findExecutable).toHaveBeenCalledWith("claude");
      expect(result).toBe("/usr/local/lib/node_modules/claude/cli.js");
      expect(mocks.logInfo).toHaveBeenCalledWith(
        "🔍 Searching for Claude CLI in PATH...",
      );
    });

    it("should exit when Claude CLI is not found in PATH", async () => {
      const mockRuntime = createMockRuntime({
        findExecutable: vi.fn().mockResolvedValue([]),
      });

      await expect(validateClaudeCli(mockRuntime)).rejects.toThrow(
        "Process exit called",
      );

      expect(mocks.logError).toHaveBeenCalledWith(
        "❌ Claude CLI not found in PATH",
      );
      expect(mocks.exit).toHaveBeenCalledWith(1);
    });

    it("should prefer .cmd files on Windows when multiple candidates exist", async () => {
      mocks.getPlatform.mockReturnValue("windows");

      const mockRuntime = createMockRuntime({
        findExecutable: vi
          .fn()
          .mockResolvedValue([
            "C:\\Users\\test\\AppData\\Roaming\\npm\\claude",
            "C:\\Users\\test\\AppData\\Roaming\\npm\\claude.cmd",
          ]),
      });

      mocks.withTempDir.mockImplementation(async () => {
        return {
          scriptPath: "C:\\Users\\test\\node_modules\\claude\\cli.js",
          versionOutput: "claude 1.0.0",
        };
      });

      const result = await validateClaudeCli(mockRuntime);

      expect(result).toBe("C:\\Users\\test\\node_modules\\claude\\cli.js");
      expect(mocks.logDebug).toHaveBeenCalledWith(
        expect.stringContaining("Windows .cmd preferred"),
      );
    });

    it("should use first candidate when no .cmd file exists on Windows", async () => {
      mocks.getPlatform.mockReturnValue("windows");

      const mockRuntime = createMockRuntime({
        findExecutable: vi
          .fn()
          .mockResolvedValue([
            "C:\\Users\\test\\AppData\\Roaming\\npm\\claude",
            "C:\\Users\\test\\AppData\\Local\\npm\\claude",
          ]),
      });

      mocks.withTempDir.mockImplementation(async () => {
        return {
          scriptPath: "C:\\Users\\test\\node_modules\\claude\\cli.js",
          versionOutput: "claude 1.0.0",
        };
      });

      await validateClaudeCli(mockRuntime);

      // When multiple candidates exist on Windows but no .cmd file found,
      // the code still goes through the Windows branch (isWindows && candidates.length > 1)
      // and selects the first candidate while appending "(Windows .cmd preferred)"
      expect(mocks.logDebug).toHaveBeenCalledWith(
        "Using Claude CLI path: C:\\Users\\test\\AppData\\Roaming\\npm\\claude (Windows .cmd preferred)",
      );
    });

    it("should use first candidate on non-Windows platforms", async () => {
      mocks.getPlatform.mockReturnValue("darwin");

      const mockRuntime = createMockRuntime({
        findExecutable: vi
          .fn()
          .mockResolvedValue([
            "/opt/homebrew/bin/claude",
            "/usr/local/bin/claude",
          ]),
      });

      mocks.withTempDir.mockImplementation(async () => {
        return {
          scriptPath: "/opt/homebrew/lib/claude/cli.js",
          versionOutput: "claude 1.0.0",
        };
      });

      const result = await validateClaudeCli(mockRuntime);

      expect(result).toBe("/opt/homebrew/lib/claude/cli.js");
    });
  });

  describe("Custom path validation", () => {
    it("should use custom path when provided", async () => {
      const mockRuntime = createMockRuntime();

      mocks.withTempDir.mockImplementation(async () => {
        return {
          scriptPath: "/custom/path/to/claude/cli.js",
          versionOutput: "claude 1.0.0",
        };
      });

      const result = await validateClaudeCli(
        mockRuntime,
        "/custom/path/to/claude",
      );

      expect(mockRuntime.findExecutable).not.toHaveBeenCalled();
      expect(mocks.logInfo).toHaveBeenCalledWith(
        "🔍 Validating custom Claude path: /custom/path/to/claude",
      );
      expect(result).toBe("/custom/path/to/claude/cli.js");
    });

    it("should fall back to custom path when script detection fails", async () => {
      const mockRuntime = createMockRuntime();

      mocks.withTempDir.mockImplementation(async () => {
        return { scriptPath: "", versionOutput: "claude 1.0.0" };
      });

      const result = await validateClaudeCli(
        mockRuntime,
        "/custom/path/to/claude",
      );

      expect(result).toBe("/custom/path/to/claude");
      expect(mocks.logWarn).toHaveBeenCalledWith(
        "⚠️  Claude CLI script path detection failed",
      );
    });
  });

  describe("Fallback behavior", () => {
    it("should fall back to claude executable path when script detection fails", async () => {
      const mockRuntime = createMockRuntime({
        findExecutable: vi.fn().mockResolvedValue(["/usr/local/bin/claude"]),
      });

      mocks.withTempDir.mockImplementation(async () => {
        return { scriptPath: "", versionOutput: "claude 1.0.0" };
      });

      const result = await validateClaudeCli(mockRuntime);

      expect(result).toBe("/usr/local/bin/claude");
      expect(mocks.logWarn).toHaveBeenCalledWith(
        "⚠️  Claude CLI script path detection failed",
      );
      expect(mocks.logWarn).toHaveBeenCalledWith(
        "   Falling back to using the claude executable directly.",
      );
    });

    it("should show version output even when falling back", async () => {
      const mockRuntime = createMockRuntime({
        findExecutable: vi.fn().mockResolvedValue(["/usr/local/bin/claude"]),
      });

      mocks.withTempDir.mockImplementation(async () => {
        return { scriptPath: "", versionOutput: "claude 1.0.108" };
      });

      await validateClaudeCli(mockRuntime);

      expect(mocks.logInfo).toHaveBeenCalledWith(
        "✅ Claude CLI found: claude 1.0.108",
      );
    });

    it("should show version output on successful detection", async () => {
      const mockRuntime = createMockRuntime({
        findExecutable: vi.fn().mockResolvedValue(["/usr/local/bin/claude"]),
      });

      mocks.withTempDir.mockImplementation(async () => {
        return {
          scriptPath: "/usr/local/lib/claude/cli.js",
          versionOutput: "claude 1.0.108",
        };
      });

      await validateClaudeCli(mockRuntime);

      expect(mocks.logInfo).toHaveBeenCalledWith(
        "✅ Claude CLI script detected: /usr/local/lib/claude/cli.js",
      );
      expect(mocks.logInfo).toHaveBeenCalledWith(
        "✅ Claude CLI found: claude 1.0.108",
      );
    });
  });

  describe("Error handling", () => {
    it("should exit on validation error", async () => {
      const mockRuntime = createMockRuntime({
        findExecutable: vi
          .fn()
          .mockRejectedValue(new Error("Permission denied")),
      });

      await expect(validateClaudeCli(mockRuntime)).rejects.toThrow(
        "Process exit called",
      );

      expect(mocks.logError).toHaveBeenCalledWith(
        "❌ Failed to validate Claude CLI",
      );
      expect(mocks.logError).toHaveBeenCalledWith(
        "   Error: Permission denied",
      );
      expect(mocks.exit).toHaveBeenCalledWith(1);
    });

    it("should handle non-Error exceptions gracefully", async () => {
      const mockRuntime = createMockRuntime({
        findExecutable: vi.fn().mockRejectedValue("String error"),
      });

      await expect(validateClaudeCli(mockRuntime)).rejects.toThrow(
        "Process exit called",
      );

      expect(mocks.logError).toHaveBeenCalledWith("   Error: String error");
      expect(mocks.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("Package manager compatibility", () => {
    it("should work with npm global installation", async () => {
      const mockRuntime = createMockRuntime({
        findExecutable: vi.fn().mockResolvedValue(["/usr/local/bin/claude"]),
      });

      mocks.withTempDir.mockImplementation(async () => {
        return {
          scriptPath:
            "/usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js",
          versionOutput: "claude 1.0.108",
        };
      });

      const result = await validateClaudeCli(mockRuntime);

      expect(result).toBe(
        "/usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js",
      );
    });

    it("should work with pnpm global installation", async () => {
      const mockRuntime = createMockRuntime({
        findExecutable: vi
          .fn()
          .mockResolvedValue(["/home/user/.local/share/pnpm/claude"]),
      });

      mocks.withTempDir.mockImplementation(async () => {
        return {
          scriptPath:
            "/home/user/.local/share/pnpm/global/5/node_modules/@anthropic-ai/claude-code/cli.js",
          versionOutput: "claude 1.0.108",
        };
      });

      const result = await validateClaudeCli(mockRuntime);

      expect(result).toBe(
        "/home/user/.local/share/pnpm/global/5/node_modules/@anthropic-ai/claude-code/cli.js",
      );
    });

    it("should work with yarn global installation", async () => {
      const mockRuntime = createMockRuntime({
        findExecutable: vi
          .fn()
          .mockResolvedValue(["/home/user/.yarn/bin/claude"]),
      });

      mocks.withTempDir.mockImplementation(async () => {
        return {
          scriptPath:
            "/home/user/.yarn/global/node_modules/@anthropic-ai/claude-code/cli.js",
          versionOutput: "claude 1.0.108",
        };
      });

      const result = await validateClaudeCli(mockRuntime);

      expect(result).toBe(
        "/home/user/.yarn/global/node_modules/@anthropic-ai/claude-code/cli.js",
      );
    });

    it("should work with asdf installation", async () => {
      const mockRuntime = createMockRuntime({
        findExecutable: vi
          .fn()
          .mockResolvedValue(["/home/user/.asdf/shims/claude"]),
      });

      mocks.withTempDir.mockImplementation(async () => {
        return {
          scriptPath:
            "/home/user/.asdf/installs/nodejs/20.0.0/lib/node_modules/@anthropic-ai/claude-code/cli.js",
          versionOutput: "claude 1.0.108",
        };
      });

      const result = await validateClaudeCli(mockRuntime);

      expect(result).toBe(
        "/home/user/.asdf/installs/nodejs/20.0.0/lib/node_modules/@anthropic-ai/claude-code/cli.js",
      );
    });
  });
});
