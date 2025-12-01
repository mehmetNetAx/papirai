import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import Company from '@/lib/db/models/Company';
import CompanyDocument from '@/lib/db/models/CompanyDocument';
import ContractAttachment from '@/lib/db/models/ContractAttachment';
import { checkContractAttachedDocuments } from '@/lib/services/document-validity';
import { getSignedUrlForS3 } from '@/lib/aws/s3';
import mongoose from 'mongoose';

// GET - List all documents attached to a contract (both CompanyDocument and ContractAttachment)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id: contractId } = await params;
      await connectDB();

      const contractObjectId = new mongoose.Types.ObjectId(contractId);
      const contract = await Contract.findById(contractObjectId)
        .select('attachedDocumentIds companyId')
        .lean();

      if (!contract) {
        return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
      }

      // Check access
      const companyObjectId = new mongoose.Types.ObjectId(user.companyId);
      // Handle both ObjectId and populated companyId
      const contractCompanyId = contract.companyId instanceof mongoose.Types.ObjectId 
        ? contract.companyId.toString() 
        : (contract.companyId as any)?._id?.toString() || String(contract.companyId);
      
      if (user.role !== 'system_admin' && contractCompanyId !== companyObjectId.toString()) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const result: {
        companyDocuments: any[];
        contractAttachments: any[];
        validityStatus: {
          valid: any[];
          expiringSoon: any[];
          expired: any[];
        };
      } = {
        companyDocuments: [],
        contractAttachments: [],
        validityStatus: {
          valid: [],
          expiringSoon: [],
          expired: [],
        },
      };

      // Get company documents (from attachedDocumentIds)
      const attachedDocumentIds = contract.attachedDocumentIds || [];
      console.log('GET /api/contracts/[id]/documents - Contract attachedDocumentIds:', {
        contractId: contractId,
        attachedDocumentIdsCount: attachedDocumentIds.length,
        attachedDocumentIds: attachedDocumentIds.map((id: any) => {
          if (id instanceof mongoose.Types.ObjectId) {
            return id.toString();
          } else if (id && typeof id === 'object' && id._id) {
            return id._id.toString();
          } else {
            return String(id);
          }
        })
      });
      if (attachedDocumentIds.length > 0) {
        // Convert ObjectIds to strings for the query
        const documentIds = attachedDocumentIds.map((id: any) => 
          id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id)
        );
        
        console.log('Fetching company documents with IDs:', documentIds.map(id => id.toString()));
        
        const companyDocuments = await CompanyDocument.find({
          _id: { $in: documentIds },
          isActive: true,
        })
          .populate('uploadedBy', 'name email')
          .populate('counterpartyCompanyId', 'name')
          .lean();

        console.log('Found company documents:', companyDocuments.length);

        for (const doc of companyDocuments) {
          const downloadUrl = await getSignedUrlForS3(doc.s3Key);
          result.companyDocuments.push({
            ...doc,
            _id: doc._id.toString(),
            companyId: doc.companyId.toString(),
            source: 'company_archive',
            downloadUrl,
          });
        }
      } else {
        console.log('No attachedDocumentIds found in contract');
      }

      // Get contract attachments (direct uploads)
      const contractAttachments = await ContractAttachment.find({
        contractId: contractObjectId,
        isActive: true,
      })
        .populate('uploadedBy', 'name email')
        .lean();

      for (const attachment of contractAttachments) {
        const downloadUrl = await getSignedUrlForS3(attachment.s3Key);
        result.contractAttachments.push({
          ...attachment,
          _id: attachment._id.toString(),
          contractId: attachment.contractId.toString(),
          source: 'direct_upload',
          downloadUrl,
        });
      }

      // Get validity status
      result.validityStatus = await checkContractAttachedDocuments(contractId);

      return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
      console.error('Error listing contract documents:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to list documents' },
        { status: 500 }
      );
    }
  })(req);
}

