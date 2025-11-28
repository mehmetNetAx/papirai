import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Company from '@/lib/db/models/Company';
import { redirect } from 'next/navigation';
import { canAccessCompany } from '@/lib/utils/permissions';
import NewIntegrationForm from '@/components/integrations/NewIntegrationForm';
import mongoose from 'mongoose';

export default async function NewIntegrationPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Only admins can create integrations
  if (!['system_admin', 'group_admin', 'company_admin'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  await connectDB();

  // Get available companies
  let companies: any[] = [];
  if (session.user.role === 'system_admin') {
    companies = await Company.find({ isActive: true })
      .select('name type')
      .sort({ name: 1 })
      .lean();
  } else {
    // For non-system admins, only their company
    const company = await Company.findById(session.user.companyId).select('name type').lean();
    if (company) {
      companies = [company];
    }
  }

  // Serialize companies
  const serializedCompanies = companies.map((c: any) => ({
    _id: String(c._id),
    name: String(c.name),
    type: String(c.type),
  }));

  return (
    <NewIntegrationForm
      companies={serializedCompanies}
      defaultCompanyId={session.user.companyId}
      currentUserRole={session.user.role}
    />
  );
}

