import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Workspace from '@/lib/db/models/Workspace';
import Company from '@/lib/db/models/Company';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import mongoose from 'mongoose';

export default async function WorkspacesPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return null;
  }

  await connectDB();

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

  const workspaces = await Workspace.find({
    ...companyFilter,
    isActive: true,
  })
    .populate('createdBy', 'name')
    .sort({ name: 1 })
    .lean();

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-display leading-tight tracking-tight">Çalışma Alanları</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-base font-normal">Sözleşme çalışma alanlarınızı yönetin</p>
          </div>
          <Button asChild className="button button-egg-blue">
            <Link href="/dashboard/workspaces/new">Yeni Çalışma Alanı</Link>
          </Button>
        </div>

        {workspaces.length === 0 ? (
          <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
            <CardContent className="py-16 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Henüz çalışma alanı yok. Başlamak için ilk çalışma alanınızı oluşturun.</p>
                <Button asChild className="button button-egg-blue">
                  <Link href="/dashboard/workspaces/new">Yeni Çalışma Alanı Oluştur</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace: any) => (
              <Card 
                key={workspace._id} 
                className="group border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm hover:shadow-md rounded-xl transition-all duration-200 overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <CardHeader className="relative z-10">
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white font-display">{workspace.name}</CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  {workspace.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{workspace.description}</p>
                  )}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200/50 dark:border-[#324d67]/50">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>{workspace.createdBy?.name || 'Bilinmeyen'}</span>
                    </div>
                    <Button variant="outline" size="sm" asChild className="shrink-0">
                      <Link href={`/dashboard/workspaces/${workspace._id}`} className="text-sm">
                        Görüntüle
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

