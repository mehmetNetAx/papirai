'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExportPDFButtonProps {
  contractId: string;
  contractTitle: string;
}

export default function ExportPDFButton({ contractId, contractTitle }: ExportPDFButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'word' | null>(null);

  const handleExport = async (format: 'pdf' | 'word') => {
    setIsExporting(true);
    setExportFormat(format);
    
    try {
      const response = await fetch(`/api/contracts/${contractId}/export?format=${format}`, {
        method: 'GET',
      });

      if (!response.ok) {
        // Try to parse error message
        let errorMessage = `${format.toUpperCase()} indirilemedi`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        alert(`Hata: ${errorMessage}`);
        setIsExporting(false);
        setExportFormat(null);
        return;
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      const expectedContentType = format === 'pdf' 
        ? 'application/pdf' 
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      
      if (!contentType || !contentType.includes(expectedContentType.split('/')[1])) {
        // Try to parse as JSON error
        try {
          const errorData = await response.json();
          alert(`Hata: ${errorData.error || `${format.toUpperCase()} oluşturulamadı`}`);
        } catch {
          alert(`${format.toUpperCase()} oluşturulamadı. Lütfen tekrar deneyin.`);
        }
        setIsExporting(false);
        setExportFormat(null);
        return;
      }

      // Get the file blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extension = format === 'pdf' ? 'pdf' : 'docx';
      a.download = `${contractTitle.replace(/[^a-z0-9]/gi, '_')}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Export error:', error);
      alert(`Hata: ${error.message || `${format.toUpperCase()} indirilirken bir hata oluştu`}`);
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          <span className="material-symbols-outlined text-lg mr-2">
            {isExporting ? 'hourglass_empty' : 'download'}
          </span>
          {isExporting 
            ? (exportFormat === 'pdf' ? 'PDF İndiriliyor...' : 'Word İndiriliyor...')
            : 'Dışa Aktar'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => handleExport('pdf')}
          disabled={isExporting}
        >
          <span className="material-symbols-outlined text-base mr-2">picture_as_pdf</span>
          PDF İndir
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleExport('word')}
          disabled={isExporting}
        >
          <span className="material-symbols-outlined text-base mr-2">description</span>
          Word İndir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