// POST - Attach a company document to a contract
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id: contractId } = await params;
      await connectDB();

      const contractObjectId = new mongoose.Types.ObjectId(contractId);
      const contract = await Contract.findById(contractObjectId);

      if (!contract) {
        return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
      }

      // Check access
      const companyObjectId = new mongoose.Types.ObjectId(user.companyId);
      if (user.role !== 'system_admin' && contract.companyId.toString() !== companyObjectId.toString()) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const body = await req.json();
      const { documentId } = body;

      if (!documentId) {
        return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
      }

      // Verify document exists and belongs to either the contract's company or counterparty company
      const document = await CompanyDocument.findById(documentId).lean();
      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      // Get contract company IDs (both companyId and counterpartyId)
      const contractCompanyId = contract.companyId instanceof mongoose.Types.ObjectId 
        ? contract.companyId.toString() 
        : (contract.companyId as any)?._id?.toString() || String(contract.companyId);
      
      let contractCounterpartyId: string | null = null;
      
      // If counterpartyId exists, use it
      if (contract.counterpartyId) {
        contractCounterpartyId = contract.counterpartyId instanceof mongoose.Types.ObjectId 
          ? contract.counterpartyId.toString() 
          : (contract.counterpartyId as any)?._id?.toString() || String(contract.counterpartyId);
      } 
      // If counterpartyId doesn't exist but counterparty string exists, try to find the company
      else if (contract.counterparty && typeof contract.counterparty === 'string') {
        const counterpartyCompany = await Company.findOne({ 
          name: { $regex: new RegExp(`^${contract.counterparty.trim()}$`, 'i') },
          isActive: true 
        }).lean();
        
        if (counterpartyCompany) {
          contractCounterpartyId = counterpartyCompany._id.toString();
        }
      }

      const documentCompanyId = document.companyId.toString();
      
      // Allow if document belongs to contract's company or counterparty company
      const isAllowed = documentCompanyId === contractCompanyId || 
                       (contractCounterpartyId && documentCompanyId === contractCounterpartyId);
      
      if (!isAllowed) {
        return NextResponse.json({ 
          error: 'Document does not belong to the contract\'s company or counterparty company' 
        }, { status: 403 });
      }

      const documentObjectId = new mongoose.Types.ObjectId(documentId);
      const documentIdString = documentId.toString();
      
      // Check if document is already attached
      const currentAttachedIds = contract.attachedDocumentIds || [];
      const isAlreadyAttached = currentAttachedIds.some(id => id.toString() === documentIdString);
      
      if (!isAlreadyAttached) {
        // Get the contract document (not lean) so we can use save()
        const contractDoc = await Contract.findById(contractObjectId);
        
        if (!contractDoc) {
          return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
        }
        
        // Initialize array if it doesn't exist
        if (!contractDoc.attachedDocumentIds) {
          contractDoc.attachedDocumentIds = [];
        }
        
        // Add document to array
        contractDoc.attachedDocumentIds.push(documentObjectId);
        
        // Mark as modified and save
        contractDoc.markModified('attachedDocumentIds');
        await contractDoc.save();
        
        // Verify by fetching again
        const verifyContract = await Contract.findById(contractObjectId)
          .select('attachedDocumentIds')
          .lean();
        
        const verifiedIds = verifyContract?.attachedDocumentIds || [];
        const isInArray = verifiedIds.some((id: any) => {
          const idStr = id instanceof mongoose.Types.ObjectId ? id.toString() : String(id);
          return idStr === documentIdString;
        });
        
        console.log('Document attached to contract:', {
          contractId: contractId,
          documentId: documentId,
          documentIdString: documentIdString,
          beforeCount: currentAttachedIds.length,
          afterCount: verifiedIds.length,
          isInArray: isInArray,
          verifiedIds: verifiedIds.map((id: any) => {
            if (id instanceof mongoose.Types.ObjectId) {
              return id.toString();
            } else if (id && typeof id === 'object' && id._id) {
              return id._id.toString();
            } else {
              return String(id);
            }
          })
        });
        
        if (!isInArray) {
          console.error('Document was not found in array after save!', {
            contractId,
            documentId,
            verifiedIds: verifiedIds.map((id: any) => String(id))
          });
          return NextResponse.json({ 
            error: 'Document was not successfully attached to contract' 
          }, { status: 500 });
        }
        
        return NextResponse.json({ 
          message: 'Document attached successfully',
          attachedDocumentIds: verifiedIds.map((id: any) => {
            if (id instanceof mongoose.Types.ObjectId) {
              return id.toString();
            } else if (id && typeof id === 'object' && id._id) {
              return id._id.toString();
            } else {
              return String(id);
            }
          })
        }, { status: 200 });
      } else {
        console.log('Document already attached:', { contractId, documentId });
        return NextResponse.json({ 
          message: 'Document already attached',
          attachedDocumentIds: currentAttachedIds.map(id => id.toString())
        }, { status: 200 });
      }
    } catch (error: any) {
      console.error('Error attaching document to contract:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to attach document' },
        { status: 500 }
      );
    }
  })(req);
}

// DELETE - Remove a document from contract
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id: contractId } = await params;
      await connectDB();

      const contractObjectId = new mongoose.Types.ObjectId(contractId);
      const contract = await Contract.findById(contractObjectId);

      if (!contract) {
        return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
      }

      // Check access
      const companyObjectId = new mongoose.Types.ObjectId(user.companyId);
      if (user.role !== 'system_admin' && contract.companyId.toString() !== companyObjectId.toString()) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const searchParams = req.nextUrl.searchParams;
      const documentId = searchParams.get('documentId');

      if (!documentId) {
        return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
      }

      // Remove document from contract's attachedDocumentIds
      if (contract.attachedDocumentIds) {
        contract.attachedDocumentIds = contract.attachedDocumentIds.filter(
          id => id.toString() !== documentId
        );
        await contract.save();
      }

      return NextResponse.json({ message: 'Document removed successfully' }, { status: 200 });
    } catch (error: any) {
      console.error('Error removing document from contract:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to remove document' },
        { status: 500 }
      );
    }
  })(req);
}

