import { useEffect, useState } from "react";

export default function BackendAlert() {
  const [isVisible, setIsVisible] = useState(true); // DEBUG: set to true to test visibility
  const [_isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        setIsLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/`,
          {
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        // If we got a response, backend is alive
        if (response.ok) {
          setIsVisible(false);
        }
      } catch (error) {
        // Timeout or error means backend might be spinning up
        console.log("[ALERT] Backend unavailable or slow, showing alert");
        setIsVisible(true);
      } finally {
        setIsLoading(false);
      }
    };

    // Check on mount
    checkBackend();

    // Check every 30 seconds
    const interval = setInterval(checkBackend, 30000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-500/20 border-b border-yellow-500/40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="mt-1 flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400 animate-pulse"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1 pt-0.5">
            <h3 className="text-sm font-semibold text-yellow-400 mb-1">
              Backend Service Starting Up
            </h3>
            <p className="text-sm text-yellow-300">
              The prediction service is waking up (free tier spindown). Please{" "}
              <button
                onClick={() => window.location.reload()}
                className="underline font-semibold hover:text-yellow-100 transition-colors"
              >
                refresh this page
              </button>{" "}
              in 2-3 seconds. It may take up to 50 seconds to fully respond.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsVisible(false)}
          className="flex-shrink-0 text-yellow-300 hover:text-yellow-200 transition-colors pt-0.5"
          aria-label="Dismiss alert"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
