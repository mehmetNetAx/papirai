import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import { requireAuth } from '@/lib/auth/middleware';
import ContractAttachment from '@/lib/db/models/ContractAttachment';
import Contract from '@/lib/db/models/Contract';
import { deleteFromS3, getSignedUrlForS3 } from '@/lib/aws/s3';
import mongoose from 'mongoose';
import { canEditContract } from '@/lib/utils/permissions';

// GET - Download attachment
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id, attachmentId } = await params;
      await connectDB();

      const contractObjectId = new mongoose.Types.ObjectId(id);
      const attachmentObjectId = new mongoose.Types.ObjectId(attachmentId);

      // Check if contract exists
      const contract = await Contract.findById(contractObjectId).lean();
      if (!contract || !contract.isActive) {
        return NextResponse.json(
          { error: 'Contract not found' },
          { status: 404 }
        );
      }

      // Check access
      if (!canEditContract(user, contract.companyId, contract.createdBy?.toString(), contract.allowedEditors)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      // Get attachment
      const attachment = await ContractAttachment.findOne({
        _id: attachmentObjectId,
        contractId: contractObjectId,
        isActive: true,
      }).lean();

      if (!attachment) {
        return NextResponse.json(
          { error: 'Attachment not found' },
          { status: 404 }
        );
      }

      // Generate signed URL for download
      try {
        const signedUrl = await getSignedUrlForS3(attachment.s3Key, 3600); // 1 hour expiry
        return NextResponse.json({ downloadUrl: signedUrl });
      } catch (error: any) {
        console.error('Error generating signed URL:', error);
        return NextResponse.json(
          { error: 'Failed to generate download URL' },
          { status: 500 }
        );
      }
    } catch (error: any) {
      console.error('Error fetching attachment:', error);
      return NextResponse.json(
        { error: 'Failed to fetch attachment' },
        { status: 500 }
      );
    }
  })(req);
}

// DELETE - Delete attachment
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id, attachmentId } = await params;
      await connectDB();

      const contractObjectId = new mongoose.Types.ObjectId(id);
      const attachmentObjectId = new mongoose.Types.ObjectId(attachmentId);

      // Check if contract exists
      const contract = await Contract.findById(contractObjectId).lean();
      if (!contract || !contract.isActive) {
        return NextResponse.json(
          { error: 'Contract not found' },
          { status: 404 }
        );
      }

      // Check edit access
      if (!canEditContract(user, contract.companyId, contract.createdBy?.toString(), contract.allowedEditors)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      // Get attachment
      const attachment = await ContractAttachment.findOne({
        _id: attachmentObjectId,
        contractId: contractObjectId,
        isActive: true,
      });

      if (!attachment) {
        return NextResponse.json(
          { error: 'Attachment not found' },
          { status: 404 }
        );
      }

      // Delete from S3 (optional - continue even if it fails)
      try {
        await deleteFromS3(attachment.s3Key);
      } catch (s3Error: any) {
        console.warn('Failed to delete from S3 (continuing with DB deletion):', s3Error.message);
      }

      // Soft delete - mark as inactive
      attachment.isActive = false;
      await attachment.save();

      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting attachment:', error);
      return NextResponse.json(
        { error: 'Failed to delete attachment' },
        { status: 500 }
      );
    }
  })(req);
}

