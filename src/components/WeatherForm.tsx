import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TestTube, Cloud } from 'lucide-react';
import { integrationsAPI } from '@/services/api';
import { toast } from 'sonner';

interface WeatherFormProps {
  integration?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const WeatherForm: React.FC<WeatherFormProps> = ({ integration, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    apiKey: '',
    location: '',
    units: 'metric',
    updateInterval: 60,
    autoPublish: true
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  // Populate form data when editing an existing integration
  useEffect(() => {
    if (integration) {
      setFormData({
        name: integration.name || '',
        apiKey: integration.config?.apiKey || '',
        location: integration.config?.location || '',
        units: integration.config?.units || 'metric',
        updateInterval: integration.config?.updateInterval || 60,
        autoPublish: integration.config?.autoPublish ?? true
      });
    }
  }, [integration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.apiKey.trim() || !formData.location.trim()) {
      toast.error('Name, API key, and location are required');
      return;
    }

    try {
      setLoading(true);
      const integrationData = {
        name: formData.name,
        apiKey: formData.apiKey,
        location: formData.location,
        units: formData.units as 'metric' | 'imperial',
        updateInterval: formData.updateInterval,
        autoPublish: formData.autoPublish
      };

      if (integration) {
        // Update existing integration
        await integrationsAPI.weather.update(integration._id, integrationData);
        toast.success('Weather integration updated successfully');
      } else {
        // Create new integration
        await integrationsAPI.weather.create(integrationData);
        toast.success('Weather integration created successfully');
      }
      onSuccess?.();
    } catch (error) {
      console.error('Failed to save weather integration:', error);
      toast.error(`Failed to ${integration ? 'update' : 'create'} weather integration`);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!formData.apiKey.trim() || !formData.location.trim()) {
      toast.error('API key and location are required for testing');
      return;
    }

    try {
      setTesting(true);
      // Test the OpenWeatherMap API
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(formData.location)}&appid=${formData.apiKey}&units=${formData.units}`
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(`Weather API test successful: ${data.weather[0].description} in ${data.name}`);
      } else if (response.status === 401) {
        toast.error('Invalid API key');
      } else if (response.status === 404) {
        toast.error('Location not found');
      } else {
        toast.error('Weather API test failed');
      }
    } catch (error) {
      console.error('Failed to test weather API:', error);
      toast.error('Failed to test weather API connection');
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

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          {integration ? 'Edit' : 'Create'} Weather Integration
        </CardTitle>
        <CardDescription>
          {integration ? 'Update' : 'Display'} local weather information and severe weather alerts on your digital signage
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
                placeholder="e.g., Campus Weather Display"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => updateFormData('location', e.target.value)}
                placeholder="e.g., New York, NY or London, UK"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">OpenWeatherMap API Key *</Label>
            <div className="flex gap-2">
              <Input
                id="apiKey"
                type="password"
                value={formData.apiKey}
                onChange={(e) => updateFormData('apiKey', e.target.value)}
                placeholder="Enter your OpenWeatherMap API key"
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
              Get your free API key from{' '}
              <a
                href="https://openweathermap.org/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                OpenWeatherMap
              </a>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="units">Units</Label>
              <Select value={formData.units} onValueChange={(value) => updateFormData('units', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="metric">Metric (°C)</SelectItem>
                  <SelectItem value="imperial">Imperial (°F)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="updateInterval">Update Interval (minutes)</Label>
              <Input
                id="updateInterval"
                type="number"
                min="30"
                max="1440"
                value={formData.updateInterval}
                onChange={(e) => updateFormData('updateInterval', parseInt(e.target.value))}
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

          <Alert>
            <AlertDescription>
              Weather data will be automatically fetched and displayed as notices. Severe weather alerts will be prioritized
              and displayed prominently. Weather updates help keep your audience informed about current conditions.
            </AlertDescription>
          </Alert>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Weather Display Features:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Current temperature, humidity, and conditions</li>
              <li>• 5-day weather forecast</li>
              <li>• Severe weather alerts and warnings</li>
              <li>• Wind speed and direction</li>
              <li>• Sunrise/sunset times</li>
            </ul>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {integration ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                `${integration ? 'Update' : 'Create'} Weather Integration`
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

export default WeatherForm;