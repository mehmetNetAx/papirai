import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Company from '@/lib/db/models/Company';
import { redirect } from 'next/navigation';
import EditCompanyForm from '../EditCompanyForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCompanyPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Only admins can edit companies
  if (!['system_admin', 'group_admin'].includes(session.user.role)) {
    redirect('/dashboard/companies');
  }

  const { id } = await params;
  await connectDB();

  const company = await Company.findById(id).lean();

  if (!company || !company.isActive) {
    redirect('/dashboard/companies');
  }

  // Convert Mongoose document to plain object for Client Component
  const serializedCompany = {
    _id: company._id.toString(),
    name: company.name,
    type: company.type,
    parentCompanyId: company.parentCompanyId?.toString(),
    settings: company.settings ? {
      allowSelfRegistration: company.settings.allowSelfRegistration || false,
      defaultWorkspacePermissions: company.settings.defaultWorkspacePermissions || {},
      notificationPreferences: company.settings.notificationPreferences || {},
    } : {
      allowSelfRegistration: false,
      defaultWorkspacePermissions: {},
      notificationPreferences: {},
    },
    isActive: company.isActive,
  };

  return <EditCompanyForm company={serializedCompany} />;
}

