import connectDB from '@/lib/db/connection';
import CompanyDocument from '@/lib/db/models/CompanyDocument';
import Contract from '@/lib/db/models/Contract';
import Notification from '@/lib/db/models/Notification';
import { sendEmailNotification } from './notification';
import User from '@/lib/db/models/User';
import { getDocumentValidityStatus } from './company-document';
import mongoose from 'mongoose';

/**
 * Check document validity and return status
 */
export function checkDocumentValidity(validityEndDate: Date): {
  status: 'valid' | 'expiring_soon' | 'expired';
  daysRemaining: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
} {
  const now = new Date();
  const endDate = new Date(validityEndDate);
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const status = getDocumentValidityStatus(validityEndDate);

  return {
    status,
    daysRemaining: daysRemaining > 0 ? daysRemaining : null,
    isExpired: status === 'expired',
    isExpiringSoon: status === 'expiring_soon',
  };
}

/**
 * Check all documents attached to a contract
 */
export async function checkContractAttachedDocuments(contractId: string): Promise<{
  valid: any[];
  expiringSoon: any[];
  expired: any[];
}> {
  await connectDB();

  const contractObjectId = new mongoose.Types.ObjectId(contractId);
  const contract = await Contract.findById(contractObjectId).lean();
  if (!contract) {
    throw new Error('Contract not found');
  }

  const result = {
    valid: [] as any[],
    expiringSoon: [] as any[],
    expired: [] as any[],
  };

  // Get attached documents from contract
  if (contract.attachedDocumentIds && contract.attachedDocumentIds.length > 0) {
    const documents = await CompanyDocument.find({
      _id: { $in: contract.attachedDocumentIds },
      isActive: true,
    })
      .populate('counterpartyCompanyId', 'name')
      .lean();

    for (const doc of documents) {
      const validity = checkDocumentValidity(doc.validityEndDate);
      
      const docData = {
        ...doc,
        _id: doc._id.toString(),
        validityStatus: validity.status,
        daysRemaining: validity.daysRemaining,
      };

      if (validity.status === 'expired') {
        result.expired.push(docData);
      } else if (validity.status === 'expiring_soon') {
        result.expiringSoon.push(docData);
      } else {
        result.valid.push(docData);
      }
    }
  }

  return result;
}

/**
 * Create notification for expired document
 */
export async function createDocumentExpirationNotification(
  document: any,
  contractId?: string
): Promise<void> {
  await connectDB();

  // Get users to notify (company admins and document uploader)
  const userIdsToNotify = new Set<string>();

  // Add document uploader
  if (document.uploadedBy) {
    const uploaderId = document.uploadedBy._id?.toString() || document.uploadedBy.toString();
    userIdsToNotify.add(uploaderId);
  }

  // If document is attached to a contract, notify contract owners
  if (contractId) {
    const contract = await Contract.findById(contractId)
      .populate('createdBy')
      .lean();

    if (contract) {
      if (contract.createdBy) {
        const createdById = (contract.createdBy as any)._id?.toString() || contract.createdBy.toString();
        userIdsToNotify.add(createdById);
      }

      // Get assigned users
      const ContractUserAssignment = (await import('@/lib/db/models/ContractUserAssignment')).default;
      const assignments = await ContractUserAssignment.find({
        contractId: contract._id,
        isActive: true,
      }).select('userId').lean();

      assignments.forEach((assignment: any) => {
        userIdsToNotify.add(assignment.userId.toString());
      });
    }
  }

  if (userIdsToNotify.size === 0) return;

  const documentName = document.originalFileName || document.fileName;
  const message = contractId
    ? `Sözleşmeye ekli doküman "${documentName}" süresi doldu. Geçerlilik bitiş tarihi: ${new Date(document.validityEndDate).toLocaleDateString('tr-TR')}`
    : `Doküman "${documentName}" süresi doldu. Geçerlilik bitiş tarihi: ${new Date(document.validityEndDate).toLocaleDateString('tr-TR')}`;

  // Create notifications
  for (const userId of userIdsToNotify) {
    await Notification.create({
      userId: new mongoose.Types.ObjectId(userId),
      type: contractId ? 'contract_document_expired' : 'document_expired',
      message,
      relatedResourceType: contractId ? 'contract' : 'document',
      relatedResourceId: contractId 
        ? new mongoose.Types.ObjectId(contractId)
        : new mongoose.Types.ObjectId(document._id),
      metadata: {
        documentId: document._id,
        documentName,
        validityEndDate: document.validityEndDate,
        contractId: contractId || undefined,
      },
    });

    // Send email
    const user = await User.findById(userId).lean();
    if (user && (user as any).email) {
      const subject = contractId
        ? `Sözleşme Dokümanı Süresi Doldu: ${documentName}`
        : `Doküman Süresi Doldu: ${documentName}`;

      await sendEmailNotification(
        userId,
        (user as any).email,
        subject,
        `<p>${message}</p><p>Lütfen güncel versiyonu yükleyin.</p>`
      );
    }
  }
}

