import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import { requireAuth } from '@/lib/auth/middleware';
import ContractAttachment, { AttachmentType } from '@/lib/db/models/ContractAttachment';
import Contract from '@/lib/db/models/Contract';
import { uploadToS3, getSignedUrlForS3, deleteFromS3 } from '@/lib/aws/s3';
import mongoose from 'mongoose';
import { canEditContract } from '@/lib/utils/permissions';

// GET - List attachments for a contract
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      await connectDB();

      const contractObjectId = new mongoose.Types.ObjectId(id);
      
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

      // Get attachments
      const attachments = await ContractAttachment.find({
        contractId: contractObjectId,
        isActive: true,
      })
        .populate('uploadedBy', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      // Generate signed URLs for S3 files
      const attachmentsWithUrls = await Promise.all(
        attachments.map(async (attachment: any) => {
          try {
            const signedUrl = await getSignedUrlForS3(attachment.s3Key, 3600); // 1 hour expiry
            return {
              ...attachment,
              _id: attachment._id.toString(),
              contractId: attachment.contractId.toString(),
              uploadedBy: attachment.uploadedBy ? {
                _id: attachment.uploadedBy._id.toString(),
                name: attachment.uploadedBy.name,
                email: attachment.uploadedBy.email,
              } : null,
              downloadUrl: signedUrl,
            };
          } catch (error) {
            console.error(`Error generating signed URL for ${attachment.s3Key}:`, error);
            return {
              ...attachment,
              _id: attachment._id.toString(),
              contractId: attachment.contractId.toString(),
              uploadedBy: attachment.uploadedBy ? {
                _id: attachment.uploadedBy._id.toString(),
                name: attachment.uploadedBy.name,
                email: attachment.uploadedBy.email,
              } : null,
              downloadUrl: null,
            };
          }
        })
      );

      return NextResponse.json({ attachments: attachmentsWithUrls });
    } catch (error: any) {
      console.error('Error fetching attachments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch attachments' },
        { status: 500 }
      );
    }
  })(req);
}

// POST - Upload attachment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      await connectDB();

      const contractObjectId = new mongoose.Types.ObjectId(id);
      
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

      const formData = await req.formData();
      const file = formData.get('file') as File;
      const attachmentType = formData.get('attachmentType') as AttachmentType;
      const description = formData.get('description') as string | null;

      if (!file) {
        return NextResponse.json(
          { error: 'File is required' },
          { status: 400 }
        );
      }

      if (!attachmentType) {
        return NextResponse.json(
          { error: 'Attachment type is required' },
          { status: 400 }
        );
      }

      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: 'File size exceeds 50MB limit' },
          { status: 400 }
        );
      }

      // Convert file to buffer
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      
      // Generate S3 key
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const s3Key = `contracts/${contract.companyId}/attachments/${contractObjectId}/${timestamp}_${sanitizedFileName}`;

      // Upload to S3
      let uploadedS3Key: string;
      try {
        uploadedS3Key = await uploadToS3(s3Key, fileBuffer, file.type);
      } catch (s3Error: any) {
        console.error('S3 upload error:', s3Error);
        return NextResponse.json(
          { error: `S3 upload failed: ${s3Error.message}` },
          { status: 500 }
        );
      }

      // Create attachment record
      const attachment = await ContractAttachment.create({
        contractId: contractObjectId,
        fileName: sanitizedFileName,
        originalFileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        attachmentType,
        description: description || undefined,
        s3Key: uploadedS3Key,
        uploadedBy: new mongoose.Types.ObjectId(user.id),
        metadata: {
          uploadedAt: new Date(),
        },
      });

      // Populate uploadedBy
      await attachment.populate('uploadedBy', 'name email');

      return NextResponse.json(
        {
          attachment: {
            ...attachment.toObject(),
            _id: attachment._id.toString(),
            contractId: attachment.contractId.toString(),
            uploadedBy: attachment.uploadedBy ? {
              _id: (attachment.uploadedBy as any)._id.toString(),
              name: (attachment.uploadedBy as any).name,
              email: (attachment.uploadedBy as any).email,
            } : null,
          },
        },
        { status: 201 }
      );
    } catch (error: any) {
      console.error('Error uploading attachment:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to upload attachment' },
        { status: 500 }
      );
    }
  })(req);
}

