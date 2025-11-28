import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import ContractAnalysis from '@/lib/db/models/ContractAnalysis';
import Company from '@/lib/db/models/Company';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import AnalyzeContractForm from './AnalyzeContractForm';
import mongoose from 'mongoose';

interface PageProps {
  params: Promise<{ id: string }>;
}

const categoryLabels: Record<string, string> = {
  operational: 'Operasyonel',
  financial: 'Finansal',
  risk: 'Risk',
  legal: 'Hukuk',
  quality: 'Kalite',
  missing_parts: 'Eksik Taraflar',
  missing_specifications: 'Eksik Şartnameler',
  other: 'Diğer',
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

const getScoreBgColor = (score: number): string => {
  if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
  if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
};

export default async function ContractAnalysisPage({ params }: PageProps) {
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

  // Fetch contract
  const contract = await Contract.findById(contractObjectId)
    .populate('workspaceId', 'name')
    .populate('createdBy', 'name')
    .lean();

  if (!contract || !contract.isActive) {
    redirect('/dashboard/contracts');
  }

  // Check access
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

  // Get latest analysis
  const analysis = await ContractAnalysis.findOne({ contractId: contractObjectId })
    .sort({ analysisDate: -1 })
    .populate('analyzedBy', 'name email')
    .lean();

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
                Sözleşme Analizi
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">{contract.title}</p>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/contracts/${id}`}>
              <span className="material-symbols-outlined text-lg mr-2">close</span>
              Kapat
            </Link>
          </Button>
        </div>

        {/* Analysis Form or Results */}
        {!analysis || analysis.status === 'failed' ? (
          <AnalyzeContractForm contractId={id} contractTitle={contract.title} />
        ) : (
          <div className="space-y-6">
            {/* Overall Score */}
            <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white font-display">
                    Genel Skor
                  </CardTitle>
                  <Badge
                    className={`text-2xl font-bold px-4 py-2 ${getScoreBgColor(analysis.overallScore)} ${getScoreColor(analysis.overallScore)}`}
                  >
                    {Math.round(analysis.overallScore)}/100
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={analysis.overallScore} className="h-3" />
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                  <p>
                    Analiz Tarihi: {new Date(analysis.analysisDate).toLocaleString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p>
                    Analiz Eden: {(analysis.analyzedBy as any)?.name || 'Bilinmeyen'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            {analysis.summary && (
              <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white font-display">
                    Özet
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analysis.summary.strengths && analysis.summary.strengths.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">
                        Güçlü Yönler
                      </h3>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        {analysis.summary.strengths.map((strength, index) => (
                          <li key={index}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysis.summary.weaknesses && analysis.summary.weaknesses.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
                        Zayıf Yönler
                      </h3>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        {analysis.summary.weaknesses.map((weakness, index) => (
                          <li key={index}>{weakness}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysis.summary.criticalIssues && analysis.summary.criticalIssues.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
                        Kritik Sorunlar
                      </h3>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        {analysis.summary.criticalIssues.map((issue, index) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysis.summary.recommendations && analysis.summary.recommendations.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
                        Öneriler
                      </h3>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        {analysis.summary.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Criteria */}
            {analysis.criteria && analysis.criteria.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white font-display">
                  Detaylı Analiz Kriterleri
                </h2>
                {analysis.criteria.map((criterion: any, index: number) => (
                  <Card
                    key={index}
                    className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white font-display">
                          {criterion.name}
                        </CardTitle>
                        <div className="flex items-center gap-3">
                          <Badge
                            className={`text-lg font-bold px-3 py-1 ${getScoreBgColor(criterion.score)} ${getScoreColor(criterion.score)}`}
                          >
                            {Math.round(criterion.score)}/100
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {categoryLabels[criterion.category] || criterion.category}
                          </Badge>
                        </div>
                      </div>
                      <Progress value={criterion.score} className="h-2 mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {criterion.details && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {criterion.details}
                        </p>
                      )}

                      {/* Sub Criteria */}
                      {criterion.subCriteria && criterion.subCriteria.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Alt Kriterler
                          </h4>
                          {criterion.subCriteria.map((sub: any, subIndex: number) => (
                            <div
                              key={subIndex}
                              className="p-3 rounded-lg border border-gray-200/50 dark:border-[#324d67]/50 bg-gray-50/50 dark:bg-[#1f2e3d]"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {sub.name}
                                </span>
                                <Badge
                                  className={`text-sm font-semibold px-2 py-0.5 ${getScoreBgColor(sub.score)} ${getScoreColor(sub.score)}`}
                                >
                                  {Math.round(sub.score)}/100
                                </Badge>
                              </div>
                              {sub.findings && sub.findings.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                    Bulgular:
                                  </p>
                                  <ul className="list-disc list-inside space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                                    {sub.findings.map((finding: string, fIndex: number) => (
                                      <li key={fIndex}>{finding}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {sub.recommendations && sub.recommendations.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                                    Öneriler:
                                  </p>
                                  <ul className="list-disc list-inside space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                                    {sub.recommendations.map((rec: string, rIndex: number) => (
                                      <li key={rIndex}>{rec}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Criterion Findings */}
                      {criterion.findings && criterion.findings.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Bulgular
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            {criterion.findings.map((finding: string, fIndex: number) => (
                              <li key={fIndex}>{finding}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Criterion Recommendations */}
                      {criterion.recommendations && criterion.recommendations.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
                            Öneriler
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            {criterion.recommendations.map((rec: string, rIndex: number) => (
                              <li key={rIndex}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Re-analyze Button */}
            <div className="flex justify-end">
              <AnalyzeContractForm contractId={id} contractTitle={contract.title} showAsButton />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

