import React, { useMemo, useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import {
  ORDER_STATUS_OPTIONS,
  type AccessProfile,
  type ConsultantRecord,
  type UserAccount,
} from '../types';
import {
  calculateConsultantFinancials,
  formatCurrency,
  formatDateBR,
} from '../utils/calculations';
import {
  exportConsultantsOrdersExcel,
  exportConsultantsOrdersPDF,
  exportUsersProfilesExcel,
  exportUsersProfilesPDF,
  type FlattenedOrderRow,
} from '../utils/exports';

interface RelatoriosTabProps {
  consultants: ConsultantRecord[];
  users: UserAccount[];
  profiles: AccessProfile[];
}

export const RelatoriosTab: React.FC<RelatoriosTabProps> = ({
  consultants,
  users,
  profiles,
}) => {
  const [selectedConsultantId, setSelectedConsultantId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const filteredRows = useMemo<FlattenedOrderRow[]>(() => {
    const rows: FlattenedOrderRow[] = [];
    consultants.forEach((c) => {
      if (selectedConsultantId && c.id !== selectedConsultantId) return;
      const fin = calculateConsultantFinancials(c.pedidos, c.taxaBancaria);
      c.pedidos.forEach((p) => {
        if (selectedStatus && p.status !== selectedStatus) return;
        rows.push({
          consultor: c,
          pedido: p,
          totalContratoConsultor: fin.totalContrato,
          totalReceberConsultor: fin.totalReceber,
        });
      });
    });
    return rows;
  }, [consultants, selectedConsultantId, selectedStatus]);

  const scopeLabel = useMemo(() => {
    const parts: string[] = [];
    if (selectedConsultantId) {
      const c = consultants.find((x) => x.id === selectedConsultantId);
      if (c) parts.push(`Consultor: ${c.nomeConsultor}`);
    }
    if (selectedStatus) parts.push(`Status: ${selectedStatus}`);
    return parts.length > 0 ? parts.join(' | ') : 'Todos os Consultores e Pedidos';
  }, [consultants, selectedConsultantId, selectedStatus]);

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const selectCls =
    'w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:border-sky-800 dark:focus:border-sky-500 focus:outline-none';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Report 1: Cadastros e Pedidos */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              Relatório de Cadastros e Pedidos
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Inclui dados bancários do consultor, comissão por pedido, total do contrato, taxa bancária e total a receber.
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Filtrar Consultor
                </label>
                <select
                  value={selectedConsultantId}
                  onChange={(e) => setSelectedConsultantId(e.target.value)}
                  className={selectCls}
                >
                  <option value="">Todos os Consultores</option>
                  {consultants.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nomeConsultor}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Filtrar Status do Pedido
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className={selectCls}
                >
                  <option value="">Todos os Status</option>
                  {ORDER_STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-600 dark:text-slate-300 font-mono-tabular">
              Registros selecionados: {filteredRows.length} pedido(s)
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  exportConsultantsOrdersPDF(filteredRows, consultants, scopeLabel)
                }
                className="inline-flex items-center gap-1.5 rounded bg-red-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-800 whitespace-nowrap shrink-0"
              >
                <FileText className="h-3.5 w-3.5" />
                Baixar PDF
              </button>
              <button
                type="button"
                onClick={() => exportConsultantsOrdersExcel(filteredRows, consultants)}
                className="inline-flex items-center gap-1.5 rounded bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Baixar Excel (.xlsx)
              </button>
            </div>
          </div>
        </div>

        {/* Report 2: Usuários e Perfis */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              Relatório de Usuários e Perfis de Acesso
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Lista completa de usuários cadastrados, status de acesso, perfil atribuído e matriz de permissões liberadas.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3 py-2.5">
                <div className="text-slate-500 dark:text-slate-400">Usuários Cadastrados</div>
                <div className="mt-0.5 text-lg font-bold font-mono-tabular text-slate-900 dark:text-slate-100">
                  {users.length}
                </div>
              </div>
              <div className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3 py-2.5">
                <div className="text-slate-500 dark:text-slate-400">Perfis Configurados</div>
                <div className="mt-0.5 text-lg font-bold font-mono-tabular text-slate-900 dark:text-slate-100">
                  {profiles.length}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-600 dark:text-slate-300 font-mono-tabular">
              Ativos: {users.filter((u) => u.ativo).length} / {users.length}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exportUsersProfilesPDF(users, profiles)}
                className="inline-flex items-center gap-1.5 rounded bg-red-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-800 whitespace-nowrap shrink-0"
              >
                <FileText className="h-3.5 w-3.5" />
                Baixar PDF
              </button>
              <button
                type="button"
                onClick={() => exportUsersProfilesExcel(users, profiles)}
                className="inline-flex items-center gap-1.5 rounded bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Baixar Excel (.xlsx)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Consolidated Consultant Financial Preview */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
            Prévia Consolidada por Consultor
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Consultor</th>
                <th className="px-3 py-2.5 font-semibold">CPF / CNPJ</th>
                <th className="px-3 py-2.5 font-semibold">Banco / Pix</th>
                <th className="px-3 py-2.5 font-semibold text-right">Qtd Pedidos</th>
                <th className="px-3 py-2.5 font-semibold text-right">Σ Comissões</th>
                <th className="px-3 py-2.5 font-semibold text-right">Descontos</th>
                <th className="px-3 py-2.5 font-semibold text-right">Total Contrato</th>
                <th className="px-3 py-2.5 font-semibold text-right">Taxa Bancária</th>
                <th className="px-3 py-2.5 font-semibold text-right">Total Receber</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {consultants
                .filter((c) => !selectedConsultantId || c.id === selectedConsultantId)
                .map((c) => {
                  const fin = calculateConsultantFinancials(c.pedidos, c.taxaBancaria);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                        {c.nomeConsultor}
                      </td>
                      <td className="px-3 py-2.5 font-mono-tabular text-slate-600 dark:text-slate-300">
                        {[c.cpf, c.cnpj].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                        {c.banco || '—'} {c.pix ? `· Pix: ${c.pix}` : ''}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-tabular">
                        {c.pedidos.length}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-tabular">
                        {formatCurrency(fin.somaComissoes)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-tabular">
                        {formatCurrency(fin.somaDescontos)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-tabular font-semibold text-sky-900 dark:text-sky-400">
                        {formatCurrency(fin.totalContrato)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-tabular">
                        {formatCurrency(c.taxaBancaria)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-tabular font-bold text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(fin.totalReceber)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users Preview */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
            Prévia de Usuários e Acessos
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                    {u.nome}
                  </td>
                  <td className="px-3 py-2.5 font-mono-tabular text-slate-700 dark:text-slate-300">
                    {u.login}
                  </td>
                  <td className="px-3 py-2.5 text-sky-900 dark:text-sky-400 font-medium">
                    {profileMap.get(u.profileId)?.nome ?? 'Sem perfil'}
                  </td>
                  <td className="px-3 py-2.5 font-medium">
                    <span
                      className={
                        u.ativo
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-red-700 dark:text-red-400'
                      }
                    >
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono-tabular text-slate-500 dark:text-slate-400">
                    {formatDateBR(u.criadoEm)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
