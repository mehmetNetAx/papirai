import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Company from '@/lib/db/models/Company';
import Workspace from '@/lib/db/models/Workspace';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import CompanyCard from '@/components/companies/CompanyCard';

export default async function CompaniesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  await connectDB();

  // Check if user has admin role
  const userRole = session.user.role;
  if (!['system_admin', 'group_admin', 'company_admin'].includes(userRole)) {
    redirect('/dashboard');
  }

  // Get companies hierarchy
  const groupCompanies = await Company.find({
    type: 'group',
    isActive: true,
  })
    .sort({ name: 1 })
    .lean();

  const subsidiaries = await Company.find({
    type: 'subsidiary',
    parentCompanyId: { $in: groupCompanies.map((c: any) => c._id) },
    isActive: true,
  })
    .populate('parentCompanyId', 'name')
    .sort({ name: 1 })
    .lean();

  // Get workspaces for all companies
  const allCompanyIds = [
    ...groupCompanies.map((c: any) => c._id),
    ...subsidiaries.map((s: any) => s._id),
  ];

  const workspaces = await Workspace.find({
    companyId: { $in: allCompanyIds },
    isActive: true,
  })
    .populate('companyId', 'name')
    .sort({ name: 1 })
    .lean();

  // Build hierarchy structure and serialize for Client Component
  // Convert all Mongoose documents to plain objects
  const hierarchy = groupCompanies.map((group: any) => {
    // Get workspaces for the group company
    const groupWorkspaces = workspaces.filter((ws: any) => {
      const wsCompanyId = ws.companyId?._id?.toString() || ws.companyId?.toString();
      return wsCompanyId === group._id.toString();
    });
    
    // Get subsidiaries for this group
    const groupSubsidiaries = subsidiaries.filter((sub: any) => {
      const subParentId = sub.parentCompanyId?._id?.toString() || sub.parentCompanyId?.toString();
      return subParentId === group._id.toString();
    });
    
    // Serialize group company
    const serializedGroup = {
      _id: String(group._id),
      name: String(group.name || ''),
      description: group.description ? String(group.description) : undefined,
      type: String(group.type),
      isActive: Boolean(group.isActive),
      createdAt: group.createdAt ? new Date(group.createdAt).toISOString() : undefined,
      updatedAt: group.updatedAt ? new Date(group.updatedAt).toISOString() : undefined,
      workspaces: groupWorkspaces.map((ws: any) => ({
        _id: String(ws._id),
        name: String(ws.name || ''),
        companyId: ws.companyId?._id ? String(ws.companyId._id) : (ws.companyId ? String(ws.companyId) : undefined),
      })),
      subsidiaries: groupSubsidiaries.map((sub: any) => {
        const subWorkspaces = workspaces.filter((ws: any) => {
          const wsCompanyId = ws.companyId?._id?.toString() || ws.companyId?.toString();
          return wsCompanyId === sub._id.toString();
        });
        return {
          _id: String(sub._id),
          name: String(sub.name || ''),
          description: sub.description ? String(sub.description) : undefined,
          type: String(sub.type),
          isActive: Boolean(sub.isActive),
          parentCompanyId: sub.parentCompanyId?._id ? String(sub.parentCompanyId._id) : (sub.parentCompanyId ? String(sub.parentCompanyId) : undefined),
          createdAt: sub.createdAt ? new Date(sub.createdAt).toISOString() : undefined,
          updatedAt: sub.updatedAt ? new Date(sub.updatedAt).toISOString() : undefined,
          workspaces: subWorkspaces.map((ws: any) => ({
            _id: String(ws._id),
            name: String(ws.name || ''),
            companyId: ws.companyId?._id ? String(ws.companyId._id) : (ws.companyId ? String(ws.companyId) : undefined),
          })),
        };
      }),
    };
    
    return serializedGroup;
  });

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-display leading-tight tracking-tight">Şirketler</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-base font-normal">
              Organizasyon şeması ve şirket hiyerarşisi
            </p>
          </div>
          {userRole === 'system_admin' && (
            <Button asChild className="button button-egg-blue">
              <Link href="/dashboard/companies/new">
                
                Yeni Şirket
              </Link>
            </Button>
          )}
        </div>

        {/* Companies Hierarchy */}
        {hierarchy.length === 0 ? (
          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
            <CardContent className="py-16 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Henüz grup şirketi yok.
                </p>
                {userRole === 'system_admin' && (
                  <Button asChild className="button button-egg-blue">
                    <Link href="/dashboard/companies/new">Yeni Şirket Oluştur</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {hierarchy.map((group: any) => (
              <CompanyCard
                key={group._id.toString()}
                company={group}
                userRole={userRole}
                isGroup={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
