import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Mail } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Keep the error visible in dev tools and any connected error-monitoring tool.
    console.error("[ErrorBoundary] Uncaught error:", error);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "Something went wrong";
      const reportSubject = encodeURIComponent("App error report");
      const reportBody = encodeURIComponent(
        `I encountered an error while using the app.\n\nError message: ${errorMessage}\n\nPlease describe what you were doing when the error occurred:`
      );
      const mailtoHref = `mailto:support@trade2connect.lovable.app?subject=${reportSubject}&body=${reportBody}`;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Oops, something went wrong
              </h1>
              <p className="text-muted-foreground">
                We're sorry — an unexpected error occurred. Our team has been notified (if error monitoring is connected), and the details are available in your browser's console.
              </p>
            </div>

            {process.env.NODE_ENV === "development" && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-left">
                <p className="text-sm font-medium text-destructive">Error details</p>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs text-foreground/80">
                  {errorMessage}
                </pre>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button onClick={this.handleReload} className="gap-2">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Reload page
              </Button>

              <Button asChild variant="outline" className="gap-2">
                <a href={mailtoHref}>
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Report issue
                </a>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
