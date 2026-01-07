import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

interface UseNavigationOptions {
  workingDirectory?: string;
}

export function useNavigation({ workingDirectory }: UseNavigationOptions) {
  const navigate = useNavigate();

  const handleBackToChat = useCallback(() => {
    navigate({ search: "" });
  }, [navigate]);

  const handleBackToHistory = useCallback(() => {
    const searchParams = new URLSearchParams();
    searchParams.set("view", "history");
    navigate({ search: searchParams.toString() });
  }, [navigate]);

  const handleBackToProjects = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleBackToProjectChat = useCallback(() => {
    if (workingDirectory) {
      navigate(`/projects${workingDirectory}`);
    }
  }, [navigate, workingDirectory]);

  const handleHistoryClick = useCallback(() => {
    const searchParams = new URLSearchParams();
    searchParams.set("view", "history");
    navigate({ search: searchParams.toString() });
  }, [navigate]);

  const handleStartNewConversation = useCallback(() => {
    if (workingDirectory) {
      navigate(`/projects${workingDirectory}`);
      window.location.reload();
    } else {
      window.location.reload();
    }
  }, [navigate, workingDirectory]);

  return {
    handleBackToChat,
    handleBackToHistory,
    handleBackToProjects,
    handleBackToProjectChat,
    handleHistoryClick,
    handleStartNewConversation,
  };
}
