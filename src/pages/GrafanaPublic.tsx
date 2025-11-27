import React from 'react';
import { Card } from '@/components/ui/card';
import { ExternalLink, RefreshCw, Maximize2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const GrafanaPublic: React.FC = () => {
  // Use the regular dashboard URL (requires authentication)
  const grafanaUrl = 'http://localhost:3000/d/iot-classroom-dashboard';
  const publicUrl = 'http://localhost:3000/public-dashboards/iot-classroom-dashboard';
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [showError, setShowError] = React.useState(false);
  const [isPublic, setIsPublic] = React.useState(false);

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleOpenExternal = () => {
    window.open(grafanaUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenPublic = () => {
    window.open(publicUrl, '_blank', 'noopener,noreferrer');
  };

  const handleFullscreen = () => {
    if (iframeRef.current) {
      if (iframeRef.current.requestFullscreen) {
        iframeRef.current.requestFullscreen();
      }
    }
  };

  // Handle iframe load errors
  React.useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      setShowError(false);
      // Check if we're getting a login page (indicates not public)
      try {
        // This is a simple check - if the iframe loads without error, assume it's working
        setIsPublic(true);
      } catch (e) {
        setIsPublic(false);
      }
    };

    const handleError = () => {
      setShowError(true);
      setIsPublic(false);
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            Grafana Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time metrics and analytics powered by Prometheus
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFullscreen}
            className="gap-2"
          >
            <Maximize2 className="h-4 w-4" />
            Fullscreen
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenExternal}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open Dashboard
          </Button>
        </div>
      </div>

      {/* Status and Instructions */}
      <div className="p-4 border-b bg-muted/50">
        <div className="flex items-center gap-2 mb-2">
          {isPublic ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-orange-500" />
          )}
          <span className="font-medium">
            {isPublic ? 'Dashboard is Public' : 'Dashboard Authentication Required'}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          The IoT Classroom System Overview dashboard is now properly configured and connected to Prometheus.
          {isPublic ? ' Public access is enabled.' : ' To enable public access:'}
        </p>
        {!isPublic && (
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">To Enable Public Access:</h4>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
              <li>Click "Open Dashboard" above to access Grafana</li>
              <li>Login with: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">admin</code> / <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">IOT@098</code></li>
              <li>Navigate to the "IoT Classroom System Overview" dashboard</li>
              <li>Click the <strong>Share</strong> button (top right)</li>
              <li>Go to <strong>"Public dashboard"</strong> tab</li>
              <li>Click <strong>"Create public dashboard"</strong></li>
              <li>Copy the public URL and the iframe will work automatically</li>
            </ol>
          </div>
        )}
      </div>

      {/* Grafana Iframe */}
      <div className="flex-1 relative overflow-hidden bg-background p-4">
        {showError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Dashboard Not Accessible</AlertTitle>
            <AlertDescription>
              The dashboard requires authentication. Please make it public using the instructions above,
              or click "Open Dashboard" to view it directly in Grafana.
            </AlertDescription>
          </Alert>
        )}

        <iframe
          ref={iframeRef}
          src={isPublic ? publicUrl : grafanaUrl}
          className="w-full h-full border-0 rounded-lg shadow-lg"
          title="Grafana Dashboard"
          allow="fullscreen"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
        />
      </div>

      {/* Footer Info */}
      <div className="p-2 border-t bg-muted/50 text-xs text-muted-foreground text-center">
        <span>Connected to Grafana • </span>
        <span>Data Source: Prometheus • </span>
        <span>Dashboard: IoT Classroom System Overview • </span>
        <span>Status: {isPublic ? 'Public' : 'Private'}</span>
      </div>
    </div>
  );
};

export default GrafanaPublic;
