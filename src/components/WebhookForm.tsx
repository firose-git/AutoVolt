import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Copy, Webhook, ExternalLink, Loader2 } from 'lucide-react';
import { integrationsAPI } from '@/services/api';
import { toast } from 'sonner';

interface WebhookFormProps {
  integration?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const WebhookForm: React.FC<WebhookFormProps> = ({ integration, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    autoPublish: true
  });
  const [loading, setLoading] = useState(false);
  const [createdWebhook, setCreatedWebhook] = useState<{
    webhookId: string;
    webhookUrl: string;
    secret: string;
  } | null>(null);

  // Populate form data when editing an existing integration
  useEffect(() => {
    if (integration) {
      setFormData({
        name: integration.name || '',
        autoPublish: integration.config?.autoPublish ?? true
      });
      // For editing, we don't recreate the webhook, just show existing info
      if (integration.config?.webhookId) {
        setCreatedWebhook({
          webhookId: integration.config.webhookId,
          webhookUrl: integration.config.webhookUrl || '',
          secret: integration.config.secret || ''
        });
      }
    }
  }, [integration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Webhook name is required');
      return;
    }

    try {
      setLoading(true);

      if (integration) {
        // Update existing webhook
        await integrationsAPI.webhooks.update(integration.id, {
          name: formData.name,
          autoPublish: formData.autoPublish
        });
        toast.success('Webhook integration updated successfully');
      } else {
        // Create new webhook
        const response = await integrationsAPI.webhooks.create({
          name: formData.name,
          autoPublish: formData.autoPublish
        });

        // Extract webhook details from response
        const webhookData = response.data;
        setCreatedWebhook({
          webhookId: webhookData.config.webhookId,
          webhookUrl: `${window.location.origin}/webhooks/${webhookData.config.webhookId}`,
          secret: webhookData.config.secret
        });
        toast.success('Webhook integration created successfully');
      }

      onSuccess?.();
    } catch (error) {
      console.error('Failed to save webhook integration:', error);
      toast.error(`Failed to ${integration ? 'update' : 'create'} webhook integration`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const updateFormData = (field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (createdWebhook) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-green-500" />
            Webhook Created Successfully!
          </CardTitle>
          <CardDescription>
            Your webhook endpoint is ready to receive external data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertDescription>
              <strong>Important:</strong> Save the webhook secret securely. You'll need it to send authenticated requests.
              The secret will not be shown again.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input value={createdWebhook.webhookUrl} readOnly className="font-mono text-sm" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(createdWebhook.webhookUrl, 'Webhook URL')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(createdWebhook.webhookUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Webhook ID</Label>
              <div className="flex gap-2">
                <Input value={createdWebhook.webhookId} readOnly className="font-mono text-sm" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(createdWebhook.webhookId, 'Webhook ID')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Webhook Secret</Label>
              <div className="flex gap-2">
                <Input
                  value={createdWebhook.secret}
                  readOnly
                  type="password"
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(createdWebhook.secret, 'Webhook secret')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Include this secret in the <code>X-Webhook-Secret</code> header of your requests
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Usage Example:</h4>
            <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
{`curl -X POST "${createdWebhook.webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Secret: ${createdWebhook.secret}" \\
  -d '{
    "title": "Breaking News",
    "content": "Important announcement...",
    "priority": "high",
    "category": "news"
  }'`}
            </pre>
          </div>

          <div className="flex gap-4 pt-4">
            <Button onClick={() => setCreatedWebhook(null)}>
              Create Another Webhook
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          {integration ? 'Edit Webhook Integration' : 'Create Webhook Integration'}
        </CardTitle>
        <CardDescription>
          {integration
            ? 'Update your webhook endpoint configuration'
            : 'Create a webhook endpoint to receive real-time content from external systems'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Webhook Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              placeholder="e.g., CMS Content Updates"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="autoPublish">Auto Publish</Label>
            <div className="flex items-center space-x-2">
              <Switch
                id="autoPublish"
                checked={formData.autoPublish}
                onCheckedChange={(checked) => updateFormData('autoPublish', checked)}
              />
              <Label htmlFor="autoPublish" className="text-sm">
                {formData.autoPublish ? 'Automatically publish webhook data as notices' : 'Manually review webhook data before publishing'}
              </Label>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              Webhooks allow external systems to send content directly to your digital signage.
              Each webhook gets a unique URL and secret for secure communication.
            </AlertDescription>
          </Alert>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Webhook Features:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Secure authentication with webhook secrets</li>
              <li>• Automatic content validation and processing</li>
              <li>• Duplicate content detection</li>
              <li>• Real-time notice creation</li>
              <li>• Request logging and monitoring</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">Expected Payload Format:</h4>
            <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
{`{
  "title": "Notice Title",
  "content": "Notice content...",
  "priority": "normal|high|urgent",
  "category": "news|alert|info",
  "expiresAt": "2024-12-31T23:59:59Z",
  "metadata": {
    "source": "external-system",
    "author": "John Doe"
  }
}`}
            </pre>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {integration ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                integration ? 'Update Webhook' : 'Create Webhook'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default WebhookForm;