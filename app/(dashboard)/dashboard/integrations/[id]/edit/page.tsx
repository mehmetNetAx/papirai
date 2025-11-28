import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Integration from '@/lib/db/models/Integration';
import { redirect } from 'next/navigation';
import { canAccessCompany } from '@/lib/utils/permissions';
import EditIntegrationForm from '@/components/integrations/EditIntegrationForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditIntegrationPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (!['system_admin', 'group_admin', 'company_admin'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  await connectDB();

  const { id } = await params;

  const integration = await Integration.findById(id).lean();

  if (!integration) {
    redirect('/dashboard/integrations');
  }

  // Check access
  const companyId = integration.companyId?.toString();
  if (session.user.role !== 'system_admin' && !canAccessCompany(session.user, companyId)) {
    redirect('/dashboard/integrations');
  }

  // Serialize integration for client component
  const serializedIntegration = {
    _id: String(integration._id),
    name: String(integration.name),
    type: integration.type as 'sap' | 'nebim' | 'logo' | 'netsis' | 'custom',
    companyId: String(integration.companyId),
    isActive: Boolean(integration.isActive),
    config: {
      apiEndpoint: integration.config?.apiEndpoint || '',
      apiKey: integration.config?.apiKey || '',
      username: integration.config?.username || '',
      password: '', // Don't send password
      database: integration.config?.database || '',
      port: integration.config?.port || 0,
    },
    mapping: {
      variableMappings: integration.mapping?.variableMappings || {},
      fieldMappings: integration.mapping?.fieldMappings || {},
    },
    schedule: {
      enabled: Boolean(integration.schedule?.enabled),
      frequency: integration.schedule?.frequency || 'daily',
      time: integration.schedule?.time || '09:00',
      dayOfWeek: integration.schedule?.dayOfWeek,
      dayOfMonth: integration.schedule?.dayOfMonth,
    },
  };

  return (
    <EditIntegrationForm
      integration={serializedIntegration}
      currentUserRole={session.user.role}
    />
  );
}

