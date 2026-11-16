import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Eraser,
  Plus,
  Printer,
  Save,
  Trash2,
  UserPlus,
  XCircle,
} from 'lucide-react';
import {
  BANCO_SUGGESTIONS,
  CODIGO_AACE_SUGGESTIONS,
  OPERADORA_SUGGESTIONS,
  ORDER_STATUS_OPTIONS,
  TIPO_PEDIDO_SUGGESTIONS,
  type ConsultantRecord,
  type OrderItem,
  type OrderStatus,
  type PermissionKey,
} from '../types';
import {
  calculateConsultantFinancials,
  calculateOrderCommission,
  formatCurrency,
  formatDateBR,
  generateId,
  getTodayISO,
  maskCNPJ,
  maskCPF,
  maskPhone,
} from '../utils/calculations';
import { ComboBoxInput, type ComboBoxOption } from './ComboBoxInput';
import { ConfirmModal } from './ConfirmModal';
import { PrintOrdersModal } from './PrintOrdersModal';

interface CadastroTabProps {
  consultants: ConsultantRecord[];
  selectedConsultantId: string | null;
  selectedOrderId: string | null;
  hasPermission: (key: PermissionKey) => boolean;
  onSaveConsultant: (consultant: ConsultantRecord) => void;
  onDeleteConsultant: (consultantId: string) => void;
  onSelectConsultant: (consultantId: string | null, orderId?: string | null) => void;
}

interface OrderDraft {
  id: string | null;
  nomeCliente: string;
  cnpjCliente: string;
  cpfCliente: string;
  cotacao: string;
  codigoAace: string;
  operadora: string;
  porcentagemVenda: string;
  quantidadeLinhas: string;
  tipoPedido: string;
  valorUnitario: string;
  status: OrderStatus;
  dataAtivacao: string;
  dataPagamento: string;
  desconto: string;
  observacao: string;
}

function createEmptyConsultant(): ConsultantRecord {
  return {
    id: generateId('cons'),
    dataCadastro: getTodayISO(),
    nomeConsultor: '',
    cnpj: '',
    cpf: '',
    telefone: '',
    banco: '',
    codigoBanco: '',
    agencia: '',
    contaBancaria: '',
    pix: '',
    taxaBancaria: 0,
    pedidos: [],
  };
}

function createEmptyOrderDraft(defaultCotacao = ''): OrderDraft {
  return {
    id: null,
    nomeCliente: '',
    cnpjCliente: '',
    cpfCliente: '',
    cotacao: defaultCotacao,
    codigoAace: '',
    operadora: '',
    porcentagemVenda: '',
    quantidadeLinhas: '1',
    tipoPedido: '',
    valorUnitario: '',
    status: 'Em Análise',
    dataAtivacao: getTodayISO(),
    dataPagamento: '',
    desconto: '0',
    observacao: '',
  };
}

function orderToDraft(order: OrderItem): OrderDraft {
  return {
    id: order.id,
    nomeCliente: order.nomeCliente,
    cnpjCliente: order.cnpjCliente,
    cpfCliente: order.cpfCliente,
    cotacao: order.cotacao,
    codigoAace: order.codigoAace,
    operadora: order.operadora,
    porcentagemVenda: String(order.porcentagemVenda ?? ''),
    quantidadeLinhas: String(order.quantidadeLinhas ?? 1),
    tipoPedido: order.tipoPedido,
    valorUnitario: String(order.valorUnitario ?? ''),
    status: order.status,
    dataAtivacao: order.dataAtivacao,
    dataPagamento: order.dataPagamento,
    desconto: String(order.desconto ?? 0),
    observacao: order.observacao,
  };
}

function parseNumberField(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(',', '.').replace(/[^\d.-]/g, '');
  const val = parseFloat(cleaned);
  return Number.isFinite(val) ? val : 0;
}

