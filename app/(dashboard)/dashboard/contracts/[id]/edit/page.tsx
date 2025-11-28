import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import Company from '@/lib/db/models/Company';
import { redirect } from 'next/navigation';
import AdvancedContractEditor from '@/components/editor/AdvancedContractEditor';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import mongoose from 'mongoose';
import { canEditContract } from '@/lib/utils/permissions';
import { getMasterVariables } from '@/lib/services/master-variables';
import MasterVariablesEditor from '@/components/contracts/MasterVariablesEditor';

export default async function EditContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const { id } = await params;
  await connectDB();

  // Convert string ID to ObjectId
  let contractObjectId: mongoose.Types.ObjectId;
  try {
    contractObjectId = new mongoose.Types.ObjectId(id);
  } catch (error) {
    redirect('/dashboard/contracts');
  }

  // Fetch contract - first without populate to get raw companyId
  const contract = await Contract.findById(contractObjectId).lean();

  if (!contract || !contract.isActive) {
    redirect('/dashboard/contracts');
  }

  // Ensure contract has companyId (should not be null, but handle gracefully)
  if (!contract.companyId) {
    console.error('Contract has no companyId:', contract._id);
    redirect('/dashboard/contracts');
  }

  // Extract companyId - contract.companyId should be ObjectId when not populated
  let contractCompanyId: string | mongoose.Types.ObjectId;
  if (contract.companyId instanceof mongoose.Types.ObjectId) {
    contractCompanyId = contract.companyId;
  } else if (typeof contract.companyId === 'object' && contract.companyId !== null) {
    // Populated object (shouldn't happen with .lean() but handle it)
    if ('_id' in contract.companyId) {
      contractCompanyId = (contract.companyId as any)._id;
    } else {
      console.error('Invalid companyId format:', contract.companyId);
      redirect('/dashboard/contracts');
    }
  } else if (typeof contract.companyId === 'string') {
    contractCompanyId = contract.companyId;
  } else {
    console.error('Could not extract companyId from contract:', contract._id, contract.companyId);
    redirect('/dashboard/contracts');
  }

  // Extract createdBy - contract.createdBy should be ObjectId when not populated
  let contractCreatedBy: string | mongoose.Types.ObjectId | undefined;
  if (contract.createdBy) {
    if (contract.createdBy instanceof mongoose.Types.ObjectId) {
      contractCreatedBy = contract.createdBy;
    } else if (typeof contract.createdBy === 'object' && contract.createdBy !== null && '_id' in contract.createdBy) {
      // Populated object (shouldn't happen with .lean() but handle it)
      contractCreatedBy = (contract.createdBy as any)._id;
    } else if (typeof contract.createdBy === 'string') {
      contractCreatedBy = contract.createdBy;
    }
  }

  // Check edit permission using canEditContract
  const user = {
    id: session.user.id,
    role: session.user.role,
    companyId: session.user.companyId,
    groupId: (session.user as any).groupId,
  };
  
  if (!canEditContract(user, contractCompanyId, contractCreatedBy, contract.allowedEditors)) {
    redirect('/dashboard/contracts');
  }

  // Get master variables to check for missing required fields
  const masterVars = await getMasterVariables(id);
  
  // Also get from contract model as fallback
  const masterVariablesData = {
    startDate: masterVars.startDate ? masterVars.startDate.toISOString().split('T')[0] : (contract.startDate ? new Date(contract.startDate).toISOString().split('T')[0] : undefined),
    endDate: masterVars.endDate ? masterVars.endDate.toISOString().split('T')[0] : (contract.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : undefined),
    contractType: masterVars.contractType || contract.contractType || undefined,
    counterparty: masterVars.counterparty || contract.counterparty || undefined,
    currency: masterVars.currency || contract.currency || undefined,
    contractValue: masterVars.contractValue !== undefined ? masterVars.contractValue : (contract.value !== undefined ? contract.value : undefined),
  };

  const handleSave = async (content: string, changeSummary?: string) => {
    'use server';
    
    await connectDB();
    
    // Update contract content
    await Contract.findByIdAndUpdate(contractObjectId, {
      content,
      updatedAt: new Date(),
    });
    
    // Create new version
    const { createVersion } = await import('@/lib/services/version');
    await createVersion(
      contractObjectId.toString(),
      content,
      session.user.id,
      changeSummary
    );
  };

  return (
    <div className="p-6 lg:p-10 space-y-6 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <Link
                href={`/dashboard/contracts/${id}`}
                className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white truncate">
                Sözleşme Düzenle
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">{contract.title}</p>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/contracts/${id}`}>
              <span className="material-symbols-outlined text-lg mr-2">close</span>
              İptal
            </Link>
          </Button>
        </div>

        {/* Master Variables Editor - Show if any required fields are missing */}
        <MasterVariablesEditor
          contractId={id}
          initialData={masterVariablesData}
        />

        <AdvancedContractEditor
          contractId={id}
          initialContent={contract.content}
          userId={session.user.id}
          userName={session.user.name}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}

