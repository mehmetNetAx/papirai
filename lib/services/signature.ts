// DocuSign API client - will be implemented when DocuSign is configured
// For now, signature functionality works without DocuSign integration
// To enable DocuSign:
// 1. Configure DOCUSIGN_* environment variables
// 2. Uncomment and fix the import below
// 3. Implement the actual DocuSign API calls in createSignatureRequest

// import { ApiClient } from 'docusign-esign';
import connectDB from '@/lib/db/connection';
import Signature from '@/lib/db/models/Signature';
import Contract from '@/lib/db/models/Contract';
import Notification from '@/lib/db/models/Notification';

export async function createSignatureRequest(
  contractId: string,
  signers: Array<{ email: string; name: string; userId: string }>
): Promise<string> {
  await connectDB();

  const contract = await Contract.findById(contractId);
  if (!contract) {
    throw new Error('Contract not found');
  }

  // In production, you would:
  // 1. Generate PDF from contract content
  // 2. Create DocuSign envelope
  // 3. Add signers
  // 4. Send for signature

  // For now, create signature records
  const signatureIds: string[] = [];

  for (const signer of signers) {
    const signature = await Signature.create({
      contractId,
      signerId: signer.userId,
      type: 'digital',
      status: 'pending',
      docusignEnvelopeId: `envelope_${Date.now()}`, // Placeholder
    });

    signatureIds.push(signature._id.toString());

    // Notify signer
    await Notification.create({
      userId: signer.userId,
      type: 'signature_request',
      message: `Contract "${contract.title}" requires your signature`,
      relatedResourceType: 'signature',
      relatedResourceId: signature._id,
    });
  }

  contract.status = 'pending_signature';
  await contract.save();

  return signatureIds[0];
}

export async function getSignatureStatus(signatureId: string) {
  await connectDB();

  const signature = await Signature.findById(signatureId)
    .populate('contractId', 'title')
    .populate('signerId', 'name email')
    .lean();

  return signature;
}

export async function markSignatureComplete(
  signatureId: string,
  documentUrl?: string
) {
  await connectDB();

  const signature = await Signature.findById(signatureId);
  if (!signature) {
    throw new Error('Signature not found');
  }

  signature.status = 'signed';
  signature.signedAt = new Date();
  if (documentUrl) {
    signature.documentUrl = documentUrl;
  }

  await signature.save();

  // Check if all signatures are complete
  const contract = await Contract.findById(signature.contractId);
  if (contract) {
    const allSignatures = await Signature.find({
      contractId: contract._id,
      status: { $ne: 'signed' },
    });

    if (allSignatures.length === 0) {
      contract.status = 'executed';
      await contract.save();

      // Notify contract creator
      await Notification.create({
        userId: contract.createdBy.toString(),
        type: 'signature_completed',
        message: `Contract "${contract.title}" has been fully executed`,
        relatedResourceType: 'contract',
        relatedResourceId: contract._id,
      });
    }
  }

  return signature;
}

export async function uploadPhysicalSignature(
  contractId: string,
  signerId: string,
  documentUrl: string
) {
  await connectDB();

  const signature = await Signature.create({
    contractId,
    signerId,
    type: 'physical',
    status: 'signed',
    documentUrl,
    signedAt: new Date(),
  });

  // Check if all signatures are complete
  const contract = await Contract.findById(contractId);
  if (contract) {
    contract.status = 'executed';
    await contract.save();
  }

  return signature;
}

