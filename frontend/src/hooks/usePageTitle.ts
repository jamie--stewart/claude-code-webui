import { useEffect } from "react";
import type { ProjectInfo } from "../types";
import { formatProjectTitle } from "../utils/projectUtils";

const BASE_TITLE = "Claude Code Web UI";

/**
 * Hook to update the document title based on the current project
 *
 * @param project - Current project info, or null if not available
 */
export function usePageTitle(project: ProjectInfo | null | undefined) {
  useEffect(() => {
    if (project) {
      const projectTitle = formatProjectTitle(project);
      document.title = `${projectTitle} - ${BASE_TITLE}`;
    } else {
      document.title = BASE_TITLE;
    }

    // Cleanup: reset title when component unmounts
    return () => {
      document.title = BASE_TITLE;
    };
  }, [project]);
}