/**
 * Create notification for expiring document
 */
export async function createDocumentExpiringNotification(
  document: any,
  daysRemaining: number,
  contractId?: string
): Promise<void> {
  await connectDB();

  // Get users to notify
  const userIdsToNotify = new Set<string>();

  // Add document uploader
  if (document.uploadedBy) {
    const uploaderId = document.uploadedBy._id?.toString() || document.uploadedBy.toString();
    userIdsToNotify.add(uploaderId);
  }

  // If document is attached to a contract, notify contract owners
  if (contractId) {
    const contract = await Contract.findById(contractId)
      .populate('createdBy')
      .lean();

    if (contract) {
      if (contract.createdBy) {
        const createdById = (contract.createdBy as any)._id?.toString() || contract.createdBy.toString();
        userIdsToNotify.add(createdById);
      }

      // Get assigned users
      const ContractUserAssignment = (await import('@/lib/db/models/ContractUserAssignment')).default;
      const assignments = await ContractUserAssignment.find({
        contractId: contract._id,
        isActive: true,
      }).select('userId').lean();

      assignments.forEach((assignment: any) => {
        userIdsToNotify.add(assignment.userId.toString());
      });
    }
  }

  if (userIdsToNotify.size === 0) return;

  const documentName = document.originalFileName || document.fileName;
  const level = daysRemaining <= 7 ? 'critical' : 'warning';
  const levelText = level === 'critical' ? 'Kritik' : 'Uyarı';
  
  const message = contractId
    ? `${levelText}: Sözleşmeye ekli doküman "${documentName}" ${daysRemaining} gün içinde süresi dolacak. Geçerlilik bitiş tarihi: ${new Date(document.validityEndDate).toLocaleDateString('tr-TR')}`
    : `${levelText}: Doküman "${documentName}" ${daysRemaining} gün içinde süresi dolacak. Geçerlilik bitiş tarihi: ${new Date(document.validityEndDate).toLocaleDateString('tr-TR')}`;

  // Create notifications
  for (const userId of userIdsToNotify) {
    await Notification.create({
      userId: new mongoose.Types.ObjectId(userId),
      type: contractId ? 'contract_document_expiring' : 'document_expiring',
      message,
      relatedResourceType: contractId ? 'contract' : 'document',
      relatedResourceId: contractId 
        ? new mongoose.Types.ObjectId(contractId)
        : new mongoose.Types.ObjectId(document._id),
      metadata: {
        documentId: document._id,
        documentName,
        validityEndDate: document.validityEndDate,
        daysRemaining,
        level,
        contractId: contractId || undefined,
      },
    });

    // Send email
    const user = await User.findById(userId).lean();
    if (user && (user as any).email) {
      const subject = contractId
        ? `${levelText}: Sözleşme Dokümanı Süresi Yaklaşıyor - ${documentName}`
        : `${levelText}: Doküman Süresi Yaklaşıyor - ${documentName}`;

      await sendEmailNotification(
        userId,
        (user as any).email,
        subject,
        `<p>${message}</p><p>Lütfen güncel versiyonu yüklemeyi düşünün.</p>`
      );
    }
  }
}

