import React from 'react';
import { createPortal } from 'react-dom';
import { FileText, Printer, X } from 'lucide-react';
import type { ConsultantRecord, OrderItem } from '../types';
import {
  calculateConsultantFinancials,
  formatCurrency,
  formatDateBR,
} from '../utils/calculations';
import { exportPrintLayoutPDF } from '../utils/exports';

export interface PrintConsultantGroup {
  consultor: ConsultantRecord;
  pedidos: OrderItem[];
}

interface PrintOrdersModalProps {
  open: boolean;
  groups: PrintConsultantGroup[];
  onClose: () => void;
}

export const PrintOrdersModal: React.FC<PrintOrdersModalProps> = ({
  open,
  groups,
  onClose,
}) => {
  if (!open || groups.length === 0) return null;

  const totalOrdersCount = groups.reduce((acc, g) => acc + g.pedidos.length, 0);

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/70 print-only-root"
      role="dialog"
      aria-modal="true"
      aria-label="Visualização de Impressão de Pedidos"
    >
      {/* Modal Toolbar (hidden when printing) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 bg-slate-900 px-5 py-3 text-white">
        <div>
          <h2 className="font-display text-sm font-bold">
            Extração de Pedidos para Impressão
          </h2>
          <p className="text-xs text-slate-300">
            {totalOrdersCount} pedido(s) selecionado(s) em {groups.length} consultor(es)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportPrintLayoutPDF(groups)}
            className="inline-flex items-center gap-1.5 rounded bg-red-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-800 whitespace-nowrap shrink-0"
          >
            <FileText className="h-3.5 w-3.5" />
            Baixar PDF (Modelo Impressão)
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded bg-sky-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-600 whitespace-nowrap shrink-0"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
          >
            <X className="h-3.5 w-3.5" />
            Fechar
          </button>
        </div>
      </div>

      {/* Scrollable White Paper Preview Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 print-only-root">
        <div className="mx-auto max-w-[1160px] space-y-8 print-only-root">
          {groups.map(({ consultor, pedidos }) => {
            const somaValorContrato = pedidos.reduce(
              (acc, p) => acc + (Number(p.valorUnitario) || 0),
              0
            );
            const financials = calculateConsultantFinancials(
              pedidos,
              consultor.taxaBancaria
            );

            return (
              <section
                key={consultor.id}
                className="print-sheet bg-white text-black p-6 sm:p-8 rounded shadow-xl border border-slate-300"
              >
                {/* Consultant Title Header (centered above main columns like reference image) */}
                <div className="mb-2 text-center sm:text-left sm:pl-28">
                  <h3 className="text-base sm:text-lg font-bold tracking-wide uppercase text-black">
                    {consultor.nomeConsultor || 'CONSULTOR SEM NOME'}
                  </h3>
                </div>

                {/* Orders Table matching reference image */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[11px] leading-tight">
                    <thead>
                      <tr className="bg-[#632424] text-white">
                        <th className="border border-black px-2 py-2 text-left font-bold uppercase whitespace-nowrap">
                          OPERADORA
                        </th>
                        <th className="border border-black px-2 py-2 text-left font-bold uppercase whitespace-nowrap">
                          COTAÇÃO
                        </th>
                        <th className="border border-black px-2 py-2 text-left font-bold uppercase">
                          CLIENTE
                        </th>
                        <th className="border border-black px-2 py-2 text-left font-bold uppercase whitespace-nowrap">
                          CNPJ / CPF
                        </th>
                        <th className="border border-black px-2 py-2 text-center font-bold uppercase whitespace-nowrap">
                          COD
                        </th>
                        <th className="border border-black px-2 py-2 text-left font-bold uppercase whitespace-nowrap">
                          TIPO DE PEDIDO
                        </th>
                        <th className="border border-black px-2 py-2 text-center font-bold uppercase whitespace-nowrap">
                          LINHAS
                        </th>
                        <th className="border border-black px-2 py-2 text-right font-bold uppercase whitespace-nowrap">
                          V. CONTRATO
                        </th>
                        <th className="border border-black px-2 py-2 text-center font-bold uppercase whitespace-nowrap">
                          % VENDAS
                        </th>
                        <th className="border border-black px-2 py-2 text-center font-bold uppercase whitespace-nowrap">
                          REMUNERAÇÃO
                          <br />
                          PARCEIRO
                        </th>
                        <th className="border border-black px-2 py-2 text-center font-bold uppercase whitespace-nowrap">
                          ATIVADO
                        </th>
                        <th className="bg-white border-0 px-2 py-2 text-left font-bold text-black">
                          &nbsp;
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidos.map((p) => {
                        const doc = p.cnpjCliente || p.cpfCliente || '—';
                        const statusLabel =
                          p.status === 'Ativado' || p.status === 'Pago'
                            ? 'OK'
                            : p.status.toUpperCase();
                        return (
                          <tr key={p.id} className="bg-white text-black">
                            <td className="border border-black px-2 py-1 uppercase whitespace-nowrap">
                              {p.operadora || '—'}
                            </td>
                            <td className="border border-black px-2 py-1 font-mono-tabular uppercase whitespace-nowrap">
                              {p.cotacao}
                            </td>
                            <td className="border border-black px-2 py-1 uppercase">
                              {p.nomeCliente}
                            </td>
                            <td className="border border-black px-2 py-1 font-mono-tabular whitespace-nowrap">
                              {doc}
                            </td>
                            <td className="border border-black px-2 py-1 text-center font-mono-tabular uppercase whitespace-nowrap">
                              {p.codigoAace || '—'}
                            </td>
                            <td className="border border-black px-2 py-1 uppercase whitespace-nowrap">
                              {p.tipoPedido || '—'}
                            </td>
                            <td className="border border-black px-2 py-1 text-center font-mono-tabular">
                              {p.quantidadeLinhas}
                            </td>
                            <td className="border border-black px-2 py-1 text-right font-mono-tabular whitespace-nowrap">
                              {formatCurrency(p.valorUnitario)}
                            </td>
                            <td className="border border-black px-2 py-1 text-center font-mono-tabular whitespace-nowrap">
                              {p.porcentagemVenda}%
                            </td>
                            <td className="border border-black px-2 py-1 text-right font-mono-tabular whitespace-nowrap">
                              {formatCurrency(p.comissao)}
                            </td>
                            <td className="border border-black px-2 py-1 text-center font-mono-tabular whitespace-nowrap">
                              {formatDateBR(p.dataAtivacao)}
                            </td>
                            <td className="border-0 px-2 py-1 font-semibold uppercase whitespace-nowrap">
                              {statusLabel}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Totals Row directly under V. CONTRATO and REMUNERAÇÃO PARCEIRO */}
                      <tr>
                        <td colSpan={7} className="border-0 py-2" />
                        <td className="pt-3 pb-1 px-0 border-0">
                          <div className="border-2 border-black px-2 py-1 text-right font-bold font-mono-tabular whitespace-nowrap">
                            {formatCurrency(somaValorContrato)}
                          </div>
                        </td>
                        <td className="border-0" />
                        <td className="pt-3 pb-1 px-0 border-0">
                          <div className="border-2 border-black px-2 py-1 text-right font-bold font-mono-tabular whitespace-nowrap">
                            {formatCurrency(financials.somaComissoes)}
                          </div>
                        </td>
                        <td colSpan={2} className="border-0" />
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Summary Ledger Box + Bank Details */}
                <div className="mt-4 max-w-[390px]">
                  <table className="w-full border-collapse border-2 border-black text-xs">
                    <tbody>
                      <tr className="bg-slate-100">
                        <td className="border border-black px-2.5 py-1.5 font-bold uppercase text-black">
                          VALOR TOTAL DE COMISSÃO
                        </td>
                        <td className="border border-black px-2.5 py-1.5 text-right font-bold font-mono-tabular text-black whitespace-nowrap">
                          {formatCurrency(financials.somaComissoes)}
                        </td>
                      </tr>
                      <tr className="bg-slate-100">
                        <td className="border border-black px-2.5 py-1.5 font-semibold uppercase text-red-600">
                          TAXA BANCARIA
                        </td>
                        <td className="border border-black px-2.5 py-1.5 text-right font-semibold font-mono-tabular text-red-600 whitespace-nowrap">
                          -{formatCurrency(consultor.taxaBancaria)}
                        </td>
                      </tr>
                      {financials.somaDescontos > 0 && (
                        <tr className="bg-slate-100">
                          <td className="border border-black px-2.5 py-1.5 font-semibold uppercase text-red-600">
                            DESCONTO
                          </td>
                          <td className="border border-black px-2.5 py-1.5 text-right font-semibold font-mono-tabular text-red-600 whitespace-nowrap">
                            -{formatCurrency(financials.somaDescontos)}
                          </td>
                        </tr>
                      )}
                      <tr className="bg-slate-100">
                        <td className="border border-black px-2.5 py-2">&nbsp;</td>
                        <td className="border border-black px-2.5 py-2">&nbsp;</td>
                      </tr>
                      <tr className="bg-slate-200">
                        <td className="border border-black px-2.5 py-1.5 font-bold uppercase text-black">
                          VALOR TOTAL A RECEBER
                        </td>
                        <td className="border border-black px-2.5 py-1.5 text-right font-bold font-mono-tabular text-black whitespace-nowrap">
                          {formatCurrency(financials.totalReceber)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* DADOS BANCARIOS */}
                  <div className="mt-3 space-y-0.5 text-xs font-bold uppercase text-black leading-snug">
                    <div className="pt-1">DADOS BANCARIOS</div>
                    <div>{consultor.nomeConsultor || '—'}</div>
                    {consultor.cpf && <div>CPF: {consultor.cpf}</div>}
                    {consultor.cnpj && <div>CNPJ: {consultor.cnpj}</div>}
                    <div>
                      {[consultor.banco, consultor.codigoBanco].filter(Boolean).join(' ') || 'BANCO: —'}
                    </div>
                    <div>AG: {consultor.agencia || '—'}</div>
                    <div>C/C: {consultor.contaBancaria || '—'}</div>
                    <div>PIX: {consultor.pix || '—'}</div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};
