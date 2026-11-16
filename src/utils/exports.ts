import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { AccessProfile, ConsultantRecord, OrderItem, UserAccount } from '../types';
import {
  calculateConsultantFinancials,
  formatCurrency,
  formatDateBR,
} from './calculations';

export interface FlattenedOrderRow {
  consultor: ConsultantRecord;
  pedido: OrderItem;
  totalContratoConsultor: number;
  totalReceberConsultor: number;
}

export function exportConsultantsOrdersPDF(
  rows: FlattenedOrderRow[],
  consultants: ConsultantRecord[],
  tituloFiltro = 'Todos os Registros'
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const nowStr = new Date().toLocaleString('pt-BR');

  // Header bar
  doc.setFillColor(185, 28, 28);
  doc.rect(0, 0, 297, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('SISTEMA FINANCEIRO MZ — RELATÓRIO DE CADASTROS E PEDIDOS', 14, 11.5);

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Escopo: ${tituloFiltro}   |   Emitido em: ${nowStr}   |   Pedidos listados: ${rows.length}`, 14, 25);

  // Table 1: Resumo Financeiro por Consultor
  const consultantIdsInScope = new Set(rows.map((r) => r.consultor.id));
  const targetConsultants =
    rows.length > 0
      ? consultants.filter((c) => consultantIdsInScope.has(c.id))
      : consultants;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. Resumo Financeiro por Consultor', 14, 32);

  autoTable(doc, {
    startY: 35,
    head: [
      [
        'Consultor',
        'CPF / CNPJ',
        'Telefone',
        'Banco / Ag / Conta',
        'Pix',
        'Qtd Ped.',
        'Σ Comissões',
        'Descontos',
        'Total Contrato',
        'Taxa Banc.',
        'Total Receber',
      ],
    ],
    body: targetConsultants.map((c) => {
      const fin = calculateConsultantFinancials(c.pedidos, c.taxaBancaria);
      return [
        c.nomeConsultor || '—',
        [c.cpf, c.cnpj].filter(Boolean).join(' / ') || '—',
        c.telefone || '—',
        `${c.codigoBanco ? c.codigoBanco + ' - ' : ''}${c.banco || '—'} (${c.agencia || '-'} / ${c.contaBancaria || '-'})`,
        c.pix || '—',
        String(c.pedidos.length),
        formatCurrency(fin.somaComissoes),
        formatCurrency(fin.somaDescontos),
        formatCurrency(fin.totalContrato),
        formatCurrency(c.taxaBancaria),
        formatCurrency(fin.totalReceber),
      ];
    }),
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [15, 76, 108], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  const afterFirstTableY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 75;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. Detalhamento de Pedidos por Cotação', 14, afterFirstTableY + 8);

  autoTable(doc, {
    startY: afterFirstTableY + 11,
    head: [
      [
        'Consultor',
        'Cliente',
        'Cotação',
        'Cód. AACE',
        'Operadora',
        'Tipo Pedido',
        'Linhas',
        'Valor Unit.',
        '% Venda',
        'Comissão',
        'Desconto',
        'Status',
        'Ativação',
        'Pagamento',
      ],
    ],
    body: rows.map(({ consultor, pedido }) => [
      consultor.nomeConsultor,
      pedido.nomeCliente,
      pedido.cotacao,
      pedido.codigoAace || '—',
      pedido.operadora || '—',
      pedido.tipoPedido || '—',
      String(pedido.quantidadeLinhas),
      formatCurrency(pedido.valorUnitario),
      `${pedido.porcentagemVenda}%`,
      formatCurrency(pedido.comissao),
      formatCurrency(pedido.desconto),
      pedido.status,
      formatDateBR(pedido.dataAtivacao),
      formatDateBR(pedido.dataPagamento),
    ]),
    styles: { fontSize: 7, cellPadding: 1.8 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(`relatorio_cadastros_pedidos_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportConsultantsOrdersExcel(
  rows: FlattenedOrderRow[],
  consultants: ConsultantRecord[]
) {
  const consultantIdsInScope = new Set(rows.map((r) => r.consultor.id));
  const targetConsultants =
    rows.length > 0
      ? consultants.filter((c) => consultantIdsInScope.has(c.id))
      : consultants;

  const consultantsSheetData = targetConsultants.map((c) => {
    const fin = calculateConsultantFinancials(c.pedidos, c.taxaBancaria);
    return {
      'Data Cadastro': formatDateBR(c.dataCadastro),
      'Nome Consultor': c.nomeConsultor,
      CNPJ: c.cnpj,
      CPF: c.cpf,
      Telefone: c.telefone,
      'Código Banco': c.codigoBanco,
      Banco: c.banco,
      Agência: c.agencia,
      'Conta Bancária': c.contaBancaria,
      Pix: c.pix,
      'Taxa Bancária (R$)': c.taxaBancaria,
      'Qtd Pedidos': c.pedidos.length,
      'Soma Comissões (R$)': fin.somaComissoes,
      'Soma Descontos (R$)': fin.somaDescontos,
      'Total Contrato (R$)': fin.totalContrato,
      'Total a Receber (R$)': fin.totalReceber,
    };
  });

  const ordersSheetData = rows.map(({ consultor, pedido, totalContratoConsultor, totalReceberConsultor }) => ({
    'Nome Consultor': consultor.nomeConsultor,
    'Nome Cliente': pedido.nomeCliente,
    'CNPJ Cliente': pedido.cnpjCliente,
    'CPF Cliente': pedido.cpfCliente,
    Cotação: pedido.cotacao,
    'Código AACE': pedido.codigoAace,
    Operadora: pedido.operadora,
    'Tipo Pedido': pedido.tipoPedido,
    'Qtd Linhas': pedido.quantidadeLinhas,
    'Valor Unitário (R$)': pedido.valorUnitario,
    '% Vendas': pedido.porcentagemVenda,
    'Comissão (R$)': pedido.comissao,
    'Desconto (R$)': pedido.desconto,
    'Total Contrato Consultor (R$)': totalContratoConsultor,
    'Taxa Bancária Consultor (R$)': consultor.taxaBancaria,
    'Total Receber Consultor (R$)': totalReceberConsultor,
    Status: pedido.status,
    'Data Ativação': formatDateBR(pedido.dataAtivacao),
    'Data Pagamento': formatDateBR(pedido.dataPagamento),
    Observação: pedido.observacao,
  }));

  const wb = XLSX.utils.book_new();
  const wsConsultants = XLSX.utils.json_to_sheet(consultantsSheetData);
  const wsOrders = XLSX.utils.json_to_sheet(ordersSheetData);

  XLSX.utils.book_append_sheet(wb, wsConsultants, 'Consultores');
  XLSX.utils.book_append_sheet(wb, wsOrders, 'Pedidos');

  XLSX.writeFile(wb, `relatorio_cadastros_pedidos_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportUsersProfilesPDF(
  users: UserAccount[],
  profiles: AccessProfile[]
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const nowStr = new Date().toLocaleString('pt-BR');
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  doc.setFillColor(185, 28, 28);
  doc.rect(0, 0, 210, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SISTEMA FINANCEIRO MZ — RELATÓRIO DE USUÁRIOS E PERFIS', 14, 11.5);

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Emitido em: ${nowStr}   |   Usuários: ${users.length}   |   Perfis: ${profiles.length}`, 14, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. Usuários Cadastrados', 14, 32);

  autoTable(doc, {
    startY: 35,
    head: [['Nome', 'Login', 'Perfil de Acesso', 'Status', 'Criado em']],
    body: users.map((u) => [
      u.nome,
      u.login,
      profileMap.get(u.profileId)?.nome ?? 'Sem perfil',
      u.ativo ? 'Ativo' : 'Inativo',
      formatDateBR(u.criadoEm),
    ]),
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [15, 76, 108], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  const afterUsersY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 85;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. Perfis de Acesso e Permissões Liberadas', 14, afterUsersY + 10);

  autoTable(doc, {
    startY: afterUsersY + 13,
    head: [['Perfil', 'Descrição', 'Permissões Liberadas']],
    body: profiles.map((p) => [
      p.nome,
      p.descricao,
      p.permissions.join(', '),
    ]),
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(`relatorio_usuarios_perfis_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportUsersProfilesExcel(
  users: UserAccount[],
  profiles: AccessProfile[]
) {
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const usersData = users.map((u) => ({
    Nome: u.nome,
    Login: u.login,
    Perfil: profileMap.get(u.profileId)?.nome ?? 'Sem perfil',
    Status: u.ativo ? 'Ativo' : 'Inativo',
    'Criado em': formatDateBR(u.criadoEm),
  }));

  const profilesData = profiles.map((p) => ({
    Perfil: p.nome,
    Descrição: p.descricao,
    'Qtd Permissões': p.permissions.length,
    'Permissões Habilitadas': p.permissions.join(' | '),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(usersData), 'Usuários');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(profilesData), 'Perfis e Permissões');

  XLSX.writeFile(wb, `relatorio_usuarios_perfis_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export interface PrintSheetGroupInput {
  consultor: ConsultantRecord;
  pedidos: OrderItem[];
}

export function exportPrintLayoutPDF(groups: PrintSheetGroupInput[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  groups.forEach(({ consultor, pedidos }, idx) => {
    if (idx > 0) doc.addPage();

    const somaValorContrato = pedidos.reduce(
      (acc, p) => acc + (Number(p.valorUnitario) || 0),
      0
    );
    const financials = calculateConsultantFinancials(pedidos, consultor.taxaBancaria);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text((consultor.nomeConsultor || 'CONSULTOR').toUpperCase(), 62, 14);

    autoTable(doc, {
      startY: 18,
      head: [
        [
          'OPERADORA',
          'COTAÇÃO',
          'CLIENTE',
          'CNPJ / CPF',
          'COD',
          'TIPO DE PEDIDO',
          'LINHAS',
          'V. CONTRATO',
          '% VENDAS',
          'REMUNERAÇÃO PARCEIRO',
          'ATIVADO',
          'STATUS',
        ],
      ],
      body: pedidos.map((p) => [
        (p.operadora || '—').toUpperCase(),
        p.cotacao.toUpperCase(),
        p.nomeCliente.toUpperCase(),
        p.cnpjCliente || p.cpfCliente || '—',
        (p.codigoAace || '—').toUpperCase(),
        (p.tipoPedido || '—').toUpperCase(),
        String(p.quantidadeLinhas),
        formatCurrency(p.valorUnitario),
        `${p.porcentagemVenda}%`,
        formatCurrency(p.comissao),
        formatDateBR(p.dataAtivacao),
        p.status === 'Ativado' || p.status === 'Pago' ? 'OK' : p.status.toUpperCase(),
      ]),
      foot: [
        [
          '',
          '',
          '',
          '',
          '',
          '',
          'TOTAIS:',
          formatCurrency(somaValorContrato),
          '',
          formatCurrency(financials.somaComissoes),
          '',
          '',
        ],
      ],
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.25,
      },
      headStyles: {
        fillColor: [99, 36, 36],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      footStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
    });

    const afterTableY =
      (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 75;

    const ledgerRows: Array<[string, string]> = [
      ['VALOR TOTAL DE COMISSÃO', formatCurrency(financials.somaComissoes)],
      ['TAXA BANCARIA', `-${formatCurrency(consultor.taxaBancaria)}`],
    ];
    if (financials.somaDescontos > 0) {
      ledgerRows.push(['DESCONTO', `-${formatCurrency(financials.somaDescontos)}`]);
    }
    ledgerRows.push(['VALOR TOTAL A RECEBER', formatCurrency(financials.totalReceber)]);

    autoTable(doc, {
      startY: afterTableY + 5,
      margin: { left: 42 },
      tableWidth: 96,
      body: ledgerRows,
      theme: 'grid',
      styles: {
        fontSize: 8.5,
        cellPadding: 2,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
        fillColor: [241, 245, 249],
      },
      didParseCell: (hookData) => {
        if (hookData.row.index === 1 || (financials.somaDescontos > 0 && hookData.row.index === 2)) {
          hookData.cell.styles.textColor = [220, 38, 38];
        }
        if (hookData.row.index === 0 || hookData.row.index === ledgerRows.length - 1) {
          hookData.cell.styles.fontStyle = 'bold';
        }
        if (hookData.column.index === 1) {
          hookData.cell.styles.halign = 'right';
        }
      },
    });

    const afterLedgerY =
      (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? afterTableY + 40;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);

    const bankLines = [
      'DADOS BANCARIOS',
      (consultor.nomeConsultor || '—').toUpperCase(),
      consultor.cpf ? `CPF: ${consultor.cpf}` : '',
      consultor.cnpj ? `CNPJ: ${consultor.cnpj}` : '',
      `${[consultor.banco, consultor.codigoBanco].filter(Boolean).join(' ').toUpperCase() || 'BANCO: —'}`,
      `AG: ${consultor.agencia || '—'}`,
      `C/C: ${consultor.contaBancaria || '—'}`,
      `PIX: ${consultor.pix || '—'}`,
    ].filter(Boolean);

    let y = afterLedgerY + 6;
    bankLines.forEach((line) => {
      doc.text(line, 42, y);
      y += 4.3;
    });
  });

  doc.save(`extrato_pedidos_impressao_${new Date().toISOString().slice(0, 10)}.pdf`);
}

