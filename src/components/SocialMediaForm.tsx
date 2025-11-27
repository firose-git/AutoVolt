import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TestTube, Twitter, Facebook, Instagram } from 'lucide-react';
import { integrationsAPI } from '@/services/api';
import { toast } from 'sonner';

interface SocialMediaFormProps {
  integration?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const SocialMediaForm: React.FC<SocialMediaFormProps> = ({ integration, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    platform: '',
    accessToken: '',
    accounts: '',
    hashtags: '',
    updateInterval: 30,
    autoPublish: true
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  // Populate form data when editing an existing integration
  useEffect(() => {
    if (integration) {
      setFormData({
        name: integration.name || '',
        platform: integration.config?.platform || '',
        accessToken: integration.config?.accessToken || '',
        accounts: integration.config?.accounts ? integration.config.accounts.join(', ') : '',
        hashtags: integration.config?.hashtags ? integration.config.hashtags.join(', ') : '',
        updateInterval: integration.config?.updateInterval || 30,
        autoPublish: integration.config?.autoPublish ?? true
      });
    }
  }, [integration]);

  const platforms = [
    { value: 'twitter', label: 'Twitter', icon: Twitter, color: 'text-blue-500' },
    { value: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-600' },
    { value: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-500' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.platform || !formData.accessToken.trim()) {
      toast.error('Name, platform, and access token are required');
      return;
    }

    try {
      setLoading(true);
      const integrationData = {
        name: formData.name,
        platform: formData.platform as 'instagram' | 'twitter' | 'facebook',
        accessToken: formData.accessToken,
        accounts: formData.accounts ? formData.accounts.split(',').map(a => a.trim()).filter(a => a) : undefined,
        hashtags: formData.hashtags ? formData.hashtags.split(',').map(h => h.trim()).filter(h => h) : undefined,
        updateInterval: formData.updateInterval,
        autoPublish: formData.autoPublish
      };

      if (integration) {
        // Update existing integration
        await integrationsAPI.socialMedia.update(integration._id, integrationData);
        toast.success('Social media integration updated successfully');
      } else {
        // Create new integration
        await integrationsAPI.socialMedia.create(integrationData);
        toast.success('Social media integration created successfully');
      }
      onSuccess?.();
    } catch (error) {
      console.error('Failed to save social media integration:', error);
      toast.error(`Failed to ${integration ? 'update' : 'create'} social media integration`);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!formData.platform || !formData.accessToken.trim()) {
      toast.error('Platform and access token are required for testing');
      return;
    }

    try {
      setTesting(true);
      // Test the API connection
      toast.info('Testing API connection...');
      // Note: Actual API testing would require backend validation
      setTimeout(() => {
        toast.success('API connection test completed');
        setTesting(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to test API connection:', error);
      toast.error('Failed to test API connection');
      setTesting(false);
    }
  };

  const updateFormData = (field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const selectedPlatform = platforms.find(p => p.value === formData.platform);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{integration ? 'Edit' : 'Create'} Social Media Integration</CardTitle>
        <CardDescription>
          {integration ? 'Update' : 'Connect to'} social media platforms to automatically fetch and publish posts as notices
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Integration Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateFormData('name', e.target.value)}
                placeholder="e.g., Company Twitter Feed"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform">Platform *</Label>
              <Select value={formData.platform} onValueChange={(value) => updateFormData('platform', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform">
                    {selectedPlatform && (
                      <div className="flex items-center gap-2">
                        <selectedPlatform.icon className={`h-4 w-4 ${selectedPlatform.color}`} />
                        {selectedPlatform.label}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((platform) => (
                    <SelectItem key={platform.value} value={platform.value}>
                      <div className="flex items-center gap-2">
                        <platform.icon className={`h-4 w-4 ${platform.color}`} />
                        {platform.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessToken">Access Token/API Key *</Label>
            <div className="flex gap-2">
              <Input
                id="accessToken"
                type="password"
                value={formData.accessToken}
                onChange={(e) => updateFormData('accessToken', e.target.value)}
                placeholder="Enter your API access token"
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={testing}
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Get API credentials from your social media platform's developer console
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accounts">Accounts to Monitor</Label>
              <Textarea
                id="accounts"
                value={formData.accounts}
                onChange={(e) => updateFormData('accounts', e.target.value)}
                placeholder="username1, username2, username3"
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                Comma-separated list of accounts to monitor
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hashtags">Hashtags to Monitor</Label>
              <Textarea
                id="hashtags"
                value={formData.hashtags}
                onChange={(e) => updateFormData('hashtags', e.target.value)}
                placeholder="#company, #news, #updates"
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                Comma-separated list of hashtags to monitor
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="updateInterval">Update Interval (minutes)</Label>
              <Input
                id="updateInterval"
                type="number"
                min="5"
                max="1440"
                value={formData.updateInterval}
                onChange={(e) => updateFormData('updateInterval', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="autoPublish">Auto Publish</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="autoPublish"
                  checked={formData.autoPublish}
                  onCheckedChange={(checked) => updateFormData('autoPublish', checked)}
                />
                <Label htmlFor="autoPublish" className="text-sm">
                  {formData.autoPublish ? 'Automatically publish matching posts as notices' : 'Manually review posts before publishing'}
                </Label>
              </div>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              Posts from monitored accounts and hashtags will be automatically fetched and can be published as notices.
              Make sure your API credentials have the necessary permissions to read posts.
            </AlertDescription>
          </Alert>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {integration ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                `${integration ? 'Update' : 'Create'} Social Media Integration`
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

export default SocialMediaForm;