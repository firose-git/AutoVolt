import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Monitor, Play, Pause, RefreshCw, AlertTriangle, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import mqttService from '@/services/mqtt';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Board {
  _id: string;
  name: string;
  location: string;
  type: string;
  status: string;
  isOnline: boolean;
  lastScreenCapture?: Date;
}

interface ScreenCapture {
  board: {
    id: string;
    name: string;
    location: string;
    status: string;
    isOnline: boolean;
  };
  currentContent: {
    id: string;
    title: string;
    content: string;
    priority: number;
    duration: number;
    attachments: Array<{
      type: string;
      filename: string;
      originalName: string;
      url: string;
      thumbnail?: string;
    }>;
    schedule: any;
    createdBy: any;
    createdAt: string;
  } | null;
  availableContent: Array<{
    id: string;
    title: string;
    content: string;
    priority: number;
    duration: number;
    attachments: Array<{
      type: string;
      filename: string;
      originalName: string;
      url: string;
      thumbnail?: string;
    }>;
    schedule: any;
    createdBy: any;
    createdAt: string;
  }>;
  currentContentIndex: number;
  totalContent: number;
  timestamp: string;
  status: string;
  liveData?: {
    currentContentFromBoard?: any;
    lastReported?: string;
  };
}

const LiveScreenPreview: React.FC = () => {
  const { toast } = useToast();
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string>('');
  const [screenCapture, setScreenCapture] = useState<ScreenCapture | null>(null);
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch available boards
  const fetchBoards = async () => {
    try {
      const response = await api.get('/boards', {
        params: { type: 'raspberry_pi', status: 'active' }
      });
      if (response.data.success) {
        setBoards(response.data.boards);
      }
    } catch (error) {
      console.error('Failed to fetch boards:', error);
    }
  };

  // Fetch screen capture data
  const fetchScreenCapture = async (boardId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/boards/${boardId}/screen-capture`);
      setScreenCapture(response.data.screenCapture);
      setCurrentContentIndex(response.data.screenCapture.currentContentIndex || 0);
      setLastUpdate(new Date(response.data.lastUpdate));
      setError(null);
    } catch (err) {
      console.error('Failed to fetch screen capture:', err);
      setError(err.response?.data?.message || 'Failed to fetch screen capture');
      setScreenCapture(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle board selection
  const handleBoardSelect = (boardId: string) => {
    setSelectedBoard(boardId);
    setCurrentContentIndex(0); // Reset to first content when switching boards
    if (boardId) {
      fetchScreenCapture(boardId);
    } else {
      setScreenCapture(null);
      setLastUpdate(null);
      setError(null);
    }
  };

  // Manual refresh
  const handleRefresh = () => {
    if (selectedBoard) {
      fetchScreenCapture(selectedBoard);
    }
  };

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  // Navigate to previous content
  const navigatePrevious = async () => {
    if (selectedBoard) {
      try {
        await api.post(`/boards/${selectedBoard}/control-content`, {
          action: 'previous'
        });
        toast({
          title: 'Content Changed',
          description: 'Switched to previous content on the display',
        });
        // Refresh the preview after a short delay
        setTimeout(() => fetchScreenCapture(selectedBoard), 500);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to change content on display',
          variant: 'destructive',
        });
      }
    }
  };

  // Navigate to next content
  const navigateNext = async () => {
    if (selectedBoard) {
      try {
        await api.post(`/boards/${selectedBoard}/control-content`, {
          action: 'next'
        });
        toast({
          title: 'Content Changed',
          description: 'Switched to next content on the display',
        });
        // Refresh the preview after a short delay
        setTimeout(() => fetchScreenCapture(selectedBoard), 500);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to change content on display',
          variant: 'destructive',
        });
      }
    }
  };

  // Enable auto rotation
  const enableAutoRotation = async () => {
    if (selectedBoard) {
      try {
        await api.post(`/boards/${selectedBoard}/control-content`, {
          action: 'enable_auto'
        });
        toast({
          title: 'Auto Rotation Enabled',
          description: 'The display will now cycle through content automatically',
        });
        // Refresh the preview after a short delay
        setTimeout(() => fetchScreenCapture(selectedBoard), 500);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to enable auto rotation',
          variant: 'destructive',
        });
      }
    }
  };

  // Refresh content from server
  const refreshContent = async () => {
    if (selectedBoard) {
      try {
        await api.post(`/boards/${selectedBoard}/control-content`, {
          action: 'refresh'
        });
        toast({
          title: 'Content Refreshed',
          description: 'Display content has been refreshed from server',
        });
        // Refresh the preview after a short delay
        setTimeout(() => fetchScreenCapture(selectedBoard), 500);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to refresh content',
          variant: 'destructive',
        });
      }
    }
  };

  // Set up polling for real-time updates (since MQTT doesn't work in browser)
  useEffect(() => {
    if (autoRefresh && selectedBoard) {
      intervalRef.current = setInterval(() => {
        fetchScreenCapture(selectedBoard);
      }, 1000); // Poll every 1 second for smoother updates
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, selectedBoard]);

  // Initial load
  useEffect(() => {
    fetchBoards();
  }, []);

  const selectedBoardData = boards.find(board => board._id === selectedBoard);
  const isBoardOnline = selectedBoardData?.isOnline && selectedBoardData?.status === 'active';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Live Screen Preview</h2>
          <p className="text-muted-foreground">
            View real-time content displayed on Raspberry Pi monitors
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={toggleAutoRefresh}
          >
            {autoRefresh ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {autoRefresh ? 'Pause' : 'Resume'} Auto-refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={!selectedBoard}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Board Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Monitor className="h-5 w-5 mr-2" />
            Select Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="board-select">Raspberry Pi Device</Label>
              <Select value={selectedBoard} onValueChange={handleBoardSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a device..." />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((board) => (
                    <SelectItem key={board._id} value={board._id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{board.name} - {board.location}</span>
                        <Badge
                          variant={board.isOnline && board.status === 'active' ? 'default' : 'secondary'}
                          className="ml-2"
                        >
                          {board.isOnline && board.status === 'active' ? 'Online' : 'Offline'}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedBoardData && (
            <div className="mt-4 flex gap-2">
              <Badge variant={isBoardOnline ? 'default' : 'destructive'}>
                {isBoardOnline ? 'Online' : 'Offline'}
              </Badge>
              <Badge variant="outline">
                {selectedBoardData.type}
              </Badge>
              <Badge variant="outline">
                {selectedBoardData.location}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Screen Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Live Content Preview</CardTitle>
          <p className="text-sm text-muted-foreground">
            Real-time view of currently displayed content on Raspberry Pi monitors
          </p>
          {lastUpdate && (
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4" variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!selectedBoard ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a Raspberry Pi device to view live content</p>
              </div>
            </div>
          ) : !isBoardOnline ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                The selected device is currently offline. Screen preview is not available.
              </AlertDescription>
            </Alert>
          ) : loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading screen capture...</span>
            </div>
          ) : screenCapture ? (
            <div className="space-y-4">
              {screenCapture.availableContent && screenCapture.availableContent.length > 0 ? (
                <div>
                  {/* Remote Control Navigation */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={navigatePrevious}
                        disabled={screenCapture.availableContent.length <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={navigateNext}
                        disabled={screenCapture.availableContent.length <= 1}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={enableAutoRotation}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Auto Rotate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshContent}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Content
                      </Button>
                    </div>
                    <Badge variant="outline">
                      Remote Control
                    </Badge>
                  </div>

                  {/* Content Display */}
                  <div className="border rounded-lg p-6 bg-slate-900 text-white min-h-64">
                    {(() => {
                      // Use the actual current content from Raspberry Pi, fallback to selected index for preview
                      const content = screenCapture.currentContent || 
                        (screenCapture.availableContent[currentContentIndex] || null);
                      
                      if (!content) {
                        return (
                          <div className="text-center text-gray-400">
                            <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg">No Content Currently Playing</p>
                            <p className="text-sm">The board is online but no content is active</p>
                          </div>
                        );
                      }

                      return (
                        <>
                          {/* Content Title */}
                          <div className="mb-4">
                            <h3 className="text-xl font-bold text-white">{content.title}</h3>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                Priority: {content.priority}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                Duration: {content.duration}s
                              </Badge>
                              {screenCapture.currentContent && (
                                <Badge variant="default" className="text-xs">
                                  Currently Playing
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Content Text */}
                          <div className="mb-4">
                            <p className="text-gray-200 whitespace-pre-wrap">{content.content}</p>
                          </div>

                          {/* Attachments */}
                          {content.attachments && content.attachments.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold text-gray-300 mb-2">Attachments:</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {content.attachments.map((attachment, index) => (
                                  <div key={index} className="bg-slate-800 rounded p-2">
                                    {attachment.type === 'image' ? (
                                      <img
                                        src={attachment.thumbnail || attachment.url}
                                        alt={attachment.filename}
                                        className="w-full h-24 object-cover rounded"
                                      />
                                    ) : attachment.type === 'video' ? (
                                      <div className="w-full h-24 bg-slate-700 rounded flex items-center justify-center">
                                        <Play className="h-8 w-8 text-gray-400" />
                                        <span className="ml-2 text-sm text-gray-400">Video</span>
                                      </div>
                                    ) : (
                                      <div className="w-full h-24 bg-slate-700 rounded flex items-center justify-center">
                                        <FileText className="h-8 w-8 text-gray-400" />
                                        <span className="ml-2 text-sm text-gray-400 truncate">{attachment.filename}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Status */}
                          <div className="text-xs text-gray-400 mt-4 pt-4 border-t border-slate-700">
                            Status: {screenCapture.status} • Updated: {new Date(screenCapture.timestamp).toLocaleString()}
                            {screenCapture.liveData?.lastReported && (
                              <span className="ml-2">
                                • Last reported: {new Date(screenCapture.liveData.lastReported).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-6 bg-slate-900 text-white min-h-64 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No Content Currently Playing</p>
                    <p className="text-sm">The board is online but no scheduled content is active</p>
                  </div>
                </div>
              )}
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Board: {screenCapture.board.name} ({screenCapture.board.location})</span>
                <span>Status: {screenCapture.status}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No screen capture available</p>
                <p className="text-sm">The device may not be streaming content yet</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveScreenPreview;