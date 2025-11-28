import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import { analyzeContract } from '@/lib/services/contract-analysis';
import { canViewContract } from '@/lib/utils/permissions';
import mongoose from 'mongoose';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    await connectDB();

    // Get contract
    const contract = await Contract.findById(id);
    if (!contract) {
      return NextResponse.json(
        { error: 'Sözleşme bulunamadı' },
        { status: 404 }
      );
    }

    // Check permissions
    if (!(await canViewContract(
      session.user, 
      contract.companyId, 
      contract.workspaceId,
      contract.createdBy?.toString(), 
      contract.allowedEditors,
      contract.assignedUsers,
      id // contractId for checking ContractUserAssignment table
    ))) {
      return NextResponse.json(
        { error: 'Bu sözleşmeyi görüntüleme yetkiniz yok' },
        { status: 403 }
      );
    }

      // Extract text content from HTML
      const textContent = contract.content
        .replace(/<[^>]*>/g, ' ') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      if (!textContent || textContent.length < 100) {
        return NextResponse.json(
          { error: 'Sözleşme içeriği analiz için yeterli değil' },
          { status: 400 }
        );
      }

      // Start analysis
      const analysisResult = await analyzeContract(
        id,
        textContent,
        contract.title,
        session.user.id
      );

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
    });
  } catch (error: any) {
    console.error('Error analyzing contract:', error);
    return NextResponse.json(
      { error: error.message || 'Sözleşme analizi sırasında bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    await connectDB();

    // Get contract
    const contract = await Contract.findById(id);
    if (!contract) {
      return NextResponse.json(
        { error: 'Sözleşme bulunamadı' },
        { status: 404 }
      );
    }

    // Check permissions
    if (!(await canViewContract(
      session.user, 
      contract.companyId, 
      contract.workspaceId,
      contract.createdBy?.toString(), 
      contract.allowedEditors,
      contract.assignedUsers,
      id // contractId for checking ContractUserAssignment table
    ))) {
      return NextResponse.json(
        { error: 'Bu sözleşmeyi görüntüleme yetkiniz yok' },
        { status: 403 }
      );
    }

      // Get latest analysis
      const { getContractAnalysis } = await import('@/lib/services/contract-analysis');
      const analysis = await getContractAnalysis(id);

      if (!analysis) {
        return NextResponse.json(
          { error: 'Bu sözleşme için analiz bulunamadı' },
          { status: 404 }
        );
      }

    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error('Error fetching analysis:', error);
    return NextResponse.json(
      { error: error.message || 'Analiz bilgisi alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
}

