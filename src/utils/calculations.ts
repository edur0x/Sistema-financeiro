import type { OrderItem } from '../types';

export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Comissão = Valor Unitário do Pedido * (Porcentagem da Venda / 100)
 */
export function calculateOrderCommission(
  valorUnitario: number,
  porcentagemVenda: number
): number {
  const valor = Number.isFinite(valorUnitario) ? valorUnitario : 0;
  const pct = Number.isFinite(porcentagemVenda) ? porcentagemVenda : 0;
  return round2(valor * (pct / 100));
}

/**
 * Total do Contrato = Soma(Comissão de cada pedido) - Soma(Desconto)
 * Total a Receber = Total do Contrato - Desconto - Taxa Bancária
 */
export function calculateConsultantFinancials(
  orders: Array<Pick<OrderItem, 'comissao' | 'desconto'>>,
  taxaBancaria: number
): {
  somaComissoes: number;
  somaDescontos: number;
  totalContrato: number;
  totalReceber: number;
} {
  const somaComissoes = round2(
    orders.reduce((acc, item) => acc + (Number(item.comissao) || 0), 0)
  );
  const somaDescontos = round2(
    orders.reduce((acc, item) => acc + (Number(item.desconto) || 0), 0)
  );
  const taxa = Number.isFinite(taxaBancaria) ? taxaBancaria : 0;

  const totalContrato = round2(somaComissoes - somaDescontos);
  const totalReceber = round2(totalContrato - somaDescontos - taxa);

  return {
    somaComissoes,
    somaDescontos,
    totalContrato,
    totalReceber,
  };
}

export function formatCurrency(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(safe);
}

export function formatDateBR(isoDate: string): string {
  if (!isoDate) return '—';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

export function maskCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function parseNumericInput(raw: string): number {
  if (!raw) return 0;
  const normalized = raw.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
