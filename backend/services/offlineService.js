const OfflineContent = require('../models/OfflineContent');
const Board = require('../models/Board');
// const Notice = require('../models/Notice'); // Removed - notice board functionality no longer exists
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class OfflineService {
  constructor() {
    this.syncIntervals = new Map(); // Store sync intervals per board
  }

  // Initialize offline content for a board
  async initializeBoardOffline(boardId) {
    try {
      const board = await Board.findById(boardId);
      if (!board) {
        throw new Error('Board not found');
      }

      // Create offline directory structure if needed
      const offlineDir = path.join(__dirname, '../offline-content', boardId.toString());
      await fs.mkdir(offlineDir, { recursive: true });

      // Start periodic sync if enabled
      if (board.offlineSettings.autoSync) {
        this.startPeriodicSync(boardId, board.offlineSettings.syncInterval);
      }

      return { success: true, message: 'Board offline initialized' };
    } catch (error) {
      console.error('Error initializing board offline:', error);
      throw error;
    }
  }

  // Queue content for offline storage
  async queueContentForOffline(boardId, contentId, priority = 0) {
    try {
      // Notice board functionality has been removed - return early
      console.log('Notice board offline functionality disabled - content not queued');
      return { success: false, message: 'Notice board functionality has been removed' };

      /* REMOVED - Notice board functionality no longer exists
      const board = await Board.findById(boardId);
      const notice = await Notice.findById(contentId).populate('attachments');

      if (!board || !notice) {
        throw new Error('Board or content not found');
      }

      const offlineDir = path.join(__dirname, '../offline-content', boardId.toString());

      // Calculate expiration date
      const expiresAt = notice.expiryDate ||
        new Date(Date.now() + (board.offlineSettings.contentRetentionDays * 24 * 60 * 60 * 1000));

      // Queue main content
      const mainContent = new OfflineContent({
        boardId,
        contentId,
        contentType: 'notice',
        localPath: path.join(offlineDir, `notice_${contentId}.json`),
        originalPath: `/api/notices/${contentId}`,
        fileSize: JSON.stringify(notice).length,
        expiresAt,
        priority,
        metadata: {
          title: notice.title,
          content: notice.content,
          priority: notice.priority
        }
      });

      await mainContent.save();

      // Queue attachments
      if (notice.attachments && notice.attachments.length > 0) {
        for (const attachment of notice.attachments) {
          const attachmentPath = path.join(offlineDir, `attachment_${attachment.filename}`);

          const offlineAttachment = new OfflineContent({
            boardId,
            contentId,
            contentType: 'notice',
            localPath: attachmentPath,
            originalPath: attachment.url,
            fileSize: attachment.size,
            expiresAt,
            priority,
            metadata: {
              filename: attachment.originalName,
              mimetype: attachment.mimetype
            }
          });

          await offlineAttachment.save();
        }
      }

      // Update board sync status
      await Board.findByIdAndUpdate(boardId, {
        $push: { 'syncStatus.pendingUploads': contentId.toString() },
        $inc: { 'syncStatus.localContentCount': 1 + (notice.attachments?.length || 0) }
      });

      return { success: true, message: 'Content queued for offline storage' };
      */
    } catch (error) {
      console.error('Error queuing content for offline:', error);
      throw error;
    }
  }

  // Download and cache content locally
  async downloadContent(boardId, contentId) {
    try {
      const offlineContent = await OfflineContent.findOne({
        boardId,
        contentId,
        downloadStatus: { $in: ['pending', 'failed'] }
      });

      if (!offlineContent) {
        return { success: false, message: 'Content not found or already downloaded' };
      }

      // Update status to downloading
      offlineContent.downloadStatus = 'downloading';
      await offlineContent.save();

      try {
        // For now, we'll simulate downloading by copying from uploads directory
        // In real implementation, this would download from the server
        const sourcePath = path.join(__dirname, '../uploads/notices',
          path.basename(offlineContent.originalPath));

        // Ensure local directory exists
        const localDir = path.dirname(offlineContent.localPath);
        await fs.mkdir(localDir, { recursive: true });

        // Copy file
        await fs.copyFile(sourcePath, offlineContent.localPath);

        // Calculate checksum
        const fileBuffer = await fs.readFile(offlineContent.localPath);
        const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');

        // Update status to completed
        offlineContent.downloadStatus = 'completed';
        offlineContent.downloadedAt = new Date();
        offlineContent.checksum = checksum;
        offlineContent.downloadProgress = 100;
        await offlineContent.save();

        // Update board storage usage
        await Board.findByIdAndUpdate(boardId, {
          $inc: { 'syncStatus.localStorageUsed': offlineContent.fileSize },
          $pull: { 'syncStatus.pendingUploads': contentId.toString() }
        });

        return { success: true, message: 'Content downloaded successfully' };
      } catch (downloadError) {
        offlineContent.downloadStatus = 'failed';
        await offlineContent.save();
        throw downloadError;
      }
    } catch (error) {
      console.error('Error downloading content:', error);
      throw error;
    }
  }

  // Clean up expired content
  async cleanupExpiredContent(boardId) {
    try {
      const expiredContent = await OfflineContent.getExpiredContent(boardId);

      for (const content of expiredContent) {
        try {
          // Delete local file
          await fs.unlink(content.localPath);

          // Remove from database
          await OfflineContent.findByIdAndDelete(content._id);

          // Update board storage usage
          await Board.findByIdAndUpdate(boardId, {
            $inc: {
              'syncStatus.localStorageUsed': -content.fileSize,
              'syncStatus.localContentCount': -1
            }
          });

          console.log(`Cleaned up expired content: ${content._id}`);
        } catch (cleanupError) {
          console.error(`Error cleaning up content ${content._id}:`, cleanupError);
        }
      }

      return { success: true, cleanedCount: expiredContent.length };
    } catch (error) {
      console.error('Error cleaning up expired content:', error);
      throw error;
    }
  }

  // Manage storage space by removing low-priority content
  async manageStorageSpace(boardId) {
    try {
      const board = await Board.findById(boardId);
      if (!board) {
        throw new Error('Board not found');
      }

      const maxStorage = board.offlineSettings.maxStorageSize;
      const currentUsage = board.syncStatus.localStorageUsed;

      if (currentUsage < maxStorage * 0.8) { // Only cleanup if usage > 80%
        return { success: true, message: 'Storage usage is within limits' };
      }

      // Get low priority content to remove
      const lowPriorityContent = await OfflineContent.getLowPriorityContent(boardId, 3);

      let freedSpace = 0;
      let removedCount = 0;

      for (const content of lowPriorityContent) {
        if (currentUsage - freedSpace < maxStorage * 0.6) { // Stop when usage drops to 60%
          break;
        }

        try {
          await fs.unlink(content.localPath);
          await OfflineContent.findByIdAndDelete(content._id);

          freedSpace += content.fileSize;
          removedCount++;

          await Board.findByIdAndUpdate(boardId, {
            $inc: {
              'syncStatus.localStorageUsed': -content.fileSize,
              'syncStatus.localContentCount': -1
            }
          });
        } catch (error) {
          console.error(`Error removing content ${content._id}:`, error);
        }
      }

      return {
        success: true,
        message: `Freed ${freedSpace} bytes by removing ${removedCount} items`
      };
    } catch (error) {
      console.error('Error managing storage space:', error);
      throw error;
    }
  }

  // Sync content with board
  async syncWithBoard(boardId) {
    try {
      const board = await Board.findById(boardId);
      if (!board) {
        throw new Error('Board not found');
      }

      // Update sync status
      await Board.findByIdAndUpdate(boardId, {
        'syncStatus.lastSync': new Date(),
        'syncStatus.nextSync': new Date(Date.now() + (board.offlineSettings.syncInterval * 1000)),
        'syncStatus.syncInProgress': true
      });

      // Download pending content
      const pendingContent = await OfflineContent.find({
        boardId,
        downloadStatus: { $in: ['pending', 'failed'] }
      });

      for (const content of pendingContent) {
        try {
          await this.downloadContent(boardId, content.contentId);
        } catch (error) {
          console.error(`Failed to download content ${content.contentId}:`, error);
        }
      }

      // Cleanup expired content
      await this.cleanupExpiredContent(boardId);

      // Manage storage space
      await this.manageStorageSpace(boardId);

      // Update sync status
      await Board.findByIdAndUpdate(boardId, {
        'syncStatus.syncInProgress': false,
        'syncStatus.failedSyncs': 0 // Reset failed syncs on successful sync
      });

      return { success: true, message: 'Sync completed successfully' };
    } catch (error) {
      // Increment failed syncs
      await Board.findByIdAndUpdate(boardId, {
        $inc: { 'syncStatus.failedSyncs': 1 },
        'syncStatus.syncInProgress': false
      });

      console.error('Error syncing with board:', error);
      throw error;
    }
  }

  // Start periodic sync for a board
  startPeriodicSync(boardId, intervalSeconds) {
    if (this.syncIntervals.has(boardId)) {
      clearInterval(this.syncIntervals.get(boardId));
    }

    const interval = setInterval(async () => {
      try {
        await this.syncWithBoard(boardId);
      } catch (error) {
        console.error(`Periodic sync failed for board ${boardId}:`, error);
      }
    }, intervalSeconds * 1000);

    this.syncIntervals.set(boardId, interval);
  }

  // Stop periodic sync for a board
  stopPeriodicSync(boardId) {
    if (this.syncIntervals.has(boardId)) {
      clearInterval(this.syncIntervals.get(boardId));
      this.syncIntervals.delete(boardId);
    }
  }

  // Get offline content status for a board
  async getOfflineStatus(boardId) {
    try {
      const board = await Board.findById(boardId);
      if (!board) {
        throw new Error('Board not found');
      }

      const contentStats = await OfflineContent.aggregate([
        { $match: { boardId: board._id } },
        {
          $group: {
            _id: '$downloadStatus',
            count: { $sum: 1 },
            totalSize: { $sum: '$fileSize' }
          }
        }
      ]);

      const expiredCount = await OfflineContent.countDocuments({
        boardId,
        $or: [
          { isExpired: true },
          { expiresAt: { $lt: new Date() } }
        ]
      });

      return {
        boardId,
        offlineEnabled: board.offlineSettings.enabled,
        maxStorage: board.offlineSettings.maxStorageSize,
        currentUsage: board.syncStatus.localStorageUsed,
        contentCount: board.syncStatus.localContentCount,
        syncStatus: {
          lastSync: board.syncStatus.lastSync,
          nextSync: board.syncStatus.nextSync,
          inProgress: board.syncStatus.syncInProgress,
          failedSyncs: board.syncStatus.failedSyncs
        },
        contentStats,
        expiredCount,
        storageUtilization: (board.syncStatus.localStorageUsed / board.offlineSettings.maxStorageSize) * 100
      };
    } catch (error) {
      console.error('Error getting offline status:', error);
      throw error;
    }
  }

  // Handle board going offline
  async handleBoardOffline(boardId) {
    try {
      await Board.findByIdAndUpdate(boardId, {
        status: 'offline',
        isOnline: false,
        lastSeen: new Date()
      });

      // Stop periodic sync
      this.stopPeriodicSync(boardId);

      console.log(`Board ${boardId} marked as offline`);
      return { success: true, message: 'Board marked as offline' };
    } catch (error) {
      console.error('Error handling board offline:', error);
      throw error;
    }
  }

  // Handle board coming back online
  async handleBoardOnline(boardId) {
    try {
      await Board.findByIdAndUpdate(boardId, {
        status: 'active',
        isOnline: true,
        lastSeen: new Date()
      });

      // Start periodic sync
      const board = await Board.findById(boardId);
      if (board.offlineSettings.autoSync) {
        this.startPeriodicSync(boardId, board.offlineSettings.syncInterval);
      }

      // Trigger immediate sync
      await this.syncWithBoard(boardId);

      console.log(`Board ${boardId} marked as online and synced`);
      return { success: true, message: 'Board marked as online and synced' };
    } catch (error) {
      console.error('Error handling board online:', error);
      throw error;
    }
  }
}

module.exports = new OfflineService();