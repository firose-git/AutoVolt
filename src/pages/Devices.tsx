import React, { useState, useEffect, useMemo } from 'react';
import { Switch as ToggleSwitch } from '@/components/ui/switch';
import DeviceCard from '@/components/DeviceCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Settings,
  Power
} from 'lucide-react';
import { useDevices } from '@/hooks/useDevices';
import { useToast } from '@/hooks/use-toast';
import { DeviceConfigDialog } from '@/components/DeviceConfigDialog';
import DeleteDeviceDialog from '@/components/DeleteDeviceDialog';
import { Device } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useSocketConnection, useDeviceNotifications } from '@/hooks/useSocket';
import { DevicesSkeleton } from '@/components/skeletons';

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'online' | 'offline' | 'warning';
type GroupBy = 'none' | 'classroom' | 'location' | 'status';
type SortBy = 'name' | 'status' | 'lastSeen' | 'classroom' | 'location';
type SortOrder = 'asc' | 'desc';

const Devices = () => {
  // Existing state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingDeviceId, setDeletingDeviceId] = useState<string | null>(null);
  const { devices, toggleSwitch, updateDevice, deleteDevice, addDevice } = useDevices();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';
  const { toast } = useToast();
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | undefined>(undefined);

  // Enhanced state for improvements
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Socket.IO hooks
  const { isConnected, connectionError } = useSocketConnection();
  const { notifications } = useDeviceNotifications();

  // Update connection status based on socket connection
  const connectionStatus = isConnected ? 'connected' : connectionError ? 'disconnected' : 'connecting';

  // Update last update time when receiving real-time notifications
  useEffect(() => {
    if (notifications.length > 0) {
      setLastUpdate(new Date());
    }
  }, [notifications]);

  // Show toast notifications for real-time device events
  useEffect(() => {
    if (notifications.length > 0) {
      const latestNotification = notifications[0];
      toast({
        title: "Device Update",
        description: latestNotification.message,
        duration: 3000,
      });
    }
  }, [notifications, toast]);

  // Filtered, sorted and grouped devices with optimized dependencies
  const filteredAndGroupedDevices = useMemo(() => {
    if (!devices) return { groups: [], totalCount: 0 };

    // Filter devices
    const filtered = devices.filter(device => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.macAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.classroom?.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'online' && device.status === 'online') ||
        (statusFilter === 'offline' && device.status === 'offline') ||
        (statusFilter === 'warning' && device.status === 'offline');

      return matchesSearch && matchesStatus;
    });

    // Sort filtered devices
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'status':
          aValue = a.status === 'online' ? 1 : 0;
          bValue = b.status === 'online' ? 1 : 0;
          break;
        case 'lastSeen':
          aValue = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
          bValue = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
          break;
        case 'classroom':
          aValue = a.classroom || '';
          bValue = b.classroom || '';
          break;
        case 'location':
          aValue = a.location || '';
          bValue = b.location || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Group devices
    const groups: { key: string; label: string; devices: Device[]; count: number }[] = [];

    if (groupBy === 'none') {
      groups.push({
        key: 'all',
        label: 'All Devices',
        devices: sorted,
        count: sorted.length
      });
    } else if (groupBy === 'status') {
      const statusGroups = {
        online: sorted.filter(d => d.status === 'online'),
        offline: sorted.filter(d => d.status === 'offline')
      };

      Object.entries(statusGroups).forEach(([status, devices]) => {
        if (devices.length > 0) {
          groups.push({
            key: status,
            label: `${status.charAt(0).toUpperCase() + status.slice(1)} Devices`,
            devices,
            count: devices.length
          });
        }
      });
    } else if (groupBy === 'classroom') {
      const classroomMap = new Map<string, Device[]>();
      sorted.forEach(device => {
        const key = device.classroom || 'No Classroom';
        if (!classroomMap.has(key)) {
          classroomMap.set(key, []);
        }
        classroomMap.get(key)!.push(device);
      });

      classroomMap.forEach((devices, classroom) => {
        groups.push({
          key: classroom,
          label: classroom,
          devices,
          count: devices.length
        });
      });
    } else if (groupBy === 'location') {
      const locationMap = new Map<string, Device[]>();
      sorted.forEach(device => {
        const key = device.location || 'No Location';
        if (!locationMap.has(key)) {
          locationMap.set(key, []);
        }
        locationMap.get(key)!.push(device);
      });

      locationMap.forEach((devices, location) => {
        groups.push({
          key: location,
          label: location,
          devices,
          count: devices.length
        });
      });
    }

    return { groups, totalCount: sorted.length };
  }, [devices, searchQuery, statusFilter, groupBy, sortBy, sortOrder]);

  const handleToggleSwitch = async (deviceId: string, switchId: string) => {
    try {
      await toggleSwitch(deviceId, switchId);
      toast({
        title: "Success",
        description: "Switch toggled successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle switch",
        variant: "destructive"
      });
    }
  };

  const handleUpdateDevice = async (deviceId: string, data: Partial<Device>) => {
    try {
      await updateDevice(deviceId, data);
      // Update the selectedDevice state with the updated device data
      const updatedDevice = devices.find(d => d.id === deviceId);
      if (updatedDevice) {
        setSelectedDevice({ ...updatedDevice }); // Create a new object to trigger re-render
      }
      toast({
        title: "Success",
        description: "Device updated successfully"
      });
      setShowConfigDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update device",
        variant: "destructive"
      });
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    setDeletingDeviceId(deviceId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteDevice = async () => {
    if (!deletingDeviceId) return;
    try {
      await deleteDevice(deletingDeviceId);
      toast({
        title: "Success",
        description: "Device deleted successfully"
      });
      setShowDeleteDialog(false);
      setDeletingDeviceId(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete device",
        variant: "destructive"
      });
    }
  };

  const handleAddDevice = async (deviceData: Device) => {
    try {
      const result = await addDevice(deviceData);
      toast({
        title: "Success",
        description: "Device added successfully"
      });

      // Show device secret if available
      if (result.deviceSecret) {
        toast({
          title: "Device Secret Key",
          description: `Secret: ${result.deviceSecret}`,
          duration: 10000, // Show for 10 seconds
        });
        // Also log to console for easy copying
        console.log('Device Secret Key:', result.deviceSecret);
      }

      setShowConfigDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add device",
        variant: "destructive"
      });
    }
  };

  if (!devices) {
    return <DevicesSkeleton />;
  }





  return (
    <>
      <DeleteDeviceDialog
        open={showDeleteDialog}
        onOpenChange={(open) => { setShowDeleteDialog(open); if (!open) setDeletingDeviceId(null); }}
        onConfirm={confirmDeleteDevice}
        loading={false}
        deviceName={devices.find(d => d.id === deletingDeviceId)?.name || ''}
      />

      <div className="container mx-auto py-6 px-4 sm:px-6">
        {/* Header with Connection Status */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Devices</h1>
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' && <Wifi className="w-4 h-4 text-green-500" />}
              {connectionStatus === 'connecting' && <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />}
              {connectionStatus === 'disconnected' && <WifiOff className="w-4 h-4 text-red-500" />}
              <Badge
                variant={connectionStatus === 'connected' ? 'default' : 'secondary'}
                className={`text-xs ${connectionStatus === 'connected'
                    ? 'bg-green-500/10 text-green-700'
                    : connectionStatus === 'connecting'
                      ? 'bg-yellow-500/10 text-yellow-700'
                      : 'bg-red-500/10 text-red-700'
                  }`}
              >
                {connectionStatus === 'connected' ? 'Live' :
                  connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
              </Badge>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>

        {/* Device Statistics */}
        {devices && devices.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Devices</p>
                  <p className="text-2xl font-bold">{devices.length}</p>
                </div>
                <Settings className="w-8 h-8 text-muted-foreground" />
              </div>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Online</p>
                  <p className="text-2xl font-bold text-green-600">
                    {devices.filter(d => d.status === 'online').length}
                  </p>
                </div>
                <Wifi className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Offline</p>
                  <p className="text-2xl font-bold text-red-600">
                    {devices.filter(d => d.status === 'offline').length}
                  </p>
                </div>
                <WifiOff className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Switches</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {devices.reduce((acc, device) => acc + device.switches.filter(s => s.state).length, 0)}
                  </p>
                </div>
                <Power className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search devices by name, MAC, location, or classroom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters and Controls */}
          <div className="flex flex-wrap gap-2 items-center">

            <Select value={statusFilter} onValueChange={(value: FilterStatus) => setStatusFilter(value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="warning">Warnings</SelectItem>
              </SelectContent>
            </Select>

            <Select value={groupBy} onValueChange={(value: GroupBy) => setGroupBy(value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Group by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Grouping</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="classroom">Classroom</SelectItem>
                <SelectItem value="location">Location</SelectItem>
              </SelectContent>
            </Select>

            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value: string) => {
              const [newSortBy, newSortOrder] = value.split('-') as [SortBy, SortOrder];
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
            }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="status-desc">Status (Online First)</SelectItem>
                <SelectItem value="status-asc">Status (Offline First)</SelectItem>
                <SelectItem value="lastSeen-desc">Last Seen (Newest)</SelectItem>
                <SelectItem value="lastSeen-asc">Last Seen (Oldest)</SelectItem>
                <SelectItem value="classroom-asc">Classroom (A-Z)</SelectItem>
                <SelectItem value="location-asc">Location (A-Z)</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Device Groups */}
        <div className="space-y-8">
          {filteredAndGroupedDevices.groups.map((group) => (
            <div key={group.key}>
              {groupBy !== 'none' && (
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    {group.label}
                    <Badge variant="secondary">{group.count}</Badge>
                  </h2>
                </div>
              )}

              {/* Device Grid/List */}
              <div className={
                viewMode === 'grid'
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "flex flex-col space-y-4"
              }>
                  {group.devices.map((device) => (
                    <div key={device.id} className="relative">
                      <div className="w-full h-full">
                        <DeviceCard
                          device={device}
                          onToggleSwitch={handleToggleSwitch}
                          onEditDevice={isAdmin ? (d) => { setSelectedDevice(d); setShowConfigDialog(true); } : undefined}
                          onDeleteDevice={isAdmin ? handleDeleteDevice : undefined}
                          showSwitches={true}
                          showActions={true}
                          compact={viewMode === 'grid'}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredAndGroupedDevices.totalCount === 0 && (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all' ? (
                <>
                  <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No devices match your current filters.</p>
                  <p className="text-sm">Try adjusting your search or filter criteria.</p>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No devices found.</p>
                  <p className="text-sm">Get started by adding your first device.</p>
                </>
              )}
            </div>
            {(searchQuery || statusFilter !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="mt-4"
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {/* Results Summary */}
        {filteredAndGroupedDevices.totalCount > 0 && (
          <div className="text-center text-sm text-muted-foreground mt-8">
            Showing {filteredAndGroupedDevices.totalCount} of {devices.length} devices
          </div>
        )}
      </div>

      {/* Fixed Add Device Button for Admins */}
      {isAdmin && !(showConfigDialog && !selectedDevice) && !selectedDevice && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            variant="default"
            onClick={() => {
              setSelectedDevice(undefined);
              setShowConfigDialog(true);
            }}
            className="shadow-lg hover:shadow-xl transition-shadow"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Device
          </Button>
        </div>
      )}

      {isAdmin && (
        <DeviceConfigDialog
          open={showConfigDialog}
          onOpenChange={setShowConfigDialog}
          onSubmit={(data) => {
            if (selectedDevice) {
              handleUpdateDevice(selectedDevice.id, {
                ...data,
                switches: data.switches.map((sw): import("@/types").Switch => ({
                  id: sw.id || `switch-${Date.now()}-${Math.floor(Math.random())}`,
                  name: sw.name || 'Unnamed Switch',
                  type: sw.type || 'relay',
                  gpio: sw.gpio,
                  relayGpio: sw.relayGpio,
                  state: sw.state ?? false,
                  manualSwitchEnabled: sw.manualSwitchEnabled ?? false,
                  manualSwitchGpio: sw.manualSwitchGpio,
                  manualMode: sw.manualMode || 'maintained',
                  manualActiveLow: sw.manualActiveLow ?? true,
                  usePir: sw.usePir ?? false,
                  dontAutoOff: sw.dontAutoOff ?? false,
                  icon: sw.icon || 'lightbulb'
                }))
              });
            } else {
              handleAddDevice({
                ...data,
                id: `device-${Date.now()}`,
                status: 'offline',
                lastSeen: new Date(),
                switches: data.switches.map((sw: import("@/types").Switch, idx: number) => ({
                  id: `switch-${Date.now()}-${idx}`,
                  name: sw.name || 'Unnamed Switch',
                  type: sw.type || 'relay',
                  gpio: sw.gpio,
                  relayGpio: sw.relayGpio,
                  state: false,
                  manualSwitchEnabled: sw.manualSwitchEnabled || false,
                  manualSwitchGpio: sw.manualSwitchGpio,
                  usePir: sw.usePir || false,
                  dontAutoOff: sw.dontAutoOff || false,
                  manualMode: sw.manualMode || 'maintained',
                  manualActiveLow: sw.manualActiveLow !== undefined ? sw.manualActiveLow : true,
                  icon: sw.icon,
                  schedule: sw.schedule,
                  powerConsumption: sw.powerConsumption
                }))
              } as Device);
            }
          }}
          initialData={selectedDevice}
        />
      )}
    </>
  );
};

export default Devices;
