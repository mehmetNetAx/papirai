'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
// import CollaborationCursor from '@tiptap/extension-collaboration-cursor'; // Temporarily disabled
import * as Y from 'yjs';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ContractEditorProps {
  contractId: string;
  initialContent?: string;
  userId: string;
  userName: string;
  onSave?: (content: string) => void;
  readOnly?: boolean;
}

// WebSocket provider for Yjs
class WebSocketProvider {
  private ws: WebSocket | null = null;
  private ydoc: Y.Doc;
  private awareness: any;
  private room: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(ydoc: Y.Doc, room: string, awareness: any) {
    this.ydoc = ydoc;
    this.room = room;
    this.awareness = awareness;
    this.connect();
  }

  private connect() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/websocket?room=${this.room}`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        // Send sync message - Yjs will handle sync automatically via updates
        // No need to manually encode sync messages
      };

      this.ws.onmessage = (event) => {
        try {
          const message = new Uint8Array(event.data);
          Y.applyUpdate(this.ydoc, message);
        } catch (error) {
          console.warn('Error applying Yjs update:', error);
        }
      };

      this.ws.onerror = (error) => {
        // Silently handle WebSocket errors - WebSocket server may not be available
        // This is expected in development when WebSocket server is not running
      };

      this.ws.onclose = () => {
        // Only attempt to reconnect if we haven't exceeded max attempts
        // and if the connection was previously established
        if (this.reconnectAttempts < this.maxReconnectAttempts && this.ws?.readyState === WebSocket.CLOSED) {
          this.reconnectAttempts++;
          setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
        }
      };
    } catch (error) {
      // Silently handle WebSocket connection errors
      // Editor will work without real-time collaboration
    }
  }

  public sendUpdate(update: Uint8Array) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(update);
    }
  }

  public destroy() {
    this.ws?.close();
  }
}

export default function ContractEditor({
  contractId,
  initialContent,
  userId,
  userName,
  onSave,
  readOnly = false,
}: ContractEditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<WebSocketProvider | null>(null);
  const [useCollaboration, setUseCollaboration] = useState(false);

  // Build extensions array
  // Note: When Collaboration is used, initialContent is ignored - content comes from Yjs document
  // For now, we'll use normal editor without Collaboration to ensure initialContent loads
  const extensions = [
    StarterKit,
    // Collaboration temporarily disabled to allow initialContent to load
    // Collaboration.configure({
    //   document: ydoc,
    // }),
  ];

  const editor = useEditor({
    extensions,
    content: initialContent || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      // Auto-save could be implemented here
    },
  });

  // Load initial content into editor when it becomes available
  useEffect(() => {
    if (!editor) return;
    
    // Set content if initialContent is provided and editor is empty or different
    if (initialContent) {
      const currentContent = editor.getHTML();
      // Check if editor is empty or content is different
      if (!currentContent || currentContent === '<p></p>' || currentContent.trim() === '') {
        editor.commands.setContent(initialContent);
      } else if (currentContent !== initialContent) {
        // Only update if content is actually different
        editor.commands.setContent(initialContent);
      }
    }
  }, [editor, initialContent]);

  useEffect(() => {
    if (!editor) return;

    // Set up Yjs provider
    // Note: WebSocket connection may not be available in development
    // Editor will work without real-time collaboration if WebSocket is unavailable
    try {
      const Awareness = (window as any).Awareness;
      const awareness = Awareness ? new Awareness(ydoc) : null;
      const wsProvider = new WebSocketProvider(ydoc, contractId, awareness);
      setProvider(wsProvider);

      // Listen for Yjs updates
      const updateHandler = () => {
        // Yjs updates are handled automatically by Collaboration extension
      };

      ydoc.on('update', updateHandler);

      return () => {
        try {
          wsProvider.destroy();
          ydoc.off('update', updateHandler);
        } catch (error) {
          // Silently handle cleanup errors
        }
      };
    } catch (error) {
      // Silently handle WebSocket provider setup errors
      // Editor will work without real-time collaboration
    }
  }, [editor, contractId, ydoc]);

  const handleSave = async () => {
    if (!editor || !onSave) return;

    setIsSaving(true);
    try {
      const content = editor.getHTML();
      await onSave(content);
      // Redirect to contract detail page after successful save
      router.push(`/dashboard/contracts/${contractId}`);
      router.refresh();
    } catch (error) {
      console.error('Save error:', error);
      alert('Kaydetme sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <Card>
      <CardContent className="p-4">
        {!readOnly && (
          <div className="mb-4 flex items-center justify-between border-b pb-2">
            <div className="flex gap-2">
              <Button
                onClick={() => editor.chain().focus().toggleBold().run()}
                variant={editor.isActive('bold') ? 'default' : 'outline'}
                size="sm"
              >
                <strong>B</strong>
              </Button>
              <Button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                variant={editor.isActive('italic') ? 'default' : 'outline'}
                size="sm"
              >
                <em>I</em>
              </Button>
              <Button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'outline'}
                size="sm"
              >
                H1
              </Button>
              <Button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'outline'}
                size="sm"
              >
                H2
              </Button>
              <Button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                variant={editor.isActive('bulletList') ? 'default' : 'outline'}
                size="sm"
              >
                •
              </Button>
            </div>
            {onSave && (
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>
        )}
        <EditorContent
          editor={editor}
          className="prose max-w-none min-h-[500px] p-4 focus:outline-none"
        />
      </CardContent>
    </Card>
  );
}

