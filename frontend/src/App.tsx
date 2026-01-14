import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { ProjectSelector } from "./components/ProjectSelector";
import { ChatPage } from "./components/ChatPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SettingsProvider } from "./contexts/SettingsContext";
import { isDevelopment, getBasePath } from "./utils/environment";

// Lazy load DemoPage only in development
const DemoPage = isDevelopment()
  ? lazy(() =>
      import("./components/DemoPage").then((module) => ({
        default: module.DemoPage,
      })),
    )
  : null;

function App() {
  const basePath = getBasePath();
  // Remove trailing slash for basename (React Router expects no trailing slash)
  const basename = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;

  return (
    <SettingsProvider>
      <ErrorBoundary>
        <Router basename={basename}>
          <Routes>
            <Route path="/" element={<ProjectSelector />} />
            <Route path="/projects/*" element={<ChatPage />} />
            {DemoPage && (
              <Route
                path="/demo"
                element={
                  <Suspense fallback={<div>Loading demo...</div>}>
                    <DemoPage />
                  </Suspense>
                }
              />
            )}
          </Routes>
        </Router>
      </ErrorBoundary>
    </SettingsProvider>
  );
}

export default App;