export const CadastroTab: React.FC<CadastroTabProps> = ({
  consultants,
  selectedConsultantId,
  selectedOrderId,
  hasPermission,
  onSaveConsultant,
  onDeleteConsultant,
  onSelectConsultant,
}) => {
  const canEdit = hasPermission('cadastro.criar_editar');
  const canDelete = hasPermission('cadastro.excluir');

  const [formConsultant, setFormConsultant] = useState<ConsultantRecord>(() => {
    if (selectedConsultantId) {
      const found = consultants.find((c) => c.id === selectedConsultantId);
      if (found) return structuredClone(found);
    }
    return createEmptyConsultant();
  });

  const [taxaInput, setTaxaInput] = useState<string>(() =>
    formConsultant.taxaBancaria ? String(formConsultant.taxaBancaria) : '0'
  );
  const [orderDraft, setOrderDraft] = useState<OrderDraft>(() => createEmptyOrderDraft());
  const [isDirty, setIsDirty] = useState(false);
  const [selectedPrintOrderIds, setSelectedPrintOrderIds] = useState<string[]>([]);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    mode: 'consultant' | 'order';
    orderId?: string;
    label?: string;
  }>({ open: false, mode: 'consultant' });

  // Sync when navigating from Pesquisar tab with a specific consultant/order
  useEffect(() => {
    if (selectedConsultantId) {
      const found = consultants.find((c) => c.id === selectedConsultantId);
      if (found) {
        setFormConsultant(structuredClone(found));
        setTaxaInput(String(found.taxaBancaria ?? 0));
        setIsDirty(false);
        setSelectedPrintOrderIds([]);
        if (selectedOrderId) {
          const order = found.pedidos.find((p) => p.id === selectedOrderId);
          setOrderDraft(order ? orderToDraft(order) : createEmptyOrderDraft());
        } else {
          setOrderDraft(createEmptyOrderDraft());
        }
      }
    }
  }, [selectedConsultantId, selectedOrderId, consultants]);

  const existingSavedConsultant = useMemo(
    () => consultants.find((c) => c.id === formConsultant.id),
    [consultants, formConsultant.id]
  );

  // Build combobox options for Banco and Código AACE (predefined + dynamic from existing records)
  const bankOptions = useMemo<ComboBoxOption[]>(() => {
    const map = new Map<string, ComboBoxOption>();
    BANCO_SUGGESTIONS.forEach((b) => {
      map.set(b.nome.toLowerCase(), {
        value: b.nome,
        label: b.nome,
        meta: b.codigo,
      });
    });
    consultants.forEach((c) => {
      const name = c.banco.trim();
      if (name && !map.has(name.toLowerCase())) {
        map.set(name.toLowerCase(), {
          value: name,
          label: name,
          meta: c.codigoBanco || undefined,
        });
      }
    });
    return Array.from(map.values());
  }, [consultants]);

  const aaceOptions = useMemo<ComboBoxOption[]>(() => {
    const set = new Set<string>(CODIGO_AACE_SUGGESTIONS);
    consultants.forEach((c) =>
      c.pedidos.forEach((p) => {
        if (p.codigoAace.trim()) set.add(p.codigoAace.trim());
      })
    );
    formConsultant.pedidos.forEach((p) => {
      if (p.codigoAace.trim()) set.add(p.codigoAace.trim());
    });
    return Array.from(set).map((code) => ({ value: code, label: code }));
  }, [consultants, formConsultant.pedidos]);

  // Live financial calculations
  const draftValorUnitario = parseNumberField(orderDraft.valorUnitario);
  const draftPorcentagem = parseNumberField(orderDraft.porcentagemVenda);
  const draftDesconto = parseNumberField(orderDraft.desconto);
  const draftComissao = calculateOrderCommission(draftValorUnitario, draftPorcentagem);

  const hasActiveDraftValues =
    orderDraft.id !== null ||
    orderDraft.nomeCliente.trim() !== '' ||
    draftValorUnitario > 0 ||
    draftPorcentagem > 0 ||
    draftDesconto > 0;

  const ordersForCalculation = useMemo(() => {
    if (!hasActiveDraftValues) {
      return formConsultant.pedidos;
    }
    const draftEntry = {
      comissao: draftComissao,
      desconto: draftDesconto,
    };
    if (orderDraft.id) {
      return formConsultant.pedidos.map((p) =>
        p.id === orderDraft.id ? { ...p, ...draftEntry } : p
      );
    }
    return [...formConsultant.pedidos, draftEntry];
  }, [formConsultant.pedidos, hasActiveDraftValues, orderDraft.id, draftComissao, draftDesconto]);

  const financials = useMemo(
    () => calculateConsultantFinancials(ordersForCalculation, formConsultant.taxaBancaria),
    [ordersForCalculation, formConsultant.taxaBancaria]
  );

  const savedOnlyFinancials = useMemo(
    () => calculateConsultantFinancials(formConsultant.pedidos, formConsultant.taxaBancaria),
    [formConsultant.pedidos, formConsultant.taxaBancaria]
  );

  const existingQuotesForConsultant = useMemo(() => {
    const quotes = new Set<string>();
    formConsultant.pedidos.forEach((p) => {
      if (p.cotacao.trim()) quotes.add(p.cotacao.trim());
    });
    return Array.from(quotes);
  }, [formConsultant.pedidos]);

  const updateConsultantField = <K extends keyof ConsultantRecord>(
    field: K,
    value: ConsultantRecord[K]
  ) => {
    setFormConsultant((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    setFeedback(null);
  };

  const handleTaxaChange = (raw: string) => {
    setTaxaInput(raw);
    const num = parseNumberField(raw);
    updateConsultantField('taxaBancaria', num);
  };

  const handleSelectExistingConsultant = (id: string) => {
    setSelectedPrintOrderIds([]);
    if (!id) {
      onSelectConsultant(null, null);
      const fresh = createEmptyConsultant();
      setFormConsultant(fresh);
      setTaxaInput('0');
      setOrderDraft(createEmptyOrderDraft());
      setIsDirty(false);
      setFeedback(null);
      return;
    }
    onSelectConsultant(id, null);
    setFeedback(null);
  };

  const handleAddOrUpdateOrder = () => {
    if (!canEdit) return;
    setFeedback(null);

    if (!orderDraft.nomeCliente.trim()) {
      setFeedback({
        type: 'error',
        message: 'Informe o Nome do Cliente para adicionar o pedido.',
      });
      return;
    }

    if (!orderDraft.cotacao.trim()) {
      setFeedback({
        type: 'error',
        message: 'Informe o código da Cotação para vincular o pedido.',
      });
      return;
    }

    const valorUnitario = parseNumberField(orderDraft.valorUnitario);
    const porcentagemVenda = parseNumberField(orderDraft.porcentagemVenda);
    const quantidadeLinhas = Math.max(
      1,
      Math.round(parseNumberField(orderDraft.quantidadeLinhas) || 1)
    );
    const desconto = parseNumberField(orderDraft.desconto);
    const comissao = calculateOrderCommission(valorUnitario, porcentagemVenda);

    const newItem: OrderItem = {
      id: orderDraft.id ?? generateId('ped'),
      nomeCliente: orderDraft.nomeCliente.trim(),
      cnpjCliente: orderDraft.cnpjCliente.trim(),
      cpfCliente: orderDraft.cpfCliente.trim(),
      cotacao: orderDraft.cotacao.trim(),
      codigoAace: orderDraft.codigoAace.trim(),
      operadora: orderDraft.operadora.trim(),
      porcentagemVenda,
      quantidadeLinhas,
      tipoPedido: orderDraft.tipoPedido.trim(),
      valorUnitario,
      status: orderDraft.status,
      dataAtivacao: orderDraft.dataAtivacao,
      dataPagamento: orderDraft.dataPagamento,
      comissao,
      desconto,
      observacao: orderDraft.observacao.trim(),
      criadoEm: getTodayISO(),
    };

    setFormConsultant((prev) => {
      const exists = prev.pedidos.some((p) => p.id === newItem.id);
      const nextOrders = exists
        ? prev.pedidos.map((p) => (p.id === newItem.id ? newItem : p))
        : [...prev.pedidos, newItem];
      return { ...prev, pedidos: nextOrders };
    });

    setIsDirty(true);
    setOrderDraft(createEmptyOrderDraft(orderDraft.cotacao.trim()));
    setFeedback({
      type: 'success',
      message: orderDraft.id
        ? `Pedido (${newItem.cotacao}) atualizado na lista. Clique em "Salvar" para confirmar o cadastro.`
        : `Pedido adicionado à cotação ${newItem.cotacao}. Você pode inserir outro item na mesma cotação ou clicar em "Salvar".`,
    });
  };

  const handleEditOrderFromList = (order: OrderItem) => {
    setOrderDraft(orderToDraft(order));
    setFeedback(null);
  };

  const handleCancelOrderEdit = () => {
    setOrderDraft(createEmptyOrderDraft());
    setFeedback(null);
  };

  const handleSaveAll = () => {
    if (!canEdit) return;
    setFeedback(null);

    if (!formConsultant.nomeConsultor.trim()) {
      setFeedback({
        type: 'error',
        message: 'Informe o Nome do Consultor antes de salvar o cadastro.',
      });
      return;
    }

    onSaveConsultant(formConsultant);
    onSelectConsultant(formConsultant.id, null);
    setIsDirty(false);
    setFeedback({
      type: 'success',
      message: `Cadastro de "${formConsultant.nomeConsultor}" salvo com ${formConsultant.pedidos.length} pedido(s).`,
    });
  };

  const handleLimpar = () => {
    onSelectConsultant(null, null);
    const fresh = createEmptyConsultant();
    setFormConsultant(fresh);
    setTaxaInput('0');
    setOrderDraft(createEmptyOrderDraft());
    setSelectedPrintOrderIds([]);
    setIsDirty(false);
    setFeedback(null);
  };

  const handleCancelar = () => {
    if (existingSavedConsultant) {
      setFormConsultant(structuredClone(existingSavedConsultant));
      setTaxaInput(String(existingSavedConsultant.taxaBancaria ?? 0));
      setOrderDraft(createEmptyOrderDraft());
      setSelectedPrintOrderIds([]);
      setIsDirty(false);
      setFeedback({
        type: 'success',
        message: 'Alterações não salvas foram descartadas.',
      });
    } else {
      handleLimpar();
    }
  };

  const handleConfirmDelete = () => {
    if (confirmState.mode === 'consultant') {
      if (existingSavedConsultant) {
        onDeleteConsultant(existingSavedConsultant.id);
      }
      handleLimpar();
      setFeedback({
        type: 'success',
        message: 'Cadastro do consultor excluído com sucesso.',
      });
    } else if (confirmState.mode === 'order' && confirmState.orderId) {
      setFormConsultant((prev) => ({
        ...prev,
        pedidos: prev.pedidos.filter((p) => p.id !== confirmState.orderId),
      }));
      setSelectedPrintOrderIds((prev) => prev.filter((id) => id !== confirmState.orderId));
      if (orderDraft.id === confirmState.orderId) {
        setOrderDraft(createEmptyOrderDraft());
      }
      setIsDirty(true);
      setFeedback({
        type: 'success',
        message: 'Pedido removido da lista. Clique em "Salvar" para gravar.',
      });
    }
    setConfirmState({ open: false, mode: 'consultant' });
  };

  // Print selection handlers
  const allSelected =
    formConsultant.pedidos.length > 0 &&
    formConsultant.pedidos.every((p) => selectedPrintOrderIds.includes(p.id));

  const toggleSelectAllPrint = () => {
    if (allSelected) {
      setSelectedPrintOrderIds([]);
    } else {
      setSelectedPrintOrderIds(formConsultant.pedidos.map((p) => p.id));
    }
  };

  const toggleSelectOrderPrint = (orderId: string) => {
    setSelectedPrintOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const selectedOrdersForPrint = useMemo(
    () => formConsultant.pedidos.filter((p) => selectedPrintOrderIds.includes(p.id)),
    [formConsultant.pedidos, selectedPrintOrderIds]
  );

  const totalLinhasConsultor = formConsultant.pedidos.reduce(
    (acc, p) => acc + (p.quantidadeLinhas || 0),
    0
  );

  const inputCls =
    'w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-sky-800 dark:focus:border-sky-500 focus:outline-none disabled:bg-slate-100 dark:disabled:bg-slate-900/60';

  return (
    <div className="space-y-4">
      {/* Top Bar: Consultant Picker + Data Cadastro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="select-consultor-ativo"
            className="text-xs font-semibold text-slate-600 dark:text-slate-300"
          >
            Consultor Selecionado:
          </label>
          <select
            id="select-consultor-ativo"
            value={existingSavedConsultant ? existingSavedConsultant.id : ''}
            onChange={(e) => handleSelectExistingConsultant(e.target.value)}
            className="min-w-[240px] rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:border-sky-800 dark:focus:border-sky-500 focus:outline-none"
          >
            <option value="">+ Novo Consultor</option>
            {consultants.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nomeConsultor} ({c.pedidos.length} pedido{c.pedidos.length === 1 ? '' : 's'})
              </option>
            ))}
          </select>

          {canEdit && (
            <button
              type="button"
              onClick={handleLimpar}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Novo Consultor
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <label
            htmlFor="data-cadastro"
            className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap"
          >
            Data Cadastro
          </label>
          <input
            id="data-cadastro"
            type="date"
            disabled={!canEdit}
            value={formConsultant.dataCadastro}
            onChange={(e) => updateConsultantField('dataCadastro', e.target.value)}
            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-sm font-mono-tabular text-slate-900 dark:text-slate-100 focus:border-sky-800 dark:focus:border-sky-500 focus:outline-none disabled:bg-slate-100 dark:disabled:bg-slate-900/60"
          />
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-md border px-4 py-2.5 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200'
              : 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 text-red-900 dark:text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-medium underline hover:no-underline shrink-0"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Main Split: Left Action Rail + Form Sections */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
        {/* Left Vertical Action Rail */}
        <aside className="lg:w-32 shrink-0 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 flex flex-row lg:flex-col gap-2.5 justify-between lg:justify-start">
          <button
            type="button"
            onClick={handleLimpar}
            disabled={!canEdit}
            className="flex-1 lg:flex-none flex flex-col items-center justify-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-3 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
          >
            <Eraser className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <span>Limpar</span>
          </button>

          {canDelete && (
            <button
              type="button"
              onClick={() =>
                setConfirmState({
                  open: true,
                  mode: 'consultant',
                  label: formConsultant.nomeConsultor || 'este cadastro',
                })
              }
              disabled={!existingSavedConsultant}
              className="flex-1 lg:flex-none flex flex-col items-center justify-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-3 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:border-red-300 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-800 dark:hover:text-red-300 disabled:opacity-40"
            >
              <Trash2 className="h-5 w-5 text-red-700 dark:text-red-400" />
              <span>Excluir</span>
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={handleSaveAll}
              className={`flex-1 lg:flex-none flex flex-col items-center justify-center gap-1.5 rounded-md border px-3 py-3 text-xs font-semibold transition-colors ${
                isDirty
                  ? 'border-sky-900 bg-sky-900 dark:bg-sky-700 dark:border-sky-700 text-white hover:bg-sky-950 dark:hover:bg-sky-600'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Save className="h-5 w-5" />
              <span>Salvar</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCancelar}
            className="flex-1 lg:flex-none flex flex-col items-center justify-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-3 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <span>Cancelar</span>
          </button>

          {isDirty && canEdit && (
            <p className="hidden lg:block mt-2 text-center text-[11px] leading-tight font-medium text-amber-700 dark:text-amber-400">
              Alterações pendentes de salvamento
            </p>
          )}
        </aside>

        {/* Form Content Area */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* DADOS CONSULTOR */}
          <fieldset className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 pb-4 pt-2">
            <legend className="px-2 text-xs font-bold tracking-wider text-sky-900 dark:text-sky-400">
              DADOS CONSULTOR
            </legend>

            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-3">
              <div className="xl:col-span-6">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nome Consultor *
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formConsultant.nomeConsultor}
                  onChange={(e) => updateConsultantField('nomeConsultor', e.target.value)}
                  placeholder="Nome completo do consultor"
                  className={inputCls}
                />
              </div>

              <div className="xl:col-span-3">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formConsultant.telefone}
                  onChange={(e) => updateConsultantField('telefone', maskPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className={`${inputCls} font-mono-tabular`}
                />
              </div>

              <div className="xl:col-span-3">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Agência
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formConsultant.agencia}
                  onChange={(e) => updateConsultantField('agencia', e.target.value)}
                  placeholder="0000"
                  className={`${inputCls} font-mono-tabular`}
                />
              </div>

              <div className="xl:col-span-4">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  CNPJ
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formConsultant.cnpj}
                  onChange={(e) => updateConsultantField('cnpj', maskCNPJ(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  className={`${inputCls} font-mono-tabular`}
                />
              </div>

              <div className="xl:col-span-4">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  CPF
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formConsultant.cpf}
                  onChange={(e) => updateConsultantField('cpf', maskCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className={`${inputCls} font-mono-tabular`}
                />
              </div>

              <div className="xl:col-span-4">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Conta Bancária
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formConsultant.contaBancaria}
                  onChange={(e) => updateConsultantField('contaBancaria', e.target.value)}
                  placeholder="00000-0"
                  className={`${inputCls} font-mono-tabular`}
                />
              </div>

              <div className="xl:col-span-5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Banco (Lista ou Digitação Manual)
                </label>
                <ComboBoxInput
                  disabled={!canEdit}
                  ariaLabel="Banco"
                  value={formConsultant.banco}
                  options={bankOptions}
                  placeholder="Selecione ou digite o banco"
                  onChange={(val) => updateConsultantField('banco', val)}
                  onSelectOption={(opt) => {
                    if (opt.meta) {
                      updateConsultantField('codigoBanco', opt.meta);
                    }
                  }}
                />
              </div>

              <div className="xl:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Cód. Banco
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formConsultant.codigoBanco}
                  onChange={(e) => updateConsultantField('codigoBanco', e.target.value)}
                  placeholder="Ex: 341"
                  className={`${inputCls} font-mono-tabular`}
                />
              </div>

              <div className="xl:col-span-3">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Chave Pix
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formConsultant.pix}
                  onChange={(e) => updateConsultantField('pix', e.target.value)}
                  placeholder="E-mail, CPF/CNPJ ou telefone"
                  className={inputCls}
                />
              </div>

              <div className="xl:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Taxa Bancária (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={!canEdit}
                  value={taxaInput}
                  onChange={(e) => handleTaxaChange(e.target.value)}
                  className={`${inputCls} font-mono-tabular`}
                />
              </div>
            </div>
          </fieldset>

          {/* DADOS PEDIDO */}
          <fieldset className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 pb-4 pt-2">
            <legend className="px-2 text-xs font-bold tracking-wider text-sky-900 dark:text-sky-400">
              {orderDraft.id ? 'DADOS PEDIDO — EDITANDO ITEM SELECIONADO' : 'DADOS PEDIDO'}
            </legend>

            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-3">
              <div className="xl:col-span-6">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nome Cliente *
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={orderDraft.nomeCliente}
                  onChange={(e) => setOrderDraft((p) => ({ ...p, nomeCliente: e.target.value }))}
                  placeholder="Razão social ou nome do cliente"
                  className={inputCls}
                />
              </div>

              <div className="xl:col-span-3">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Cotação *
                </label>
                <input
                  type="text"
                  list="cotacoes-consultor"
                  disabled={!canEdit}
                  value={orderDraft.cotacao}
                  onChange={(e) => setOrderDraft((p) => ({ ...p, cotacao: e.target.value }))}
                  placeholder="Ex: COT-2026-001"
                  className={`${inputCls} font-mono-tabular`}
                />
                <datalist id="cotacoes-consultor">
                  {existingQuotesForConsultant.map((q) => (
                    <option key={q} value={q} />
                  ))}
                </datalist>
              </div>

              <div className="xl:col-span-3">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Código AACE (Lista ou Manual)
                </label>
                <ComboBoxInput
                  disabled={!canEdit}
                  ariaLabel="Código AACE"
                  value={orderDraft.codigoAace}
                  options={aaceOptions}
                  placeholder="Selecione ou digite o código"
                  className="font-mono-tabular"
                  onChange={(val) => setOrderDraft((p) => ({ ...p, codigoAace: val }))}
                />
              </div>

              <div className="xl:col-span-3">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  CNPJ Cliente
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={orderDraft.cnpjCliente}
                  onChange={(e) =>
                    setOrderDraft((p) => ({ ...p, cnpjCliente: maskCNPJ(e.target.value) }))
                  }
                  placeholder="00.000.000/0000-00"
                  className={`${inputCls} font-mono-tabular`}
                />
              </div>

              <div className="xl:col-span-3">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  CPF Cliente
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={orderDraft.cpfCliente}
                  onChange={(e) =>
                    setOrderDraft((p) => ({ ...p, cpfCliente: maskCPF(e.target.value) }))
                  }
                  placeholder="000.000.000-00"
                  className={`${inputCls} font-mono-tabular`}
                />
              </div>

              <div className="xl:col-span-3">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Operadora
                </label>
                <input
                  type="text"
                  list="operadora-suggestions"
                  disabled={!canEdit}
                  value={orderDraft.operadora}
                  onChange={(e) => setOrderDraft((p) => ({ ...p, operadora: e.target.value }))}
                  placeholder="Vivo, Claro, TIM..."
                  className={inputCls}
                />
                <datalist id="operadora-suggestions">
                  {OPERADORA_SUGGESTIONS.map((op) => (
                    <option key={op} value={op} />
                  ))}
                </datalist>
              </div>

              <div className="xl:col-span-3">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tipo Pedido
                </label>
                <input
                  type="text"
                  list="tipo-pedido-suggestions"
                  disabled={!canEdit}
                  value={orderDraft.tipoPedido}
                  onChange={(e) => setOrderDraft((p) => ({ ...p, tipoPedido: e.target.value }))}
                  placeholder="Portabilidade, Linha Nova..."
                  className={inputCls}
                />
                <datalist id="tipo-pedido-suggestions">
                  {TIPO_PEDIDO_SUGGESTIONS.map((tp) => (
                    <option key={tp} value={tp} />
                  ))}
                </datalist>
              </div>

              <div className="xl:col-span-3">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Valor Unitário do Pedido (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={!canEdit}
                  value={orderDraft.valorUnitario}
                  onChange={(e) => setOrderDraft((p) => ({ ...p, valorUnitario: e.target.value }))}
                  placeholder="0.00"
                  className={`${inputCls} font-mono-tabular`}
                />
              </div>

              <div className="xl:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  % Vendas (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={!canEdit}
                  value={orderDraft.porcentagemVenda}
                  onChange={(e) =>
                    setOrderDraft((p) => ({ ...p, porcentagemVenda: e.target.value }))
                  }
                  placeholder="Ex: 12"
                  className={`${inputCls} font-mono-tabular`}
                />
              </div>

              <div className="xl:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Qtd Linhas
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  disabled={!canEdit}
                  value={orderDraft.quantidadeLinhas}
                  onChange={(e) =>
                    setOrderDraft((p) => ({ ...p, quantidadeLinhas: e.target.value }))
                  }
                  className={`${inputCls} font-mono-tabular`}
                />
              </div>

              <div className="xl:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  disabled={!canEdit}
                  value={orderDraft.status}
                  onChange={(e) =>
                    setOrderDraft((p) => ({ ...p, status: e.target.value as OrderStatus }))
                  }
                  className={inputCls}
                >
                  {ORDER_STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="xl:col-span-3">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Desconto (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={!canEdit}
                  value={orderDraft.desconto}
                  onChange={(e) => setOrderDraft((p) => ({ ...p, desconto: e.target.value }))}
                  placeholder="0.00"
                  className={`${inputCls} font-mono-tabular`}
                />
              </div>

              <div className="xl:col-span-3">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Data Ativação
                </label>
                <input
                  type="date"
                  disabled={!canEdit}
                  value={orderDraft.dataAtivacao}
                  onChange={(e) => setOrderDraft((p) => ({ ...p, dataAtivacao: e.target.value }))}
                  className={`${inputCls} font-mono-tabular`}
                />
              </div>

              <div className="xl:col-span-3">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Data Pagamento
                </label>
                <input
                  type="date"
                  disabled={!canEdit}
                  value={orderDraft.dataPagamento}
                  onChange={(e) => setOrderDraft((p) => ({ ...p, dataPagamento: e.target.value }))}
                  className={`${inputCls} font-mono-tabular`}
                />
              </div>

              <div className="xl:col-span-6">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Observação (Obs)
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={orderDraft.observacao}
                  onChange={(e) => setOrderDraft((p) => ({ ...p, observacao: e.target.value }))}
                  placeholder="Observações gerais do pedido"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Calculated Fields Strip */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3 py-2">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Comissão (Valor Unitário × % Vendas)
                </div>
                <div className="mt-0.5 text-base font-bold font-mono-tabular text-slate-900 dark:text-slate-100">
                  {formatCurrency(draftComissao)}
                </div>
              </div>

              <div className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3 py-2">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Total Contrato (Σ Comissões − Desconto)
                </div>
                <div className="mt-0.5 text-base font-bold font-mono-tabular text-sky-900 dark:text-sky-400">
                  {formatCurrency(financials.totalContrato)}
                </div>
              </div>

              <div className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3 py-2">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Total Receber (Total Contrato − Desconto − Taxa Bancária)
                </div>
                <div className="mt-0.5 text-base font-bold font-mono-tabular text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(financials.totalReceber)}
                </div>
              </div>
            </div>

            {/* ADICIONAR PEDIDO Button */}
            {canEdit && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleAddOrUpdateOrder}
                  className="inline-flex items-center gap-2 rounded-full bg-[#134E6F] dark:bg-sky-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0D3B54] dark:hover:bg-sky-600 whitespace-nowrap shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  {orderDraft.id ? 'ATUALIZAR PEDIDO' : 'ADICIONAR PEDIDO'}
                </button>

                {orderDraft.id && (
                  <button
                    type="button"
                    onClick={handleCancelOrderEdit}
                    className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
                  >
                    Cancelar edição do item
                  </button>
                )}
              </div>
            )}
          </fieldset>
        </div>
      </div>

      {/* Consultant's Orders List Grid */}
      <div className="rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
          <div>
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
              Pedidos Inseridos do Consultor
              {formConsultant.nomeConsultor ? `: ${formConsultant.nomeConsultor}` : ''}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Marque todos os pedidos ou pedidos individuais e clique em Extrair / Imprimir para gerar o layout de impressão.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-mono-tabular">
              <span>Pedidos: {formConsultant.pedidos.length}</span>
              <span aria-hidden="true">·</span>
              <span>Linhas: {totalLinhasConsultor}</span>
              <span aria-hidden="true">·</span>
              <span>Σ Comissões: {formatCurrency(savedOnlyFinancials.somaComissoes)}</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                Total Receber: {formatCurrency(savedOnlyFinancials.totalReceber)}
              </span>
            </div>

            {formConsultant.pedidos.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSelectAllPrint}
                  className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
                >
                  {allSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
                <button
                  type="button"
                  disabled={selectedOrdersForPrint.length === 0}
                  onClick={() => setPrintModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded bg-[#632424] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#4e1b1b] disabled:opacity-40 whitespace-nowrap shrink-0"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Extrair / Imprimir ({selectedOrdersForPrint.length})
                </button>
              </div>
            )}
          </div>
        </div>

        {formConsultant.pedidos.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Nenhum pedido inserido para este consultor ainda.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Preencha os campos em DADOS PEDIDO acima e clique em &quot;ADICIONAR PEDIDO&quot; para incluir o primeiro item.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                <tr>
                  <th className="px-3 py-2.5 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAllPrint}
                      aria-label="Selecionar todos os pedidos para impressão"
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-sky-900 focus:ring-sky-800"
                    />
                  </th>
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
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Status</th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Ativação</th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Pagamento</th>
                  {(canEdit || canDelete) && (
                    <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {formConsultant.pedidos.map((item) => {
                  const isEditingThis = orderDraft.id === item.id;
                  const isChecked = selectedPrintOrderIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isEditingThis
                          ? 'bg-sky-50 dark:bg-sky-950/40'
                          : isChecked
                          ? 'bg-amber-50/50 dark:bg-amber-950/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOrderPrint(item.id)}
                          aria-label={`Selecionar pedido ${item.cotacao}`}
                          className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-sky-900 focus:ring-sky-800"
                        />
                      </td>
                      <td className="px-3 py-2 font-mono-tabular font-semibold text-sky-900 dark:text-sky-400 whitespace-nowrap">
                        {item.cotacao}
                      </td>
                      <td className="px-3 py-2 font-mono-tabular text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {item.codigoAace || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-900 dark:text-slate-100 font-medium max-w-[200px] truncate">
                        {item.nomeCliente}
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {item.operadora || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {item.tipoPedido || '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono-tabular text-slate-800 dark:text-slate-200">
                        {item.quantidadeLinhas}
                      </td>
                      <td className="px-3 py-2 text-right font-mono-tabular text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {formatCurrency(item.valorUnitario)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono-tabular text-slate-800 dark:text-slate-200">
                        {item.porcentagemVenda}%
                      </td>
                      <td className="px-3 py-2 text-right font-mono-tabular font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {formatCurrency(item.comissao)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono-tabular text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatCurrency(item.desconto)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                        {item.status}
                      </td>
                      <td className="px-3 py-2 font-mono-tabular text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatDateBR(item.dataAtivacao)}
                      </td>
                      <td className="px-3 py-2 font-mono-tabular text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatDateBR(item.dataPagamento)}
                      </td>
                      {(canEdit || canDelete) && (
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleEditOrderFromList(item)}
                                className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-sky-800 dark:hover:border-sky-500 hover:text-sky-900 dark:hover:text-sky-300 inline-flex items-center gap-1"
                              >
                                <Edit3 className="h-3 w-3" />
                                Editar
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmState({
                                    open: true,
                                    mode: 'order',
                                    orderId: item.id,
                                    label: `${item.cotacao} — ${item.nomeCliente}`,
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
                      )}
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
        groups={[
          {
            consultor: formConsultant,
            pedidos: selectedOrdersForPrint,
          },
        ]}
        onClose={() => setPrintModalOpen(false)}
      />

      <ConfirmModal
        open={confirmState.open}
        title={
          confirmState.mode === 'consultant'
            ? 'Excluir Cadastro do Consultor'
            : 'Remover Pedido da Lista'
        }
        description={
          confirmState.mode === 'consultant'
            ? `Tem certeza que deseja excluir permanentemente o cadastro de "${confirmState.label}" e todos os seus pedidos vinculados?`
            : `Deseja remover o pedido "${confirmState.label}" da lista do consultor?`
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmState({ open: false, mode: 'consultant' })}
      />
    </div>
  );
};
