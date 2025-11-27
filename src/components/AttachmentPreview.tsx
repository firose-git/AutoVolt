import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  X, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  FileText,
  File
} from 'lucide-react';
import { config } from '@/config/env';

interface Attachment {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
}

interface AttachmentPreviewProps {
  attachments: Attachment[];
  initialIndex?: number;
  onClose: () => void;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  attachments,
  initialIndex = 0,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(100);
  const currentAttachment = attachments[currentIndex];

  if (!currentAttachment) {
    return null;
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % attachments.length);
    setZoom(100);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + attachments.length) % attachments.length);
    setZoom(100);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `${config.staticBaseUrl}${currentAttachment.url}`;
    link.download = currentAttachment.originalName;
    link.click();
  };

  const isImage = currentAttachment.mimetype?.startsWith('image/');
  const isVideo = currentAttachment.mimetype?.startsWith('video/');
  const isPDF = currentAttachment.mimetype === 'application/pdf';
  const isDocument = currentAttachment.mimetype?.includes('document') || 
                     currentAttachment.mimetype?.includes('word') ||
                     currentAttachment.mimetype === 'text/plain';

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Attachment Preview</DialogTitle>
          <DialogDescription>
            Preview and download attached files
          </DialogDescription>
        </DialogHeader>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/50">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{currentAttachment.originalName}</h3>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(currentAttachment.size)} • {currentIndex + 1} of {attachments.length}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {isImage && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom((prev) => Math.max(25, prev - 25))}
                  disabled={zoom <= 25}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[50px] text-center">{zoom}%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom((prev) => Math.min(200, prev + 25))}
                  disabled={zoom >= 200}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom(100)}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="relative flex items-center justify-center bg-black/5 overflow-auto" style={{ height: 'calc(90vh - 80px)' }}>
          {attachments.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-background/80 hover:bg-background z-10"
                onClick={handlePrevious}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-background/80 hover:bg-background z-10"
                onClick={handleNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          <div className="w-full h-full flex items-center justify-center p-4">
            {isImage && (
              <img
                src={`${config.staticBaseUrl}${currentAttachment.url}`}
                alt={currentAttachment.originalName}
                className="max-w-full max-h-full object-contain"
                style={{ transform: `scale(${zoom / 100})` }}
              />
            )}

            {isVideo && (
              <video
                controls
                className="max-w-full max-h-full"
                src={`${config.staticBaseUrl}${currentAttachment.url}`}
              >
                Your browser does not support the video tag.
              </video>
            )}

            {isPDF && (
              <iframe
                src={`${config.staticBaseUrl}${currentAttachment.url}#toolbar=1`}
                className="w-full h-full border-0"
                title={currentAttachment.originalName}
              />
            )}

            {isDocument && !isPDF && (
              <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
                <FileText className="h-20 w-20 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold mb-2">{currentAttachment.originalName}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Document preview not available. Click download to view the file.
                  </p>
                  <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </Button>
                </div>
              </div>
            )}

            {!isImage && !isVideo && !isPDF && !isDocument && (
              <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
                <File className="h-20 w-20 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold mb-2">{currentAttachment.originalName}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Preview not available for this file type.
                  </p>
                  <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Thumbnail Navigation */}
        {attachments.length > 1 && (
          <div className="border-t bg-muted/50 p-2">
            <div className="flex gap-2 overflow-x-auto">
              {attachments.map((attachment, index) => {
                const isImageThumb = attachment.mimetype?.startsWith('image/');
                return (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentIndex(index);
                      setZoom(100);
                    }}
                    className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all ${
                      index === currentIndex
                        ? 'border-primary scale-110'
                        : 'border-transparent hover:border-primary/50'
                    }`}
                  >
                    {isImageThumb ? (
                      <img
                        src={`${config.staticBaseUrl}${attachment.url}`}
                        alt={attachment.originalName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <File className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
