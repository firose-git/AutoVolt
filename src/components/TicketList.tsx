import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Search,
    Filter,
    Eye,
    Edit,
    Trash2,
    Clock,
    AlertCircle,
    CheckCircle,
    XCircle,
    User,
    Calendar,
    Tag,
    Ticket,
    RefreshCw
} from 'lucide-react';
import { ticketAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import CreateTicketDialog from './CreateTicketDialog';

interface Ticket {
    id: string;
    ticketId: string;
    title: string;
    description: string;
    category: string;
    priority: string;
    status: string;
    createdBy: {
        name: string;
        email: string;
        role: string;
    };
    assignedTo?: {
        name: string;
        email: string;
        role: string;
    };
    department?: string;
    location?: string;
    deviceId?: string;
    tags: string[];
    resolution?: string;
    resolvedAt?: string;
    closedAt?: string;
    estimatedHours?: number;
    actualHours?: number;
    createdAt: string;
    updatedAt: string;
    daysOpen: number;
    comments: Array<{
        id: string;
        author: string;
        authorName: string;
        message: string;
        isInternal: boolean;
        createdAt: string;
    }>;
}

const TicketList: React.FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [showResolutionDialog, setShowResolutionDialog] = useState(false);
    const [resolutionMessage, setResolutionMessage] = useState('');
    const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{ ticketId: string, status: string } | null>(null);
    const [filters, setFilters] = useState({
        status: 'all',
        category: 'all',
        priority: 'all',
        search: ''
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    });

    // Helper function to check if user can manage tickets (status updates, assignments)
    const canManageTickets = () => {
        return user?.role === 'admin' || user?.role === 'super-admin';
    };

    // Helper function to check if user can view all department tickets
    const canViewDepartmentTickets = () => {
        return user?.role === 'admin' || user?.role === 'super-admin' || user?.role === 'dean' || user?.role === 'hod';
    };

    // Helper function to check if user can delete tickets (admin/super-admin only)
    const canDeleteTickets = () => {
        return user?.role === 'admin' || user?.role === 'super-admin';
    };

    const loadTickets = async () => {
        try {
            setLoading(true);
            const response = await ticketAPI.getTickets({
                ...Object.fromEntries(
                    Object.entries(filters).map(([key, value]) => [
                        key,
                        value === 'all' ? '' : value
                    ])
                ),
                page: pagination.page,
                limit: pagination.limit
            });
            setTickets(response.data.data);
            setPagination(response.data.pagination);
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to load tickets.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTickets();
    }, [filters, pagination.page]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-blue-500 text-white hover:bg-blue-600';
            case 'in_progress': return 'bg-yellow-500 text-white hover:bg-yellow-600';
            case 'on_hold': return 'bg-orange-500 text-white hover:bg-orange-600';
            case 'resolved': return 'bg-green-500 text-white hover:bg-green-600';
            case 'closed': return 'bg-gray-500 text-white hover:bg-gray-600';
            case 'cancelled': return 'bg-red-500 text-white hover:bg-red-600';
            default: return 'bg-gray-500 text-white hover:bg-gray-600';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'low': return 'bg-gray-200 text-gray-800 hover:bg-gray-300';
            case 'medium': return 'bg-blue-200 text-blue-800 hover:bg-blue-300';
            case 'high': return 'bg-orange-200 text-orange-800 hover:bg-orange-300';
            case 'urgent': return 'bg-red-200 text-red-800 hover:bg-red-300';
            default: return 'bg-gray-200 text-gray-800 hover:bg-gray-300';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'open': return <Clock className="w-4 h-4" />;
            case 'in_progress': return <AlertCircle className="w-4 h-4" />;
            case 'on_hold': return <Clock className="w-4 h-4" />;
            case 'resolved': return <CheckCircle className="w-4 h-4" />;
            case 'closed': return <XCircle className="w-4 h-4" />;
            case 'cancelled': return <XCircle className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'open': return 'Open';
            case 'in_progress': return 'Processing';
            case 'on_hold': return 'On Hold';
            case 'resolved': return 'Resolved';
            case 'closed': return 'Closed';
            case 'cancelled': return 'Cancelled';
            default: return status.replace('_', ' ');
        }
    };

    const getCategoryLabel = (category: string) => {
        const categories: Record<string, string> = {
            technical_issue: 'Technical Issue',
            device_problem: 'Device Problem',
            network_issue: 'Network Issue',
            software_bug: 'Software Bug',
            feature_request: 'Feature Request',
            account_issue: 'Account Issue',
            security_concern: 'Security Concern',
            other: 'Other'
        };
        return categories[category] || category;
    };

    const formatDepartmentName = (department: string) => {
        const departmentMap: Record<string, string> = {
            'School of IT': 'School of Information Technology',
            'School of Business': 'School of Business',
            'School of Hospitality': 'School of Hospitality',
            'Admission Department': 'Admission Department',
            'Other': 'Other'
        };
        return departmentMap[department] || department;
    };

    const handleViewDetails = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setShowDetails(true);
    };

    const handleStatusUpdate = async (ticketId: string, status: string, comment?: string) => {
        try {
            const statusComments: Record<string, string> = {
                'in_progress': 'Ticket is now being processed. Working on resolving the issue.',
                'resolved': 'Issue has been resolved. Please verify the fix.',
                'closed': 'Ticket has been closed. Thank you for your patience.',
                'cancelled': 'Ticket has been cancelled.',
                'on_hold': 'Ticket is on hold. Will resume shortly.'
            };

            const updateComment = comment || statusComments[status] || `Status changed to ${status.replace('_', ' ')}`;

            await ticketAPI.updateTicket(ticketId, { 
                status, 
                comment: updateComment 
            });
            
            toast({
                title: "Success",
                description: `Ticket status updated to ${status.replace('_', ' ').toUpperCase()}`,
            });
            
            // Reload tickets and refresh selected ticket details
            await loadTickets();
            
            // If viewing details, refresh the selected ticket
            if (selectedTicket && selectedTicket.id === ticketId) {
                const response = await ticketAPI.getTicket(ticketId);
                setSelectedTicket(response.data.data);
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to update ticket status.",
                variant: "destructive"
            });
        }
    };

    const handleStatusUpdateWithMessage = (ticketId: string, status: string) => {
        // For certain statuses, show the message dialog
        if (['in_progress', 'resolved', 'closed', 'on_hold', 'cancelled'].includes(status)) {
            setPendingStatusUpdate({ ticketId, status });
            setShowResolutionDialog(true);
        } else {
            handleStatusUpdate(ticketId, status);
        }
    };

    const confirmStatusUpdate = async () => {
        if (pendingStatusUpdate) {
            const message = resolutionMessage.trim();
            await handleStatusUpdate(
                pendingStatusUpdate.ticketId, 
                pendingStatusUpdate.status, 
                message || undefined
            );
            setShowResolutionDialog(false);
            setShowDetails(false);
            setResolutionMessage('');
            setPendingStatusUpdate(null);
        }
    };

    const handleDeleteTicket = async (ticketId: string) => {
        if (!confirm('Are you sure you want to delete this ticket?')) return;

        try {
            await ticketAPI.deleteTicket(ticketId);
            toast({
                title: "Success",
                description: "Ticket deleted successfully.",
            });
            loadTickets();
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to delete ticket.",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Support Tickets</h2>
                    <p className="text-muted-foreground">Manage and track support requests</p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline"
                        onClick={loadTickets}
                        disabled={loading}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <CreateTicketDialog onTicketCreated={loadTickets} />
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="w-5 h-5" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <Label>Search</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search tickets..."
                                    value={filters.search}
                                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Status</Label>
                            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in_progress">Processing</SelectItem>
                                    <SelectItem value="on_hold">On Hold</SelectItem>
                                    <SelectItem value="resolved">Resolved</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Category</Label>
                            <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    <SelectItem value="technical_issue">Technical Issue</SelectItem>
                                    <SelectItem value="device_problem">Device Problem</SelectItem>
                                    <SelectItem value="network_issue">Network Issue</SelectItem>
                                    <SelectItem value="software_bug">Software Bug</SelectItem>
                                    <SelectItem value="feature_request">Feature Request</SelectItem>
                                    <SelectItem value="account_issue">Account Issue</SelectItem>
                                    <SelectItem value="security_concern">Security Concern</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Priority</Label>
                            <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Priorities" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Priorities</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tickets Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ticket ID</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Created By</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8">
                                        Loading tickets...
                                    </TableCell>
                                </TableRow>
                            ) : tickets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-12">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-ticket w-12 h-12 text-muted-foreground mb-2"><path d="M2 9V7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z"></path><path d="M13 5v14"></path></svg>
                                            <span className="text-lg font-semibold text-muted-foreground">No tickets found</span>
                                            <span className="text-sm text-muted-foreground">You have not raised any tickets yet.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tickets.map((ticket) => (
                                    <TableRow key={ticket.id}>
                                        <TableCell className="font-mono text-sm">
                                            {ticket.ticketId}
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate">
                                            {ticket.title}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getStatusColor(ticket.status)}>
                                                <span className="flex items-center gap-1">
                                                    {getStatusIcon(ticket.status)}
                                                    {getStatusText(ticket.status)}
                                                </span>
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getPriorityColor(ticket.priority)}>
                                                {ticket.priority}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {getCategoryLabel(ticket.category)}
                                        </TableCell>
                                        <TableCell>
                                            {ticket.createdBy?.name || 'Unknown User'}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(ticket.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleViewDetails(ticket)}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                {canDeleteTickets() && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteTicket(ticket.id)}
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    <Button
                        variant="outline"
                        disabled={pagination.page === 1}
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                        Previous
                    </Button>
                    <span className="flex items-center px-4">
                        Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                        variant="outline"
                        disabled={pagination.page === pagination.totalPages}
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                        Next
                    </Button>
                </div>
            )}

            {/* Ticket Details Dialog */}
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Ticket className="w-5 h-5" />
                            {selectedTicket?.ticketId}: {selectedTicket?.title}
                        </DialogTitle>
                        <DialogDescription>
                            View and manage ticket details, status, and comments
                        </DialogDescription>
                    </DialogHeader>

                    {selectedTicket && (
                        <div className="space-y-6">
                            {/* Ticket Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Status</Label>
                                    <div className="mt-1">
                                        <Badge className={getStatusColor(selectedTicket.status)}>
                                            <span className="flex items-center gap-1">
                                                {getStatusIcon(selectedTicket.status)}
                                                {getStatusText(selectedTicket.status)}
                                            </span>
                                        </Badge>
                                    </div>
                                </div>
                                <div>
                                    <Label>Priority</Label>
                                    <div className="mt-1">
                                        <Badge className={getPriorityColor(selectedTicket.priority)}>
                                            {selectedTicket.priority.toUpperCase()}
                                        </Badge>
                                    </div>
                                </div>
                                <div>
                                    <Label>Category</Label>
                                    <p className="mt-1">{getCategoryLabel(selectedTicket.category)}</p>
                                </div>
                                <div>
                                    <Label>Days Open</Label>
                                    <p className="mt-1">
                                        <span className="font-semibold">{selectedTicket.daysOpen}</span> days
                                    </p>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <Label>Description</Label>
                                <p className="mt-1 p-3 bg-muted rounded-md">{selectedTicket.description}</p>
                            </div>

                            {/* Additional Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Created By</Label>
                                    <p>{selectedTicket.createdBy?.name || 'Unknown User'} ({selectedTicket.createdBy?.email || 'N/A'})</p>
                                </div>
                                {selectedTicket.assignedTo && (
                                    <div>
                                        <Label>Assigned To</Label>
                                        <p>{selectedTicket.assignedTo.name} ({selectedTicket.assignedTo.email})</p>
                                    </div>
                                )}
                                {selectedTicket.department && (
                                    <div>
                                        <Label>Department</Label>
                                        <p>{formatDepartmentName(selectedTicket.department)}</p>
                                    </div>
                                )}
                                {selectedTicket.location && (
                                    <div>
                                        <Label>Location</Label>
                                        <p>{selectedTicket.location}</p>
                                    </div>
                                )}
                            </div>

                            {/* Tags */}
                            {selectedTicket.tags.length > 0 && (
                                <div>
                                    <Label>Tags</Label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {selectedTicket.tags.map((tag) => (
                                            <Badge key={tag} variant="outline">
                                                <Tag className="w-3 h-3 mr-1" />
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Comments */}
                            <div>
                                <Label>Comments</Label>
                                <div className="space-y-3 mt-2">
                                    {selectedTicket.comments.map((comment) => (
                                        <div key={comment.id} className="p-3 bg-muted rounded-md">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4" />
                                                    <span className="font-medium">{comment.authorName}</span>
                                                    {comment.isInternal && (
                                                        <Badge variant="secondary">Internal</Badge>
                                                    )}
                                                </div>
                                                <span className="text-sm text-muted-foreground">
                                                    {new Date(comment.createdAt).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="mt-2">{comment.message}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            {canManageTickets() && (
                                <div className="space-y-4 pt-4 border-t">
                                    <Label className="text-base font-semibold">Ticket Actions</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedTicket.status === 'open' && (
                                            <>
                                                <Button
                                                    onClick={() => handleStatusUpdateWithMessage(selectedTicket.id, 'in_progress')}
                                                    className="bg-yellow-500 hover:bg-yellow-600"
                                                >
                                                    <AlertCircle className="w-4 h-4 mr-2" />
                                                    Start Processing
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleStatusUpdateWithMessage(selectedTicket.id, 'cancelled')}
                                                    className="border-red-500 text-red-500 hover:bg-red-50"
                                                >
                                                    <XCircle className="w-4 h-4 mr-2" />
                                                    Cancel Ticket
                                                </Button>
                                            </>
                                        )}
                                        
                                        {selectedTicket.status === 'in_progress' && (
                                            <>
                                                <Button
                                                    onClick={() => handleStatusUpdateWithMessage(selectedTicket.id, 'resolved')}
                                                    className="bg-green-500 hover:bg-green-600"
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    Mark as Resolved
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleStatusUpdateWithMessage(selectedTicket.id, 'on_hold')}
                                                    className="border-orange-500 text-orange-500 hover:bg-orange-50"
                                                >
                                                    <Clock className="w-4 h-4 mr-2" />
                                                    Put On Hold
                                                </Button>
                                            </>
                                        )}

                                        {selectedTicket.status === 'on_hold' && (
                                            <Button
                                                onClick={() => handleStatusUpdateWithMessage(selectedTicket.id, 'in_progress')}
                                                className="bg-yellow-500 hover:bg-yellow-600"
                                            >
                                                <AlertCircle className="w-4 h-4 mr-2" />
                                                Resume Processing
                                            </Button>
                                        )}
                                        
                                        {selectedTicket.status === 'resolved' && (
                                            <>
                                                <Button
                                                    onClick={() => handleStatusUpdateWithMessage(selectedTicket.id, 'closed')}
                                                    className="bg-gray-500 hover:bg-gray-600"
                                                >
                                                    <XCircle className="w-4 h-4 mr-2" />
                                                    Close Ticket
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleStatusUpdateWithMessage(selectedTicket.id, 'in_progress')}
                                                >
                                                    <AlertCircle className="w-4 h-4 mr-2" />
                                                    Reopen Ticket
                                                </Button>
                                            </>
                                        )}

                                        {(selectedTicket.status === 'closed' || selectedTicket.status === 'cancelled') && (
                                            <div className="w-full p-3 bg-muted rounded-md">
                                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                    <CheckCircle className="w-4 h-4" />
                                                    This ticket is {selectedTicket.status}. No further actions available.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Resolution Message Dialog */}
            <Dialog open={showResolutionDialog} onOpenChange={setShowResolutionDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Status Update Message (Optional)</DialogTitle>
                        <DialogDescription>
                            You can add a message that will be visible to all users viewing this ticket. This is optional.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="resolutionMessage">Update Message</Label>
                            <Textarea
                                id="resolutionMessage"
                                placeholder="e.g., Issue resolved by restarting the server, or Waiting for vendor response..."
                                value={resolutionMessage}
                                onChange={(e) => setResolutionMessage(e.target.value)}
                                rows={4}
                                className="mt-2"
                            />
                            <p className="text-sm text-muted-foreground mt-2">
                                Leave empty to use default message
                            </p>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowResolutionDialog(false);
                                    setResolutionMessage('');
                                    setPendingStatusUpdate(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={confirmStatusUpdate}>
                                Continue
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TicketList;
