import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components";

interface LabelingErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface LabelingErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class LabelingErrorBoundary extends Component<
  LabelingErrorBoundaryProps,
  LabelingErrorBoundaryState
> {
  public state: LabelingErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Labeling workspace crashed", error, info);
  }

  render() {
    const { hasError, error } = this.state;
    if (hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-md bg-slate-100 p-4 text-center text-sm text-red-700">
            <p>Something went wrong while loading the labeling viewer.</p>
            {error?.message ? <p className="text-xs">{error.message}</p> : null}
            <Button
              style="primary"
              size="md"
              isMinWidth={true}
              onClick={() => {
                location.reload();
              }}
            >
              Go Back
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default LabelingErrorBoundary;
