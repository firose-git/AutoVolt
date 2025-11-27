import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TestTube, Database } from 'lucide-react';
import { integrationsAPI } from '@/services/api';
import { toast } from 'sonner';

interface DatabaseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  integration?: {
    id: string;
    name: string;
    type: string;
    config: {
      dbType: string;
      connectionString: string;
      query: string;
      updateInterval?: number;
      autoPublish?: boolean;
    };
  };
}

const DatabaseForm: React.FC<DatabaseFormProps> = ({ onSuccess, onCancel, integration }) => {
  const [formData, setFormData] = useState({
    name: '',
    dbType: '',
    connectionString: '',
    query: '',
    updateInterval: 60,
    autoPublish: true
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (integration) {
      setFormData({
        name: integration.name || '',
        dbType: integration.config?.dbType || '',
        connectionString: integration.config?.connectionString || '',
        query: integration.config?.query || '',
        updateInterval: integration.config?.updateInterval ?? 60,
        autoPublish: integration.config?.autoPublish ?? true
      });
    }
  }, [integration]);

  const dbTypes = [
    { value: 'mysql', label: 'MySQL', example: 'mysql://user:pass@host:3306/database' },
    { value: 'postgres', label: 'PostgreSQL', example: 'postgresql://user:pass@host:5432/database' },
    { value: 'mssql', label: 'SQL Server', example: 'mssql://user:pass@host:1433/database' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.dbType || !formData.connectionString.trim() || !formData.query.trim()) {
      toast.error('All fields are required');
      return;
    }

    try {
      setLoading(true);

      if (integration) {
        // Update existing database integration
        await integrationsAPI.database.update(integration.id, {
          name: formData.name,
          dbType: formData.dbType,
          connectionString: formData.connectionString,
          query: formData.query,
          updateInterval: formData.updateInterval,
          autoPublish: formData.autoPublish
        });
        toast.success('Database integration updated successfully');
      } else {
        // Create new database integration
        await integrationsAPI.database.create({
          name: formData.name,
          dbType: formData.dbType as 'mysql' | 'postgres' | 'mssql',
          connectionString: formData.connectionString,
          query: formData.query,
          updateInterval: formData.updateInterval,
          autoPublish: formData.autoPublish
        });
        toast.success('Database integration created successfully');
      }

      onSuccess?.();
    } catch (error) {
      console.error('Failed to save database integration:', error);
      toast.error(`Failed to ${integration ? 'update' : 'create'} database integration`);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!formData.dbType || !formData.connectionString.trim() || !formData.query.trim()) {
      toast.error('Database type, connection string, and query are required for testing');
      return;
    }

    try {
      setTesting(true);
      await integrationsAPI.database.test({
        dbType: formData.dbType,
        connectionString: formData.connectionString,
        query: formData.query
      });
      toast.success('Database connection and query test successful');
    } catch (error) {
      console.error('Failed to test database connection:', error);
      toast.error('Database connection or query test failed');
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

  const selectedDbType = dbTypes.find(db => db.value === formData.dbType);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          {integration ? 'Edit Database Integration' : 'Create Database Integration'}
        </CardTitle>
        <CardDescription>
          {integration
            ? 'Update your database connection and query configuration'
            : 'Connect to external databases to pull content and display it on your digital signage'
          }
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
                placeholder="e.g., CMS Database"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dbType">Database Type *</Label>
              <Select value={formData.dbType} onValueChange={(value) => updateFormData('dbType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select database type" />
                </SelectTrigger>
                <SelectContent>
                  {dbTypes.map((db) => (
                    <SelectItem key={db.value} value={db.value}>
                      {db.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="connectionString">Connection String *</Label>
            <Input
              id="connectionString"
              type="password"
              value={formData.connectionString}
              onChange={(e) => updateFormData('connectionString', e.target.value)}
              placeholder={selectedDbType?.example || "protocol://user:password@host:port/database"}
              required
            />
            <p className="text-sm text-muted-foreground">
              {selectedDbType ? `Example: ${selectedDbType.example}` : 'Select a database type to see connection string format'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="query">SQL Query *</Label>
            <Textarea
              id="query"
              value={formData.query}
              onChange={(e) => updateFormData('query', e.target.value)}
              placeholder="SELECT title, content, created_at FROM notices WHERE status = 'active'"
              rows={4}
              required
            />
            <p className="text-sm text-muted-foreground">
              Query should return columns that can be mapped to notice fields (title, content, etc.)
            </p>
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
                  {formData.autoPublish ? 'Automatically publish query results as notices' : 'Manually review query results before publishing'}
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
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
                Test Connection
              </Button>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              Database queries will be executed at the specified interval. Results will be processed and
              converted into notices for display. Ensure your query returns appropriate data for notice creation.
            </AlertDescription>
          </Alert>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Supported Database Types:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>MySQL:</strong> Standard MySQL/MariaDB connections</li>
              <li>• <strong>PostgreSQL:</strong> Full PostgreSQL support</li>
              <li>• <strong>SQL Server:</strong> Microsoft SQL Server and Azure SQL</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">Query Result Mapping:</h4>
            <p className="text-sm text-yellow-800 mb-2">
              Your query results will be automatically mapped to notice fields:
            </p>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• <code>title</code> → Notice title</li>
              <li>• <code>content</code> → Notice content</li>
              <li>• <code>priority</code> → Notice priority (normal/high/urgent)</li>
              <li>• <code>category</code> → Notice category</li>
              <li>• <code>expires_at</code> → Notice expiration date</li>
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
                integration ? 'Update Database Integration' : 'Create Database Integration'
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

export default DatabaseForm;