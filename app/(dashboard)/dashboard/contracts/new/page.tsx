import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Workspace from '@/lib/db/models/Workspace';
import Company from '@/lib/db/models/Company';
import { redirect } from 'next/navigation';
import AdvancedContractEditor from '@/components/editor/AdvancedContractEditor';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import mongoose from 'mongoose';
import NewContractForm from './NewContractForm';

interface PageProps {
  searchParams: Promise<{ workspaceId?: string }>;
}

export default async function NewContractPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  await connectDB();
  
  const params = await searchParams;
  const preselectedWorkspaceId = params.workspaceId;

  // Convert string ID to ObjectId for MongoDB query
  const companyObjectId = new mongoose.Types.ObjectId(session.user.companyId);
  const userRole = session.user.role;

  // Build company filter based on user role
  let companyFilter: any = {};
  
  if (userRole === 'system_admin') {
    // System admin sees all workspaces
    companyFilter = {};
  } else if (userRole === 'group_admin') {
    // Group admin sees all workspaces in their group
    const userCompany = await Company.findById(companyObjectId).lean();
    if (userCompany && (userCompany as any).type === 'group') {
      // Get all subsidiaries in the group
      const subsidiaries = await Company.find({
        parentCompanyId: companyObjectId,
        isActive: true,
      }).select('_id').lean();
      const companyIds = [companyObjectId, ...subsidiaries.map((s: any) => s._id)];
      companyFilter = { companyId: { $in: companyIds } };
    } else {
      companyFilter = { companyId: companyObjectId };
    }
  } else {
    // Regular users see only their company's workspaces
    companyFilter = { companyId: companyObjectId };
  }

  const workspacesRaw = await Workspace.find({
    ...companyFilter,
    isActive: true,
  })
    .populate('createdBy', 'name')
    .sort({ name: 1 })
    .lean();

  // Convert ObjectId to string for Client Component
  const workspaces = workspacesRaw.map((w: any) => ({
    _id: w._id.toString(),
    name: w.name,
    description: w.description || undefined,
  }));

  const handleSave = async (
    title: string,
    workspaceId: string,
    content: string,
    startDate: string,
    endDate: string,
    contractType: string,
    counterparty: string,
    currency: string,
    contractValue: number,
    variables?: Array<{ name: string; description: string }>
  ) => {
    'use server';
    
    await connectDB();
    
    // Validate dates
    if (!startDate || !endDate) {
      throw new Error('Başlangıç ve bitiş tarihleri zorunludur');
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      throw new Error('Geçersiz tarih formatı');
    }

    if (endDateObj < startDateObj) {
      throw new Error('Bitiş tarihi başlangıç tarihinden sonra olmalıdır');
    }
    
    // Create new contract
    const { default: Contract } = await import('@/lib/db/models/Contract');
    const contract = await Contract.create({
      title,
      content,
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      companyId: companyObjectId,
      createdBy: new mongoose.Types.ObjectId(session.user.id),
      status: 'draft',
      startDate: startDateObj,
      endDate: endDateObj,
      contractType,
      counterparty,
      currency,
      value: contractValue,
    });
    
    // Create initial version
    const { createVersion } = await import('@/lib/services/version');
    await createVersion(
      contract._id.toString(),
      content,
      session.user.id,
      'İlk versiyon'
    );
    
    // Set master variables
    const { setMasterVariable } = await import('@/lib/services/master-variables');
    try {
      // Set startDate
      await setMasterVariable(contract._id.toString(), 'startDate', startDateObj, 'Başlangıç Tarihi');
      
      // Set endDate
      await setMasterVariable(contract._id.toString(), 'endDate', endDateObj, 'Bitiş Tarihi');
      
      // Set contractType
      await setMasterVariable(contract._id.toString(), 'contractType', contractType, 'Sözleşme Tipi');
      
      // Set counterparty
      await setMasterVariable(contract._id.toString(), 'counterparty', counterparty, 'Karşı Taraf');
      
      // Set currency
      await setMasterVariable(contract._id.toString(), 'currency', currency, 'Para Birimi');
      
      // Set contractValue
      await setMasterVariable(contract._id.toString(), 'contractValue', contractValue, 'Sözleşme Tutarı');
    } catch (masterVarError) {
      console.error('Error setting master variables:', masterVarError);
      // Continue even if master variables fail - contract is already created
    }
    
    // Create variables from AI-generated content or extract from content
    if (variables && variables.length > 0) {
      const { default: ContractVariable } = await import('@/lib/db/models/ContractVariable');
      
      for (const variable of variables) {
        try {
          // Check if variable already exists
          const existing = await ContractVariable.findOne({
            contractId: contract._id,
            name: variable.name,
          });
          
          if (!existing) {
            await ContractVariable.create({
              contractId: contract._id,
              name: variable.name,
              type: 'text', // Default type, can be changed later
              value: '',
              taggedText: `{{${variable.name}}}`,
              isComplianceTracked: false,
            });
          }
        } catch (error) {
          console.error(`Error creating variable ${variable.name}:`, error);
          // Continue with other variables even if one fails
        }
      }
    } else {
      // Extract variables from content if not provided
      const variablePattern = /\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/g;
      const extractedVariables = new Set<string>();
      let match;
      
      while ((match = variablePattern.exec(content)) !== null) {
        extractedVariables.add(match[1]);
      }
      
      if (extractedVariables.size > 0) {
        const { default: ContractVariable } = await import('@/lib/db/models/ContractVariable');
        
        for (const varName of extractedVariables) {
          try {
            const existing = await ContractVariable.findOne({
              contractId: contract._id,
              name: varName,
            });
            
            if (!existing) {
              await ContractVariable.create({
                contractId: contract._id,
                name: varName,
                type: 'text',
                value: '',
                taggedText: `{{${varName}}}`,
                isComplianceTracked: false,
              });
            }
          } catch (error) {
            console.error(`Error creating variable ${varName}:`, error);
          }
        }
      }
    }
    
    // Redirect to edit page
    redirect(`/dashboard/contracts/${contract._id}/edit`);
  };

  return (
    <div className="p-6 lg:p-10 space-y-6 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/dashboard/contracts"
                className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white truncate">
                Yeni Sözleşme
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">Yeni bir sözleşme oluşturun</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/contracts">
              <span className="material-symbols-outlined text-lg mr-2">close</span>
              İptal
            </Link>
          </Button>
        </div>

        <NewContractForm
          workspaces={workspaces}
          userId={session.user.id}
          userName={session.user.name}
          onSave={handleSave}
          preselectedWorkspaceId={preselectedWorkspaceId}
        />
      </div>
    </div>
  );
}

