import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Rss, Twitter, Facebook, Instagram, Cloud, Webhook, Database, RefreshCw, Trash2, Edit, Play, Eye } from 'lucide-react';
import { integrationsAPI } from '@/services/api';
import { toast } from 'sonner';
import RSSFeedForm from '@/components/RSSFeedForm';
import SocialMediaForm from '@/components/SocialMediaForm';
import WeatherForm from '@/components/WeatherForm';
import WebhookForm from '@/components/WebhookForm';
import DatabaseForm from '@/components/DatabaseForm';

// Types
interface Integration {
  _id: string;
  type: 'rss' | 'social-media' | 'weather' | 'webhook' | 'database';
  name: string;
  status: 'active' | 'inactive' | 'error';
  lastFetched?: string;
  nextFetch?: string;
  createdAt: string;
  updatedAt: string;
  config: Record<string, unknown>;
}

interface RSSFeed extends Integration {
  type: 'rss';
  config: {
    url: string;
    updateInterval: number;
    maxItems: number;
    autoPublish: boolean;
  };
}

interface SocialMediaFeed extends Integration {
  type: 'social-media';
  config: {
    platform: 'instagram' | 'twitter' | 'facebook';
    accounts?: string[];
    hashtags?: string[];
    updateInterval: number;
    autoPublish: boolean;
  };
}

interface WeatherFeed extends Integration {
  type: 'weather';
  config: {
    location: string;
    units: 'metric' | 'imperial';
    updateInterval: number;
    autoPublish: boolean;
  };
}

interface WebhookFeed extends Integration {
  type: 'webhook';
  config: {
    webhookId: string;
    autoPublish: boolean;
  };
}

interface DatabaseFeed extends Integration {
  type: 'database';
  config: {
    dbType: 'mysql' | 'postgres' | 'mssql';
    updateInterval: number;
    autoPublish: boolean;
  };
}

