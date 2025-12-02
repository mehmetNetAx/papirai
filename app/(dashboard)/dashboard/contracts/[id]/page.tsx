import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import ContractVersion from '@/lib/db/models/ContractVersion';
import Approval from '@/lib/db/models/Approval';
import Signature from '@/lib/db/models/Signature';
import ContractVariable from '@/lib/db/models/ContractVariable';
import ComplianceCheck from '@/lib/db/models/ComplianceCheck';
import ContractAnalysis from '@/lib/db/models/ContractAnalysis';
import Company from '@/lib/db/models/Company';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import mongoose from 'mongoose';
import ExportPDFButton from './ExportPDFButton';
import CreateComplianceCheckButton from './CreateComplianceCheckButton';
import ContractPreview from './ContractPreview';
import AnalyzeContractButton from './AnalyzeContractButton';
import MasterVariablesManager from '@/components/contracts/MasterVariablesManager';
import ArchiveContractButton from '@/components/contracts/ArchiveContractButton';
import ContractStatusManager from '@/components/contracts/ContractStatusManager';
import ContractUserAssignment from '@/components/contracts/ContractUserAssignment';
import ContractDocumentsManager from '@/components/contracts/ContractDocumentsManager';
import { canEditContract } from '@/lib/utils/permissions';
import HelpButton from '@/components/help/HelpButton';
import ContractChatBot from '@/components/contracts/ContractChatBot';
import SummaryViewer from '@/components/contracts/SummaryViewer';
import EmbeddingStatus from '@/components/contracts/EmbeddingStatus';
import { hasContractEmbeddings } from '@/lib/services/ai/embedding';

interface PageProps {
  params: Promise<{ id: string }>;
}

function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    draft: 'Taslak',
    in_review: 'İncelemede',
    pending_approval: 'Onay Bekliyor',
    approved: 'Onaylandı',
    pending_signature: 'İmza Bekliyor',
    executed: 'Yürürlükte',
    expired: 'Süresi Doldu',
    terminated: 'Feshedildi',
  };
  return statusMap[status] || status;
}

function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    in_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    pending_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    pending_signature: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    executed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    expired: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    terminated: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
}

