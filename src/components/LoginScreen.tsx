import React, { useState } from 'react';
import { Eye, EyeOff, Lock, LogIn, Moon, ShieldCheck, Sun, User } from 'lucide-react';
import type { AccessProfile, UserAccount } from '../types';

interface LoginScreenProps {
  users: UserAccount[];
  profiles: AccessProfile[];
  isDark: boolean;
  onToggleTheme: () => void;
  onLogin: (user: UserAccount) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  users,
  profiles,
  isDark,
  onToggleTheme,
  onLogin,
}) => {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanLogin = login.trim().toLowerCase();
    if (!cleanLogin || !senha) {
      setError('Informe o login e a senha para acessar o sistema.');
      return;
    }

    const found = users.find(
      (u) => u.login.trim().toLowerCase() === cleanLogin && u.senha === senha
    );

    if (!found) {
      setError('Login ou senha inválidos. Verifique suas credenciais.');
      return;
    }

    if (!found.ativo) {
      setError('Este usuário está inativo. Solicite a reativação ao Administrador.');
      return;
    }

    onLogin(found);
  };

  const handleQuickFill = (user: UserAccount) => {
    setLogin(user.login);
    setSenha(user.senha);
    setError('');
  };

  const activeDemoUsers = users.filter((u) => u.ativo).slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col">
      {/* Top Crimson Brand Banner */}
      <div className="bg-red-700 text-white py-3.5 px-6 shadow-sm">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-4">
          <span className="font-display text-lg font-bold tracking-wide">
            SISTEMA FINANCEIRO MZ
          </span>
          <div className="flex items-center gap-4">
            <span className="text-xs text-red-100 hidden sm:inline">
              Gestão de Consultores, Clientes, Pedidos e Comissões
            </span>
            <button
              type="button"
              onClick={onToggleTheme}
              title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              className="rounded-md border border-red-400/50 bg-red-800/60 p-1.5 text-white transition-colors hover:bg-red-900"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          {/* Left Panel: Login Form */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
            <div className="mb-7">
              <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                Acesso ao Sistema
              </p>
              <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
                Identificação do Usuário
              </h1>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                Entre com seu login e senha para carregar as permissões do seu perfil.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-input"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Login
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="login-input"
                    type="text"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    placeholder="Digite seu login (ex: admin)"
                    autoComplete="username"
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-sky-800 dark:focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-800/15"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="senha-input"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Senha
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="senha-input"
                    type={showPassword ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-10 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-sky-800 dark:focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-800/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-3.5 py-2.5 text-sm text-red-800 dark:text-red-300"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-sky-900 dark:bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-950 dark:hover:bg-sky-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-900"
              >
                <LogIn className="h-4 w-4" />
                Entrar no Sistema
              </button>
            </form>
          </div>

          {/* Right Panel: Demo Accounts for Fast Evaluation */}
          <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/60 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 mb-2">
                <ShieldCheck className="h-4 w-4 text-sky-900 dark:text-sky-400" />
                <h2 className="font-display text-sm font-semibold">
                  Contas de Demonstração
                </h2>
              </div>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 mb-4">
                Clique em um perfil abaixo para preencher automaticamente e testar os diferentes níveis de acesso liberados pelo Administrador.
              </p>

              <div className="space-y-2.5">
                {activeDemoUsers.map((u) => {
                  const prof = profileMap.get(u.profileId);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleQuickFill(u)}
                      className="w-full text-left rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 transition-colors hover:border-sky-800 dark:hover:border-sky-500 hover:bg-sky-50/40 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-sky-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {u.nome}
                        </span>
                        <span className="text-xs font-medium text-sky-900 dark:text-sky-400 whitespace-nowrap shrink-0">
                          {prof?.nome ?? 'Perfil'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                        <span>Login: {u.login}</span>
                        <span aria-hidden="true">·</span>
                        <span>Senha: {u.senha}</span>
                        <span aria-hidden="true">·</span>
                        <span>{prof?.permissions.length ?? 0} permissões</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
              Novos usuários e perfis criados pelo Administrador ficam disponíveis imediatamente para login neste navegador.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
