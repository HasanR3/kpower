import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("KPower UI error", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary" role="alert">
          <h1>Something went wrong</h1>
          <p>The monitoring UI hit an unexpected error. Telemetry may still be reachable via the HID bridge.</p>
          <pre className="error-boundary__detail">{this.state.error.message}</pre>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
          >
            Reload application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
