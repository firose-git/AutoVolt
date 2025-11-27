import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TestTube } from 'lucide-react';
import { integrationsAPI } from '@/services/api';
import { toast } from 'sonner';

interface RSSFeedFormProps {
  integration?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const RSSFeedForm: React.FC<RSSFeedFormProps> = ({ integration, onSuccess, onCancel }) => {
  const isEditing = !!integration;
  
  const [formData, setFormData] = useState({
    name: integration?.name || '',
    url: integration?.config?.url || '',
    updateInterval: integration?.config?.updateInterval || 30,
    maxItems: integration?.config?.maxItems || 10,
    autoPublish: integration?.config?.autoPublish ?? true,
    filters: {
      keywords: integration?.config?.filters?.keywords || '',
      excludeKeywords: integration?.config?.filters?.excludeKeywords || '',
      categories: integration?.config?.filters?.categories || ''
    }
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.url.trim()) {
      toast.error('Name and URL are required');
      return;
    }

    try {
      setLoading(true);
      if (isEditing) {
        await integrationsAPI.rss.update(integration._id, {
          name: formData.name,
          url: formData.url,
          updateInterval: formData.updateInterval,
          maxItems: formData.maxItems,
          autoPublish: formData.autoPublish,
          filters: formData.filters
        });
        toast.success('RSS feed updated successfully');
      } else {
        await integrationsAPI.rss.create({
          name: formData.name,
          url: formData.url,
          updateInterval: formData.updateInterval,
          maxItems: formData.maxItems,
          autoPublish: formData.autoPublish,
          filters: formData.filters
        });
        toast.success('RSS feed created successfully');
      }
      onSuccess?.();
    } catch (error) {
      console.error(`Failed to ${isEditing ? 'update' : 'create'} RSS feed:`, error);
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} RSS feed`);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!formData.url.trim()) {
      toast.error('URL is required for testing');
      return;
    }

    try {
      setTesting(true);
      // Test the RSS feed URL by making a request
      const response = await fetch(formData.url);
      if (response.ok) {
        toast.success('RSS feed URL is valid');
      } else {
        toast.error('RSS feed URL is not accessible');
      }
    } catch (error) {
      console.error('Failed to test RSS feed:', error);
      toast.error('Failed to test RSS feed URL');
    } finally {
      setTesting(false);
    }
  };

  const updateFormData = (field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateFilters = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [field]: value
      }
    }));
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit RSS Feed Integration' : 'Create RSS Feed Integration'}</CardTitle>
        <CardDescription>
          {isEditing ? 'Update the RSS feed configuration' : 'Configure an RSS feed to automatically fetch and publish content as notices'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Feed Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateFormData('name', e.target.value)}
                placeholder="e.g., Company News Feed"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">RSS Feed URL *</Label>
              <div className="flex gap-2">
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => updateFormData('url', e.target.value)}
                  placeholder="https://example.com/feed.xml"
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

            <div className="space-y-2">
              <Label htmlFor="maxItems">Max Items per Fetch</Label>
              <Input
                id="maxItems"
                type="number"
                min="1"
                max="50"
                value={formData.maxItems}
                onChange={(e) => updateFormData('maxItems', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="autoPublish">Auto Publish</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="autoPublish"
                  checked={formData.autoPublish}
                  onCheckedChange={(checked) => updateFormData('autoPublish', checked)}
                />
                <Label htmlFor="autoPublish" className="text-sm">
                  {formData.autoPublish ? 'Enabled' : 'Disabled'}
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Content Filters (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="keywords">Include Keywords</Label>
                <Textarea
                  id="keywords"
                  value={formData.filters.keywords}
                  onChange={(e) => updateFilters('keywords', e.target.value)}
                  placeholder="Comma-separated keywords to include"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="excludeKeywords">Exclude Keywords</Label>
                <Textarea
                  id="excludeKeywords"
                  value={formData.filters.excludeKeywords}
                  onChange={(e) => updateFilters('excludeKeywords', e.target.value)}
                  placeholder="Comma-separated keywords to exclude"
                  rows={2}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categories">Categories</Label>
              <Input
                id="categories"
                value={formData.filters.categories}
                onChange={(e) => updateFilters('categories', e.target.value)}
                placeholder="Comma-separated categories"
              />
            </div>
          </div>

          <Alert>
            <AlertDescription>
              Content that matches the filters will be automatically published as notices on your digital signage boards.
              You can review and approve notices before they are displayed.
            </AlertDescription>
          </Alert>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditing ? 'Update RSS Feed' : 'Create RSS Feed'
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

export default RSSFeedForm;