/**
 * Check all documents and create notifications for expired/expiring ones
 */
export async function checkAllDocumentExpirations(): Promise<{
  expired: number;
  expiringSoon: number;
  errors: number;
}> {
  await connectDB();

  const now = new Date();
  const thirtyDaysLater = new Date(now);
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

  let expiredCount = 0;
  let expiringSoonCount = 0;
  let errorCount = 0;

  // Get all active documents
  const documents = await CompanyDocument.find({
    isActive: true,
  })
    .populate('uploadedBy', 'name email')
    .lean();

  for (const doc of documents) {
    try {
      const validity = checkDocumentValidity(doc.validityEndDate);

      if (validity.status === 'expired') {
        // Check if notification already sent today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const existingNotification = await Notification.findOne({
          type: 'document_expired',
          relatedResourceType: 'document',
          relatedResourceId: doc._id,
          createdAt: { $gte: today },
        });

        if (!existingNotification) {
          await createDocumentExpirationNotification(doc);
          expiredCount++;
        }
      } else if (validity.status === 'expiring_soon' && validity.daysRemaining) {
        // Check if notification already sent (once per week for expiring documents)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const existingNotification = await Notification.findOne({
          type: 'document_expiring',
          relatedResourceType: 'document',
          relatedResourceId: doc._id,
          createdAt: { $gte: weekAgo },
        });

        if (!existingNotification) {
          await createDocumentExpiringNotification(doc, validity.daysRemaining);
          expiringSoonCount++;
        }
      }
    } catch (error) {
      console.error(`Error checking document ${doc._id}:`, error);
      errorCount++;
    }
  }

  return {
    expired: expiredCount,
    expiringSoon: expiringSoonCount,
    errors: errorCount,
  };
}

/**
 * Check contract attached documents and create notifications
 */
export async function checkContractDocumentExpirations(): Promise<{
  expired: number;
  expiringSoon: number;
  errors: number;
}> {
  await connectDB();

  let expiredCount = 0;
  let expiringSoonCount = 0;
  let errorCount = 0;

  // Get all active contracts with attached documents
  const contracts = await Contract.find({
    isActive: true,
    attachedDocumentIds: { $exists: true, $ne: [] },
  }).lean();

  for (const contract of contracts) {
    try {
      if (!contract.attachedDocumentIds || contract.attachedDocumentIds.length === 0) {
        continue;
      }

      const documents = await CompanyDocument.find({
        _id: { $in: contract.attachedDocumentIds },
        isActive: true,
      })
        .populate('uploadedBy', 'name email')
        .lean();

      for (const doc of documents) {
        const validity = checkDocumentValidity(doc.validityEndDate);

        if (validity.status === 'expired') {
          // Check if notification already sent today
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const existingNotification = await Notification.findOne({
            type: 'contract_document_expired',
            relatedResourceType: 'contract',
            relatedResourceId: contract._id,
            'metadata.documentId': doc._id.toString(),
            createdAt: { $gte: today },
          });

          if (!existingNotification) {
            await createDocumentExpirationNotification(doc, contract._id.toString());
            expiredCount++;
          }
        } else if (validity.status === 'expiring_soon' && validity.daysRemaining) {
          // Check if notification already sent (once per week)
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);

          const existingNotification = await Notification.findOne({
            type: 'contract_document_expiring',
            relatedResourceType: 'contract',
            relatedResourceId: contract._id,
            'metadata.documentId': doc._id.toString(),
            createdAt: { $gte: weekAgo },
          });

          if (!existingNotification) {
            await createDocumentExpiringNotification(doc, validity.daysRemaining, contract._id.toString());
            expiringSoonCount++;
          }
        }
      }
    } catch (error) {
      console.error(`Error checking contract ${contract._id} documents:`, error);
      errorCount++;
    }
  }

  return {
    expired: expiredCount,
    expiringSoon: expiringSoonCount,
    errors: errorCount,
  };
}

