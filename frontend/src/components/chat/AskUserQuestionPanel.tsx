import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import { useState, useEffect, useCallback } from "react";
import type { AskUserQuestion } from "../../types";

interface AskUserQuestionPanelProps {
  questions: AskUserQuestion[];
  onSubmit: (answers: Record<string, string>) => void;
  onCancel: () => void;
  /** Number of pending questions in queue (including current one) */
  pendingCount?: number;
}

export function AskUserQuestionPanel({
  questions,
  onSubmit,
  onCancel,
  pendingCount = 1,
}: AskUserQuestionPanelProps) {
  // Track answers for each question (keyed by question index)
  const [answers, setAnswers] = useState<Record<number, string[]>>({});
  // Track "Other" custom input for each question
  const [otherInputs, setOtherInputs] = useState<Record<number, string>>({});
  // Track which questions have "Other" selected
  const [showOtherInput, setShowOtherInput] = useState<Record<number, boolean>>(
    {},
  );
  // Track currently focused question for keyboard navigation
  const [focusedQuestion, setFocusedQuestion] = useState(0);

  // Initialize answers with first option selected for single-select questions
  useEffect(() => {
    const initialAnswers: Record<number, string[]> = {};
    questions.forEach((q, idx) => {
      if (!q.multiSelect && q.options.length > 0) {
        initialAnswers[idx] = [q.options[0].label];
      } else {
        initialAnswers[idx] = [];
      }
    });
    setAnswers(initialAnswers);
  }, [questions]);

  const handleOptionSelect = useCallback(
    (questionIdx: number, optionLabel: string, isMultiSelect: boolean) => {
      setAnswers((prev) => {
        const currentAnswers = prev[questionIdx] || [];

        if (optionLabel === "__other__") {
          // Handle "Other" option
          setShowOtherInput((prevShow) => ({
            ...prevShow,
            [questionIdx]: true,
          }));
          if (isMultiSelect) {
            // For multi-select, toggle "Other"
            if (currentAnswers.includes("__other__")) {
              setShowOtherInput((prevShow) => ({
                ...prevShow,
                [questionIdx]: false,
              }));
              return {
                ...prev,
                [questionIdx]: currentAnswers.filter((a) => a !== "__other__"),
              };
            }
            return {
              ...prev,
              [questionIdx]: [...currentAnswers, "__other__"],
            };
          } else {
            // For single-select, set only "Other"
            return { ...prev, [questionIdx]: ["__other__"] };
          }
        }

        // Handle regular options
        setShowOtherInput((prevShow) => ({
          ...prevShow,
          [questionIdx]: false,
        }));

        if (isMultiSelect) {
          // Toggle selection for multi-select
          if (currentAnswers.includes(optionLabel)) {
            return {
              ...prev,
              [questionIdx]: currentAnswers.filter((a) => a !== optionLabel),
            };
          }
          return {
            ...prev,
            [questionIdx]: [
              ...currentAnswers.filter((a) => a !== "__other__"),
              optionLabel,
            ],
          };
        } else {
          // Replace selection for single-select
          return { ...prev, [questionIdx]: [optionLabel] };
        }
      });
    },
    [],
  );

  const handleOtherInputChange = useCallback(
    (questionIdx: number, value: string) => {
      setOtherInputs((prev) => ({ ...prev, [questionIdx]: value }));
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    const formattedAnswers: Record<string, string> = {};

    questions.forEach((q, idx) => {
      const selectedAnswers = answers[idx] || [];
      const finalAnswers = selectedAnswers.map((a) =>
        a === "__other__" ? otherInputs[idx] || "" : a,
      );

      // Format answer based on question header as key
      formattedAnswers[q.header] = q.multiSelect
        ? finalAnswers.join(", ")
        : finalAnswers[0] || "";
    });

    onSubmit(formattedAnswers);
  }, [questions, answers, otherInputs, onSubmit]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const question = questions[focusedQuestion];
        const currentAnswers = answers[focusedQuestion] || [];
        const allOptions = [
          ...question.options.map((o) => o.label),
          "__other__",
        ];
        const currentIdx = allOptions.findIndex((o) =>
          currentAnswers.includes(o),
        );
        const newIdx =
          e.key === "ArrowDown"
            ? (currentIdx + 1) % allOptions.length
            : (currentIdx - 1 + allOptions.length) % allOptions.length;
        handleOptionSelect(
          focusedQuestion,
          allOptions[newIdx],
          question.multiSelect,
        );
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    focusedQuestion,
    questions,
    answers,
    handleOptionSelect,
    handleSubmit,
    onCancel,
  ]);

  // Check if submit should be enabled
  const canSubmit = questions.every((q, idx) => {
    const selectedAnswers = answers[idx] || [];
    if (selectedAnswers.length === 0) return false;
    if (selectedAnswers.includes("__other__") && !otherInputs[idx]?.trim()) {
      return false;
    }
    return true;
  });

  return (
    <div
      data-testid="ask-user-question-panel"
      className="flex-shrink-0 px-4 py-4 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl backdrop-blur-sm shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
          <QuestionMarkCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Claude has a question
        </h3>
        {pendingCount > 1 && (
          <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
            +{pendingCount - 1} more pending
          </span>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-6 mb-4">
        {questions.map((question, questionIdx) => (
          <div
            key={questionIdx}
            className={`${questionIdx > 0 ? "pt-4 border-t border-slate-200 dark:border-slate-700" : ""}`}
            onFocus={() => setFocusedQuestion(questionIdx)}
          >
            {/* Question header badge */}
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                {question.header}
              </span>
              {question.multiSelect && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  (select multiple)
                </span>
              )}
            </div>

            {/* Question text */}
            <p className="text-slate-700 dark:text-slate-200 mb-3 font-medium">
              {question.question}
            </p>

            {/* Options */}
            <div className="space-y-2">
              {question.options.map((option, optionIdx) => {
                const isSelected = (answers[questionIdx] || []).includes(
                  option.label,
                );
                return (
                  <button
                    key={optionIdx}
                    onClick={() =>
                      handleOptionSelect(
                        questionIdx,
                        option.label,
                        question.multiSelect,
                      )
                    }
                    className={`w-full p-3 rounded-lg cursor-pointer transition-all duration-200 text-left focus:outline-none ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 dark:border-blue-400 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Selection indicator */}
                      <div
                        className={`flex-shrink-0 w-5 h-5 mt-0.5 ${question.multiSelect ? "rounded" : "rounded-full"} border-2 flex items-center justify-center ${
                          isSelected
                            ? "border-blue-500 dark:border-blue-400 bg-blue-500 dark:bg-blue-400"
                            : "border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-sm font-medium ${
                            isSelected
                              ? "text-blue-700 dark:text-blue-300"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {option.label}
                        </span>
                        {option.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {option.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* "Other" option */}
              <button
                onClick={() =>
                  handleOptionSelect(
                    questionIdx,
                    "__other__",
                    question.multiSelect,
                  )
                }
                className={`w-full p-3 rounded-lg cursor-pointer transition-all duration-200 text-left focus:outline-none ${
                  showOtherInput[questionIdx]
                    ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 dark:border-blue-400 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800 border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex-shrink-0 w-5 h-5 mt-0.5 ${question.multiSelect ? "rounded" : "rounded-full"} border-2 flex items-center justify-center ${
                      showOtherInput[questionIdx]
                        ? "border-blue-500 dark:border-blue-400 bg-blue-500 dark:bg-blue-400"
                        : "border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {showOtherInput[questionIdx] && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      showOtherInput[questionIdx]
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Other
                  </span>
                </div>
              </button>

              {/* "Other" text input */}
              {showOtherInput[questionIdx] && (
                <div className="ml-8 mt-2">
                  <input
                    type="text"
                    value={otherInputs[questionIdx] || ""}
                    onChange={(e) =>
                      handleOtherInputChange(questionIdx, e.target.value)
                    }
                    placeholder="Enter your answer..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Press Enter to submit, Escape to cancel
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              canSubmit
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-blue-400 cursor-not-allowed"
            }`}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
