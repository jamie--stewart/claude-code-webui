import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AskUserQuestionPanel } from "./AskUserQuestionPanel";
import type { AskUserQuestion } from "../../types";

describe("AskUserQuestionPanel", () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  const singleQuestion: AskUserQuestion[] = [
    {
      question: "Which authentication method should we use?",
      header: "Auth method",
      multiSelect: false,
      options: [
        { label: "JWT", description: "JSON Web Token authentication" },
        { label: "OAuth", description: "OAuth 2.0 authentication" },
        { label: "Session", description: "Session-based authentication" },
      ],
    },
  ];

  const multiSelectQuestion: AskUserQuestion[] = [
    {
      question: "Which features do you want to enable?",
      header: "Features",
      multiSelect: true,
      options: [
        { label: "Dark mode", description: "Enable dark theme support" },
        { label: "Notifications", description: "Enable push notifications" },
        { label: "Analytics", description: "Enable usage analytics" },
      ],
    },
  ];

  const multipleQuestions: AskUserQuestion[] = [
    {
      question: "Which framework should we use?",
      header: "Framework",
      multiSelect: false,
      options: [
        { label: "React", description: "React with TypeScript" },
        { label: "Vue", description: "Vue.js 3" },
      ],
    },
    {
      question: "Which database should we use?",
      header: "Database",
      multiSelect: false,
      options: [
        { label: "PostgreSQL", description: "Relational database" },
        { label: "MongoDB", description: "NoSQL document database" },
      ],
    },
  ];

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
  });

  it("renders single question correctly", () => {
    render(
      <AskUserQuestionPanel
        questions={singleQuestion}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByText("Claude has a question")).toBeInTheDocument();
    expect(screen.getByText("Auth method")).toBeInTheDocument();
    expect(
      screen.getByText("Which authentication method should we use?"),
    ).toBeInTheDocument();
    expect(screen.getByText("JWT")).toBeInTheDocument();
    expect(screen.getByText("OAuth")).toBeInTheDocument();
    expect(screen.getByText("Session")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();
  });

  it("renders multiple questions correctly", () => {
    render(
      <AskUserQuestionPanel
        questions={multipleQuestions}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByText("Framework")).toBeInTheDocument();
    expect(screen.getByText("Database")).toBeInTheDocument();
    expect(
      screen.getByText("Which framework should we use?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Which database should we use?"),
    ).toBeInTheDocument();
  });

  it("shows multi-select indicator for multi-select questions", () => {
    render(
      <AskUserQuestionPanel
        questions={multiSelectQuestion}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByText("(select multiple)")).toBeInTheDocument();
  });

  it("selects first option by default for single-select questions", () => {
    render(
      <AskUserQuestionPanel
        questions={singleQuestion}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    // The JWT button should be selected by default (indicated by blue styling)
    const jwtButton = screen.getByRole("button", { name: /JWT/i });
    expect(jwtButton).toHaveClass("bg-blue-50");
  });

  it("allows selecting an option", () => {
    render(
      <AskUserQuestionPanel
        questions={singleQuestion}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const oauthButton = screen.getByRole("button", { name: /OAuth/i });
    fireEvent.click(oauthButton);

    expect(oauthButton).toHaveClass("bg-blue-50");
  });

  it("allows multiple selections for multi-select questions", () => {
    render(
      <AskUserQuestionPanel
        questions={multiSelectQuestion}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const darkModeButton = screen.getByRole("button", { name: /Dark mode/i });
    const notificationsButton = screen.getByRole("button", {
      name: /Notifications/i,
    });

    fireEvent.click(darkModeButton);
    fireEvent.click(notificationsButton);

    expect(darkModeButton).toHaveClass("bg-blue-50");
    expect(notificationsButton).toHaveClass("bg-blue-50");
  });

  it('shows text input when "Other" is selected', () => {
    render(
      <AskUserQuestionPanel
        questions={singleQuestion}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const otherButton = screen.getByRole("button", { name: /^Other$/i });
    fireEvent.click(otherButton);

    expect(
      screen.getByPlaceholderText("Enter your answer..."),
    ).toBeInTheDocument();
  });

  it("calls onSubmit with formatted answers when submit button is clicked", () => {
    render(
      <AskUserQuestionPanel
        questions={singleQuestion}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    // Select OAuth
    const oauthButton = screen.getByRole("button", { name: /OAuth/i });
    fireEvent.click(oauthButton);

    // Submit
    const submitButton = screen.getByRole("button", { name: /Submit/i });
    fireEvent.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith({
      "Auth method": "OAuth",
    });
  });

  it("calls onCancel when cancel button is clicked", () => {
    render(
      <AskUserQuestionPanel
        questions={singleQuestion}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("submits custom text for 'Other' option", () => {
    render(
      <AskUserQuestionPanel
        questions={singleQuestion}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    // Select "Other"
    const otherButton = screen.getByRole("button", { name: /^Other$/i });
    fireEvent.click(otherButton);

    // Enter custom text
    const input = screen.getByPlaceholderText("Enter your answer...");
    fireEvent.change(input, { target: { value: "Custom auth method" } });

    // Submit
    const submitButton = screen.getByRole("button", { name: /Submit/i });
    fireEvent.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith({
      "Auth method": "Custom auth method",
    });
  });

  it("disables submit button when no option is selected for multi-select", () => {
    render(
      <AskUserQuestionPanel
        questions={multiSelectQuestion}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const submitButton = screen.getByRole("button", { name: /Submit/i });
    expect(submitButton).toBeDisabled();
  });

  it("handles keyboard navigation with Enter to submit", () => {
    render(
      <AskUserQuestionPanel
        questions={singleQuestion}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    // Press Enter to submit
    fireEvent.keyDown(document, { key: "Enter" });

    expect(mockOnSubmit).toHaveBeenCalled();
  });

  it("handles keyboard navigation with Escape to cancel", () => {
    render(
      <AskUserQuestionPanel
        questions={singleQuestion}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    // Press Escape to cancel
    fireEvent.keyDown(document, { key: "Escape" });

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("handles multiple questions submission correctly", () => {
    render(
      <AskUserQuestionPanel
        questions={multipleQuestions}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    // Select Vue for framework
    const vueButton = screen.getByRole("button", { name: /Vue/i });
    fireEvent.click(vueButton);

    // Select MongoDB for database
    const mongoButton = screen.getByRole("button", { name: /MongoDB/i });
    fireEvent.click(mongoButton);

    // Submit
    const submitButton = screen.getByRole("button", { name: /Submit/i });
    fireEvent.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith({
      Framework: "Vue",
      Database: "MongoDB",
    });
  });
});
