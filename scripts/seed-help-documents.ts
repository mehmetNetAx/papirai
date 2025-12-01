/**
 * Seed script to populate help documents from USER_TRAINING_GUIDE.md
 * 
 * This script reads the training guide and creates help documents for each module.
 * Run with: npm run seed:help
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import HelpDocument from '../lib/db/models/HelpDocument';
import User from '../lib/db/models/User';

dotenv.config({ path: path.join(process.cwd(), '.env') });

// Module mapping from guide sections to module names
const moduleMapping: Record<string, string> = {
  '1. Giriş ve Genel Bakış': 'dashboard',
  '2. Hesap Oluşturma ve Giriş': 'dashboard',
  '3. Dashboard Kullanımı': 'dashboard',
  '4. Sözleşme Oluşturma': 'contracts',
  '5. Sözleşme Düzenleme ve İşbirliği': 'contracts',
  '6. Doküman Yönetimi': 'documents',
  '7. Master Değişkenler': 'master-variables',
  '8. Versiyon Kontrolü': 'contracts',
  '9. Onay İş Akışları': 'approvals',
  '10. İmza Süreçleri': 'signatures',
  '11. Uyum Takibi': 'compliance',
  '12. Raporlama ve Analitik': 'reports',
  '13. Şirket ve Kullanıcı Yönetimi': 'companies',
  '14. Entegrasyonlar': 'integrations',
  '15. İpuçları ve En İyi Uygulamalar': 'dashboard',
};

// Extract content for a section
function extractSectionContent(markdown: string, sectionTitle: string): string | null {
  // Find the section header
  const sectionRegex = new RegExp(`^## ${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'm');
  const match = markdown.match(sectionRegex);
  
  if (!match) {
    return null;
  }

  const startIndex = match.index! + match[0].length;
  
  // Find the next section (##) or end of file
  const nextSectionRegex = /^## /m;
  const remainingContent = markdown.substring(startIndex);
  const nextMatch = remainingContent.match(nextSectionRegex);
  
  const endIndex = nextMatch ? startIndex + nextMatch.index! : markdown.length;
  
  return markdown.substring(startIndex, endIndex).trim();
}

// Split content into subsections
function splitIntoSubsections(content: string): Array<{ title: string; content: string; order: number }> {
  const subsections: Array<{ title: string; content: string; order: number }> = [];
  
  // Split by ### headers (subsections)
  const subsectionRegex = /^### (.*)$/gm;
  let lastIndex = 0;
  let order = 0;
  let match;
  
  while ((match = subsectionRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      // Add content before this subsection
      const prevContent = content.substring(lastIndex, match.index).trim();
      if (prevContent) {
        subsections.push({
          title: '',
          content: prevContent,
          order: order++,
        });
      }
    }
    
    const subsectionTitle = match[1];
    const subsectionStart = match.index + match[0].length;
    
    // Find next subsection or end
    const nextMatch = subsectionRegex.exec(content);
    const subsectionEnd = nextMatch ? nextMatch.index : content.length;
    
    const subsectionContent = content.substring(subsectionStart, subsectionEnd).trim();
    
    subsections.push({
      title: subsectionTitle,
      content: subsectionContent,
      order: order++,
    });
    
    lastIndex = subsectionEnd;
    subsectionRegex.lastIndex = subsectionEnd;
  }
  
  // Add remaining content
  if (lastIndex < content.length) {
    const remainingContent = content.substring(lastIndex).trim();
    if (remainingContent) {
      subsections.push({
        title: '',
        content: remainingContent,
        order: order++,
      });
    }
  }
  
  // If no subsections found, return the whole content as one document
  if (subsections.length === 0) {
    return [{
      title: '',
      content: content,
      order: 0,
    }];
  }
  
  return subsections;
}

async function seedHelpDocuments() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to database');

    // Find or create a system admin user for createdBy
    let adminUser = await User.findOne({ role: 'system_admin' }).lean();
    
    if (!adminUser) {
      // Create a default admin user if none exists
      const firstUser = await User.findOne().lean();
      if (!firstUser) {
        throw new Error('No users found. Please create a user first.');
      }
      adminUser = firstUser;
    }

    // Read the training guide
    const guidePath = path.join(process.cwd(), 'docs', 'USER_TRAINING_GUIDE.md');
    if (!fs.existsSync(guidePath)) {
      throw new Error(`Training guide not found at ${guidePath}`);
    }

    const markdown = fs.readFileSync(guidePath, 'utf-8');
    console.log('Training guide loaded');

    // Process each section
    let totalCreated = 0;
    let totalUpdated = 0;

    for (const [sectionTitle, module] of Object.entries(moduleMapping)) {
      console.log(`\nProcessing: ${sectionTitle} -> ${module}`);
      
      const sectionContent = extractSectionContent(markdown, sectionTitle);
      
      if (!sectionContent) {
        console.log(`  ⚠️  Section not found: ${sectionTitle}`);
        continue;
      }

      // Split into subsections
      const subsections = splitIntoSubsections(sectionContent);
      console.log(`  Found ${subsections.length} subsection(s)`);

      for (const subsection of subsections) {
        const title = subsection.title || sectionTitle.replace(/^\d+\.\s*/, '');
        const content = subsection.content;
        const order = subsection.order;

        // Check if document already exists
        const existing = await HelpDocument.findOne({
          module,
          title,
        });

        if (existing) {
          // Update existing document
          existing.content = content;
          existing.order = order;
          existing.updatedBy = adminUser._id;
          await existing.save();
          console.log(`  ✓ Updated: ${title}`);
          totalUpdated++;
        } else {
          // Create new document
          await HelpDocument.create({
            module,
            title,
            content,
            order,
            isActive: true,
            createdBy: adminUser._id,
          });
          console.log(`  ✓ Created: ${title}`);
          totalCreated++;
        }
      }
    }

    console.log(`\n✅ Seeding completed!`);
    console.log(`   Created: ${totalCreated} documents`);
    console.log(`   Updated: ${totalUpdated} documents`);

    await mongoose.disconnect();
    console.log('Disconnected from database');
  } catch (error: any) {
    console.error('Error seeding help documents:', error);
    process.exit(1);
  }
}

// Run the seed function
seedHelpDocuments();
