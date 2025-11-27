import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings as SettingsIcon,
  Zap,
  DollarSign,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Fan,
  Monitor,
  Activity,
  Plug
} from 'lucide-react';
import { apiService } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';

// Type for icon components
type IconComponent = React.ComponentType<{ className?: string }>;

// Icon mapping for device types
const iconMap: Record<string, IconComponent> = {
  'Lightbulb': Lightbulb,
  'Fan': Fan,
  'Monitor': Monitor,
  'Activity': Activity,
  'Plug': Plug,
  'Zap': Zap
};

// Helper function to get icon component from name
const getIconComponent = (iconName: string | IconComponent): IconComponent => {
  if (typeof iconName === 'string') {
    return iconMap[iconName] || Zap;
  }
  return iconName;
};

interface DeviceTypeConfig {
  type: string;
  name: string;
  icon: string | IconComponent;
  powerConsumption: number;
  unit: string;
}

interface PowerSettingsData {
  deviceTypes: DeviceTypeConfig[];
  electricityPrice: number; // Price per kWh in rupees
}

const PowerSettings: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { isAdmin, isSuperAdmin } = usePermissions();
  const [settings, setSettings] = useState<PowerSettingsData>({
    deviceTypes: [
      { type: 'relay', name: 'Relay Switch', icon: 'Zap', powerConsumption: 50, unit: 'W' },
      { type: 'light', name: 'LED Lights', icon: 'Lightbulb', powerConsumption: 40, unit: 'W' },
      { type: 'fan', name: 'HVAC Fans', icon: 'Fan', powerConsumption: 75, unit: 'W' },
      { type: 'outlet', name: 'Power Outlet', icon: 'Plug', powerConsumption: 100, unit: 'W' },
      { type: 'projector', name: 'Projector', icon: 'Monitor', powerConsumption: 200, unit: 'W' },
      { type: 'ac', name: 'Air Conditioner', icon: 'Activity', powerConsumption: 1500, unit: 'W' }
    ],
    electricityPrice: 7.5
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load current settings
  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get('/settings/power');
      if (response.data) {
        setSettings(response.data);
      }
    } catch (err) {
      console.error('Error loading power settings:', err);
      // Use default settings if API fails
      setError('Failed to load current settings. Using defaults.');
    } finally {
      setLoading(false);
    }
  };

  // Save settings
  const saveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      await apiService.post('/settings/power', settings);
      setSuccess(true);

      // Trigger backend reload immediately
      await apiService.post('/settings/power/reload');

      // Show success message briefly, then close modal
      setTimeout(() => {
        setSuccess(false);
        onClose(); // Close the modal after successful save
      }, 1500);
    } catch (err) {
      console.error('Error saving power settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Update device type power consumption
  const updateDevicePower = (type: string, powerConsumption: number) => {
    setSettings(prev => ({
      ...prev,
      deviceTypes: prev.deviceTypes.map(device =>
        device.type === type ? { ...device, powerConsumption } : device
      )
    }));
  };

  // Update electricity price
  const updateElectricityPrice = (price: number) => {
    setSettings(prev => ({
      ...prev,
      electricityPrice: price
    }));
  };

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  // Only allow admin/super-admin access
  if (!isAdmin && !isSuperAdmin) {
    return null;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <SettingsIcon className="h-5 w-5" />
                Power Consumption Settings
              </CardTitle>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadSettings}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                >
                  Close
                </Button>
              </div>
            </div>
            <CardDescription className="text-xs">
              Configure power consumption values for different device types and electricity pricing
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Status Messages */}
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Settings saved successfully!
                </AlertDescription>
              </Alert>
            )}

            {/* Electricity Price Setting */}
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  Electricity Price
                </CardTitle>
                <CardDescription>
                  Set the electricity rate per kWh in rupees
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="electricity-price" className="text-sm font-medium">
                      Price per kWh (₹)
                    </Label>
                    <Input
                      id="electricity-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={settings.electricityPrice}
                      onChange={(e) => updateElectricityPrice(parseFloat(e.target.value) || 0)}
                      className="mt-1"
                      placeholder="7.50"
                    />
                  </div>
                  <div className="flex items-end">
                    <Badge variant="outline" className="px-3 py-1">
                      ₹{settings.electricityPrice.toFixed(2)}/kWh
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  This rate will be used to calculate energy costs throughout the system
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Device Type Power Consumption */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-600" />
                Device Power Consumption
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {settings.deviceTypes.map((device) => {
                  const IconComponent = getIconComponent(device.icon);
                  return (
                    <Card key={device.type} className="border-muted">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-muted rounded-lg">
                            <IconComponent className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">{device.name}</h4>
                            <p className="text-xs text-muted-foreground">{device.type}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`power-${device.type}`} className="text-xs">
                            Power Consumption ({device.unit})
                          </Label>
                          <Input
                            id={`power-${device.type}`}
                            type="number"
                            min="0"
                            step={device.unit === 'W' ? '1' : '0.1'}
                            value={device.powerConsumption}
                            onChange={(e) => updateDevicePower(device.type, parseFloat(e.target.value) || 0)}
                            className="text-sm"
                          />
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">
                              Cost per hour: ₹{((device.powerConsumption / 1000) * settings.electricityPrice).toFixed(2)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {device.powerConsumption} {device.unit}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={saveSettings}
                disabled={saving}
                className="min-w-[120px]"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>

            {/* Info Section */}
            <Card className="bg-gray-50 dark:bg-gray-950/20 border-gray-200">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-amber-800 dark:text-amber-200">
                      Important Notes:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-300">
                      <li>Changes to power consumption values will affect all energy calculations and forecasts</li>
                      <li>Electricity price changes will immediately affect cost calculations across the system</li>
                      <li>Ensure power consumption values are accurate for your specific devices</li>
                      <li>These settings are only accessible to administrators</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PowerSettings;