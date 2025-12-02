import { ragConfig } from '@/lib/config/rag';

export interface Chunk {
  text: string;
  index: number;
  metadata: {
    section?: string;
    startPos?: number;
    endPos?: number;
    [key: string]: any;
  };
}

/**
 * Convert HTML content to plain text
 */
export function htmlToText(html: string): string {
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Replace HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // Replace block elements with newlines
  text = text.replace(/<\/?(p|div|h[1-6]|li|br|hr)[^>]*>/gi, '\n');
  text = text.replace(/<\/?(ul|ol|dl|table|tr)[^>]*>/gi, '\n');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Clean up whitespace
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.trim();

  return text;
}

/**
 * Split text into semantic chunks
 */
export function chunkText(
  text: string,
  chunkSize: number = ragConfig.chunkSize,
  chunkOverlap: number = ragConfig.chunkOverlap
): Chunk[] {
  const chunks: Chunk[] = [];
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  let currentChunk = '';
  let currentIndex = 0;
  let startPos = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    
    // If adding this paragraph would exceed chunk size, save current chunk
    if (currentChunk.length > 0 && (currentChunk.length + paragraph.length + 2) > chunkSize) {
      chunks.push({
        text: currentChunk.trim(),
        index: currentIndex++,
        metadata: {
          startPos,
          endPos: startPos + currentChunk.length,
        },
      });

      // Start new chunk with overlap
      const overlapText = getOverlapText(currentChunk, chunkOverlap);
      currentChunk = overlapText + '\n\n' + paragraph;
      startPos = startPos + currentChunk.length - overlapText.length - paragraph.length - 2;
    } else {
      if (currentChunk.length > 0) {
        currentChunk += '\n\n' + paragraph;
      } else {
        currentChunk = paragraph;
      }
    }
  }

  // Add the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      index: currentIndex,
      metadata: {
        startPos,
        endPos: startPos + currentChunk.length,
      },
    });
  }

  return chunks;
}

/**
 * Get overlap text from the end of a chunk
 */
function getOverlapText(text: string, overlapSize: number): string {
  if (text.length <= overlapSize) {
    return text;
  }

  // Try to break at sentence boundary
  const lastSentences = text.slice(-overlapSize * 2);
  const sentenceMatch = lastSentences.match(/[.!?]\s+[A-Z]/);
  
  if (sentenceMatch && sentenceMatch.index !== undefined) {
    return lastSentences.slice(sentenceMatch.index + 1).trim();
  }

  // Fallback to character boundary
  return text.slice(-overlapSize);
}

/**
 * Chunk contract content (HTML to text, then chunk)
 */
export function chunkContractContent(content: string): Chunk[] {
  const plainText = htmlToText(content);
  return chunkText(plainText);
}

