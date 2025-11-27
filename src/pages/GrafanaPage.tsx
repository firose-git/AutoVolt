import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Activity, RefreshCw, ExternalLink, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GrafanaPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // ESP32 Public Dashboard URL (updated to provisioned dashboard UID)
  const esp32DashboardUrl = 'http://localhost:3000/public-dashboards/d62e6d4e83d8400085cb7b24db51c879';

  const goBack = () => {
    navigate(-1); // Go back to previous page
  };

  const refreshDashboard = () => {
    setIsLoading(true);
    // Force iframe refresh
    const iframe = document.getElementById('grafana-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = iframe.src;
    }
    setTimeout(() => setIsLoading(false), 2000);
  };

  const openExternal = () => {
    window.open(esp32DashboardUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className='fixed inset-0 bg-background z-50'>
      {/* Header */}
      <div className='flex items-center justify-between p-4 border-b bg-card'>
        <div className='flex items-center gap-3'>
          <Button
            onClick={goBack}
            variant='ghost'
            size='sm'
            className='mr-2'
          >
            <ArrowLeft className='h-4 w-4 mr-2' />
            Back
          </Button>
          <Activity className='h-6 w-6 text-primary' />
          <div>
            <h1 className='text-xl font-bold'>Grafana Dashboard</h1>
            <p className='text-sm text-muted-foreground'>
              ESP32 IoT Device Monitoring & Analytics
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            onClick={refreshDashboard}
            disabled={isLoading}
            variant='outline'
            size='sm'
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={openExternal}
            variant='outline'
            size='sm'
          >
            <ExternalLink className='h-4 w-4 mr-2' />
            Open External
          </Button>
        </div>
      </div>

      {/* Full Screen Dashboard */}
      <div className='flex-1 h-[calc(100vh-80px)]'>
        <iframe
          id='grafana-iframe'
          src={esp32DashboardUrl}
          width='100%'
          height='100%'
          frameBorder='0'
          title='ESP32 Grafana Dashboard'
          className='w-full h-full'
          allow='fullscreen'
          onError={(e) => {
            console.warn('Grafana dashboard failed to load. This is expected if dashboard is not configured yet.');
          }}
        />
      </div>
    </div>
  );
};

export default GrafanaPage;
