import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import { requireAuth } from '@/lib/auth/middleware';
import { importDocument } from '@/lib/services/import';

// POST - Import contract
export async function POST(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const formData = await req.formData();
      const file = formData.get('file') as File;
      const title = formData.get('title') as string;
      const workspaceId = formData.get('workspaceId') as string;
      const useAIValue = formData.get('useAI') as string | null;
      // Default to true if not provided or if value is 'true'
      const useAI = useAIValue === null || useAIValue === 'true';

      if (!file || !title || !workspaceId) {
        return NextResponse.json(
          { error: 'File, title, and workspace ID are required' },
          { status: 400 }
        );
      }

      // Validate file type
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['pdf', 'doc', 'docx', 'txt'];
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        return NextResponse.json(
          { error: 'Invalid file type. Only PDF, Word (DOC/DOCX), and TXT files are allowed.' },
          { status: 400 }
        );
      }

      const contractId = await importDocument(
        file, 
        file.name, 
        {
          title,
          workspaceId,
          companyId: user.companyId,
          createdBy: user.id,
        },
        { useAI }
      );

      // Generate embeddings in the background (don't wait for it)
      try {
        const { generateContractEmbeddings } = await import('@/lib/services/ai/embedding');
        // Run in background - don't await to avoid blocking response
        generateContractEmbeddings(contractId).catch((error) => {
          console.error('Error generating embeddings for imported contract:', error);
          // Don't fail import if embedding generation fails
        });
      } catch (error) {
        console.error('Error importing embedding service:', error);
        // Don't fail import if embedding service import fails
      }

      return NextResponse.json({ contractId }, { status: 201 });
    } catch (error: any) {
      console.error('Error importing contract:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        code: error.code,
      });
      
      // Provide more detailed error messages
      let errorMessage = 'Dosya yüklenirken bir hata oluştu';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code === 'ENOENT') {
        errorMessage = 'Dosya bulunamadı';
      } else if (error.code === 'EACCES') {
        errorMessage = 'Dosyaya erişim izni yok';
      } else if (error.name === 'ValidationError') {
        errorMessage = 'Dosya formatı geçersiz';
      } else if (error.message?.includes('AWS') || error.message?.includes('S3')) {
        errorMessage = `S3 yükleme hatası: ${error.message}`;
      } else if (error.message?.includes('Gemini') || error.message?.includes('AI')) {
        errorMessage = `AI parse hatası: ${error.message}`;
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }
  })(req);
}

