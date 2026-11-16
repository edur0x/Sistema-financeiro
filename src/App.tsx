import { useEffect, useMemo, useState } from 'react';
import { LogOut, Moon, RotateCcw, Sun } from 'lucide-react';
import { CadastroTab } from './components/CadastroTab';
import { ConfirmModal } from './components/ConfirmModal';
import { LoginScreen } from './components/LoginScreen';
import { PesquisarTab } from './components/PesquisarTab';
import { RelatoriosTab } from './components/RelatoriosTab';
import { UsuariosTab } from './components/UsuariosTab';
import type {
  AccessProfile,
  ActiveTab,
  ConsultantRecord,
  PermissionKey,
  UserAccount,
} from './types';
import {
  INITIAL_CONSULTANTS,
  INITIAL_PROFILES,
  INITIAL_USERS,
} from './utils/seedData';

const STORAGE_KEYS = {
  consultants: 'sfmz_consultants_v1',
  users: 'sfmz_users_v1',
  profiles: 'sfmz_profiles_v1',
  sessionUserId: 'sfmz_session_user_v1',
  theme: 'sfmz_theme_v1',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [profiles, setProfiles] = useState<AccessProfile[]>(() =>
    loadFromStorage(STORAGE_KEYS.profiles, INITIAL_PROFILES)
  );
  const [users, setUsers] = useState<UserAccount[]>(() =>
    loadFromStorage(STORAGE_KEYS.users, INITIAL_USERS)
  );
  const [consultants, setConsultants] = useState<ConsultantRecord[]>(() =>
    loadFromStorage(STORAGE_KEYS.consultants, INITIAL_CONSULTANTS)
  );
  const [sessionUserId, setSessionUserId] = useState<string | null>(() =>
    loadFromStorage(STORAGE_KEYS.sessionUserId, null)
  );
  const [isDark, setIsDark] = useState<boolean>(() =>
    loadFromStorage(STORAGE_KEYS.theme, false)
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>('cadastro');
  const [selectedConsultantId, setSelectedConsultantId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Sync dark mode class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(isDark));
    } catch {
      // ignore
    }
  }, [isDark]);

  // Persist state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(profiles));
    } catch {
      // ignore storage quota errors
    }
  }, [profiles]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
    } catch {
      // ignore
    }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.consultants, JSON.stringify(consultants));
    } catch {
      // ignore
    }
  }, [consultants]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.sessionUserId, JSON.stringify(sessionUserId));
    } catch {
      // ignore
    }
  }, [sessionUserId]);

  const currentUser = useMemo(
    () => users.find((u) => u.id === sessionUserId && u.ativo) ?? null,
    [users, sessionUserId]
  );

  const currentProfile = useMemo(
    () => (currentUser ? profiles.find((p) => p.id === currentUser.profileId) ?? null : null),
    [currentUser, profiles]
  );

  const hasPermission = (key: PermissionKey): boolean => {
    if (!currentProfile) return false;
    return currentProfile.permissions.includes(key);
  };

  const availableTabs = useMemo(() => {
    if (!currentProfile) return [] as Array<{ id: ActiveTab; label: string }>;
    const tabs: Array<{ id: ActiveTab; label: string }> = [];
    if (currentProfile.permissions.includes('cadastro.visualizar')) {
      tabs.push({ id: 'cadastro', label: 'Cadastro' });
    }
    if (currentProfile.permissions.includes('pesquisar.visualizar')) {
      tabs.push({ id: 'pesquisar', label: 'Pesquisar' });
    }
    if (currentProfile.permissions.includes('relatorios.exportar')) {
      tabs.push({ id: 'relatorios', label: 'Relatórios' });
    }
    if (currentProfile.permissions.includes('usuarios.gerenciar')) {
      tabs.push({ id: 'usuarios', label: 'Usuários' });
    }
    return tabs;
  }, [currentProfile]);

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some((t) => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  const handleLogin = (user: UserAccount) => {
    setSessionUserId(user.id);
    const prof = profiles.find((p) => p.id === user.profileId);
    if (prof?.permissions.includes('cadastro.visualizar')) {
      setActiveTab('cadastro');
    } else if (prof?.permissions.includes('pesquisar.visualizar')) {
      setActiveTab('pesquisar');
    } else if (prof?.permissions.includes('relatorios.exportar')) {
      setActiveTab('relatorios');
    } else if (prof?.permissions.includes('usuarios.gerenciar')) {
      setActiveTab('usuarios');
    }
  };

  const handleLogout = () => {
    setSessionUserId(null);
    setSelectedConsultantId(null);
    setSelectedOrderId(null);
  };

  const handleSaveConsultant = (record: ConsultantRecord) => {
    setConsultants((prev) => {
      const exists = prev.some((c) => c.id === record.id);
      if (exists) {
        return prev.map((c) => (c.id === record.id ? record : c));
      }
      return [record, ...prev];
    });
  };

  const handleDeleteConsultant = (consultantId: string) => {
    setConsultants((prev) => prev.filter((c) => c.id !== consultantId));
    if (selectedConsultantId === consultantId) {
      setSelectedConsultantId(null);
      setSelectedOrderId(null);
    }
  };

  const handleDeleteOrderFromSearch = (consultantId: string, orderId: string) => {
    setConsultants((prev) =>
      prev.map((c) =>
        c.id === consultantId
          ? { ...c, pedidos: c.pedidos.filter((p) => p.id !== orderId) }
          : c
      )
    );
  };

  const handleOpenInCadastro = (consultantId: string, orderId: string | null) => {
    setSelectedConsultantId(consultantId);
    setSelectedOrderId(orderId);
    setActiveTab('cadastro');
  };

  const handleSaveUser = (user: UserAccount) => {
    setUsers((prev) => {
      const exists = prev.some((u) => u.id === user.id);
      return exists ? prev.map((u) => (u.id === user.id ? user : u)) : [...prev, user];
    });
  };

  const handleDeleteUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleSaveProfile = (profile: AccessProfile) => {
    setProfiles((prev) => {
      const exists = prev.some((p) => p.id === profile.id);
      return exists
        ? prev.map((p) => (p.id === profile.id ? profile : p))
        : [...prev, profile];
    });
  };

  const handleDeleteProfile = (profileId: string) => {
    const fallbackProfile = profiles.find((p) => p.id !== profileId);
    setProfiles((prev) => prev.filter((p) => p.id !== profileId));
    if (fallbackProfile) {
      setUsers((prev) =>
        prev.map((u) =>
          u.profileId === profileId ? { ...u, profileId: fallbackProfile.id } : u
        )
      );
    }
  };

  const handleResetDemo = () => {
    setConsultants(INITIAL_CONSULTANTS);
    setProfiles(INITIAL_PROFILES);
    setUsers(INITIAL_USERS);
    setSelectedConsultantId(null);
    setSelectedOrderId(null);
    setConfirmResetOpen(false);
  };

  if (!currentUser) {
    return (
      <LoginScreen
        users={users}
        profiles={profiles}
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div className="no-print min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col">
      {/* Top Crimson Bar (3-zone Top Bar Contract) */}
      <header className="bg-red-700 text-white shadow-sm">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          <span className="font-display text-base sm:text-lg font-bold tracking-wide whitespace-nowrap shrink-0">
            SISTEMA FINANCEIRO MZ
          </span>

          <nav
            aria-label="Navegação Principal"
            className="flex items-center gap-1 sm:gap-2 overflow-x-auto"
          >
            {availableTabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-red-800 font-semibold shadow-sm'
                      : 'text-red-50 hover:bg-red-800/70 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded border border-red-400/50 bg-red-800/60 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-900 whitespace-nowrap shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      </header>

      {/* Quiet Context Sub-bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Usuário:{' '}
              <strong className="text-slate-900 dark:text-slate-100">{currentUser.nome}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Perfil:{' '}
              <strong className="text-sky-900 dark:text-sky-400">
                {currentProfile?.nome ?? 'Padrão'}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>{currentProfile?.permissions.length ?? 0} funcionalidade(s) liberada(s)</span>
          </div>

          <div className="flex items-center gap-4">
            {hasPermission('usuarios.gerenciar') && (
              <button
                type="button"
                onClick={() => setConfirmResetOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3 w-3" />
                Restaurar Dados Demo
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDark((prev) => !prev)}
              title={isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
              aria-label={isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
              className="inline-flex items-center gap-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
            >
              {isDark ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-slate-600" />}
              <span>{isDark ? 'Tema Claro' : 'Tema Escuro'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1 mx-auto w-full max-w-[1440px] px-4 sm:px-6 py-5">
        {availableTabs.length === 0 ? (
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center max-w-lg mx-auto mt-10">
            <h1 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              Nenhuma funcionalidade habilitada
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              O perfil <strong>{currentProfile?.nome}</strong> não possui módulos liberados no momento. Solicite ao Administrador a liberação das permissões necessárias.
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'cadastro' && hasPermission('cadastro.visualizar') && (
              <CadastroTab
                consultants={consultants}
                selectedConsultantId={selectedConsultantId}
                selectedOrderId={selectedOrderId}
                hasPermission={hasPermission}
                onSaveConsultant={handleSaveConsultant}
                onDeleteConsultant={handleDeleteConsultant}
                onSelectConsultant={(cId, oId = null) => {
                  setSelectedConsultantId(cId);
                  setSelectedOrderId(oId);
                }}
              />
            )}

            {activeTab === 'pesquisar' && hasPermission('pesquisar.visualizar') && (
              <PesquisarTab
                consultants={consultants}
                hasPermission={hasPermission}
                onOpenInCadastro={handleOpenInCadastro}
                onDeleteOrder={handleDeleteOrderFromSearch}
              />
            )}

            {activeTab === 'relatorios' && hasPermission('relatorios.exportar') && (
              <RelatoriosTab
                consultants={consultants}
                users={users}
                profiles={profiles}
              />
            )}

            {activeTab === 'usuarios' && hasPermission('usuarios.gerenciar') && (
              <UsuariosTab
                users={users}
                profiles={profiles}
                currentUserId={currentUser.id}
                canExport={hasPermission('relatorios.exportar')}
                onSaveUser={handleSaveUser}
                onDeleteUser={handleDeleteUser}
                onSaveProfile={handleSaveProfile}
                onDeleteProfile={handleDeleteProfile}
              />
            )}
          </>
        )}
      </main>

      <ConfirmModal
        open={confirmResetOpen}
        title="Restaurar Dados de Demonstração"
        description="Isso restaurará os consultores, pedidos, usuários e perfis iniciais de demonstração. Alterações locais feitas neste navegador serão substituídas."
        confirmLabel="Restaurar Demo"
        onConfirm={handleResetDemo}
        onCancel={() => setConfirmResetOpen(false)}
      />
    </div>
  );
}
