import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Company from '@/lib/db/models/Company';
import Workspace from '@/lib/db/models/Workspace';
import Contract from '@/lib/db/models/Contract';
import Link from 'next/link';
import { redirect } from 'next/navigation';

interface PageProps {
  searchParams: Promise<{ workspaceId?: string }>;
}

export default async function OrganizationsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  await connectDB();

  const params = await searchParams;

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

  // Get all company IDs (both groups and subsidiaries) for workspace query
  const allCompanyIds = [
    ...groupCompanies.map((c: any) => c._id),
    ...subsidiaries.map((s: any) => s._id),
  ];

  // Get workspaces for all companies (both groups and subsidiaries)
  const workspaces = await Workspace.find({
    companyId: { $in: allCompanyIds },
    isActive: true,
  })
    .populate('companyId', 'name')
    .sort({ name: 1 })
    .lean();

  // Get selected workspace or first workspace
  const selectedWorkspaceId = params.workspaceId || workspaces[0]?._id?.toString();
  const selectedWorkspace = selectedWorkspaceId
    ? workspaces.find((w: any) => w._id.toString() === selectedWorkspaceId)
    : null;

  // Get contracts for selected workspace
  let contracts: any[] = [];
  let stats = {
    total: 0,
    active: 0,
    inactive: 0,
  };

  if (selectedWorkspace) {
    contracts = await Contract.find({
      workspaceId: selectedWorkspace._id,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const allContracts = await Contract.find({
      workspaceId: selectedWorkspace._id,
      isActive: true,
    }).lean();

    stats = {
      total: allContracts.length,
      active: allContracts.filter((c: any) => c.status === 'executed' || c.status === 'approved').length,
      inactive: allContracts.filter((c: any) => c.status === 'draft' || c.status === 'expired').length,
    };
  }

  // Build hierarchy structure
  const hierarchy = groupCompanies.map((group: any) => {
    // Get workspaces for the group company
    const groupWorkspaces = workspaces.filter(
      (ws: any) => ws.companyId?._id?.toString() === group._id.toString()
    );
    
    // Get subsidiaries for this group
    const groupSubsidiaries = subsidiaries.filter(
      (sub: any) => sub.parentCompanyId?._id?.toString() === group._id.toString()
    );
    
    return {
      ...group,
      workspaces: groupWorkspaces,
      subsidiaries: groupSubsidiaries.map((sub: any) => {
        const subWorkspaces = workspaces.filter(
          (ws: any) => ws.companyId?._id?.toString() === sub._id.toString()
        );
        return {
          ...sub,
          workspaces: subWorkspaces,
        };
      }),
    };
  });

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
      <main className="flex flex-1 overflow-hidden">
        {/* Left Panel: SideNavBar */}
        <aside className="w-full max-w-xs flex-col border-r border-slate-200 dark:border-r-[#233648] bg-white dark:bg-[#111a22] p-4 hidden md:flex">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-10 bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-2xl">account_tree</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-slate-800 dark:text-white text-base font-medium leading-normal">
                  Hiyerarşi
                </h1>
                <p className="text-slate-500 dark:text-[#92adc9] text-sm font-normal leading-normal">
                  Organizasyonel Yapı
                </p>
              </div>
            </div>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-xl">
                search
              </span>
              <input
                className="w-full rounded-lg border border-slate-200 dark:border-[#324d67] bg-slate-100 dark:bg-[#233648] pl-10 pr-4 py-2 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Hiyerarşide ara..."
                type="text"
              />
            </div>

            <nav className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              {hierarchy.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <p className="text-sm">Henüz grup şirketi bulunmuyor.</p>
                </div>
              ) : (
                hierarchy.map((group: any) => (
                  <div key={group._id.toString()} className="flex flex-col">
                    {/* Group Company */}
                    <Link
                      href={`/dashboard/organizations?groupId=${group._id}`}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-[#233648]"
                    >
                      <span className="material-symbols-outlined text-lg text-slate-400 dark:text-slate-500">
                        apartment
                      </span>
                      <span className="font-semibold">{group.name}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
                        (Grup)
                      </span>
                    </Link>

                    {/* Group Company Workspaces */}
                    {group.workspaces && group.workspaces.length > 0 && (
                      <div className="pl-5 border-l border-slate-200 dark:border-slate-700 ml-5 flex flex-col">
                        {group.workspaces.map((ws: any) => (
                          <div
                            key={ws._id.toString()}
                            className="flex flex-col"
                          >
                            <Link
                              href={`/dashboard/organizations?workspaceId=${ws._id}`}
                              className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                                selectedWorkspaceId === ws._id.toString()
                                  ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary'
                                  : 'hover:bg-slate-100 dark:hover:bg-[#233648]'
                              }`}
                            >
                              <span className="material-symbols-outlined text-lg">
                                {selectedWorkspaceId === ws._id.toString() ? 'folder_managed' : 'folder'}
                              </span>
                              <span>{ws.name}</span>
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Subsidiaries */}
                    {group.subsidiaries && group.subsidiaries.length > 0 && (
                      <div className="pl-5 border-l border-slate-200 dark:border-slate-700 ml-5 flex flex-col">
                        {group.subsidiaries.map((sub: any) => (
                          <div key={sub._id.toString()} className="flex flex-col">
                            <Link
                              href={`/dashboard/organizations?subsidiaryId=${sub._id}`}
                              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-[#233648]"
                            >
                              <span className="material-symbols-outlined text-lg text-slate-400 dark:text-slate-500">
                                business_center
                              </span>
                              <span>{sub.name}</span>
                              <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
                                (Yan Kuruluş)
                              </span>
                            </Link>

                            {/* Subsidiary Workspaces */}
                            {sub.workspaces && sub.workspaces.length > 0 && (
                              <div className="pl-5 border-l border-slate-200 dark:border-slate-700 ml-5 flex flex-col">
                                {sub.workspaces.map((ws: any) => (
                                  <div
                                    key={ws._id.toString()}
                                    className="flex flex-col"
                                  >
                                    <Link
                                      href={`/dashboard/organizations?workspaceId=${ws._id}`}
                                      className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                                        selectedWorkspaceId === ws._id.toString()
                                          ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary'
                                          : 'hover:bg-slate-100 dark:hover:bg-[#233648]'
                                      }`}
                                    >
                                      <span className="material-symbols-outlined text-lg">
                                        {selectedWorkspaceId === ws._id.toString() ? 'folder_managed' : 'folder'}
                                      </span>
                                      <span>{ws.name}</span>
                                    </Link>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </nav>
          </div>
        </aside>

        {/* Right Panel: Main Content */}
        <div className="flex-1 p-6 lg:p-10 bg-background-light dark:bg-background-dark overflow-y-auto">
          {selectedWorkspace ? (
            <div className="max-w-7xl mx-auto flex flex-col gap-8">
              {/* Page Heading */}
              <div className="flex flex-wrap justify-between gap-4 items-center">
                <div className="flex min-w-72 flex-col gap-1">
                  <p className="text-slate-800 dark:text-white text-3xl lg:text-4xl font-black leading-tight tracking-[-0.033em]">
                    {selectedWorkspace.name}
                  </p>
                  <p className="text-slate-500 dark:text-[#92adc9] text-base font-normal leading-normal">
                    Bu çalışma alanının detayları ve bağlı sözleşmeleri.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-slate-300 dark:border-[#324d67] bg-white dark:bg-[#111a22] text-sm font-bold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-[#233648]">
                    <span className="material-symbols-outlined text-lg">edit</span>
                    <span>Düzenle</span>
                  </button>
                  <button className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-slate-300 dark:border-[#324d67] bg-white dark:bg-[#111a22] text-sm font-bold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-[#233648]">
                    <span className="material-symbols-outlined text-lg">delete</span>
                    <span>Sil</span>
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2 rounded-xl p-6 border border-slate-200 dark:border-[#324d67] bg-white dark:bg-[#111a22]">
                  <p className="text-slate-600 dark:text-white text-base font-medium leading-normal">
                    Toplam Sözleşme
                  </p>
                  <p className="text-slate-800 dark:text-white tracking-light text-3xl font-bold leading-tight">
                    {stats.total}
                  </p>
                  <p className="text-[#36B37E] text-base font-medium leading-normal">+5.2%</p>
                </div>
                <div className="flex flex-col gap-2 rounded-xl p-6 border border-slate-200 dark:border-[#324d67] bg-white dark:bg-[#111a22]">
                  <p className="text-slate-600 dark:text-white text-base font-medium leading-normal">
                    Aktif Sözleşmeler
                  </p>
                  <p className="text-slate-800 dark:text-white tracking-light text-3xl font-bold leading-tight">
                    {stats.active}
                  </p>
                  <p className="text-[#36B37E] text-base font-medium leading-normal">+3.1%</p>
                </div>
                <div className="flex flex-col gap-2 rounded-xl p-6 border border-slate-200 dark:border-[#324d67] bg-white dark:bg-[#111a22]">
                  <p className="text-slate-600 dark:text-white text-base font-medium leading-normal">
                    Pasif Sözleşmeler
                  </p>
                  <p className="text-slate-800 dark:text-white tracking-light text-3xl font-bold leading-tight">
                    {stats.inactive}
                  </p>
                  <p className="text-[#DE350B] text-base font-medium leading-normal">-1.0%</p>
                </div>
              </div>

              {/* Description List */}
              <div className="p-6 rounded-xl border border-slate-200 dark:border-[#324d67] bg-white dark:bg-[#111a22]">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
                  Çalışma Alanı Detayları
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                  <div className="flex flex-col gap-1 border-t border-solid border-slate-200 dark:border-t-[#324d67] py-4">
                    <p className="text-slate-500 dark:text-[#92adc9] text-sm font-normal leading-normal">
                      Ana Şirket
                    </p>
                    <p className="text-slate-700 dark:text-white text-sm font-medium leading-normal">
                      {(selectedWorkspace.companyId as any)?.name || 'Belirtilmemiş'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 border-t border-solid border-slate-200 dark:border-t-[#324d67] py-4">
                    <p className="text-slate-500 dark:text-[#92adc9] text-sm font-normal leading-normal">
                      Çalışma Alanı Amacı
                    </p>
                    <p className="text-slate-700 dark:text-white text-sm font-medium leading-normal">
                      {selectedWorkspace.description || 'Açıklama belirtilmemiş.'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 border-t border-solid border-slate-200 dark:border-t-[#324d67] py-4">
                    <p className="text-slate-500 dark:text-[#92adc9] text-sm font-normal leading-normal">
                      Oluşturulma Tarihi
                    </p>
                    <p className="text-slate-700 dark:text-white text-sm font-medium leading-normal">
                      {new Date(selectedWorkspace.createdAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 border-t border-solid border-slate-200 dark:border-t-[#324d67] py-4">
                    <p className="text-slate-500 dark:text-[#92adc9] text-sm font-normal leading-normal">
                      Atanan Ekipler
                    </p>
                    <p className="text-slate-700 dark:text-white text-sm font-medium leading-normal">
                      Mühendislik, Hukuk
                    </p>
                  </div>
                </div>
              </div>

              {/* Contracts Table */}
              <div className="rounded-xl border border-slate-200 dark:border-[#324d67] bg-white dark:bg-[#111a22] overflow-hidden">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Bağlı Sözleşmeler</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 dark:border-[#324d67] text-xs uppercase text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#233648]/50">
                      <tr>
                        <th className="px-6 py-3 font-medium" scope="col">
                          Sözleşme Adı
                        </th>
                        <th className="px-6 py-3 font-medium" scope="col">
                          Durum
                        </th>
                        <th className="px-6 py-3 font-medium" scope="col">
                          Oluşturulma Tarihi
                        </th>
                        <th className="px-6 py-3 font-medium" scope="col">
                          Taraflar
                        </th>
                        <th className="px-6 py-3 font-medium text-right" scope="col">
                          İşlemler
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.length > 0 ? (
                        contracts.map((contract: any) => {
                          const statusColors: Record<string, string> = {
                            executed: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300',
                            approved: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300',
                            active: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300',
                            expired: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300',
                            draft: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300',
                            pending_approval: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300',
                            pending_signature: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300',
                          };

                          const statusLabels: Record<string, string> = {
                            executed: 'Aktif',
                            approved: 'Aktif',
                            active: 'Aktif',
                            expired: 'Süresi Dolmuş',
                            draft: 'Taslak',
                            pending_approval: 'İnceleme Bekliyor',
                            pending_signature: 'İnceleme Bekliyor',
                          };

                          return (
                            <tr
                              key={contract._id.toString()}
                              className="border-b border-slate-200 dark:border-[#324d67]"
                            >
                              <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">
                                {contract.title}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                    statusColors[contract.status] ||
                                    'bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-300'
                                  }`}
                                >
                                  {statusLabels[contract.status] || contract.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                {new Date(contract.createdAt).toLocaleDateString('tr-TR')}
                              </td>
                              <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                {contract.counterparty || 'Belirtilmemiş'}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <Link
                                  href={`/dashboard/contracts/${contract._id}`}
                                  className="font-medium text-primary hover:underline"
                                >
                                  Görüntüle
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                            Bu çalışma alanında sözleşme bulunamadı.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {contracts.length > 0 && (
                  <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-[#324d67]">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {stats.total} sonuçtan 1 - {contracts.length} arası gösteriliyor
                    </span>
                    <div className="inline-flex items-center -space-x-px text-sm">
                      <button className="flex items-center justify-center px-3 h-8 ms-0 leading-tight text-slate-500 bg-white border border-e-0 border-slate-300 rounded-s-lg hover:bg-slate-100 hover:text-slate-700 dark:bg-[#111a22] dark:border-[#324d67] dark:text-slate-400 dark:hover:bg-[#233648] dark:hover:text-white">
                        Önceki
                      </button>
                      <button className="flex items-center justify-center px-3 h-8 leading-tight text-slate-500 bg-white border border-slate-300 hover:bg-slate-100 hover:text-slate-700 dark:bg-[#111a22] dark:border-[#324d67] dark:text-slate-400 dark:hover:bg-[#233648] dark:hover:text-white">
                        1
                      </button>
                      <button className="flex items-center justify-center px-3 h-8 leading-tight text-slate-500 bg-white border border-slate-300 rounded-e-lg hover:bg-slate-100 hover:text-slate-700 dark:bg-[#111a22] dark:border-[#324d67] dark:text-slate-400 dark:hover:bg-[#233648] dark:hover:text-white">
                        Sonraki
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto flex flex-col gap-8 items-center justify-center min-h-[400px]">
              <p className="text-slate-500 dark:text-slate-400 text-lg">
                Detayları görüntülemek için yan menüden bir çalışma alanı seçin.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