export default async function ContractDetailPage({ params }: PageProps) {
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

  // Fetch contract with populated fields
  const contract = await Contract.findById(contractObjectId)
    .populate('workspaceId', 'name')
    .populate('createdBy', 'name email')
    .populate('companyId', 'name')
    .lean();

  if (!contract) {
    redirect('/dashboard/contracts');
  }
  
  // Allow viewing archived contracts, but show a warning

  // Check access based on role
  const companyObjectId = new mongoose.Types.ObjectId(session.user.companyId);
  const userRole = session.user.role;
  let hasAccess = false;

  if (userRole === 'system_admin') {
    hasAccess = true;
  } else if (userRole === 'group_admin') {
    const userCompany = await Company.findById(companyObjectId).lean();
    if (userCompany && (userCompany as any).type === 'group') {
      const subsidiaries = await Company.find({
        parentCompanyId: companyObjectId,
        isActive: true,
      }).select('_id').lean();
      const companyIds = [companyObjectId, ...subsidiaries.map((s: any) => s._id)];
      hasAccess = companyIds.some((cid: any) => cid.toString() === (contract.companyId as any)._id.toString());
    } else {
      hasAccess = (contract.companyId as any)._id.toString() === companyObjectId.toString();
    }
  } else {
    hasAccess = (contract.companyId as any)._id.toString() === companyObjectId.toString();
  }

  if (!hasAccess) {
    redirect('/dashboard/contracts');
  }

  // Check edit permission
  const user = {
    id: session.user.id,
    role: session.user.role,
    companyId: session.user.companyId,
    groupId: (session.user as any).groupId,
  };
  const canEdit = canEditContract(
    user,
    (contract.companyId as any)._id,
    (contract.createdBy as any)?._id?.toString(),
    contract.allowedEditors
  );

  // Fetch related data
  const [versions, approvals, signatures, variables, complianceChecks, analysis, hasEmbeddings] = await Promise.all([
    ContractVersion.find({ contractId: contractObjectId })
      .populate('createdBy', 'name')
      .sort({ versionNumber: -1 })
      .limit(10)
      .lean(),
    Approval.find({ contractId: contractObjectId })
      .populate('approverId', 'name email')
      .sort({ createdAt: -1 })
      .lean(),
    Signature.find({ contractId: contractObjectId })
      .populate('signerId', 'name email')
      .sort({ signedAt: -1 })
      .lean(),
    ContractVariable.find({ contractId: contractObjectId })
      .sort({ createdAt: -1 })
      .lean(),
    ComplianceCheck.find({ contractId: contractObjectId })
      .populate('variableId', 'name type')
      .sort({ checkedAt: -1 })
      .limit(5)
      .lean(),
    ContractAnalysis.findOne({ contractId: contractObjectId })
      .sort({ analysisDate: -1 })
      .populate('analyzedBy', 'name email')
      .lean(),
    hasContractEmbeddings(id).catch(() => false), // Check embedding status
  ]);

  // Format currency
  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Archive Warning */}
        {contract.isActive === false && (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">archive</span>
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                Bu sözleşme arşive kaldırılmıştır. Aktif hale getirmek için yukarıdaki "Aktif Hale Getir" butonunu kullanabilirsiniz.
              </p>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/dashboard/contracts"
                className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white truncate">
                {contract.title}
              </h1>
              <HelpButton module="contracts" />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <ContractStatusManager
                contractId={id}
                contractTitle={contract.title}
                currentStatus={contract.status}
              />
              {contract.contractType && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {contract.contractType}
                </span>
              )}
              <EmbeddingStatus contractId={id} hasEmbeddings={hasEmbeddings} />
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/contracts/${id}/edit`}>
                <span className="material-symbols-outlined text-lg mr-2">edit</span>
                Düzenle
              </Link>
            </Button>
            <AnalyzeContractButton contractId={id} contractTitle={contract.title} />
            <ExportPDFButton contractId={id} contractTitle={contract.title} />
            <CreateComplianceCheckButton 
              contractId={id} 
              variables={variables.map((v: any) => ({
                _id: v._id.toString(),
                name: v.name,
                type: v.type,
                value: v.value,
              }))} 
            />
            <ArchiveContractButton 
              contractId={id} 
              contractTitle={contract.title}
              isActive={contract.isActive}
            />
          </div>
        </div>

        {/* Tabs for organized content */}
        <Tabs defaultValue="contract" className="w-full">
          <TabsList className="grid w-full grid-cols-6 lg:grid-cols-12 mb-6 h-auto p-1">
            <TabsTrigger value="contract" className="text-xs lg:text-sm">
              <span className="material-symbols-outlined text-base mr-1">description</span>
              <span className="hidden sm:inline">Sözleşme</span>
            </TabsTrigger>
            <TabsTrigger value="summary" className="text-xs lg:text-sm">
              <span className="material-symbols-outlined text-base mr-1">summarize</span>
              <span className="hidden sm:inline">Özet</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="text-xs lg:text-sm">
              <span className="material-symbols-outlined text-base mr-1">chat</span>
              <span className="hidden sm:inline">AI Chat</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs lg:text-sm">
              <span className="material-symbols-outlined text-base mr-1">folder</span>
              <span className="hidden sm:inline">Dokümanlar</span>
            </TabsTrigger>
            <TabsTrigger value="master" className="text-xs lg:text-sm">
              <span className="material-symbols-outlined text-base mr-1">star</span>
              <span className="hidden sm:inline">Master</span>
            </TabsTrigger>
            <TabsTrigger value="variables" className="text-xs lg:text-sm">
              <span className="material-symbols-outlined text-base mr-1">tune</span>
              <span className="hidden sm:inline">Değişkenler</span>
            </TabsTrigger>
            <TabsTrigger value="details" className="text-xs lg:text-sm">
              <span className="material-symbols-outlined text-base mr-1">info</span>
              <span className="hidden sm:inline">Detaylar</span>
            </TabsTrigger>
            <TabsTrigger value="versions" className="text-xs lg:text-sm">
              <span className="material-symbols-outlined text-base mr-1">history</span>
              <span className="hidden sm:inline">Versiyonlar</span>
            </TabsTrigger>
            <TabsTrigger value="approvals" className="text-xs lg:text-sm">
              <span className="material-symbols-outlined text-base mr-1">check_circle</span>
              <span className="hidden sm:inline">Onaylar</span>
            </TabsTrigger>
            <TabsTrigger value="signatures" className="text-xs lg:text-sm">
              <span className="material-symbols-outlined text-base mr-1">draw</span>
              <span className="hidden sm:inline">İmzalar</span>
            </TabsTrigger>
            <TabsTrigger value="compliance" className="text-xs lg:text-sm">
              <span className="material-symbols-outlined text-base mr-1">verified</span>
              <span className="hidden sm:inline">Uyum</span>
            </TabsTrigger>
            <TabsTrigger value="analysis" className="text-xs lg:text-sm">
              <span className="material-symbols-outlined text-base mr-1">analytics</span>
              <span className="hidden sm:inline">Analiz</span>
            </TabsTrigger>
          </TabsList>

          {/* Contract Tab */}
          <TabsContent value="contract" className="space-y-6 mt-0">
            <ContractPreview 
              content={contract.content}
              variables={variables.map((v: any) => ({
                name: v.name,
                value: v.value,
                type: v.type,
              }))}
            />
            <ContractUserAssignment contractId={id} />
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-6 mt-0">
            <SummaryViewer contractId={id} />
          </TabsContent>

          {/* AI Chat Tab */}
          <TabsContent value="chat" className="space-y-6 mt-0">
            <ContractChatBot contractId={id} />
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6 mt-0">
            <ContractDocumentsManager
              contractId={id}
              companyId={(contract.companyId as any)?._id?.toString() || (contract.companyId as any).toString()}
              counterpartyCompanyId={contract.counterpartyId ? (contract.counterpartyId instanceof mongoose.Types.ObjectId ? contract.counterpartyId.toString() : (contract.counterpartyId as any)?._id?.toString() || String(contract.counterpartyId)) : undefined}
              counterpartyName={contract.counterparty}
              canEdit={canEdit}
            />
          </TabsContent>

          {/* Master Variables Tab */}
          <TabsContent value="master" className="space-y-6 mt-0">
            <MasterVariablesManager
              contractId={id}
              variables={variables.map((v: any) => ({
                _id: v._id.toString(),
                name: v.name,
                value: v.value,
                type: v.type,
                masterType: v.masterType,
                isMaster: v.isMaster || false,
              }))}
            />
          </TabsContent>

          {/* Variables Tab */}
          <TabsContent value="variables" className="space-y-6 mt-0">
            {variables.length > 0 && (
              <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white font-display">
                    Tüm Değişkenler ({variables.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {variables.map((variable: any) => (
                      <div
                        key={variable._id.toString()}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200/50 dark:border-[#324d67]/50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-gray-900 dark:text-white font-display">
                              {variable.name}
                            </p>
                            {variable.isMaster && (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                                Master
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {variable.type} • {variable.taggedText || 'Değer yok'}
                            {variable.masterType && ` • ${variable.masterType}`}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-primary">
                          {variable.value instanceof Date 
                            ? new Date(variable.value).toLocaleDateString('tr-TR')
                            : variable.value || 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6 mt-0">
            <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white font-display">
                  Sözleşme Detayları
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Çalışma Alanı</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {(contract.workspaceId as any)?.name || 'Belirtilmemiş'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Şirket</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {(contract.companyId as any)?.name || 'Belirtilmemiş'}
                      </p>
                    </div>
                    {contract.counterparty && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Karşı Taraf</p>
                        <p className="text-sm text-gray-900 dark:text-white">{contract.counterparty}</p>
                      </div>
                    )}
                    {contract.value && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Değer</p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {formatCurrency(contract.value, contract.currency)}
                        </p>
                      </div>
                    )}
                    {contract.startDate && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Başlangıç Tarihi</p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {contract.startDate instanceof Date 
                            ? contract.startDate.toLocaleDateString('tr-TR')
                            : new Date(contract.startDate).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    )}
                    {contract.endDate && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Bitiş Tarihi</p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {contract.endDate instanceof Date 
                            ? contract.endDate.toLocaleDateString('tr-TR')
                            : new Date(contract.endDate).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    )}
                    {contract.renewalDate && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Yenileme Tarihi</p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {contract.renewalDate instanceof Date 
                            ? contract.renewalDate.toLocaleDateString('tr-TR')
                            : new Date(contract.renewalDate).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Oluşturan</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {(contract.createdBy as any)?.name || 'Bilinmeyen'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Oluşturulma Tarihi</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {(contract.createdAt instanceof Date 
                          ? contract.createdAt 
                          : new Date(contract.createdAt)).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    {contract.tags && contract.tags.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Etiketler</p>
                        <div className="flex flex-wrap gap-2">
                          {contract.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Versions Tab */}
          <TabsContent value="versions" className="space-y-6 mt-0">
            <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white font-display">
                  Versiyonlar ({versions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                    {versions.length > 0 ? (
                      <>
                        <div className="space-y-2">
                          {versions.slice(0, 5).map((version: any) => (
                            <div
                              key={version._id.toString()}
                              className="flex items-center justify-between p-3 rounded-lg border border-gray-200/50 dark:border-[#324d67]/50 hover:bg-gray-50/50 dark:hover:bg-[#1f2e3d] transition-colors"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    Versiyon {version.versionNumber}
                                  </span>
                                  {version.changeSummary && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      • {version.changeSummary}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {(version.createdBy as any)?.name || 'Bilinmeyen'} • {(version.createdAt instanceof Date 
                                    ? version.createdAt 
                                    : new Date(version.createdAt)).toLocaleString('tr-TR', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                        {versions.length > 5 && (
                          <Link
                            href={`/dashboard/contracts/${id}/versions`}
                            className="block mt-3 text-sm text-primary hover:underline text-center"
                          >
                            Tüm versiyonları görüntüle ({versions.length})
                          </Link>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        Henüz versiyon bulunmuyor
                      </p>
                    )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals" className="space-y-6 mt-0">
            {approvals.length > 0 ? (
              <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white font-display">
                    Onaylar ({approvals.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                      <div className="space-y-2">
                        {approvals.slice(0, 5).map((approval: any) => (
                          <div
                            key={approval._id.toString()}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50/50 dark:hover:bg-[#1f2e3d] transition-colors"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {(approval.approverId as any)?.name || 'Bilinmeyen'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {approval.status === 'approved' ? 'Onaylandı' : approval.status === 'rejected' ? 'Reddedildi' : 'Beklemede'} • {(approval.createdAt instanceof Date 
                                  ? approval.createdAt 
                                  : new Date(approval.createdAt)).toLocaleDateString('tr-TR')}
                              </p>
                            </div>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                              approval.status === 'approved'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                : approval.status === 'rejected'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                            }`}>
                              {approval.status === 'approved' ? 'Onaylandı' : approval.status === 'rejected' ? 'Reddedildi' : 'Beklemede'}
                            </span>
                          </div>
                        ))}
                      </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
                <CardContent className="pt-6">
                  <p className="text-center text-gray-500 dark:text-gray-400">Henüz onay bulunmuyor</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Signatures Tab */}
          <TabsContent value="signatures" className="space-y-6 mt-0">
            {signatures.length > 0 ? (
              <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white font-display">
                    İmzalar ({signatures.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                      <div className="space-y-2">
                        {signatures.map((signature: any) => (
                          <div
                            key={signature._id.toString()}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50/50 dark:hover:bg-[#1f2e3d] transition-colors"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {(signature.signerId as any)?.name || 'Bilinmeyen'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {signature.type === 'digital' ? 'Dijital' : 'Fiziksel'} • {signature.signedAt 
                                  ? (signature.signedAt instanceof Date 
                                      ? signature.signedAt 
                                      : new Date(signature.signedAt)).toLocaleDateString('tr-TR')
                                  : 'İmzalanmadı'}
                              </p>
                            </div>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                              signature.status === 'signed'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                            }`}>
                              {signature.status === 'signed' ? 'İmzalandı' : 'Beklemede'}
                            </span>
                          </div>
                        ))}
                      </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
                <CardContent className="pt-6">
                  <p className="text-center text-gray-500 dark:text-gray-400">Henüz imza bulunmuyor</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-6 mt-0">
            {complianceChecks.length > 0 ? (
              <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white font-display">
                    Uyum Kontrolleri ({complianceChecks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                      <div className="space-y-3">
                        {complianceChecks.map((check: any) => (
                          <div
                            key={check._id.toString()}
                            className="flex items-center justify-between p-3 rounded-lg border border-gray-200/50 dark:border-[#324d67]/50"
                          >
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {(check.variableId as any)?.name || 'Bilinmeyen Değişken'}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Beklenen: {check.expectedValue instanceof Date 
                                  ? new Date(check.expectedValue).toLocaleDateString('tr-TR')
                                  : String(check.expectedValue || 'N/A')} • Gerçek: {check.actualValue instanceof Date 
                                  ? new Date(check.actualValue).toLocaleDateString('tr-TR')
                                  : String(check.actualValue || 'N/A')}
                              </p>
                            </div>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              check.status === 'compliant'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                : check.status === 'non_compliant'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                            }`}>
                              {check.status === 'compliant' ? 'Uyumlu' : check.status === 'non_compliant' ? 'Uyumsuz' : 'Uyarı'}
                            </span>
                          </div>
                        ))}
                      </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
                <CardContent className="pt-6">
                  <p className="text-center text-gray-500 dark:text-gray-400">Henüz uyum kontrolü bulunmuyor</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6 mt-0">
            <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white font-display">
                  Sözleşme Analizi
                  {analysis && (
                    <span className={`ml-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      analysis.overallScore >= 80
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                        : analysis.overallScore >= 60
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                    }`}>
                      {Math.round(analysis.overallScore)}/100
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                    {analysis && analysis.status === 'completed' ? (
                      <div className="space-y-4">
                        {/* Overall Score */}
                        <div className="p-4 rounded-lg border border-gray-200/50 dark:border-[#324d67]/50 bg-gray-50/50 dark:bg-[#1f2e3d]">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Genel Skor</span>
                            <span className={`text-lg font-bold ${
                              analysis.overallScore >= 80
                                ? 'text-green-600 dark:text-green-400'
                                : analysis.overallScore >= 60
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {Math.round(analysis.overallScore)}/100
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                analysis.overallScore >= 80
                                  ? 'bg-green-500'
                                  : analysis.overallScore >= 60
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${analysis.overallScore}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Analiz Tarihi: {new Date(analysis.analysisDate).toLocaleDateString('tr-TR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                            {(analysis.analyzedBy as any)?.name && (
                              <> • Analiz Eden: {(analysis.analyzedBy as any).name}</>
                            )}
                          </p>
                        </div>

                        {/* Summary */}
                        {analysis.summary && (
                          <div className="space-y-3">
                            {analysis.summary.strengths && analysis.summary.strengths.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">
                                  Güçlü Yönler
                                </h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                  {analysis.summary.strengths.slice(0, 3).map((strength: string, index: number) => (
                                    <li key={index}>{strength}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {analysis.summary.weaknesses && analysis.summary.weaknesses.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
                                  Zayıf Yönler
                                </h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                  {analysis.summary.weaknesses.slice(0, 3).map((weakness: string, index: number) => (
                                    <li key={index}>{weakness}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {analysis.summary.criticalIssues && analysis.summary.criticalIssues.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
                                  Kritik Sorunlar
                                </h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                  {analysis.summary.criticalIssues.slice(0, 3).map((issue: string, index: number) => (
                                    <li key={index}>{issue}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Criteria Summary */}
                        {analysis.criteria && analysis.criteria.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                              Kriter Skorları
                            </h4>
                            <div className="space-y-2">
                              {analysis.criteria.map((criterion: any, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-2 rounded-lg border border-gray-200/50 dark:border-[#324d67]/50"
                                >
                                  <span className="text-sm text-gray-700 dark:text-gray-300">{criterion.name}</span>
                                  <span className={`text-sm font-semibold ${
                                    criterion.score >= 80
                                      ? 'text-green-600 dark:text-green-400'
                                      : criterion.score >= 60
                                      ? 'text-yellow-600 dark:text-yellow-400'
                                      : 'text-red-600 dark:text-red-400'
                                  }`}>
                                    {Math.round(criterion.score)}/100
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* View Full Analysis Link */}
                        <div className="pt-2">
                          <Button variant="outline" size="sm" asChild className="w-full">
                            <Link href={`/dashboard/contracts/${id}/analyze`}>
                              <span className="material-symbols-outlined text-base mr-2">analytics</span>
                              Detaylı Analizi Görüntüle
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          Bu sözleşme için henüz analiz yapılmamış.
                        </p>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/contracts/${id}/analyze`}>
                            <span className="material-symbols-outlined text-base mr-2">analytics</span>
                            Analiz Yap
                          </Link>
                        </Button>
                      </div>
                    )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

