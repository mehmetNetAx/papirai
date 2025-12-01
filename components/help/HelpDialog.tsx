'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface HelpDocument {
  _id: string;
  module: string;
  title: string;
  content: string;
  order: number;
  images?: string[];
  metadata?: {
    videoUrl?: string;
    tags?: string[];
    relatedModules?: string[];
  };
  createdBy?: {
    name: string;
    email: string;
  };
  updatedAt?: string;
}

interface HelpDialogProps {
  module: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HelpDialog({ module, open, onOpenChange }: HelpDialogProps) {
  const [helpDocuments, setHelpDocuments] = useState<HelpDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && module) {
      loadHelpDocuments();
    }
  }, [open, module]);

  const loadHelpDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/help/module/${encodeURIComponent(module)}`);
      if (!response.ok) {
        throw new Error('Failed to load help documents');
      }
      const data = await response.json();
      setHelpDocuments(data.helpDocuments || []);
    } catch (err: any) {
      console.error('Error loading help documents:', err);
      setError(err.message || 'Yardım dokümanları yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };


  // Get S3 URL for images
  const getImageUrl = (imageKey: string) => {
    // If it's already a full URL, return as is
    if (imageKey.startsWith('http://') || imageKey.startsWith('https://')) {
      return imageKey;
    }
    // Otherwise, construct S3 URL (adjust based on your S3 setup)
    return `/api/files/${imageKey}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="material-symbols-outlined">help</span>
            Yardım: {module.charAt(0).toUpperCase() + module.slice(1)}
          </DialogTitle>
          <DialogDescription>
            Bu modül için yardım dokümanları
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && helpDocuments.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2">info</span>
            <p>Bu modül için henüz yardım dokümanı bulunmamaktadır.</p>
          </div>
        )}

        {!loading && !error && helpDocuments.length > 0 && (
          <div className="space-y-6 mt-4">
            {helpDocuments.map((doc) => (
              <div key={doc._id} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-b-0">
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                  {doc.title}
                </h3>
                
                {/* Images */}
                {doc.images && doc.images.length > 0 && (
                  <div className="my-4 space-y-2">
                    {doc.images.map((imageKey, index) => (
                      <div key={index} className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <img
                          src={getImageUrl(imageKey)}
                          alt={`${doc.title} - Görsel ${index + 1}`}
                          className="w-full h-auto"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Video */}
                {doc.metadata?.videoUrl && (
                  <div className="my-4">
                    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                      <iframe
                        src={doc.metadata.videoUrl}
                        className="w-full aspect-video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="prose prose-sm max-w-none dark:prose-invert text-gray-700 dark:text-gray-300 prose-headings:font-semibold prose-p:mb-4 prose-ul:list-disc prose-ol:list-decimal prose-li:my-1 prose-code:bg-gray-100 prose-code:dark:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-gray-100 prose-pre:dark:bg-gray-800 prose-pre:p-4 prose-pre:rounded prose-pre:overflow-x-auto prose-a:text-blue-600 prose-a:dark:text-blue-400 prose-a:no-underline hover:prose-a:underline">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {doc.content}
                  </ReactMarkdown>
                </div>

                {/* Tags */}
                {doc.metadata?.tags && doc.metadata.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {doc.metadata.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Related Modules */}
                {doc.metadata?.relatedModules && doc.metadata.relatedModules.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">İlgili Modüller:</p>
                    <div className="flex flex-wrap gap-2">
                      {doc.metadata.relatedModules.map((relatedModule, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Could navigate to related module help
                            console.log('Related module:', relatedModule);
                          }}
                        >
                          {relatedModule}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

