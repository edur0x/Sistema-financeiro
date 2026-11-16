import React, { useMemo, useState } from 'react';
import {
  Edit3,
  FileSpreadsheet,
  FileText,
  FilterX,
  PlusCircle,
  Printer,
  Search,
  Trash2,
} from 'lucide-react';
import {
  ORDER_STATUS_OPTIONS,
  type ConsultantRecord,
  type PermissionKey,
  type SearchFilters,
} from '../types';
import {
  calculateConsultantFinancials,
  formatCurrency,
  formatDateBR,
} from '../utils/calculations';
import {
  exportConsultantsOrdersExcel,
  exportConsultantsOrdersPDF,
  type FlattenedOrderRow,
} from '../utils/exports';
import { ConfirmModal } from './ConfirmModal';
import { PrintOrdersModal, type PrintConsultantGroup } from './PrintOrdersModal';

interface PesquisarTabProps {
  consultants: ConsultantRecord[];
  hasPermission: (key: PermissionKey) => boolean;
  onOpenInCadastro: (consultantId: string, orderId: string | null) => void;
  onDeleteOrder: (consultantId: string, orderId: string) => void;
}

const INITIAL_FILTERS: SearchFilters = {
  buscaGeral: '',
  consultorId: '',
  nomeCliente: '',
  documentoCliente: '',
  cotacao: '',
  codigoAace: '',
  operadora: '',
  tipoPedido: '',
  status: '',
  dataAtivacaoInicio: '',
  dataAtivacaoFim: '',
  dataPagamentoInicio: '',
  dataPagamentoFim: '',
};

