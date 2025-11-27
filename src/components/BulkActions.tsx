import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Archive, 
  Trash2, 
  Loader2,
  Monitor
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { api } from '@/services/api';
import { toast } from 'sonner';

interface BulkActionsProps {
  selectedNotices: string[];
  totalNotices: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onActionComplete: () => void;
}

export const BulkActions: React.FC<BulkActionsProps> = ({
  selectedNotices,
  totalNotices,
  onSelectAll,
  onDeselectAll,
  onActionComplete
}) => {
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject' | 'archive' | 'delete' | null;
  }>({
    open: false,
    action: null
  });
  const [rejectionReason, setRejectionReason] = useState('');

  const handleBulkAction = async (action: 'approve' | 'reject' | 'archive' | 'delete') => {
    if (action === 'reject' && !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setLoading(true);
    try {
      const endpoint = `/notices/bulk-${action}`;
      const payload: any = { noticeIds: selectedNotices };
      
      if (action === 'reject') {
        payload.rejectionReason = rejectionReason;
      }

      const response = await api.post(endpoint, payload);

      if (response.data.success) {
        toast.success(`Successfully ${action}ed ${selectedNotices.length} notice(s)`);
        setConfirmDialog({ open: false, action: null });
        setRejectionReason('');
        onActionComplete();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${action} notices`);
    } finally {
      setLoading(false);
    }
  };

  const openConfirmDialog = (action: 'approve' | 'reject' | 'archive' | 'delete') => {
    setConfirmDialog({ open: true, action });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, action: null });
    setRejectionReason('');
  };

  if (selectedNotices.length === 0) {
    return null;
  }

  return (
    <>
      <div className="sticky top-0 z-10 bg-primary text-primary-foreground shadow-lg rounded-lg p-4 mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Checkbox
              checked={selectedNotices.length === totalNotices && totalNotices > 0}
              onCheckedChange={(checked) => {
                if (checked) {
                  onSelectAll();
                } else {
                  onDeselectAll();
                }
              }}
            />
            <div>
              <h3 className="font-semibold">
                {selectedNotices.length} notice{selectedNotices.length !== 1 ? 's' : ''} selected
              </h3>
              <p className="text-sm opacity-90">
                {selectedNotices.length === totalNotices 
                  ? 'All notices selected' 
                  : `${totalNotices - selectedNotices.length} remaining`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openConfirmDialog('approve')}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Approve
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => openConfirmDialog('reject')}
              disabled={loading}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => openConfirmDialog('archive')}
              disabled={loading}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => openConfirmDialog('delete')}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onDeselectAll}
              className="text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/20"
            >
              Clear Selection
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && closeConfirmDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm Bulk {confirmDialog.action?.charAt(0).toUpperCase()}{confirmDialog.action?.slice(1)}
            </DialogTitle>
            <DialogDescription>
              You are about to {confirmDialog.action} {selectedNotices.length} notice(s). 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {confirmDialog.action === 'reject' && (
            <div className="space-y-2 my-4">
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <Textarea
                id="rejectionReason"
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeConfirmDialog} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant={confirmDialog.action === 'delete' ? 'destructive' : 'default'}
              onClick={() => confirmDialog.action && handleBulkAction(confirmDialog.action)}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm {confirmDialog.action?.charAt(0).toUpperCase()}{confirmDialog.action?.slice(1)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