const IntegrationsPage: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [integrationType, setIntegrationType] = useState<string>('');
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const response = await integrationsAPI.getAll();
      setIntegrations(response.data);
    } catch (error) {
      console.error('Failed to load integrations:', error);
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;

    try {
      await integrationsAPI.delete(id);
      setIntegrations(prev => prev.filter(i => i._id !== id));
      toast.success('Integration deleted successfully');
    } catch (error) {
      console.error('Failed to delete integration:', error);
      toast.error('Failed to delete integration');
    }
  };

  const handleFetch = async (integration: Integration) => {
    try {
      let response;
      switch (integration.type) {
        case 'rss':
          response = await integrationsAPI.rss.fetch(integration._id);
          break;
        case 'social-media':
          response = await integrationsAPI.socialMedia.fetch(integration._id);
          break;
        case 'weather':
          response = await integrationsAPI.weather.fetch(integration._id);
          break;
        case 'database':
          response = await integrationsAPI.database.fetch(integration._id);
          break;
        default:
          throw new Error('Unsupported integration type');
      }
      toast.success('Content fetched successfully');
      loadIntegrations(); // Refresh the list
    } catch (error) {
      console.error('Failed to fetch content:', error);
      toast.error('Failed to fetch content');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'rss':
        return <Rss className="h-4 w-4" />;
      case 'social-media':
        return <Twitter className="h-4 w-4" />;
      case 'weather':
        return <Cloud className="h-4 w-4" />;
      case 'webhook':
        return <Webhook className="h-4 w-4" />;
      case 'database':
        return <Database className="h-4 w-4" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'twitter':
        return <Twitter className="h-4 w-4 text-blue-500" />;
      case 'facebook':
        return <Facebook className="h-4 w-4 text-blue-600" />;
      case 'instagram':
        return <Instagram className="h-4 w-4 text-pink-500" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };

  const filteredIntegrations = integrations.filter(integration => {
    if (activeTab === 'all') return true;
    return integration.type === activeTab;
  });

  const IntegrationCard: React.FC<{ integration: Integration }> = ({ integration }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getTypeIcon(integration.type)}
            <CardTitle className="text-lg">{integration.name}</CardTitle>
          </div>
          {getStatusBadge(integration.status)}
        </div>
        <CardDescription>
          {integration.type === 'rss' && `URL: ${(integration as RSSFeed).config.url}`}
          {integration.type === 'social-media' && (
            <div className="flex items-center gap-2">
              {getPlatformIcon((integration as SocialMediaFeed).config.platform)}
              <span>{(integration as SocialMediaFeed).config.platform}</span>
            </div>
          )}
          {integration.type === 'weather' && `Location: ${(integration as WeatherFeed).config.location}`}
          {integration.type === 'webhook' && `Webhook ID: ${(integration as WebhookFeed).config.webhookId}`}
          {integration.type === 'database' && `Type: ${(integration as DatabaseFeed).config.dbType}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <span>Last fetched: {integration.lastFetched ? new Date(integration.lastFetched).toLocaleString() : 'Never'}</span>
          <span>Next fetch: {integration.nextFetch ? new Date(integration.nextFetch).toLocaleString() : 'N/A'}</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFetch(integration)}
            disabled={integration.status !== 'active'}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Fetch
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedIntegration(integration)}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedIntegration(integration);
              setIntegrationType(integration.type);
              setEditingIntegration(integration);
              setShowFormDialog(true);
            }}
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(integration._id)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Advanced Integrations</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage RSS feeds, social media, weather, webhooks, and database integrations
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Integration</DialogTitle>
              <DialogDescription>
                Choose the type of integration you want to create
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => {
                  setIntegrationType('rss');
                  setShowCreateDialog(false);
                  setShowFormDialog(true);
                }}
              >
                <Rss className="h-6 w-6" />
                RSS Feed
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => {
                  setIntegrationType('social-media');
                  setShowCreateDialog(false);
                  setShowFormDialog(true);
                }}
              >
                <Twitter className="h-6 w-6" />
                Social Media
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => {
                  setIntegrationType('weather');
                  setShowCreateDialog(false);
                  setShowFormDialog(true);
                }}
              >
                <Cloud className="h-6 w-6" />
                Weather
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => {
                  setIntegrationType('webhook');
                  setShowCreateDialog(false);
                  setShowFormDialog(true);
                }}
              >
                <Webhook className="h-6 w-6" />
                Webhook
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 col-span-2"
                onClick={() => {
                  setIntegrationType('database');
                  setShowCreateDialog(false);
                  setShowFormDialog(true);
                }}
              >
                <Database className="h-6 w-6" />
                Database
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="rss">RSS</TabsTrigger>
          <TabsTrigger value="social-media">Social</TabsTrigger>
          <TabsTrigger value="weather">Weather</TabsTrigger>
          <TabsTrigger value="webhook">Webhooks</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredIntegrations.length === 0 ? (
            <Alert>
              <AlertDescription>
                No {activeTab === 'all' ? '' : activeTab} integrations found. Click "Add Integration" to create your first one.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredIntegrations.map((integration) => (
                <IntegrationCard key={integration._id} integration={integration} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Integration Details Dialog */}
      <Dialog open={!!selectedIntegration} onOpenChange={() => setSelectedIntegration(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedIntegration && getTypeIcon(selectedIntegration.type)}
              {selectedIntegration?.name}
            </DialogTitle>
            <DialogDescription>
              Integration details and configuration
            </DialogDescription>
          </DialogHeader>
          {selectedIntegration && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedIntegration.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <div className="mt-1 capitalize">{selectedIntegration.type.replace('-', ' ')}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Created</label>
                  <div className="mt-1">{new Date(selectedIntegration.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Last Updated</label>
                  <div className="mt-1">{new Date(selectedIntegration.updatedAt).toLocaleString()}</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Configuration</label>
                <pre className="mt-1 p-3 bg-muted rounded-md text-sm overflow-auto">
                  {JSON.stringify(selectedIntegration.config, null, 2)}
                </pre>
              </div>

              {(selectedIntegration.lastFetched || selectedIntegration.nextFetch) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedIntegration.lastFetched && (
                    <div>
                      <label className="text-sm font-medium">Last Fetched</label>
                      <div className="mt-1">{new Date(selectedIntegration.lastFetched).toLocaleString()}</div>
                    </div>
                  )}
                  {selectedIntegration.nextFetch && (
                    <div>
                      <label className="text-sm font-medium">Next Fetch</label>
                      <div className="mt-1">{new Date(selectedIntegration.nextFetch).toLocaleString()}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Integration Form Dialog */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {integrationType === 'rss' && (
            <RSSFeedForm
              integration={editingIntegration}
              onSuccess={() => {
                setShowFormDialog(false);
                setIntegrationType('');
                setEditingIntegration(null);
                loadIntegrations();
              }}
              onCancel={() => {
                setShowFormDialog(false);
                setIntegrationType('');
                setEditingIntegration(null);
              }}
            />
          )}
          {integrationType === 'social-media' && (
            <SocialMediaForm
              integration={editingIntegration}
              onSuccess={() => {
                setShowFormDialog(false);
                setIntegrationType('');
                setEditingIntegration(null);
                loadIntegrations();
              }}
              onCancel={() => {
                setShowFormDialog(false);
                setIntegrationType('');
                setEditingIntegration(null);
              }}
            />
          )}
          {integrationType === 'weather' && (
            <WeatherForm
              integration={editingIntegration}
              onSuccess={() => {
                setShowFormDialog(false);
                setIntegrationType('');
                setEditingIntegration(null);
                loadIntegrations();
              }}
              onCancel={() => {
                setShowFormDialog(false);
                setIntegrationType('');
                setEditingIntegration(null);
              }}
            />
          )}
          {integrationType === 'webhook' && (
            <WebhookForm
              integration={editingIntegration}
              onSuccess={() => {
                setShowFormDialog(false);
                setIntegrationType('');
                setEditingIntegration(null);
                loadIntegrations();
              }}
              onCancel={() => {
                setShowFormDialog(false);
                setIntegrationType('');
                setEditingIntegration(null);
              }}
            />
          )}
          {integrationType === 'database' && (
            <DatabaseForm
              integration={editingIntegration}
              onSuccess={() => {
                setShowFormDialog(false);
                setIntegrationType('');
                setEditingIntegration(null);
                loadIntegrations();
              }}
              onCancel={() => {
                setShowFormDialog(false);
                setIntegrationType('');
                setEditingIntegration(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegrationsPage;