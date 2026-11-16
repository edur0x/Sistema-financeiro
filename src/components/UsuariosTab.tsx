import React, { useState } from 'react';
import {
  Check,
  Edit3,
  FileSpreadsheet,
  FileText,
  KeyRound,
  Plus,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  PERMISSION_CATALOG,
  type AccessProfile,
  type PermissionKey,
  type UserAccount,
} from '../types';
import { formatDateBR, generateId, getTodayISO } from '../utils/calculations';
import { exportUsersProfilesExcel, exportUsersProfilesPDF } from '../utils/exports';
import { ConfirmModal } from './ConfirmModal';

interface UsuariosTabProps {
  users: UserAccount[];
  profiles: AccessProfile[];
  currentUserId: string;
  canExport: boolean;
  onSaveUser: (user: UserAccount) => void;
  onDeleteUser: (userId: string) => void;
  onSaveProfile: (profile: AccessProfile) => void;
  onDeleteProfile: (profileId: string) => void;
}

export const UsuariosTab: React.FC<UsuariosTabProps> = ({
  users,
  profiles,
  currentUserId,
  canExport,
  onSaveUser,
  onDeleteUser,
  onSaveProfile,
  onDeleteProfile,
}) => {
  const [subView, setSubView] = useState<'users' | 'profiles'>('users');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // User form state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userLogin, setUserLogin] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userProfileId, setUserProfileId] = useState<string>(profiles[0]?.id ?? '');
  const [userActive, setUserActive] = useState(true);

  // Profile form state
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileDesc, setProfileDesc] = useState('');
  const [profilePermissions, setProfilePermissions] = useState<PermissionKey[]>([
    'pesquisar.visualizar',
  ]);

  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'user' | 'profile';
    id: string;
    label: string;
  } | null>(null);

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const resetUserForm = () => {
    setEditingUserId(null);
    setUserName('');
    setUserLogin('');
    setUserPassword('');
    setUserProfileId(profiles[0]?.id ?? '');
    setUserActive(true);
  };

  const resetProfileForm = () => {
    setEditingProfileId(null);
    setProfileName('');
    setProfileDesc('');
    setProfilePermissions(['pesquisar.visualizar']);
  };

  const handleEditUser = (u: UserAccount) => {
    setEditingUserId(u.id);
    setUserName(u.nome);
    setUserLogin(u.login);
    setUserPassword(u.senha);
    setUserProfileId(u.profileId);
    setUserActive(u.ativo);
    setFeedback(null);
  };

  const handleSubmitUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!userName.trim() || !userLogin.trim() || !userPassword.trim()) {
      setFeedback({
        type: 'error',
        message: 'Preencha Nome, Login e Senha para salvar o usuário.',
      });
      return;
    }

    const duplicateLogin = users.some(
      (u) =>
        u.login.trim().toLowerCase() === userLogin.trim().toLowerCase() &&
        u.id !== editingUserId
    );
    if (duplicateLogin) {
      setFeedback({
        type: 'error',
        message: `O login "${userLogin.trim()}" já está em uso por outro usuário.`,
      });
      return;
    }

    const existing = editingUserId ? users.find((u) => u.id === editingUserId) : null;
    const saved: UserAccount = {
      id: editingUserId ?? generateId('usr'),
      nome: userName.trim(),
      login: userLogin.trim(),
      senha: userPassword,
      profileId: userProfileId || profiles[0]?.id || '',
      ativo: userActive,
      criadoEm: existing?.criadoEm ?? getTodayISO(),
    };

    onSaveUser(saved);
    resetUserForm();
    setFeedback({
      type: 'success',
      message: `Usuário "${saved.nome}" (${saved.login}) salvo com sucesso.`,
    });
  };

  const handleEditProfile = (p: AccessProfile) => {
    setEditingProfileId(p.id);
    setProfileName(p.nome);
    setProfileDesc(p.descricao);
    setProfilePermissions([...p.permissions]);
    setFeedback(null);
  };

  const togglePermission = (key: PermissionKey) => {
    setProfilePermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSubmitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!profileName.trim()) {
      setFeedback({
        type: 'error',
        message: 'Informe o nome do perfil de acesso.',
      });
      return;
    }

    const existing = editingProfileId
      ? profiles.find((p) => p.id === editingProfileId)
      : null;

    if (existing?.isSystemAdmin && !profilePermissions.includes('usuarios.gerenciar')) {
      setFeedback({
        type: 'error',
        message: 'O perfil Administrador deve manter a permissão de gerenciar usuários e perfis.',
      });
      return;
    }

    const saved: AccessProfile = {
      id: editingProfileId ?? generateId('prof'),
      nome: profileName.trim(),
      descricao: profileDesc.trim() || 'Perfil personalizado de acesso.',
      isSystemAdmin: existing?.isSystemAdmin,
      permissions: profilePermissions,
    };

    onSaveProfile(saved);
    resetProfileForm();
    setFeedback({
      type: 'success',
      message: `Perfil "${saved.nome}" salvo com ${saved.permissions.length} permissão(ões).`,
    });
  };

  const inputCls =
    'w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-sky-800 dark:focus:border-sky-500 focus:outline-none';

  return (
    <div className="space-y-4">
      {/* Sub-navigation & Export */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
        <div className="flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 p-1">
          <button
            type="button"
            onClick={() => {
              setSubView('users');
              setFeedback(null);
            }}
            className={`inline-flex items-center gap-2 rounded px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              subView === 'users'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Usuários ({users.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setSubView('profiles');
              setFeedback(null);
            }}
            className={`inline-flex items-center gap-2 rounded px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              subView === 'profiles'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            Perfis e Permissões ({profiles.length})
          </button>
        </div>

        {canExport && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportUsersProfilesPDF(users, profiles)}
              className="inline-flex items-center gap-1.5 rounded border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-3 py-1.5 text-xs font-semibold text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 whitespace-nowrap shrink-0"
            >
              <FileText className="h-3.5 w-3.5" />
              Relatório PDF
            </button>
            <button
              type="button"
              onClick={() => exportUsersProfilesExcel(users, profiles)}
              className="inline-flex items-center gap-1.5 rounded border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Relatório Excel
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div
          role="status"
          className={`rounded-md border px-4 py-2.5 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200'
              : 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 text-red-900 dark:text-red-200'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {subView === 'users' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* User Form */}
          <form
            onSubmit={handleSubmitUser}
            className="lg:col-span-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-sky-900 dark:text-sky-400" />
                {editingUserId ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              {editingUserId && (
                <button
                  type="button"
                  onClick={resetUserForm}
                  className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline"
                >
                  Cancelar edição
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Ex: Ana Paula Ferreira"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Login de Acesso *
              </label>
              <input
                type="text"
                value={userLogin}
                onChange={(e) => setUserLogin(e.target.value)}
                placeholder="Ex: anapaula"
                className={`${inputCls} font-mono-tabular`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Senha *
              </label>
              <input
                type="text"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                placeholder="Digite a senha inicial"
                className={`${inputCls} font-mono-tabular`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Perfil de Acesso *
              </label>
              <select
                value={userProfileId}
                onChange={(e) => setUserProfileId(e.target.value)}
                className={inputCls}
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} ({p.permissions.length} permissões)
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={userActive}
                onChange={(e) => setUserActive(e.target.checked)}
                disabled={editingUserId === currentUserId}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-sky-900 focus:ring-sky-800"
              />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Usuário ativo (pode efetuar login)
              </span>
            </label>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-sky-900 dark:bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-950 dark:hover:bg-sky-600"
            >
              <Plus className="h-4 w-4" />
              {editingUserId ? 'Salvar Alterações' : 'Criar Usuário'}
            </button>
          </form>

          {/* Users Table */}
          <div className="lg:col-span-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                Usuários Cadastrados
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Nome</th>
                    <th className="px-3 py-2.5 font-semibold">Login</th>
                    <th className="px-3 py-2.5 font-semibold">Perfil</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-3 py-2.5 font-semibold">Criado em</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {users.map((u) => {
                    const prof = profileMap.get(u.profileId);
                    const isSelf = u.id === currentUserId;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                          {u.nome}{' '}
                          {isSelf && (
                            <span className="text-[11px] text-sky-800 dark:text-sky-400">
                              (Você)
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-mono-tabular text-slate-700 dark:text-slate-300">
                          {u.login}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-sky-900 dark:text-sky-400">
                          {prof?.nome ?? 'Sem perfil'}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`font-medium ${
                              u.ativo
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-red-700 dark:text-red-400'
                            }`}
                          >
                            {u.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono-tabular text-slate-500 dark:text-slate-400">
                          {formatDateBR(u.criadoEm)}
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditUser(u)}
                              className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-sky-800 dark:hover:border-sky-500 hover:text-sky-900 dark:hover:text-sky-300 inline-flex items-center gap-1"
                            >
                              <Edit3 className="h-3 w-3" />
                              Editar
                            </button>
                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmDelete({
                                    type: 'user',
                                    id: u.id,
                                    label: `${u.nome} (${u.login})`,
                                  })
                                }
                                className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[11px] font-medium text-red-700 dark:text-red-400 hover:border-red-300 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/50 inline-flex items-center gap-1"
                              >
                                <Trash2 className="h-3 w-3" />
                                Excluir
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Profile Builder Form */}
          <form
            onSubmit={handleSubmitProfile}
            className="lg:col-span-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-sky-900 dark:text-sky-400" />
                {editingProfileId ? 'Editar Perfil de Acesso' : 'Criar Novo Perfil'}
              </h2>
              {editingProfileId && (
                <button
                  type="button"
                  onClick={resetProfileForm}
                  className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline"
                >
                  Novo perfil
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nome do Perfil *
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Ex: Supervisor Comercial"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Descrição
              </label>
              <input
                type="text"
                value={profileDesc}
                onChange={(e) => setProfileDesc(e.target.value)}
                placeholder="Finalidade deste perfil de acesso"
                className={inputCls}
              />
            </div>

            <div className="pt-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Funcionalidades Liberadas ({profilePermissions.length}/{PERMISSION_CATALOG.length})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setProfilePermissions(
                      profilePermissions.length === PERMISSION_CATALOG.length
                        ? []
                        : PERMISSION_CATALOG.map((p) => p.key)
                    )
                  }
                  className="text-[11px] font-semibold text-sky-900 dark:text-sky-400 hover:underline"
                >
                  {profilePermissions.length === PERMISSION_CATALOG.length
                    ? 'Desmarcar todas'
                    : 'Selecionar todas'}
                </button>
              </div>

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {PERMISSION_CATALOG.map((perm) => {
                  const checked = profilePermissions.includes(perm.key);
                  return (
                    <label
                      key={perm.key}
                      className={`flex items-start gap-2.5 rounded border p-2.5 cursor-pointer transition-colors ${
                        checked
                          ? 'border-sky-700 dark:border-sky-600 bg-sky-50/50 dark:bg-sky-950/40'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePermission(perm.key)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-sky-900 focus:ring-sky-800"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {perm.module} · {perm.label}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          {perm.description}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-sky-900 dark:bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-950 dark:hover:bg-sky-600"
            >
              <Check className="h-4 w-4" />
              {editingProfileId ? 'Atualizar Perfil' : 'Salvar Novo Perfil'}
            </button>
          </form>

          {/* Profiles List */}
          <div className="lg:col-span-7 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                Perfis Cadastrados e Matriz de Permissões
              </h3>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {profiles.map((prof) => {
                const usersCount = users.filter((u) => u.profileId === prof.id).length;
                return (
                  <div key={prof.id} className="p-4 flex flex-col gap-2.5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {prof.nome}
                          </h4>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            · {usersCount} usuário{usersCount === 1 ? '' : 's'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          {prof.descricao}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditProfile(prof)}
                          className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-sky-800 dark:hover:border-sky-500 hover:text-sky-900 dark:hover:text-sky-300 inline-flex items-center gap-1"
                        >
                          <Edit3 className="h-3 w-3" />
                          Editar
                        </button>
                        {!prof.isSystemAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDelete({
                                type: 'profile',
                                id: prof.id,
                                label: prof.nome,
                              })
                            }
                            className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-400 hover:border-red-300 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/50 inline-flex items-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" />
                            Excluir
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Acessos:{' '}
                      </span>
                      {prof.permissions.length === 0
                        ? 'Nenhuma funcionalidade liberada'
                        : prof.permissions
                            .map(
                              (pk) =>
                                PERMISSION_CATALOG.find((item) => item.key === pk)?.label ?? pk
                            )
                            .join(' · ')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmDelete)}
        title={
          confirmDelete?.type === 'user' ? 'Excluir Usuário' : 'Excluir Perfil de Acesso'
        }
        description={
          confirmDelete?.type === 'user'
            ? `Tem certeza que deseja excluir o usuário "${confirmDelete.label}"?`
            : `Deseja excluir o perfil "${confirmDelete?.label}"? Usuários vinculados serão movidos para o primeiro perfil disponível.`
        }
        onConfirm={() => {
          if (confirmDelete) {
            if (confirmDelete.type === 'user') {
              onDeleteUser(confirmDelete.id);
              if (editingUserId === confirmDelete.id) resetUserForm();
            } else {
              onDeleteProfile(confirmDelete.id);
              if (editingProfileId === confirmDelete.id) resetProfileForm();
            }
          }
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};
