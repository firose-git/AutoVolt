import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ExternalLink, RefreshCw, Maximize2, AlertCircle, Activity } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';

const ESP32GrafanaPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  // ESP32 Public Dashboard URL
  const esp32DashboardUrl = 'http://localhost:3000/public-dashboards/d62e6d4e83d8400085cb7b24db51c879';

  const handleRefresh = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
    setTimeout(() => setIsLoading(false), 2000);
  };

  const handleOpenExternal = () => {
    window.open(esp32DashboardUrl, '_blank', 'noopener,noreferrer');
  };

  const handleFullscreen = () => {
    if (iframeRef.current) {
      if (iframeRef.current.requestFullscreen) {
        iframeRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">ESP32 IoT Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Real-time monitoring and analytics for ESP32-based IoT devices
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="default" className="flex items-center gap-2">
            <Activity className="w-3 h-3" />
            ESP32 Monitoring
          </Badge>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleFullscreen}
            variant="outline"
            size="sm"
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            Fullscreen
          </Button>
          <Button
            onClick={handleOpenExternal}
            variant="outline"
            size="sm"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open External
          </Button>
        </div>
      </div>

      <Alert className="mb-6">
        <Activity className="h-4 w-4" />
        <AlertTitle>ESP32 Public Dashboard</AlertTitle>
        <AlertDescription>
          This dashboard provides real-time monitoring of ESP32 IoT devices, including sensor data,
          device status, and performance metrics. The dashboard is publicly accessible and embedded here for convenience.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>ESP32 Device Monitoring</CardTitle>
          <CardDescription>
            Comprehensive real-time monitoring of ESP32-based IoT devices and sensors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-gray-50 min-h-[800px] relative">
            <iframe
              ref={iframeRef}
              src={esp32DashboardUrl}
              width="100%"
              height="800"
              frameBorder="0"
              title="ESP32 Grafana Dashboard"
              className="rounded"
              allow="fullscreen"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
            />
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Device Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">ESP32 devices online</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Sensor Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <span className="text-sm">Real-time metrics</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Data Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-sm">Prometheus connected</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ESP32GrafanaPage;