export const PesquisarTab: React.FC<PesquisarTabProps> = ({
  consultants,
  hasPermission,
  onOpenInCadastro,
  onDeleteOrder,
}) => {
  const [filters, setFilters] = useState<SearchFilters>(INITIAL_FILTERS);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [checkedPrintKeys, setCheckedPrintKeys] = useState<string[]>([]);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    consultantId: string;
    orderId: string;
    label: string;
  } | null>(null);

  const canEditItem =
    hasPermission('pesquisar.editar_item') && hasPermission('cadastro.visualizar');
  const canDelete = hasPermission('cadastro.excluir');
  const canExport = hasPermission('relatorios.exportar');

  const uniqueOperadoras = useMemo(() => {
    const set = new Set<string>();
    consultants.forEach((c) =>
      c.pedidos.forEach((p) => {
        if (p.operadora) set.add(p.operadora);
      })
    );
    return Array.from(set).sort();
  }, [consultants]);

  const uniqueTipos = useMemo(() => {
    const set = new Set<string>();
    consultants.forEach((c) =>
      c.pedidos.forEach((p) => {
        if (p.tipoPedido) set.add(p.tipoPedido);
      })
    );
    return Array.from(set).sort();
  }, [consultants]);

  const allRows = useMemo<FlattenedOrderRow[]>(() => {
    const list: FlattenedOrderRow[] = [];
    consultants.forEach((c) => {
      const fin = calculateConsultantFinancials(c.pedidos, c.taxaBancaria);
      c.pedidos.forEach((p) => {
        list.push({
          consultor: c,
          pedido: p,
          totalContratoConsultor: fin.totalContrato,
          totalReceberConsultor: fin.totalReceber,
        });
      });
    });
    return list;
  }, [consultants]);

  const filteredRows = useMemo(() => {
    const q = filters.buscaGeral.trim().toLowerCase();
    const clienteQ = filters.nomeCliente.trim().toLowerCase();
    const docQ = filters.documentoCliente.replace(/\D/g, '');
    const cotQ = filters.cotacao.trim().toLowerCase();
    const aaceQ = filters.codigoAace.trim().toLowerCase();

    return allRows.filter(({ consultor, pedido }) => {
      if (filters.consultorId && consultor.id !== filters.consultorId) return false;
      if (clienteQ && !pedido.nomeCliente.toLowerCase().includes(clienteQ)) return false;
      if (cotQ && !pedido.cotacao.toLowerCase().includes(cotQ)) return false;
      if (aaceQ && !pedido.codigoAace.toLowerCase().includes(aaceQ)) return false;
      if (filters.operadora && pedido.operadora !== filters.operadora) return false;
      if (filters.tipoPedido && pedido.tipoPedido !== filters.tipoPedido) return false;
      if (filters.status && pedido.status !== filters.status) return false;

      if (docQ) {
        const cDocs = [
          consultor.cpf,
          consultor.cnpj,
          pedido.cpfCliente,
          pedido.cnpjCliente,
        ]
          .join(' ')
          .replace(/\D/g, '');
        if (!cDocs.includes(docQ)) return false;
      }

      if (
        filters.dataAtivacaoInicio &&
        (!pedido.dataAtivacao || pedido.dataAtivacao < filters.dataAtivacaoInicio)
      ) {
        return false;
      }
      if (
        filters.dataAtivacaoFim &&
        (!pedido.dataAtivacao || pedido.dataAtivacao > filters.dataAtivacaoFim)
      ) {
        return false;
      }
      if (
        filters.dataPagamentoInicio &&
        (!pedido.dataPagamento || pedido.dataPagamento < filters.dataPagamentoInicio)
      ) {
        return false;
      }
      if (
        filters.dataPagamentoFim &&
        (!pedido.dataPagamento || pedido.dataPagamento > filters.dataPagamentoFim)
      ) {
        return false;
      }

      if (q) {
        const haystack = [
          consultor.nomeConsultor,
          consultor.cpf,
          consultor.cnpj,
          consultor.banco,
          consultor.pix,
          consultor.telefone,
          pedido.nomeCliente,
          pedido.cpfCliente,
          pedido.cnpjCliente,
          pedido.cotacao,
          pedido.codigoAace,
          pedido.operadora,
          pedido.tipoPedido,
          pedido.status,
          pedido.observacao,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [allRows, filters]);

  const selectedRow = useMemo(
    () =>
      filteredRows.find(
        (r) => `${r.consultor.id}::${r.pedido.id}` === selectedKey
      ) ?? null,
    [filteredRows, selectedKey]
  );

  const summary = useMemo(() => {
    const totalComissoes = filteredRows.reduce((acc, r) => acc + r.pedido.comissao, 0);
    const totalDescontos = filteredRows.reduce((acc, r) => acc + r.pedido.desconto, 0);
    const totalLinhas = filteredRows.reduce((acc, r) => acc + r.pedido.quantidadeLinhas, 0);
    return { totalComissoes, totalDescontos, totalLinhas };
  }, [filteredRows]);

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Print multi-select logic
  const filteredKeys = useMemo(
    () => filteredRows.map((r) => `${r.consultor.id}::${r.pedido.id}`),
    [filteredRows]
  );

  const allFilteredSelectedForPrint =
    filteredKeys.length > 0 && filteredKeys.every((k) => checkedPrintKeys.includes(k));

  const toggleAllPrint = () => {
    if (allFilteredSelectedForPrint) {
      setCheckedPrintKeys((prev) => prev.filter((k) => !filteredKeys.includes(k)));
    } else {
      setCheckedPrintKeys((prev) => Array.from(new Set([...prev, ...filteredKeys])));
    }
  };

  const toggleRowPrint = (key: string) => {
    setCheckedPrintKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectedPrintCount = useMemo(
    () => filteredKeys.filter((k) => checkedPrintKeys.includes(k)).length,
    [filteredKeys, checkedPrintKeys]
  );

  const printGroups = useMemo<PrintConsultantGroup[]>(() => {
    const map = new Map<string, PrintConsultantGroup>();
    filteredRows.forEach((row) => {
      const key = `${row.consultor.id}::${row.pedido.id}`;
      if (!checkedPrintKeys.includes(key)) return;
      const existing = map.get(row.consultor.id);
      if (existing) {
        existing.pedidos.push(row.pedido);
      } else {
        map.set(row.consultor.id, {
          consultor: row.consultor,
          pedidos: [row.pedido],
        });
      }
    });
    return Array.from(map.values());
  }, [filteredRows, checkedPrintKeys]);

  const inputCls =
    'w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-sky-800 dark:focus:border-sky-500 focus:outline-none';

  return (
    <div className="space-y-4">
      {/* Filter Panel */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-sky-900 dark:text-sky-400" />
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
              Pesquisa e Filtros de Pedidos por Consultor
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilters(INITIAL_FILTERS)}
              className="inline-flex items-center gap-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
            >
              <FilterX className="h-3.5 w-3.5" />
              Limpar Filtros
            </button>

            {filteredRows.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={toggleAllPrint}
                  className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
                >
                  {allFilteredSelectedForPrint ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
                <button
                  type="button"
                  disabled={selectedPrintCount === 0}
                  onClick={() => setPrintModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded bg-[#632424] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4e1b1b] disabled:opacity-40 whitespace-nowrap shrink-0"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Extrair / Imprimir ({selectedPrintCount})
                </button>
              </>
            )}

            {canExport && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    exportConsultantsOrdersPDF(
                      filteredRows,
                      consultants,
                      'Pesquisa Filtrada'
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-3 py-1.5 text-xs font-semibold text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 whitespace-nowrap shrink-0"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Exportar PDF
                </button>
                <button
                  type="button"
                  onClick={() => exportConsultantsOrdersExcel(filteredRows, consultants)}
                  className="inline-flex items-center gap-1.5 rounded border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 whitespace-nowrap shrink-0"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Exportar Excel
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Busca Geral (Consultor, Cliente, Pix, Banco, Obs)
            </label>
            <input
              type="text"
              value={filters.buscaGeral}
              onChange={(e) => updateFilter('buscaGeral', e.target.value)}
              placeholder="Digite qualquer termo..."
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Consultor
            </label>
            <select
              value={filters.consultorId}
              onChange={(e) => updateFilter('consultorId', e.target.value)}
              className={inputCls}
            >
              <option value="">Todos</option>
              {consultants.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nomeConsultor}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nome Cliente
            </label>
            <input
              type="text"
              value={filters.nomeCliente}
              onChange={(e) => updateFilter('nomeCliente', e.target.value)}
              placeholder="Filtrar cliente"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              CPF / CNPJ (Consultor ou Cliente)
            </label>
            <input
              type="text"
              value={filters.documentoCliente}
              onChange={(e) => updateFilter('documentoCliente', e.target.value)}
              placeholder="Somente números ou máscara"
              className={`${inputCls} font-mono-tabular`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Cotação
            </label>
            <input
              type="text"
              value={filters.cotacao}
              onChange={(e) => updateFilter('cotacao', e.target.value)}
              placeholder="Ex: COT-2026"
              className={`${inputCls} font-mono-tabular`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Código AACE
            </label>
            <input
              type="text"
              value={filters.codigoAace}
              onChange={(e) => updateFilter('codigoAace', e.target.value)}
              placeholder="Ex: EGZ6"
              className={`${inputCls} font-mono-tabular`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Operadora
            </label>
            <select
              value={filters.operadora}
              onChange={(e) => updateFilter('operadora', e.target.value)}
              className={inputCls}
            >
              <option value="">Todas</option>
              {uniqueOperadoras.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tipo Pedido
            </label>
            <select
              value={filters.tipoPedido}
              onChange={(e) => updateFilter('tipoPedido', e.target.value)}
              className={inputCls}
            >
              <option value="">Todos</option>
              {uniqueTipos.map((tp) => (
                <option key={tp} value={tp}>
                  {tp}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className={inputCls}
            >
              <option value="">Todos</option>
              {ORDER_STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Ativação (De)
            </label>
            <input
              type="date"
              value={filters.dataAtivacaoInicio}
              onChange={(e) => updateFilter('dataAtivacaoInicio', e.target.value)}
              className={`${inputCls} font-mono-tabular`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Ativação (Até)
            </label>
            <input
              type="date"
              value={filters.dataAtivacaoFim}
              onChange={(e) => updateFilter('dataAtivacaoFim', e.target.value)}
              className={`${inputCls} font-mono-tabular`}
            />
          </div>
        </div>
      </div>

      {/* Action Bar for Selected Item */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300 font-mono-tabular">
          <span>Resultados: {filteredRows.length}</span>
          <span aria-hidden="true">·</span>
          <span>Linhas: {summary.totalLinhas}</span>
          <span aria-hidden="true">·</span>
          <span>Σ Comissões: {formatCurrency(summary.totalComissoes)}</span>
          <span aria-hidden="true">·</span>
          <span>Σ Descontos: {formatCurrency(summary.totalDescontos)}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedRow ? (
            <>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200 mr-1">
                Selecionado: <strong>{selectedRow.pedido.cotacao}</strong> (
                {selectedRow.consultor.nomeConsultor})
              </span>
              {canEditItem && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenInCadastro(selectedRow.consultor.id, selectedRow.pedido.id)
                    }
                    className="inline-flex items-center gap-1.5 rounded bg-sky-900 dark:bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-950 dark:hover:bg-sky-600 whitespace-nowrap shrink-0"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Editar Pedido no Cadastro
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenInCadastro(selectedRow.consultor.id, null)}
                    className="inline-flex items-center gap-1.5 rounded border border-sky-800 dark:border-sky-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-sky-900 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Novo Pedido p/ Consultor
                  </button>
                </>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() =>
                    setPendingDelete({
                      consultantId: selectedRow.consultor.id,
                      orderId: selectedRow.pedido.id,
                      label: `${selectedRow.pedido.cotacao} (${selectedRow.pedido.nomeCliente})`,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-3 py-1.5 text-xs font-semibold text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 whitespace-nowrap shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir Pedido
                </button>
              )}
            </>
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Clique em uma linha para editar/excluir ou marque as caixas à esquerda para extrair para impressão.
            </span>
          )}
        </div>
      </div>

      {/* Results Table */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {filteredRows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Nenhum pedido encontrado com os filtros aplicados.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Ajuste os critérios de pesquisa ou limpe os filtros para visualizar todos os registros.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                <tr>
                  <th className="px-3 py-2.5 w-8">
                    <input
                      type="checkbox"
                      checked={allFilteredSelectedForPrint}
                      onChange={toggleAllPrint}
                      aria-label="Selecionar todos os pedidos filtrados para impressão"
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-sky-900 focus:ring-sky-800"
                    />
                  </th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Consultor</th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Cotação</th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Cód. AACE</th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Cliente</th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Operadora</th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Tipo Pedido</th>
                  <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">Linhas</th>
                  <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">Valor Unit.</th>
                  <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">% Venda</th>
                  <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">Comissão</th>
                  <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">Desconto</th>
                  <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">Total Contrato</th>
                  <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">Total Receber</th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Status</th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Ativação</th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Pagamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredRows.map((row) => {
                  const key = `${row.consultor.id}::${row.pedido.id}`;
                  const isSelected = key === selectedKey;
                  const isChecked = checkedPrintKeys.includes(key);
                  return (
                    <tr
                      key={key}
                      onClick={() => setSelectedKey(isSelected ? null : key)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-sky-50 dark:bg-sky-950/40 ring-1 ring-inset ring-sky-700 dark:ring-sky-500'
                          : isChecked
                          ? 'bg-amber-50/50 dark:bg-amber-950/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td
                        className="px-3 py-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRowPrint(key)}
                          aria-label={`Selecionar pedido ${row.pedido.cotacao}`}
                          className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-sky-900 focus:ring-sky-800"
                        />
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {row.consultor.nomeConsultor}
                      </td>
                      <td className="px-3 py-2.5 font-mono-tabular font-semibold text-sky-900 dark:text-sky-400 whitespace-nowrap">
                        {row.pedido.cotacao}
                      </td>
                      <td className="px-3 py-2.5 font-mono-tabular text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {row.pedido.codigoAace || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200 max-w-[180px] truncate">
                        {row.pedido.nomeCliente}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {row.pedido.operadora || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {row.pedido.tipoPedido || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-tabular text-slate-800 dark:text-slate-200">
                        {row.pedido.quantidadeLinhas}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-tabular text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {formatCurrency(row.pedido.valorUnitario)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-tabular text-slate-800 dark:text-slate-200">
                        {row.pedido.porcentagemVenda}%
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-tabular font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {formatCurrency(row.pedido.comissao)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-tabular text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatCurrency(row.pedido.desconto)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-tabular font-medium text-sky-900 dark:text-sky-400 whitespace-nowrap">
                        {formatCurrency(row.totalContratoConsultor)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-tabular font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        {formatCurrency(row.totalReceberConsultor)}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {row.pedido.status}
                      </td>
                      <td className="px-3 py-2.5 font-mono-tabular text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatDateBR(row.pedido.dataAtivacao)}
                      </td>
                      <td className="px-3 py-2.5 font-mono-tabular text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatDateBR(row.pedido.dataPagamento)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PrintOrdersModal
        open={printModalOpen}
        groups={printGroups}
        onClose={() => setPrintModalOpen(false)}
      />

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Excluir Pedido Selecionado"
        description={`Tem certeza que deseja excluir o pedido "${pendingDelete?.label}"? Esta ação recalculará os totais do consultor.`}
        onConfirm={() => {
          if (pendingDelete) {
            onDeleteOrder(pendingDelete.consultantId, pendingDelete.orderId);
            setSelectedKey(null);
            setCheckedPrintKeys((prev) =>
              prev.filter(
                (k) => k !== `${pendingDelete.consultantId}::${pendingDelete.orderId}`
              )
            );
          }
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};
