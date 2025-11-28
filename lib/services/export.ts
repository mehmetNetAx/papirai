import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import Contract from '@/lib/db/models/Contract';
import ContractVariable from '@/lib/db/models/ContractVariable';
import connectDB from '@/lib/db/connection';

// Helper function to parse HTML and convert to Word document elements
function parseHTMLToWordElements(html: string): Paragraph[] {
  const elements: Paragraph[] = [];
  
  // Remove track changes spans (they have style attributes with red color)
  html = html.replace(/<span[^>]*style="[^"]*color:\s*#dc2626[^"]*"[^>]*>([^<]*)<\/span>/gi, '$1');
  
  // Normalize HTML - ensure proper structure
  html = html.replace(/<br\s*\/?>/gi, '\n');
  
  // Extract block-level elements using regex
  // Match opening tags, content, and closing tags
  const blockPattern = /<(p|h1|h2|h3|h4|h5|h6|div|li)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  let lastIndex = 0;
  
  while ((match = blockPattern.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const content = match[2];
    const fullMatch = match[0];
    
    // Check if there's text before this block
    const beforeText = html.substring(lastIndex, match.index).trim();
    if (beforeText && !beforeText.match(/^<[^>]+>$/)) {
      // Add as regular paragraph
      const cleanBefore = beforeText.replace(/<[^>]+>/g, '').trim();
      if (cleanBefore) {
        elements.push(createParagraphFromHTML(cleanBefore, null, false));
      }
    }
    
    // Determine heading level
    let headingLevel: typeof HeadingLevel[keyof typeof HeadingLevel] | null = null;
    let isListItem = false;
    
    if (tag === 'h1') headingLevel = HeadingLevel.HEADING_1;
    else if (tag === 'h2') headingLevel = HeadingLevel.HEADING_2;
    else if (tag === 'h3') headingLevel = HeadingLevel.HEADING_3;
    else if (tag === 'h4') headingLevel = HeadingLevel.HEADING_4;
    else if (tag === 'h5') headingLevel = HeadingLevel.HEADING_5;
    else if (tag === 'h6') headingLevel = HeadingLevel.HEADING_6;
    else if (tag === 'li') isListItem = true;
    
    // Create paragraph from content
    if (content.trim()) {
      elements.push(createParagraphFromHTML(content, headingLevel, isListItem));
    }
    
    lastIndex = blockPattern.lastIndex;
  }
  
  // Handle any remaining text after last block
  const remainingText = html.substring(lastIndex).trim();
  if (remainingText && !remainingText.match(/^<[^>]+>$/)) {
    const cleanRemaining = remainingText.replace(/<[^>]+>/g, '').trim();
    if (cleanRemaining) {
      elements.push(createParagraphFromHTML(cleanRemaining, null, false));
    }
  }
  
  // If no blocks found, treat entire content as a paragraph
  if (elements.length === 0 && html.trim()) {
    const cleanHtml = html.replace(/<[^>]+>/g, '').trim();
    if (cleanHtml) {
      elements.push(createParagraphFromHTML(html, null, false));
    }
  }
  
  return elements;
}

// Helper function to create a Paragraph from HTML text with formatting
function createParagraphFromHTML(
  html: string,
  headingLevel: typeof HeadingLevel[keyof typeof HeadingLevel] | null = null,
  isListItem: boolean = false
): Paragraph {
  const textRuns: TextRun[] = [];
  
  // Remove block-level tags that might be left
  html = html.replace(/<\/?(p|div|h1|h2|h3|h4|h5|h6|ul|ol)[^>]*>/gi, '');
  
  // Use a stack-based approach for nested formatting tags
  const formatStack: Array<'bold' | 'italic' | 'underline'> = [];
  let currentText = '';
  let i = 0;
  
  while (i < html.length) {
    // Check for opening tags
    const openMatch = html.substring(i).match(/^<(strong|b|em|i|u)[^>]*>/i);
    if (openMatch) {
      // Save any accumulated text with current format
      if (currentText.trim()) {
        const format = getFormatFromStack(formatStack);
        textRuns.push(createTextRun(currentText, format));
        currentText = '';
      }
      
      const tag = openMatch[1].toLowerCase();
      if (tag === 'strong' || tag === 'b') {
        formatStack.push('bold');
      } else if (tag === 'em' || tag === 'i') {
        formatStack.push('italic');
      } else if (tag === 'u') {
        formatStack.push('underline');
      }
      
      i += openMatch[0].length;
      continue;
    }
    
    // Check for closing tags
    const closeMatch = html.substring(i).match(/^<\/(strong|b|em|i|u)[^>]*>/i);
    if (closeMatch) {
      // Save any accumulated text with current format
      if (currentText.trim()) {
        const format = getFormatFromStack(formatStack);
        textRuns.push(createTextRun(currentText, format));
        currentText = '';
      }
      
      const tag = closeMatch[1].toLowerCase();
      // Remove matching format from stack (LIFO - last in first out)
      for (let j = formatStack.length - 1; j >= 0; j--) {
        if ((tag === 'strong' || tag === 'b') && formatStack[j] === 'bold') {
          formatStack.splice(j, 1);
          break;
        } else if ((tag === 'em' || tag === 'i') && formatStack[j] === 'italic') {
          formatStack.splice(j, 1);
          break;
        } else if (tag === 'u' && formatStack[j] === 'underline') {
          formatStack.splice(j, 1);
          break;
        }
      }
      
      i += closeMatch[0].length;
      continue;
    }
    
    // Check for line breaks
    const brMatch = html.substring(i).match(/^<br\s*\/?>/i);
    if (brMatch) {
      if (currentText.trim()) {
        const format = getFormatFromStack(formatStack);
        textRuns.push(createTextRun(currentText, format));
        currentText = '';
      }
      textRuns.push(new TextRun({ text: '\n' }));
      i += brMatch[0].length;
      continue;
    }
    
    // Regular character
    currentText += html[i];
    i++;
  }
  
  // Add any remaining text
  if (currentText.trim()) {
    const format = getFormatFromStack(formatStack);
    textRuns.push(createTextRun(currentText, format));
  }
  
  // If no text runs, create an empty one
  if (textRuns.length === 0) {
    textRuns.push(new TextRun({ text: '' }));
  }
  
  return new Paragraph({
    children: textRuns,
    heading: headingLevel || undefined,
    bullet: isListItem ? { level: 0 } : undefined,
  });
}

// Helper to get current format from stack
function getFormatFromStack(stack: Array<'bold' | 'italic' | 'underline'>): {
  bold: boolean;
  italic: boolean;
  underline: boolean;
} {
  return {
    bold: stack.includes('bold'),
    italic: stack.includes('italic'),
    underline: stack.includes('underline'),
  };
}

// Helper to create a TextRun with formatting
function createTextRun(
  text: string,
  format: { bold: boolean; italic: boolean; underline: boolean }
): TextRun {
  // Clean HTML entities and remaining tags
  const cleanText = text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  
  return new TextRun({
    text: cleanText,
    bold: format.bold,
    italics: format.italic,
    underline: format.underline ? {} : undefined,
  });
}

export async function exportToWord(contractId: string): Promise<Buffer> {
  await connectDB();

  const contract = await Contract.findById(contractId);
  if (!contract) {
    throw new Error('Contract not found');
  }

  const variables = await ContractVariable.find({ contractId });

  // Replace variables in content
  let content = contract.content;
  for (const variable of variables) {
    const regex = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g');
    content = content.replace(regex, variable.value.toString());
  }

  // Parse HTML and convert to Word document elements
  const children = parseHTMLToWordElements(content);
  
  // Add title as first element
  const titleParagraph = new Paragraph({
    text: contract.title,
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 400 },
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [titleParagraph, ...children],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

export async function exportToPDF(contractId: string): Promise<Buffer> {
  await connectDB();

  const contract = await Contract.findById(contractId);
  if (!contract) {
    throw new Error('Contract not found');
  }

  const variables = await ContractVariable.find({ contractId });

  // Replace variables in content
  let content = contract.content;
  for (const variable of variables) {
    const regex = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g');
    content = content.replace(regex, variable.value.toString());
  }

  // Generate PDF using Puppeteer (dynamic import for server-side only)
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  
  // Create HTML from content
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #333; }
        </style>
      </head>
      <body>
        <h1>${contract.title}</h1>
        <div>${content}</div>
      </body>
    </html>
  `;

  await page.setContent(html);
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
  });

  await browser.close();

  return Buffer.from(pdf);
}

