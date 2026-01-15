import { getBasePath } from "../utils/environment";

// API configuration - uses relative paths with Vite proxy in development
export const API_CONFIG = {
  ENDPOINTS: {
    CHAT: "/api/chat",
    ABORT: "/api/abort",
    PROJECTS: "/api/projects",
    HISTORIES: "/api/projects",
    CONVERSATIONS: "/api/projects",
    MENTIONS: "/api/mentions",
  },
} as const;

// Helper function to get full API URL with base path
export const getApiUrl = (endpoint: string) => {
  const basePath = getBasePath();
  // Remove trailing slash from basePath, keep leading slash on endpoint
  const base = basePath.replace(/\/$/, "");
  return `${base}${endpoint}`;
};

// Helper function to get abort URL
export const getAbortUrl = (requestId: string) => {
  return getApiUrl(`${API_CONFIG.ENDPOINTS.ABORT}/${requestId}`);
};

// Helper function to get chat URL
export const getChatUrl = () => {
  return getApiUrl(API_CONFIG.ENDPOINTS.CHAT);
};

// Helper function to get projects URL
export const getProjectsUrl = () => {
  return getApiUrl(API_CONFIG.ENDPOINTS.PROJECTS);
};

// Helper function to get histories URL
export const getHistoriesUrl = (projectPath: string) => {
  const encodedPath = encodeURIComponent(projectPath);
  return getApiUrl(
    `${API_CONFIG.ENDPOINTS.HISTORIES}/${encodedPath}/histories`,
  );
};

// Helper function to get conversation URL
export const getConversationUrl = (
  encodedProjectName: string,
  sessionId: string,
) => {
  return getApiUrl(
    `${API_CONFIG.ENDPOINTS.CONVERSATIONS}/${encodedProjectName}/histories/${sessionId}`,
  );
};

// Helper function to get mentions URL
export const getMentionsUrl = (cwd: string, query: string) => {
  const params = new URLSearchParams({ cwd });
  if (query) {
    params.append("query", query);
  }
  return getApiUrl(`${API_CONFIG.ENDPOINTS.MENTIONS}?${params.toString()}`);
};
