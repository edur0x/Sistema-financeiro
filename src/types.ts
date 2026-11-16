export type PermissionKey =
  | 'cadastro.visualizar'
  | 'cadastro.criar_editar'
  | 'cadastro.excluir'
  | 'pesquisar.visualizar'
  | 'pesquisar.editar_item'
  | 'relatorios.exportar'
  | 'usuarios.gerenciar';

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  description: string;
  module: 'Cadastro' | 'Pesquisa' | 'Relatórios' | 'Administração';
}

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  {
    key: 'cadastro.visualizar',
    label: 'Visualizar Cadastro',
    description: 'Acessar a tela de cadastro de consultores e pedidos.',
    module: 'Cadastro',
  },
  {
    key: 'cadastro.criar_editar',
    label: 'Criar e Editar Cadastros',
    description: 'Cadastrar consultores, adicionar itens de pedidos e salvar alterações.',
    module: 'Cadastro',
  },
  {
    key: 'cadastro.excluir',
    label: 'Excluir Consultores e Pedidos',
    description: 'Remover pedidos individuais ou cadastros completos de consultores.',
    module: 'Cadastro',
  },
  {
    key: 'pesquisar.visualizar',
    label: 'Pesquisar e Filtrar Pedidos',
    description: 'Acessar a aba de pesquisa avançada por todos os campos do formulário.',
    module: 'Pesquisa',
  },
  {
    key: 'pesquisar.editar_item',
    label: 'Selecionar Item para Edição',
    description: 'Abrir um pedido pesquisado diretamente no cadastro para editar ou adicionar itens.',
    module: 'Pesquisa',
  },
  {
    key: 'relatorios.exportar',
    label: 'Extrair Relatórios (PDF / Excel)',
    description: 'Gerar e baixar relatórios de cadastros, pedidos e usuários em PDF e Excel.',
    module: 'Relatórios',
  },
  {
    key: 'usuarios.gerenciar',
    label: 'Gerenciar Usuários e Perfis',
    description: 'Criar usuários, configurar senhas e definir permissões de perfis de acesso.',
    module: 'Administração',
  },
];

export interface AccessProfile {
  id: string;
  nome: string;
  descricao: string;
  isSystemAdmin?: boolean;
  permissions: PermissionKey[];
}

export interface UserAccount {
  id: string;
  nome: string;
  login: string;
  senha: string;
  profileId: string;
  ativo: boolean;
  criadoEm: string;
}

export type OrderStatus =
  | 'Em Análise'
  | 'Pendente'
  | 'Aprovado'
  | 'Ativado'
  | 'Pago'
  | 'Cancelado';

export const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'Em Análise',
  'Pendente',
  'Aprovado',
  'Ativado',
  'Pago',
  'Cancelado',
];

export const OPERADORA_SUGGESTIONS = [
  'Vivo Empresas',
  'Claro Empresas',
  'TIM Empresas',
  'Oi Soluções',
  'Algar Telecom',
];

export const TIPO_PEDIDO_SUGGESTIONS = [
  'Portabilidade',
  'Linha Nova',
  'Renovação',
  'Upgrade de Plano',
  'Banda Larga / Link Dedicado',
  'Aparelho + Plano',
  'INCREMENTO',
];

export interface BankSuggestion {
  codigo: string;
  nome: string;
}

export const BANCO_SUGGESTIONS: BankSuggestion[] = [
  { codigo: '001', nome: 'BANCO DO BRASIL' },
  { codigo: '104', nome: 'CAIXA ECONÔMICA FEDERAL' },
  { codigo: '341', nome: 'BANCO ITAÚ UNIBANCO' },
  { codigo: '237', nome: 'BANCO BRADESCO' },
  { codigo: '033', nome: 'BANCO SANTANDER' },
  { codigo: '260', nome: 'NUBANK (NU PAGAMENTOS)' },
  { codigo: '077', nome: 'BANCO INTER' },
  { codigo: '756', nome: 'SICOOB' },
  { codigo: '748', nome: 'SICREDI' },
  { codigo: '336', nome: 'C6 BANK' },
  { codigo: '208', nome: 'BANCO BTG PACTUAL' },
  { codigo: '422', nome: 'BANCO SAFRA' },
  { codigo: '290', nome: 'PAGBANK / PAGSEGURO' },
];

export const CODIGO_AACE_SUGGESTIONS: string[] = [
  'EGZ6',
  'AACE-99102',
  'AACE-99108',
  'AACE-99214',
  'AACE-99450',
  'AACE-99501',
  'AACE-PME01',
  'AACE-CORP02',
];

export interface OrderItem {
  id: string;
  nomeCliente: string;
  cnpjCliente: string;
  cpfCliente: string;
  cotacao: string;
  codigoAace: string;
  operadora: string;
  porcentagemVenda: number;
  quantidadeLinhas: number;
  tipoPedido: string;
  valorUnitario: number;
  status: OrderStatus;
  dataAtivacao: string;
  dataPagamento: string;
  comissao: number;
  desconto: number;
  observacao: string;
  criadoEm: string;
}

export interface ConsultantRecord {
  id: string;
  dataCadastro: string;
  nomeConsultor: string;
  cnpj: string;
  cpf: string;
  telefone: string;
  banco: string;
  codigoBanco: string;
  agencia: string;
  contaBancaria: string;
  pix: string;
  taxaBancaria: number;
  pedidos: OrderItem[];
}

export interface SearchFilters {
  buscaGeral: string;
  consultorId: string;
  nomeCliente: string;
  documentoCliente: string;
  cotacao: string;
  codigoAace: string;
  operadora: string;
  tipoPedido: string;
  status: string;
  dataAtivacaoInicio: string;
  dataAtivacaoFim: string;
  dataPagamentoInicio: string;
  dataPagamentoFim: string;
}

export type ActiveTab = 'cadastro' | 'pesquisar' | 'usuarios' | 'relatorios';
