import { createPortal } from 'react-dom';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as XLSX from 'xlsx';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  getGetProjectQueryKey,
  getHealthCheckQueryKey,
  getListProjectsQueryKey,
  useCreateSpecification,
  useDeleteSpecification,
  useGetProject,
  useHealthCheck,
  useListProjects,
  useUpdateSpecification,
  type Project,
  type ProjectDetail,
  type Specification,
  type SpecificationInput,
} from '@workspace/api-client-react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Bath,
  Bell,
  BookOpen,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  CircleHelp,
  ClipboardList,
  Clock,
  CloudUpload,
  Disc,
  DoorClosed,
  DoorOpen,
  Download,
  Droplets,
  ExternalLink,
  FileSpreadsheet,
  FolderKanban,
  HardHat,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  Lightbulb,
  Link as LinkIcon,
  LoaderCircle,
  LogOut,
  Minus,
  MoreHorizontal,
  PackageSearch,
  PanelsTopLeft,
  Pencil,
  Plug,
  Plus,
  Printer,
  Ruler,
  Search,
  Settings,
  Settings2,
  Share2,
  ShowerHead,
  SlidersHorizontal,
  Square,
  SquareStack,
  Table2,
  ToggleRight,
  Trash2,
  Upload,
  Users,
  Waves,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Link, Route, Switch, Router as WouterRouter, useLocation, useParams } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  CURRENT_USER,
  isPending,
  useWorkspace,
  WorkspaceProvider,
  type ActivityEntry,
  type MatrixSpec,
  type Zone,
} from '@/workspace-store';
import { AuthProvider, DEMO_EMAIL, useAuth } from '@/auth-context';
import { initialsOf } from '@/supabase';
import AuthScreen from '@/pages/auth-screen';

const queryClient = new QueryClient();

type LocalProject = Project;
type LocalSpec = Specification;

function isProjectDetail(value: unknown): value is ProjectDetail {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'specifications' in value
  );
}

const FALLBACK_PROJECTS: LocalProject[] = [
  {
    id: 'ed-santa-monica',
    name: 'Ed. Santa Mônica',
    client: 'Construtora Vale Norte',
    location: 'São Paulo, SP',
    completion: 68,
    updatedAt: '2024-06-18T16:42:00Z',
  },
  {
    id: 'casa-serra',
    name: 'Casa Serra Azul',
    client: 'Ateliê Horizonte',
    location: 'Campos do Jordão, SP',
    completion: 42,
    updatedAt: '2024-06-14T10:10:00Z',
  },
  {
    id: 'torre-ipanema',
    name: 'Torre Ipanema',
    client: 'Mares Incorporadora',
    location: 'Rio de Janeiro, RJ',
    completion: 19,
    updatedAt: '2024-06-10T09:23:00Z',
  },
];

const FALLBACK_SPECS: LocalSpec[] = [
  { id: 'spec-1', environment: 'Estar', item: 'Piso vinílico amadeirado', dimension: '1220 × 180 mm', finish: 'Carvalho natural / E=5 mm', brand: 'Tarkett — Injoy', budget: 12800, quotedPrice: 11640, updatedAt: '2024-06-18T16:42:00Z' },
  { id: 'spec-2', environment: 'Estar', item: 'Painel ripado em lâmina', dimension: '3600 × 2700 mm', finish: 'Lâmina freijó / fosco', brand: 'Decorfilm', budget: 18600, quotedPrice: 20340, updatedAt: '2024-06-17T14:05:00Z' },
  { id: 'spec-3', environment: 'Cozinha', item: 'Bancada ilha', dimension: '2400 × 1100 × 20 mm', finish: 'Quartzo branco / levigado', brand: 'Marmoraria São Bento', budget: 22400, quotedPrice: 21650, updatedAt: '2024-06-17T11:26:00Z' },
  { id: 'spec-4', environment: 'Cozinha', item: 'Marcenaria inferior', dimension: '4200 × 900 mm', finish: 'MDF azul petróleo / PU', brand: 'Módulo 7', budget: 31200, quotedPrice: 33890, updatedAt: '2024-06-16T18:14:00Z' },
  { id: 'spec-5', environment: 'Suíte master', item: 'Revestimento cabeceira', dimension: '3200 × 1200 mm', finish: 'Linho cru / trama fina', brand: 'Celina Têxteis', budget: 9700, quotedPrice: 8420, updatedAt: '2024-06-15T09:52:00Z' },
  { id: 'spec-6', environment: 'Suíte master', item: 'Arandela de leitura', dimension: 'Ø 120 × 180 mm', finish: 'Latão escovado', brand: 'Lumini — Lume', budget: 4600, quotedPrice: 4980, updatedAt: '2024-06-15T09:47:00Z' },
  { id: 'spec-7', environment: 'Banho casal', item: 'Metais de bancada', dimension: 'Monocomando 240 mm', finish: 'Grafite escovado', brand: 'Docol — Lift', budget: 7800, quotedPrice: 7240, updatedAt: '2024-06-13T17:28:00Z' },
  { id: 'spec-8', environment: 'Varanda', item: 'Esquadria de correr', dimension: '4800 × 2400 mm', finish: 'Alumínio champanhe', brand: 'Ação Esquadrias', budget: 27500, quotedPrice: 30120, updatedAt: '2024-06-12T13:02:00Z' },
];

const MATRIX_SPECS: MatrixSpec[] = [
  { id: 'spec-1', environment: 'Hall Apartamentos', element: 'Piso', item: 'Porcelanato Bianco Covelano', dimension: '90x90 cm', finish: 'Nat. Retificado', brand: 'Portobello', budget: 140, quotedPrice: 135, areaTotal: 42, revision: 'R05', assignedTo: 'Felipe', status: 'aprovado', zone: 'Apartamentos', updatedAt: '2024-06-18T16:42:00Z' },
  { id: 'spec-2', environment: 'Hall Apartamentos', element: 'Porta', item: 'Porta de madeira lisa', dimension: '80x210 cm', finish: 'Branco', brand: 'Madeireira Sul', budget: 420, quotedPrice: 410, revision: 'R04', assignedTo: 'Felipe', status: 'aprovado', zone: 'Apartamentos', updatedAt: '2024-06-15T10:10:00Z' },
  { id: 'spec-3', environment: 'Hall Apartamentos', element: 'Acabamento Elétrico', item: 'Interruptor paralelo', dimension: 'Bivolt', finish: 'Branco', brand: 'Pial', budget: 18, quotedPrice: 17, revision: 'R04', assignedTo: 'Lucas', status: 'aprovado', zone: 'Apartamentos', updatedAt: '2024-06-14T09:40:00Z' },
  { id: 'spec-4', environment: 'Cozinha', element: 'Piso', item: 'Porcelanato Bianco Covelano', dimension: '90x90 cm', finish: 'Nat. Retificado', brand: 'Portobello', budget: 140, quotedPrice: 135, areaTotal: 38, revision: 'R05', assignedTo: 'Felipe', status: 'aprovado', zone: 'Apartamentos', updatedAt: '2024-06-18T16:42:00Z' },
  { id: 'spec-5', environment: 'Cozinha', element: 'Parede', item: 'Porcelanato Bianco Covelano', dimension: '90x90 cm', finish: 'Nat. Retificado', brand: 'Portobello', budget: 140, quotedPrice: 148, areaTotal: 24, revision: 'R05', assignedTo: 'Marina Reis', status: 'pendente', zone: 'Apartamentos', updatedAt: '2024-06-17T14:05:00Z' },
  { id: 'spec-6', environment: 'Cozinha', element: 'Rodapé', item: 'Rodapé polido 10 cm', dimension: '10x90 cm', finish: 'Polido', brand: 'Portobello', budget: 45, quotedPrice: 42, areaTotal: 32, revision: 'R04', assignedTo: 'Lucas', status: 'aprovado', zone: 'Apartamentos', updatedAt: '2024-06-16T11:20:00Z' },
  { id: 'spec-7', environment: 'Cozinha', element: 'Bancada', item: 'Granito Preto São Gabriel', dimension: 'h=90 cm', finish: 'Polido', brand: 'Marmoraria Z', budget: 450, quotedPrice: 520, areaTotal: 3.5, revision: 'R05', assignedTo: 'Marina Reis', status: 'pendente', zone: 'Apartamentos', updatedAt: '2024-06-17T14:05:00Z' },
  { id: 'spec-8', environment: 'Cozinha', element: 'Torneira', item: 'Torneira de mesa de cozinha', dimension: 'Bica alta', finish: 'Escovado', brand: 'Deca', budget: 260, quotedPrice: 255, revision: 'R04', assignedTo: 'Lucas', status: 'aprovado', zone: 'Apartamentos', updatedAt: '2024-06-15T13:45:00Z' },
  { id: 'spec-9', environment: 'Cozinha', element: 'Sifão', item: 'Sifão flexível p/ cuba', dimension: '1 1/2"', finish: 'Cromado', brand: 'Tigre', budget: 35, quotedPrice: 38, revision: 'R04', assignedTo: 'Marina Reis', status: 'revisao', zone: 'Apartamentos', updatedAt: '2024-06-15T13:50:00Z' },
  { id: 'spec-10', environment: 'Cozinha', element: 'Iluminação', item: 'Spot LED embutido', dimension: 'Ø 90 mm', finish: '4000K', brand: 'Ledtech', budget: 60, quotedPrice: 58, revision: 'R04', assignedTo: 'Lucas', status: 'aprovado', zone: 'Apartamentos', updatedAt: '2024-06-14T08:12:00Z' },
  { id: 'spec-11', environment: 'Banho Master', element: 'Piso', item: 'Porcelanato Bianco Covelano', dimension: '60x60 cm', finish: 'Nat. Retificado', brand: 'Portobello', budget: 110, quotedPrice: 108, areaTotal: 12, revision: 'R04', assignedTo: 'Felipe', status: 'aprovado', zone: 'Apartamentos', updatedAt: '2024-06-16T09:00:00Z' },
  { id: 'spec-12', environment: 'Banho Master', element: 'Parede', item: 'Pasta de vidro verde', dimension: '30x30 cm', finish: 'Fosco', brand: 'Portobello', budget: 95, quotedPrice: 122, areaTotal: 18, revision: 'R04', assignedTo: 'Lucas', status: 'pendente', zone: 'Apartamentos', updatedAt: '2024-06-15T17:30:00Z' },
  { id: 'spec-13', environment: 'Banho Master', element: 'Bancada', item: 'Granito Preto São Gabriel', dimension: 'h=80 cm', finish: 'Polido', brand: 'Marmoraria Z', budget: 320, quotedPrice: 315, revision: 'R04', assignedTo: 'Lucas', status: 'aprovado', zone: 'Apartamentos', updatedAt: '2024-06-15T15:22:00Z' },
  { id: 'spec-14', environment: 'Banho Master', element: 'Bacia Sanitária', item: 'Bacia com caixa acoplada', dimension: '-', finish: 'Branco Brilho', brand: 'Deca', budget: 650, quotedPrice: 610, revision: 'R05', assignedTo: 'Lucas', status: 'aprovado', zone: 'Apartamentos', updatedAt: '2024-06-16T10:15:00Z' },
  { id: 'spec-15', environment: 'Banho Master', element: 'Cuba', item: 'Cuba Semiencaixe c/ mesa L830.17', dimension: 'Square', finish: 'Branco Brilho', brand: 'Deca', budget: 380, quotedPrice: 360, revision: 'R04', assignedTo: 'Lucas', status: 'aprovado', zone: 'Apartamentos', updatedAt: '2024-06-15T11:26:00Z' },
  { id: 'spec-16', environment: 'Banho Master', element: 'Torneira', item: 'Torneira de mesa Just (1167.C27)', dimension: '-', finish: 'Cromado', brand: 'Deca', budget: 290, quotedPrice: 340, revision: 'R05', assignedTo: 'Felipe', status: 'pendente', zone: 'Apartamentos', updatedAt: '2024-06-16T18:14:00Z' },
  { id: 'spec-17', environment: 'Banho Master', element: 'Ducha Higiênica', item: 'Ducha higiênica de parede', dimension: '-', finish: 'Cromado', brand: 'Deca', budget: 180, quotedPrice: 175, revision: 'R04', assignedTo: 'Felipe', status: 'aprovado', zone: 'Apartamentos', updatedAt: '2024-06-15T09:47:00Z' },
  { id: 'spec-18', environment: 'Banho Master', element: 'Ralo', item: 'Ralo linear 10 cm', dimension: '100x60 mm', finish: 'Cromado', brand: 'Docol', budget: 120, quotedPrice: 115, revision: 'R04', assignedTo: 'Felipe', status: 'aprovado', zone: 'Apartamentos', updatedAt: '2024-06-14T12:33:00Z' },
  { id: 'spec-19', environment: 'Banho Master', element: 'Maçaneta', item: 'Maçaneta de banheiro', dimension: '-', finish: 'Cromada', brand: 'Docol', budget: 90, quotedPrice: 88, revision: 'R04', assignedTo: 'Felipe', status: 'aprovado', zone: 'Apartamentos', updatedAt: '2024-06-14T12:36:00Z' },
  { id: 'spec-20', environment: 'Banho Master', element: 'Acabamento Elétrico', item: 'Tomada 2P+T 20A', dimension: 'Bivolt', finish: 'Branco', brand: 'Pial', budget: 25, quotedPrice: 30, revision: 'R04', assignedTo: 'Felipe', status: 'revisao', zone: 'Apartamentos', updatedAt: '2024-06-13T16:04:00Z' },
  { id: 'spec-21', environment: 'Hall de Entrada', element: 'Piso', item: 'Granito Preto São Gabriel', dimension: '60x60 cm', finish: 'Polido', brand: 'Marmoraria Z', budget: 320, quotedPrice: 330, revision: 'R03', assignedTo: 'Marina Reis', status: 'pendente', zone: 'Áreas Comuns', updatedAt: '2024-06-12T09:10:00Z' },
  { id: 'spec-22', environment: 'Hall de Entrada', element: 'Parede', item: 'Tinta acrílica premium', dimension: '18L', finish: 'Fosco', brand: 'Suvinil', budget: 180, quotedPrice: 165, revision: 'R03', assignedTo: 'Felipe', status: 'aprovado', zone: 'Áreas Comuns', updatedAt: '2024-06-11T14:22:00Z' },
  { id: 'spec-23', environment: 'Escada', element: 'Piso', item: 'Granito Preto São Gabriel', dimension: 'Degraus', finish: 'Polido', brand: 'Marmoraria Z', budget: 240, quotedPrice: 235, revision: 'R03', assignedTo: 'Lucas', status: 'aprovado', zone: 'Áreas Comuns', updatedAt: '2024-06-10T11:05:00Z' },
  { id: 'spec-24', environment: 'Corredor', element: 'Iluminação', item: 'Painel LED 60x60', dimension: '40W', finish: '4000K', brand: 'Ledtech', budget: 95, quotedPrice: 98, revision: 'R03', assignedTo: 'Marina Reis', status: 'pendente', zone: 'Áreas Comuns', updatedAt: '2024-06-09T16:40:00Z' },
  { id: 'spec-25', environment: 'Corredor', element: 'Acabamento Elétrico', item: 'Tomada 2P+T 20A', dimension: 'Bivolt', finish: 'Branco', brand: 'Pial', budget: 25, quotedPrice: 24, revision: 'R03', assignedTo: 'Lucas', status: 'aprovado', zone: 'Áreas Comuns', updatedAt: '2024-06-09T16:42:00Z' },
  { id: 'spec-26', environment: 'Fachada Principal', element: 'Teto', item: 'Pintura acrílica de fachada', dimension: '18L', finish: 'Fosco', brand: 'Suvinil', budget: 210, quotedPrice: 225, revision: 'R02', assignedTo: 'Felipe', status: 'pendente', zone: 'Fachada', updatedAt: '2024-06-08T10:30:00Z' },
  { id: 'spec-27', environment: 'Fachada Principal', element: 'Acabamento Elétrico', item: 'Projetor LED', dimension: '30W', finish: '3000K', brand: 'Ledtech', budget: 120, quotedPrice: 115, revision: 'R02', assignedTo: 'Felipe', status: 'aprovado', zone: 'Fachada', updatedAt: '2024-06-08T10:35:00Z' },
  { id: 'spec-28', environment: 'Fachada Principal', element: 'Porta', item: 'Porta de entrada em aço', dimension: '90x210 cm', finish: 'Texturizada', brand: 'Metalúrgica Norte', budget: 780, quotedPrice: 760, revision: 'R02', assignedTo: 'Lucas', status: 'aprovado', zone: 'Fachada', updatedAt: '2024-06-07T15:12:00Z' },
  { id: 'spec-29', environment: 'Fachada Principal', element: 'Peitoril', item: 'Peitoril em granito', dimension: '20x120 cm', finish: 'Polido', brand: 'Marmoraria Z', budget: 90, quotedPrice: 95, revision: 'R02', assignedTo: 'Marina Reis', status: 'revisao', zone: 'Fachada', updatedAt: '2024-06-07T15:15:00Z' },
];

const REVESTIMENTOS = ['Piso', 'Parede', 'Rodapé', 'Soleira/Filete', 'Bancada', 'Teto', 'Peitoril', 'Soco'];
const LOUCAS_E_METAIS = ['Cuba', 'Tanque', 'Válvula de Cuba', 'Sifão', 'Torneira', 'Bacia Sanitária', 'Ducha Higiênica', 'Acabamento de Registro', 'Acionamento de Chuveiro', 'Ralo'];

const CASA_SERRA_SPECS: MatrixSpec[] = [
  { id: 'cs-1', environment: 'Estar', element: 'Piso', item: 'Piso vinílico amadeirado', dimension: '1220 × 180 mm', finish: 'Carvalho natural / E=5 mm', brand: 'Tarkett — Injoy', budget: 12800, quotedPrice: 11640, revision: 'R03', assignedTo: 'Marina Reis', status: 'pendente', zone: 'Apartamentos', updatedAt: '2024-06-14T10:10:00Z' },
  { id: 'cs-2', environment: 'Estar', element: 'Parede', item: 'Painel ripado em lâmina', dimension: '3600 × 2700 mm', finish: 'Lâmina freijó / fosco', brand: 'Decorfilm', budget: 18600, quotedPrice: 20340, revision: 'R03', assignedTo: 'Felipe', status: 'aprovado', zone: 'Apartamentos', updatedAt: '2024-06-14T09:40:00Z' },
  { id: 'cs-3', environment: 'Cozinha', element: 'Bancada', item: 'Bancada em quartzo branco', dimension: '2400 × 1100 × 20 mm', finish: 'Levigado', brand: 'Marmoraria São Bento', budget: 22400, quotedPrice: 21650, revision: 'R02', assignedTo: 'Marina Reis', status: 'revisao', zone: 'Apartamentos', updatedAt: '2024-06-13T16:00:00Z' },
  { id: 'cs-4', environment: 'Cozinha', element: 'Torneira', item: 'Torneira de mesa de cozinha', dimension: 'Bica alta', finish: 'Escovado', brand: 'Deca', budget: 260, quotedPrice: 255, revision: 'R02', assignedTo: 'Lucas', status: 'aprovado', zone: 'Apartamentos', updatedAt: '2024-06-12T11:22:00Z' },
  { id: 'cs-5', environment: 'Suíte master', element: 'Iluminação', item: 'Arandela de leitura', dimension: 'Ø 120 × 180 mm', finish: 'Latão escovado', brand: 'Lumini — Lume', budget: 4600, quotedPrice: 4980, revision: 'R02', assignedTo: 'Marina Reis', status: 'pendente', zone: 'Apartamentos', updatedAt: '2024-06-12T11:25:00Z' },
  { id: 'cs-6', environment: 'Banho casal', element: 'Bacia Sanitária', item: 'Bacia com caixa acoplada', dimension: '-', finish: 'Branco Brilho', brand: 'Deca', budget: 650, quotedPrice: 610, revision: 'R02', assignedTo: 'Lucas', status: 'aprovado', zone: 'Apartamentos', updatedAt: '2024-06-11T08:40:00Z' },
];

const TORRE_IPANEMA_SPECS: MatrixSpec[] = [
  { id: 'ti-1', environment: 'Hall de Entrada', element: 'Piso', item: 'Granito Preto São Gabriel', dimension: '60x60 cm', finish: 'Polido', brand: 'Marmoraria Z', budget: 320, quotedPrice: 345, revision: 'R02', assignedTo: 'Marina Reis', status: 'pendente', zone: 'Áreas Comuns', updatedAt: '2024-06-10T09:23:00Z' },
  { id: 'ti-2', environment: 'Apartamento tipo', element: 'Piso', item: 'Porcelanato Bianco Covelano', dimension: '90x90 cm', finish: 'Nat. Retificado', brand: 'Portobello', budget: 140, quotedPrice: 138, revision: 'R02', assignedTo: 'Lucas', status: 'aprovado', zone: 'Apartamentos', updatedAt: '2024-06-10T09:20:00Z' },
  { id: 'ti-3', environment: 'Apartamento tipo', element: 'Bacia Sanitária', item: 'Bacia com caixa acoplada', dimension: '-', finish: 'Branco Brilho', brand: 'Deca', budget: 650, quotedPrice: 680, revision: 'R01', assignedTo: 'Felipe', status: 'pendente', zone: 'Apartamentos', updatedAt: '2024-06-09T14:02:00Z' },
  { id: 'ti-4', environment: 'Cobertura', element: 'Acabamento Elétrico', item: 'Painel de distribuição', dimension: '24 disjuntores', finish: 'Branco', brand: 'Pial', budget: 940, quotedPrice: 920, revision: 'R01', assignedTo: 'Marina Reis', status: 'revisao', zone: 'Apartamentos', updatedAt: '2024-06-09T13:58:00Z' },
  { id: 'ti-5', environment: 'Fachada Principal', element: 'Teto', item: 'Pintura acrílica de fachada', dimension: '18L', finish: 'Fosco', brand: 'Suvinil', budget: 210, quotedPrice: 205, revision: 'R01', assignedTo: 'Lucas', status: 'aprovado', zone: 'Fachada', updatedAt: '2024-06-08T10:15:00Z' },
];

const INITIAL_ACTIVITY: ActivityEntry[] = [
  { mark: 'AR', label: 'André Ribeiro', action: 'atualizou a verba de', target: 'Painel ripado em lâmina', project: 'Ed. Santa Mônica', time: 'há 18 min', tone: 'teal' },
  { mark: 'FL', label: 'Fernanda Lima', action: 'comentou em', target: 'Revestimento cabeceira', project: 'Casa Serra Azul', time: 'há 1 h', tone: 'coral' },
  { mark: 'MR', label: 'Marina Reis', action: 'aprovou', target: 'Metais de bancada', project: 'Ed. Santa Mônica', time: 'ontem', tone: 'ink' },
  { mark: 'JP', label: 'João Pedro', action: 'solicitou troca em', target: 'Torneira de Mesa Just', project: 'Ed. Santa Mônica', time: 'há 2 dias', tone: 'amber' },
  { mark: 'CS', label: 'Carla Souza', action: 'alterou o fornecedor de', target: 'Bancada ilha', project: 'Casa Serra Azul', time: 'há 3 dias', tone: 'violet' },
];

const INITIAL_SPECS: Record<string, MatrixSpec[]> = {
  'ed-santa-monica': MATRIX_SPECS,
  'casa-serra': CASA_SERRA_SPECS,
  'torre-ipanema': TORRE_IPANEMA_SPECS,
};

const ELEMENT_ICONS: Record<string, LucideIcon> = {
  'Piso': LayoutGrid,
  'Parede': SquareStack,
  'Rodapé': Ruler,
  'Soleira/Filete': Minus,
  'Bancada': Table2,
  'Teto': PanelsTopLeft,
  'Peitoril': Square,
  'Soco': Layers,
  'Cuba': CircleDot,
  'Tanque': Waves,
  'Válvula de Cuba': Settings2,
  'Sifão': Wrench,
  'Torneira': ShowerHead,
  'Bacia Sanitária': Bath,
  'Ducha Higiênica': Droplets,
  'Acabamento de Registro': SlidersHorizontal,
  'Acionamento de Chuveiro': ToggleRight,
  'Ralo': Disc,
  'Porta': DoorOpen,
  'Maçaneta': DoorClosed,
  'Iluminação': Lightbulb,
  'Acabamento Elétrico': Plug,
};

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const BRL_NUM = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const DATE = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });

function money(value: number) {
  return BRL.format(value).replace(/\s/g, ' ');
}

function dateLabel(value: string) {
  return DATE.format(new Date(value)).replace('.', '');
}

function specCompletion(specs: MatrixSpec[]) {
  if (!specs.length) return 0;
  const complete = specs.filter((spec) => Boolean(spec.item?.trim()) && Boolean(spec.brand?.trim()) && Boolean(spec.finish?.trim()) && Number(spec.budget) > 0 && Number(spec.quotedPrice) > 0).length;
  return Math.round((complete / specs.length) * 100);
}

function specArea(spec: MatrixSpec) {
  return Number(spec.areaTotal) || 0;
}

function specTotalValue(spec: MatrixSpec) {
  const area = specArea(spec);
  return area > 0 ? Number(spec.quotedPrice || 0) * area : Number(spec.quotedPrice || 0);
}

function specBudgetValue(spec: MatrixSpec) {
  const area = specArea(spec);
  return area > 0 ? Number(spec.budget || 0) * area : Number(spec.budget || 0);
}

function mergeProjects(base: LocalProject[], local: LocalProject[]) {
  const ids = new Set(base.map((project) => project.id));
  return [...base, ...local.filter((project) => !ids.has(project.id))];
}

function effectiveProjects(base: LocalProject[], local: LocalProject[], hidden: string[], names: Record<string, string>): LocalProject[] {
  return mergeProjects(base, local)
    .filter((project) => !hidden.includes(project.id))
    .map((project) => (names[project.id] ? { ...project, name: names[project.id] } : project));
}

function normalizeHeader(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s_-]+/g, '');
}

function productKey(spec: Pick<MatrixSpec, 'brand' | 'item' | 'finish' | 'dimension'>) {
  return [spec.brand, spec.item, spec.finish, spec.dimension].map((part) => normalizeHeader(part || '')).join('|');
}

function headerKind(key: string): keyof Pick<MatrixSpec, 'environment' | 'element' | 'item' | 'dimension' | 'finish' | 'brand' | 'budget' | 'quotedPrice' | 'areaTotal'> | 'zone' | null {
  const k = normalizeHeader(key);
  if (k.includes('ambiente')) return 'environment';
  if (k.includes('elemento') || k.includes('element')) return 'element';
  if (k.includes('item') || k.includes('descricao')) return 'item';
  if (k.includes('dimensao')) return 'dimension';
  if (k.includes('acabamento')) return 'finish';
  if (k.includes('marca') || k.includes('fornecedor')) return 'brand';
  if (k.includes('verba') || k.includes('previsto') || k.includes('orcamento') || k.includes('teto')) return 'budget';
  if (k.includes('cotado') || k.includes('preco') || k.includes('atual')) return 'quotedPrice';
  if (k.includes('area') || k.includes('quantidade') || k.includes('m2')) return 'areaTotal';
  if (k.includes('macrozona') || k.includes('zona')) return 'zone';
  return null;
}

function parseMoney(value: unknown): number {
  if (typeof value === 'number') return value;
  const text = String(value ?? '').trim();
  if (!text) return 0;
  const cleaned = text.replace(/R\$\s?/gi, '').replace(/\./g, '').replace(/,/g, '.').trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function normalizeZone(value: string): Zone {
  const v = normalizeHeader(value);
  if (v.includes('comum') || v.includes('comun')) return 'Áreas Comuns';
  if (v.includes('fachada')) return 'Fachada';
  return 'Apartamentos';
}

function parseCsvText(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) return [];
  const delimiter = lines[0].includes(';') ? ';' : ',';
  const splitLine = (line: string) => {
    const out: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i += 1; }
        else inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        out.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    out.push(current.trim());
    return out;
  };
  const headers = splitLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const row: Record<string, unknown> = {};
    headers.forEach((header, index) => { row[header] = cells[index] ?? ''; });
    return row;
  });
}

function parseWorkbookRows(rows: Record<string, unknown>[], currentUserName: string = CURRENT_USER): MatrixSpec[] {
  const headers = Object.keys(rows[0] ?? {});
  const map: Partial<Record<'environment' | 'element' | 'item' | 'dimension' | 'finish' | 'brand' | 'budget' | 'quotedPrice' | 'areaTotal' | 'zone', string>> = {};
  for (const header of headers) {
    const kind = headerKind(header);
    if (kind && map[kind] === undefined) map[kind] = header;
  }
  return rows.map((row, index) => {
    const item = String(row[map.item ?? ''] ?? '').trim();
    return {
      id: `import-${Date.now()}-${index}`,
      environment: String(row[map.environment ?? ''] ?? '').trim() || 'Ambiente não informado',
      element: String(row[map.element ?? ''] ?? '').trim() || 'Elemento',
      item: item || 'Item não informado',
      dimension: String(row[map.dimension ?? ''] ?? '').trim() || '—',
      finish: String(row[map.finish ?? ''] ?? '').trim() || '—',
      brand: String(row[map.brand ?? ''] ?? '').trim() || '—',
      budget: parseMoney(row[map.budget ?? '']),
      quotedPrice: parseMoney(row[map.quotedPrice ?? '']),
      areaTotal: map.areaTotal ? parseMoney(row[map.areaTotal ?? '']) : 0,
      revision: 'R01',
      assignedTo: currentUserName,
      status: 'pendente',
      zone: map.zone ? normalizeZone(String(row[map.zone] ?? '')) : 'Apartamentos',
      updatedAt: new Date().toISOString(),
    } satisfies MatrixSpec;
  });
}

function IconButton({ label, children, onClick, className = '', testId }: { label: string; children: ReactNode; onClick?: () => void; className?: string; testId: string }) {
  return (
    <button type="button" aria-label={label} title={label} data-testid={testId} onClick={onClick} className={`icon-button ${className}`}>
      {children}
    </button>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const [notice, setNotice] = useState('');
  const { user, logout } = useAuth();
  const me = user ?? { id: '', name: CURRENT_USER, initials: 'MR', email: '', role: 'Direção de projetos', company: 'Vale Norte', createdAt: '' };
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), staleTime: 60000 } });
  const projectsQuery = useListProjects({ query: { queryKey: getListProjectsQueryKey(), staleTime: 30000 } });
  const { sampleMode, localProjects, hiddenProjects, projectNameOverrides } = useWorkspace();
  const demoBase = sampleMode ? FALLBACK_PROJECTS : [];
  const projects = effectiveProjects(Array.isArray(projectsQuery.data) && projectsQuery.data.length ? projectsQuery.data : demoBase, localProjects, hiddenProjects, projectNameOverrides);
  const activeProjectId = location.match(/^\/projects\/([^/]+)/)?.[1] ?? projects[0]?.id ?? 'ed-santa-monica';
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const isProject = location.startsWith('/projects/') || location === '/matriz';
  const matrixHref = projects[0] ? `/projects/${projects[0].id}` : '/matriz';

  const pushNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3200);
  };

  return (
    <div className="shell-noise min-h-[100dvh] bg-background text-foreground">
      <aside className="sidebar">
        <Link href="/" className="brand-lockup" data-testid="link-brand-home">
          <span className="brand-mark"><HardHat size={19} strokeWidth={2.4} /></span>
          <span><strong>spec</strong>master<em>®</em></span>
        </Link>
        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-switcher">
          <span className="workspace-avatar">{initialsOf(me.company)}</span>
          <span><strong>{me.company}</strong><small>{me.role}</small></span>
        </div>
        <nav className="side-nav" aria-label="Navegação principal">
          <p className="nav-caption">Controle</p>
          <Link href="/" className={`nav-item ${location === '/' ? 'active' : ''}`} data-testid="link-nav-portfolio">
            <LayoutDashboard size={17} /><span>Portfólio</span><kbd>1</kbd>
          </Link>
          <Link href={matrixHref} className={`nav-item ${isProject ? 'active' : ''}`} data-testid="link-nav-matrix">
            <ClipboardList size={17} /><span>Matriz de specs</span>
          </Link>
          <Link href="/suppliers" className={`nav-item ${location === '/suppliers' ? 'active' : ''}`} data-testid="link-nav-suppliers">
            <Users size={17} /><span>Fornecedores</span>
          </Link>
          <p className="nav-caption nav-caption-spaced">Workspace</p>
          <Link href="/settings" className={`nav-item ${location === '/settings' ? 'active' : ''}`} data-testid="link-nav-settings">
            <Settings size={17} /><span>Configurações</span>
          </Link>
          <button type="button" onClick={() => pushNotice('Central de ajuda disponível em breve.')} className="nav-item nav-button" data-testid="button-help">
            <CircleHelp size={17} /><span>Central de ajuda</span>
          </button>
          <button type="button" onClick={logout} className="nav-item nav-button" data-testid="button-logout">
            <LogOut size={17} /><span>Sair</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="system-status">
            <span className={`status-dot ${health.isError ? 'offline' : ''}`} />
            <span>{health.isError ? 'Modo offline' : 'Operação normal'}</span>
            <span className="font-mono-ui status-time">09:41</span>
          </div>
          <div className="profile-row">
            <span className="profile-avatar">{me.initials}</span>
            <span><strong>{me.name}</strong><small>{me.role}</small></span>
            <MoreHorizontal size={16} />
          </div>
        </div>
      </aside>
      <main className="main-canvas">
        <div className="project-switcher-bar" data-testid="project-switcher">
           <div className="project-switcher-main"><span className="breadcrumb-link">Projetos</span><span className="breadcrumb-separator">›</span><label className="project-select-wrap"><span className="sr-only">Selecionar projeto</span><select value={activeProject?.id ?? 'ed-santa-monica'} onChange={(event) => setLocation(`/projects/${event.target.value}`)} data-testid="select-project-switcher">{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><ChevronDown size={14} /></label></div>
           <div className="header-toolbar"><span className="sync-badge"><span className="status-dot" /> Sincronizado</span><span className="header-profile"><span className="profile-avatar">{me.initials}</span><span className="header-profile-id"><strong>{me.name}</strong><small>{me.role}</small></span></span></div>
        </div>
        {children}
      </main>
      {notice && (
        <div className="toast-note page-enter" role="status" data-testid="status-toast">
          <Check size={15} /> {notice}
        </div>
      )}
    </div>
  );
}

function Topbar({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <header className="topbar">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="topbar-actions">
        <IconButton label="Notificações" testId="button-notifications"><Bell size={17} /></IconButton>
        <div className="topbar-divider" />
        {action}
      </div>
    </header>
  );
}

function Portfolio() {
  const { user: authUser } = useAuth();
  const meName = authUser?.name ?? CURRENT_USER;
  const projectsQuery = useListProjects({ query: { queryKey: getListProjectsQueryKey(), staleTime: 30000 } });
  const { sampleMode, adoptExample, specsByProject, requestApproval, activity, localProjects, hiddenProjects, projectNameOverrides, createProject, setAutoImportProjectId, renameProject, deleteProject } = useWorkspace();
  const demoBase = sampleMode ? FALLBACK_PROJECTS : [];
  const projects = effectiveProjects(Array.isArray(projectsQuery.data) && projectsQuery.data.length ? projectsQuery.data : demoBase, localProjects, hiddenProjects, projectNameOverrides);
  const projectCount = projects.length;
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [, setLocation] = useLocation();
  const projectName = (projectId: string) => projects.find((project) => project.id === projectId)?.name ?? projectId;
  const myPending = useMemo(() => Object.entries(specsByProject).flatMap(([projectId, list]) => list.filter((spec) => spec.assignedTo === meName && isPending(spec)).map((spec) => ({ ...spec, projectId }))), [specsByProject, meName]);
  const openPending = (projectId: string, spec: MatrixSpec) => {
    requestApproval(projectId, spec.id);
    setLocation(`/projects/${projectId}`);
  };
  const statusLabel = (status: MatrixSpec['status']) => status === 'troca' ? 'Troca solicitada' : status === 'revisao' ? 'Revisão pendente' : 'Pendente';
  const completionOf = (projectId: string) => specCompletion(specsByProject[projectId] ?? []);
  const budgetOf = (projectId: string) => {
    const specs = specsByProject[projectId] ?? [];
    const budget = specs.reduce((sum, row) => sum + specBudgetValue(row), 0);
    const quoted = specs.reduce((sum, row) => sum + specTotalValue(row), 0);
    return { budget, quoted, over: quoted > budget };
  };
  const onCreateProject = (input: { name: string; client: string; location: string; startWith: 'blank' | 'import' }) => {
    const projectId = createProject({ name: input.name, client: input.client, location: input.location });
    setNewProjectOpen(false);
    if (input.startWith === 'import') setAutoImportProjectId(projectId);
    setLocation(`/projects/${projectId}`);
  };
  const [renameTarget, setRenameTarget] = useState<LocalProject | null>(null);
  const [notice, setNotice] = useState('');
  const pushNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3200);
  };
  const confirmRename = (name: string) => {
    if (renameTarget) {
      renameProject(renameTarget.id, name);
      pushNotice('Projeto renomeado.');
    }
    setRenameTarget(null);
  };
  const confirmDelete = (project: LocalProject) => {
    if (window.confirm(`Apagar o projeto "${project.name}"? Esta ação não pode ser desfeita.`)) {
      deleteProject(project.id);
      pushNotice('Projeto apagado.');
    }
  };

  return (
    <div className="page-wrap page-enter">
      <Topbar
        eyebrow="PORTFÓLIO / 2024"
        title="Visão operacional"
        action={<button type="button" className="button button-primary" onClick={() => setNewProjectOpen(true)} data-testid="button-new-project"><Plus size={16} /> Novo projeto</button>}
      />
      <section className="metric-strip compact-metrics stagger-1" aria-label="Resumo do portfólio">
        <div className="metric-cell"><span className="metric-label">Projetos ativos</span><strong data-testid="text-active-projects">{projectCount.toString().padStart(2, '0')}</strong><small>+ 1 nesta semana</small></div>
        <div className="metric-cell"><span className="metric-label">Itens em revisão</span><strong data-testid="text-pending-count">{myPending.length.toString().padStart(2, '0')}</strong><small className={myPending.length ? 'warning-text' : 'success-text'}>{myPending.length ? `${myPending.length} precisam do seu retorno` : 'tudo em dia'}</small></div>
        <div className="metric-cell"><span className="metric-label">Aderência à verba</span><strong>82,4<span>%</span></strong><small className="success-text">+4,8% no mês</small></div>
      </section>
      <section className="portfolio-section stagger-2">
        <div className="section-heading">
          <div><p className="section-kicker">EM ANDAMENTO</p><h3>Projetos ativos</h3></div>
          <span className="muted-label">Atualizado hoje, 09:38</span>
        </div>
        {projects.length === 0 && !projectsQuery.isLoading ? (
          <div className="portfolio-onboarding" data-testid="onboarding-empty">
            <div className="onboarding-mark"><FolderKanban size={22} /></div>
            <p className="section-kicker">COMEÇANDO SEU PORTFÓLIO</p>
            <h3 className="onboarding-title">Este é o seu espaço de projetos</h3>
            <p className="onboarding-copy">Crie seu primeiro projeto e monte a matriz de especificações do seu jeito — com as marcas, verbas e cotações reais da sua obra. Ou explore um exemplo pronto para entender as possibilidades.</p>
            <div className="onboarding-actions">
              <button type="button" className="button button-primary" onClick={() => setNewProjectOpen(true)} data-testid="button-onboarding-create"><Plus size={15} /> Criar meu primeiro projeto</button>
              <button type="button" className="button button-quiet" onClick={() => { adoptExample(); setLocation('/projects/casa-serra'); }} data-testid="button-onboarding-example">Começar com um projeto de exemplo <ArrowUpRight size={14} /></button>
            </div>
            <span className="onboarding-hint"><Lightbulb size={13} /> Você pode importar uma planilha (.xlsx ou .csv) ao criar o projeto.</span>
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((project, index) => (
              <ProjectCard project={project} completion={completionOf(project.id)} budgetInfo={budgetOf(project.id)} index={index} onRename={setRenameTarget} onDelete={confirmDelete} key={project.id} />
            ))}
            {!projectsQuery.data && projectsQuery.isLoading && <ProjectSkeleton />}
          </div>
        )}
        {projectCount > 0 && projectsQuery.isError && <div className="query-note" data-testid="status-projects-error">Exibindo a última fotografia salva. <button type="button" onClick={() => projectsQuery.refetch()} data-testid="button-retry-projects">Tentar novamente</button></div>}
      </section>
      {projectCount > 0 && (<>
      <section className="pending-panel stagger-3" data-testid="my-pending-panel">
        <div className="section-heading">
          <div><p className="section-kicker">APROVAÇÕES E REVISÕES</p><h3>Suas pendências {myPending.length > 0 && <span className="pending-count-badge">{myPending.length}</span>}</h3></div>
          <span className="muted-label">Atribuídas a {meName}</span>
        </div>
        {myPending.length === 0 ? (
          <div className="pending-empty"><CheckCircle2 size={18} /> Nenhuma pendência sua. Tudo em dia!</div>
        ) : (
          <div className="pending-list">
            {myPending.map((spec) => (
              <div className="pending-item" key={`${spec.projectId}-${spec.id}`} onClick={() => openPending(spec.projectId, spec)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') openPending(spec.projectId, spec); }} data-testid={`pending-item-${spec.id}`}>
                <span className={`activity-avatar ${spec.status === 'troca' ? 'amber' : 'ink'}`}>{spec.assignedTo.split(' ').map((part) => part[0]).join('')}</span>
                <div className="pending-main">
                  <p className="pending-title"><strong>{spec.item}</strong></p>
                  <span className="pending-meta"><span>{spec.environment}</span><i aria-hidden="true" /><span>{spec.zone}</span></span>
                  <span className="pending-project">{projectName(spec.projectId)}</span>
                </div>
                <span className={`pending-status ${spec.status}`}>{statusLabel(spec.status)}</span>
                <div className="pending-actions">
                  <button type="button" className="button button-quiet button-small" onClick={(event) => { event.stopPropagation(); openPending(spec.projectId, spec); }} data-testid={`approve-pending-${spec.id}`}><ArrowUpRight size={13} /> Revisar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="activity-section compact-activity stagger-4">
        <div className="section-heading"><div><p className="section-kicker">RASTRO RECENTE</p><h3>O que mudou</h3></div><button type="button" className="text-button" data-testid="button-view-activity">Ver atividade completa <ArrowUpRight size={15} /></button></div>
        <div className="activity-list">
          {activity.slice(0, 6).map((entry, index) => (
            <ActivityItem key={`${entry.mark}-${index}`} mark={entry.mark} label={entry.label} action={entry.action} target={entry.target} project={entry.project} time={entry.time} tone={entry.tone} />
          ))}
        </div>
      </section>
      </>)}
      {newProjectOpen && <NewProjectModal onClose={() => setNewProjectOpen(false)} onCreate={onCreateProject} />}
      {renameTarget && <RenameProjectModal project={renameTarget} onClose={() => setRenameTarget(null)} onSave={confirmRename} />}
      {notice && <div className="toast-note page-enter" role="status" data-testid="status-portfolio-toast"><Check size={15} /> {notice}</div>}
    </div>
  );
}

function ProjectCard({ project, completion, budgetInfo, index, onRename, onDelete }: { project: LocalProject; completion: number; budgetInfo: { budget: number; quoted: number; over: boolean }; index: number; onRename: (project: LocalProject) => void; onDelete: (project: LocalProject) => void }) {
  const [, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { budget, quoted, over } = budgetInfo;
  const delta = quoted - budget;
  const budgetPct = budget > 0 ? Math.round((quoted / budget) * 100) : 0;
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);
  return (
    <div className={`project-card ${over ? 'over' : 'under'} page-enter stagger-${Math.min(index + 1, 4)}`} role="link" tabIndex={0} onClick={() => setLocation(`/projects/${project.id}`)} onKeyDown={(event) => { if (event.key === 'Enter') setLocation(`/projects/${project.id}`); }} data-testid={`card-project-${project.id}`}>
      <div className="card-topline">
        <span className="project-number">0{index + 1}</span>
        <span className="card-actions">
          <ArrowUpRight size={17} />
          <span className="card-menu-wrap" ref={menuRef}>
            <button type="button" className="card-menu-button" aria-label={`Opções de ${project.name}`} title="Opções do projeto" onClick={(event) => { event.stopPropagation(); setMenuOpen((current) => !current); }} data-testid={`menu-project-${project.id}`}><MoreHorizontal size={16} /></button>
            {menuOpen && <div className="card-menu">
              <button type="button" onClick={(event) => { event.stopPropagation(); setMenuOpen(false); onRename(project); }} data-testid={`menu-rename-${project.id}`}><Pencil size={14} /> Renomear</button>
              <button type="button" className="danger" onClick={(event) => { event.stopPropagation(); setMenuOpen(false); onDelete(project); }} data-testid={`menu-delete-${project.id}`}><Trash2 size={14} /> Apagar</button>
            </div>}
          </span>
        </span>
      </div>
      <div className="project-card-body">
        <div className="project-type">PROJETO RESIDENCIAL</div>
        <h4>{project.name}</h4>
        <p>{project.client}</p>
        <div className="project-location"><span className="location-pin" /> {project.location}</div>
      </div>
      <div className="project-card-bottom">
        <div className="completion-copy"><span>ESPECIFICAÇÃO</span><strong>{completion}%</strong></div>
        <div className="completion-bar"><span style={{ width: `${completion}%` }} /></div>
        <div className="budget-copy"><span className="budget-label">ORÇAMENTO</span><span className={`card-status ${over ? 'over' : 'under'}`}>{over ? `Estourando ${money(delta)}` : 'Dentro da verba'}</span></div>
        <div className="budget-values"><span>Previsto <b>{money(budget)}</b></span><span>Cotado <b className={over ? 'over' : ''}>{money(quoted)}</b></span></div>
        <div className={`budget-bar ${over ? 'over' : ''}`}><span style={{ width: `${Math.min(budgetPct, 100)}%` }} /></div>
        <div className="project-updated">Atualizado {dateLabel(project.updatedAt)}</div>
      </div>
    </div>
  );
}

function ProjectSkeleton() {
  return <div className="project-card skeleton-card"><div className="skeleton-line w-20" /><div className="skeleton-block" /><div className="skeleton-line w-60" /></div>;
}

function ActivityItem({ mark, label, action, target, project, time, tone }: { mark: string; label: string; action: string; target: string; project: string; time: string; tone: string }) {
  return (
    <div className="activity-item" data-testid={`activity-${mark}`}>
      <span className={`activity-avatar ${tone}`}>{mark}</span>
      <p><strong>{label}</strong> {action} <b>{target}</b><small>{project}</small></p>
      <time>{time}</time>
    </div>
  );
}

function MatrixPage() {
  const { user: authUser } = useAuth();
  const meName = authUser?.name ?? CURRENT_USER;
  const meInitials = authUser?.initials ?? 'MR';
  const { projectId } = useParams<{ projectId?: string }>();
  const { sampleMode, specsByProject, activity, approvalRequest, dismissApproval, requestApproval, localProjects, autoImportProjectId, setAutoImportProjectId, projectNameOverrides, setSpec, addSpecs, removeSpec, seedProject, approveSpec, requestChange, pushActivity, finalizeDraft } = useWorkspace();
  const requestedId = projectId;
  const ownsRequested = Boolean(requestedId) && (sampleMode || localProjects.some((project) => project.id === requestedId));
  const id = ownsRequested ? requestedId! : sampleMode ? 'ed-santa-monica' : (localProjects[0]?.id ?? '');
  const projectQuery = useGetProject(id || 'ed-santa-monica', { query: { queryKey: getGetProjectQueryKey(id || 'ed-santa-monica'), staleTime: 15000 } });
  const createSpecification = useCreateSpecification();
  const updateSpecification = useUpdateSpecification();
  const deleteSpecification = useDeleteSpecification();
  const queryClient = useQueryClient();
  const [overBudgetOnly, setOverBudgetOnly] = useState(false);
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [myPendingOnly, setMyPendingOnly] = useState(false);
  const [sortMode, setSortMode] = useState<'default' | 'risk'>('default');
  const [elementFilter, setElementFilter] = useState('');
  const [dimensionFilter, setDimensionFilter] = useState('');
  const [environmentFilter, setEnvironmentFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterWrapRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [shareState, setShareState] = useState(false);
  const [zone, setZone] = useState<Zone>('Apartamentos');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'Revestimentos': true,
    'Louças e Metais': true,
    'Complementares': true,
  });
  const [changeRequest, setChangeRequest] = useState<MatrixSpec | null>(null);
  const [changeReason, setChangeReason] = useState('');
  const [changeResponsible, setChangeResponsible] = useState('Felipe');
  const [newSpecOpen, setNewSpecOpen] = useState(false);

  const resolvedProject = isProjectDetail(projectQuery.data)
    ? projectQuery.data
    : localProjects.find((item) => item.id === id) ?? FALLBACK_PROJECTS.find((item) => item.id === id) ?? FALLBACK_PROJECTS[0];
  const project = projectNameOverrides[resolvedProject.id] ? { ...resolvedProject, name: projectNameOverrides[resolvedProject.id] } : resolvedProject;

  useEffect(() => {
    if (autoImportProjectId === id) {
      setImportOpen(true);
      setAutoImportProjectId(null);
    }
  }, [autoImportProjectId, id, setAutoImportProjectId]);

  useEffect(() => {
    if (isProjectDetail(projectQuery.data) && !(specsByProject[id]?.length)) {
      seedProject(id, projectQuery.data.specifications.map((row) => ({
        ...row,
        element: 'Elemento',
        revision: 'R01',
        assignedTo: meName,
        status: 'pendente',
        zone: 'Apartamentos',
      })));
    }
  }, [projectQuery.data, specsByProject, id, seedProject]);

  const specs: MatrixSpec[] = specsByProject[id] ?? [];
  const isOverBudget = (row: MatrixSpec) => specTotalValue(row) > specBudgetValue(row);
  const categoryFor = (row: MatrixSpec) => LOUCAS_E_METAIS.includes(row.element) ? 'Louças e Metais' : REVESTIMENTOS.includes(row.element) ? 'Revestimentos' : 'Complementares';
  const zoneSpecs = useMemo(() => specs.filter((row) => row.zone === zone), [specs, zone]);
  const zoneCounts = useMemo(() => ({
    'Apartamentos': specs.filter((row) => row.zone === 'Apartamentos').length,
    'Áreas Comuns': specs.filter((row) => row.zone === 'Áreas Comuns').length,
    'Fachada': specs.filter((row) => row.zone === 'Fachada').length,
  }), [specs]);
  const myPendingCount = useMemo(() => specs.filter((row) => row.assignedTo === meName && isPending(row)).length, [specs, meName]);
  const filtered = useMemo(() => zoneSpecs.filter((row) => [row.environment, row.element, row.item, row.dimension, row.finish, row.brand].join(' ').toLowerCase().includes(search.toLowerCase())), [zoneSpecs, search]);
  const budgetFiltered = useMemo(() => {
    let rows = filtered;
    if (overBudgetOnly) rows = rows.filter(isOverBudget);
    if (myPendingOnly) rows = rows.filter((row) => row.assignedTo === meName && isPending(row));
    if (approvalFilter === 'pending') rows = rows.filter(isPending);
    if (approvalFilter === 'approved') rows = rows.filter((row) => !isPending(row));
    if (elementFilter) rows = rows.filter((row) => row.element.toLowerCase().includes(elementFilter.toLowerCase()));
    if (dimensionFilter) rows = rows.filter((row) => row.dimension.toLowerCase().includes(dimensionFilter.toLowerCase()));
    if (environmentFilter) rows = rows.filter((row) => row.environment.toLowerCase().includes(environmentFilter.toLowerCase()));
    return rows;
  }, [filtered, overBudgetOnly, myPendingOnly, approvalFilter, elementFilter, dimensionFilter, environmentFilter]);
  const ordered = useMemo(() => {
    if (sortMode !== 'risk') return budgetFiltered;
    return [...budgetFiltered].sort((a, b) => ((specTotalValue(b) - specBudgetValue(b)) - (specTotalValue(a) - specBudgetValue(a))));
  }, [budgetFiltered, sortMode]);
  const groupedRows = useMemo(() => ['Revestimentos', 'Louças e Metais', 'Complementares'].map((category) => ({ category, rows: ordered.filter((row) => categoryFor(row) === category) })), [ordered]);
  const totalBudget = zoneSpecs.reduce((sum, row) => sum + specBudgetValue(row), 0);
  const totalQuoted = zoneSpecs.reduce((sum, row) => sum + specTotalValue(row), 0);
  const overBudgetCount = zoneSpecs.filter(isOverBudget).length;
  const activeFilterCount = (overBudgetOnly ? 1 : 0) + (myPendingOnly ? 1 : 0) + (approvalFilter !== 'all' ? 1 : 0) + (elementFilter ? 1 : 0) + (dimensionFilter ? 1 : 0) + (environmentFilter ? 1 : 0);

  const pushNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3200);
  };

  useEffect(() => {
    if (!filtersOpen) return;
    const onDown = (event: MouseEvent) => {
      if (filterWrapRef.current && !filterWrapRef.current.contains(event.target as Node)) setFiltersOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [filtersOpen]);

  const updateLocal = (row: MatrixSpec) => setSpec(id, row);
  const saveRow = (row: MatrixSpec) => {
    const payload: SpecificationInput = { environment: row.environment, item: row.item, dimension: row.dimension, finish: row.finish, brand: row.brand, budget: Number(row.budget) || 0, quotedPrice: Number(row.quotedPrice) || 0, areaTotal: Number(row.areaTotal) || 0 };
    if (row.id.startsWith('draft-')) {
      createSpecification.mutate({ projectId: id, data: payload }, {
        onSuccess: (created) => {
          setSpec(id, { ...created, element: row.element, revision: row.revision, assignedTo: row.assignedTo, status: row.status, zone: row.zone });
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
          pushNotice('Item adicionado à matriz.');
        },
        onError: () => {
          finalizeDraft(id, row);
          pushNotice('Linha salva localmente.');
        },
      });
    } else {
      updateSpecification.mutate({ projectId: id, specificationId: row.id, data: payload }, {
        onSuccess: (updated) => {
          setSpec(id, { ...updated, element: row.element, revision: row.revision, assignedTo: row.assignedTo, status: row.status, zone: row.zone });
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
          pushNotice('Alteração salva.');
        },
        onError: () => pushNotice('Alteração mantida localmente; tente salvar novamente.'),
      });
    }
  };

  const addRow = () => {
    setNewSpecOpen(true);
  };

  const createSpec = (input: { zone: Zone; category: string; environment: string; element: string; item: string; dimension: string; finish: string; brand: string; budget: number; quotedPrice: number; areaTotal: number; responsible: string }) => {
    const draft: MatrixSpec = { id: `draft-${Date.now()}`, environment: input.environment || 'Novo ambiente', item: input.item || 'Novo item', dimension: input.dimension || '—', finish: input.finish || '—', brand: input.brand || 'A definir', budget: input.budget || 0, quotedPrice: input.quotedPrice || 0, areaTotal: input.areaTotal || 0, element: input.element || 'Elemento', revision: 'R01', assignedTo: input.responsible || meName, status: 'pendente', zone: input.zone, updatedAt: new Date().toISOString() };
    addSpecs(id, [draft]);
    setNewSpecOpen(false);
    if (input.zone !== zone) setZone(input.zone);
    pushActivity({ mark: meInitials, label: meName, action: 'cadastrou', target: draft.item, project: project.name, time: 'agora', tone: 'ink' });
    const payload: SpecificationInput = { environment: draft.environment, item: draft.item, dimension: draft.dimension, finish: draft.finish, brand: draft.brand, budget: draft.budget, quotedPrice: draft.quotedPrice, areaTotal: draft.areaTotal };
    createSpecification.mutate({ projectId: id, data: payload }, {
      onSuccess: (created) => {
        setSpec(id, { ...created, element: draft.element, revision: draft.revision, assignedTo: draft.assignedTo, status: draft.status, zone: draft.zone });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
        pushNotice('Especificação cadastrada.');
      },
      onError: () => {
        finalizeDraft(id, draft);
        pushNotice('Linha salva localmente.');
      },
    });
  };

  const approveRow = (row: MatrixSpec) => {
    approveSpec(id, row.id);
    pushActivity({ mark: meInitials, label: meName, action: 'aprovou', target: row.item, project: project.name, time: 'agora', tone: 'ink' });
    dismissApproval();
    pushNotice(`"${row.item}" aprovado.`);
  };

  const openApproval = (row: MatrixSpec) => requestApproval(id, row.id);
  const approvalSpec = useMemo(() => (approvalRequest?.projectId === id ? specs.find((spec) => spec.id === approvalRequest.specId) ?? null : null), [approvalRequest, id, specs]);

  const exportCSV = () => {
    const rows = budgetFiltered.map((row) => [row.environment, row.zone, categoryFor(row), row.element, row.item, row.dimension, row.finish, row.brand, Number(row.budget) || 0, Number(row.quotedPrice) || 0, specArea(row) || '', specTotalValue(row)]);
    const header = ['Ambiente', 'Macrozona', 'Categoria', 'Elemento', 'Item', 'Dimensão', 'Acabamento', 'Marca', 'Verba (R$)', 'Custo Cotado (R$)', 'Área Total', 'Valor Total (R$)'];
    const csv = [header, ...rows].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `matriz-${project.name.toLowerCase().replace(/\s+/g, '-')}-${zone.toLowerCase().replace(/\s+/g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    pushNotice('CSV exportado com os itens visíveis.');
  };

  const removeRow = (row: MatrixSpec) => {
    if (row.id.startsWith('draft-')) {
      removeSpec(id, row.id);
      return;
    }
    if (!window.confirm(`Remover "${row.item}" da matriz?`)) return;
    deleteSpecification.mutate({ projectId: id, specificationId: row.id }, {
      onSuccess: () => {
        removeSpec(id, row.id);
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
        pushNotice('Item removido.');
      },
      onError: () => pushNotice('Não foi possível remover este item.'),
    });
  };

  const importRows = (rows: MatrixSpec[]) => {
    addSpecs(id, rows);
    pushActivity({ mark: meInitials, label: meName, action: 'importou', target: `${rows.length} ${rows.length === 1 ? 'item' : 'itens'} de planilha`, project: project.name, time: 'agora', tone: 'coral' });
    pushNotice(`${rows.length} ${rows.length === 1 ? 'item' : 'itens'} importados para revisão.`);
  };

  const share = async () => {
    try { await navigator.clipboard?.writeText(window.location.href); } catch { /* clipboard can be unavailable in preview */ }
    setShareState(true);
    pushNotice('Link de compartilhamento copiado.');
    window.setTimeout(() => setShareState(false), 2400);
  };

  if (!id) {
    return (
      <div className="page-wrap matrix-page page-enter">
        <div className="matrix-breadcrumb"><Link href="/" data-testid="link-back-portfolio"><ArrowLeft size={14} /> Portfólio</Link></div>
        <div className="useful-empty matrix-empty-gate">
          <div className="empty-orbit"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><FolderKanban size={34} /></div>
          <p className="section-kicker">MATRIZ DE ESPECIFICAÇÕES</p>
          <h2>Você ainda não tem projetos.</h2>
          <p>Crie seu primeiro projeto no portfólio para começar a montar a matriz de especificações com as marcas, verbas e cotações da sua obra.</p>
          <div className="empty-actions">
            <Link href="/" className="button button-primary" data-testid="link-gate-portfolio"><Plus size={15} /> Criar projeto no portfólio</Link>
          </div>
        </div>
      </div>
    );
  }
  if (projectQuery.isLoading && !projectQuery.data && !(specsByProject[id]?.length)) return <MatrixSkeleton />;

  return (
    <div className="page-wrap matrix-page page-enter">
      <div className="matrix-breadcrumb"><Link href="/" data-testid="link-back-portfolio"><ArrowLeft size={14} /> Portfólio</Link><span>/</span><span>{project.name}</span></div>
      <header className="matrix-header">
        <div>
          <div className="project-type">MATRIZ DE ESPECIFICAÇÕES <span className="header-status"><span className="pulse-dot" /> AO VIVO</span></div>
          <h1 className="matrix-title">{project.name}</h1>
          <p className="matrix-subtitle">{project.client} <span>·</span> {project.location} <span>·</span> última edição há 18 min</p>
        </div>
        <div className="matrix-header-actions">
          <button type="button" className="button button-quiet" onClick={share} data-testid="button-share-project"><Share2 size={15} /> {shareState ? 'Link copiado' : 'Compartilhar'}</button>
          <button type="button" className="button button-quiet" onClick={exportCSV} data-testid="button-export-csv"><Download size={15} /> Exportar CSV</button>
          <button type="button" className="button button-quiet" onClick={() => window.print()} data-testid="button-export-print"><Printer size={15} /> Imprimir</button>
        </div>
      </header>
       <BudgetHealthPanel totalBudget={totalBudget} totalQuoted={totalQuoted} overBudgetCount={overBudgetCount} linesCount={zoneSpecs.length} zoneLabel={zone} />
       <section className="matrix-zones" role="tablist" aria-label="Zona do projeto">
         {(['Apartamentos', 'Áreas Comuns', 'Fachada'] as const).map((item) => <button type="button" key={item} className={zone === item ? 'selected' : ''} onClick={() => setZone(item)} data-testid={`button-zone-${item}`}>{item}<span className="zone-count">{zoneCounts[item]}</span></button>)}
       </section>
       <section className="matrix-toolbar">
        <div className="toolbar-left">
          <button type="button" className={overBudgetOnly ? 'over-filter active' : 'over-filter'} onClick={() => setOverBudgetOnly((current) => !current)} aria-pressed={overBudgetOnly} data-testid="button-over-budget-filter"><span className="over-filter-dot" /> {overBudgetOnly ? 'Ver todos os itens' : 'Ver apenas estouros'}</button>
          <button type="button" className={myPendingOnly ? 'my-pending-filter active' : 'my-pending-filter'} onClick={() => setMyPendingOnly((current) => !current)} aria-pressed={myPendingOnly} data-testid="button-my-pending"><span className="my-pending-dot" /> Suas pendências{myPendingCount > 0 && <span className="filter-count my-pending-count">{myPendingCount}</span>}</button>
          <label className="sort-select-wrap"><span className="sr-only">Ordenar por</span><select className="sort-select" value={sortMode} onChange={(event) => setSortMode(event.target.value as 'default' | 'risk')} data-testid="select-sort"><option value="default">Padrão</option><option value="risk">Maior estouro</option></select><ChevronDown size={13} /></label>
        </div>
        <div className="toolbar-right">
          <label className="search-box"><Search size={15} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar item, marca..." aria-label="Buscar especificações" data-testid="input-search-specs" />{search && <IconButton label="Limpar busca" testId="button-clear-search" onClick={() => setSearch('')}><X size={13} /></IconButton>}</label>
          <div className="filter-wrap" ref={filterWrapRef}>
            <button type="button" className="button button-quiet filter-button" onClick={() => setFiltersOpen((current) => !current)} aria-expanded={filtersOpen} data-testid="button-filter-specs"><SlidersHorizontal size={15} /> Filtros {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}</button>
            {filtersOpen && <div className="filter-menu">
              <p className="filter-menu-label">APROVAÇÃO</p>
              <div className="filter-options">
                {([['all', 'Todas'], ['pending', 'Pendente'], ['approved', 'Aprovada']] as const).map(([value, label]) => <button type="button" key={value} className={approvalFilter === value ? 'selected' : ''} onClick={() => setApprovalFilter(value)} data-testid={`filter-approval-${value}`}>{label}</button>)}
              </div>
              <p className="filter-menu-label">ELEMENTO</p>
              <input type="text" className="filter-text" value={elementFilter} onChange={(event) => setElementFilter(event.target.value)} placeholder="Ex: Piso, Torneira" data-testid="input-filter-element" />
              <p className="filter-menu-label">DIMENSÃO</p>
              <input type="text" className="filter-text" value={dimensionFilter} onChange={(event) => setDimensionFilter(event.target.value)} placeholder="Ex: 90x90 cm" data-testid="input-filter-dimension" />
              <p className="filter-menu-label">AMBIENTE</p>
              <input type="text" className="filter-text" value={environmentFilter} onChange={(event) => setEnvironmentFilter(event.target.value)} placeholder="Ex: Cozinha" data-testid="input-filter-environment" />
              <button type="button" className="filter-clear" onClick={() => { setApprovalFilter('all'); setElementFilter(''); setDimensionFilter(''); setEnvironmentFilter(''); setOverBudgetOnly(false); }} data-testid="button-clear-filters">Limpar filtros</button>
            </div>}
          </div>
          <button type="button" className="button button-quiet" onClick={() => setImportOpen(true)} data-testid="button-open-import"><Upload size={15} /> Importar</button>
          <button type="button" className="button button-primary" onClick={addRow} data-testid="button-add-spec"><Plus size={15} /> Adicionar linha</button>
        </div>
      </section>
      {projectQuery.isError && <div className="query-note matrix-error" data-testid="status-project-error">A API não respondeu. Você está vendo a última fotografia disponível. <button type="button" onClick={() => projectQuery.refetch()} data-testid="button-retry-project">Tentar novamente</button></div>}
      {budgetFiltered.length ? <SpecificationTable groups={groupedRows} openCategories={openCategories} onToggleCategory={(category) => setOpenCategories((current) => ({ ...current, [category]: !current[category] }))} onChange={updateLocal} onSave={saveRow} onDelete={removeRow} onRequestChange={setChangeRequest} onOpenApproval={openApproval} /> : (
        <div className="empty-search"><PackageSearch size={26} /><strong>{filtered.length ? 'Nenhum item com os filtros aplicados' : 'Nenhuma especificação nesta zona'}</strong><span>{filtered.length ? 'Ajuste os filtros para ver mais itens.' : 'Cadastre uma nova especificação para começar.'}</span></div>
      )}
      <footer className="matrix-footer"><span><span className="legend-dot green" /> Dentro da verba <span className="legend-dot red" /> Acima da verba</span><span className="font-mono-ui">{budgetFiltered.length} itens visíveis · Última sincronização 09:38:12</span></footer>
      <MatrixActivity entries={activity.filter((entry) => entry.project === project.name)} projectName={project.name} />
      {notice && <div className="toast-note page-enter" role="status" data-testid="status-matrix-toast"><Check size={15} /> {notice}</div>}
      {importOpen && <ImportModal currentUser={meName} onClose={() => setImportOpen(false)} onImport={importRows} />}
      {newSpecOpen && <NewSpecModal defaultResponsible={meName} defaultZone={zone} onClose={() => setNewSpecOpen(false)} onSubmit={createSpec} />}
      {approvalSpec && <ApprovalModal spec={approvalSpec} projectName={project.name} onClose={dismissApproval} onApprove={approveRow} />}
      {changeRequest && <ChangeRequestModal row={changeRequest} reason={changeReason} responsible={changeResponsible} onReasonChange={setChangeReason} onResponsibleChange={setChangeResponsible} onClose={() => { setChangeRequest(null); setChangeReason(''); }} onSubmit={() => { const row = changeRequest; setChangeRequest(null); setChangeReason(''); requestChange(id, row.id, changeResponsible); pushActivity({ mark: meInitials, label: meName, action: 'solicitou troca em', target: row.item, project: project.name, time: 'agora', tone: 'amber' }); pushNotice(`Solicitação de troca enviada para ${changeResponsible}.`); }} />}
    </div>
  );
}

function EditableCell({ value, onChange, onCommit, numeric, testId }: { value: string | number; onChange: (value: string) => void; onCommit: () => void; numeric?: boolean; testId: string }) {
  return <input className={`editable-cell ${numeric ? 'numeric-cell' : ''}`} type={numeric ? 'number' : 'text'} value={value} onChange={(event) => onChange(event.target.value)} onBlur={onCommit} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} data-testid={testId} />;
}

function AutoTextarea({ value, onChange, onCommit, testId }: { value: string; onChange: (value: string) => void; onCommit: () => void; testId: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const doResize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);
  useEffect(() => {
    doResize();
    const el = ref.current;
    if (!el) return;
    let lastWidth = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth !== lastWidth) {
        lastWidth = el.clientWidth;
        doResize();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, doResize]);
  return <textarea ref={ref} rows={1} className="editable-cell item-input" value={value} onChange={(event) => onChange(event.target.value)} onInput={doResize} onBlur={onCommit} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) event.currentTarget.blur(); }} data-testid={testId} />;
}

function ElementGlyph({ element }: { element: string }) {
  const Icon = ELEMENT_ICONS[element] ?? Box;
  return <Icon size={15} strokeWidth={1.9} />;
}

function SpecificationTable({ groups, openCategories, onToggleCategory, onChange, onSave, onDelete, onRequestChange, onOpenApproval }: { groups: { category: string; rows: MatrixSpec[] }[]; openCategories: Record<string, boolean>; onToggleCategory: (category: string) => void; onChange: (row: MatrixSpec) => void; onSave: (row: MatrixSpec) => void; onDelete: (row: MatrixSpec) => void; onRequestChange: (row: MatrixSpec) => void; onOpenApproval: (row: MatrixSpec) => void }) {
  const edit = (row: MatrixSpec, key: keyof MatrixSpec, value: string) => onChange({ ...row, [key]: key === 'budget' || key === 'quotedPrice' || key === 'areaTotal' ? Number(value) : value });
  const deltaLabel = (row: MatrixSpec) => {
    const delta = specBudgetValue(row) - specTotalValue(row);
    if (delta > 0) return `+${BRL_NUM.format(delta)}`;
    if (delta < 0) return `−${BRL_NUM.format(-delta)}`;
    return '—';
  };
  const deltaClass = (row: MatrixSpec) => {
    const delta = specBudgetValue(row) - specTotalValue(row);
    return delta < 0 ? 'delta-over' : delta > 0 ? 'delta-under' : 'delta-zero';
  };
  const groupByEnvironment = (rows: MatrixSpec[]) => {
    const order: string[] = [];
    const map = new Map<string, MatrixSpec[]>();
    for (const row of rows) {
      if (!map.has(row.environment)) {
        map.set(row.environment, []);
        order.push(row.environment);
      }
      map.get(row.environment)!.push(row);
    }
    return order.map((environment) => ({ environment, rows: map.get(environment)! }));
  };
  const envTotals = (rows: MatrixSpec[]) => {
    const budget = rows.reduce((sum, row) => sum + specBudgetValue(row), 0);
    const quoted = rows.reduce((sum, row) => sum + specTotalValue(row), 0);
    return { budget, quoted, delta: budget - quoted };
  };
  return (
    <div className="table-frame">
      <div className="spec-table">
        <div className="spec-head-row">
          <div className="head-env">Ambiente</div>
          <div className="head-rest">
            <div>Elemento</div><div>Item / Descrição</div><div>Dimensão</div><div>Acabamento</div><div>Valor Previsto (R$)</div><div>Custo Cotado (R$)</div><div>Área Total</div><div>Valor Total (R$)</div><div>Δ (R$)</div><div>Aprovação</div><div>Ações</div>
          </div>
        </div>
        {groups.map(({ category, rows }) => <Fragment key={category}>
          {(() => {
            const cat = envTotals(rows);
            return (
              <button type="button" className="spec-category" onClick={() => onToggleCategory(category)} aria-expanded={openCategories[category]}><ChevronDown size={15} className={openCategories[category] ? '' : 'collapsed'} /><span>{category}</span><small><span className="cat-count">{rows.length} {rows.length === 1 ? 'item' : 'itens'}</span><span className="cat-budget">{money(cat.quoted)} <i>de</i> {money(cat.budget)}</span><span className={`delta-value ${cat.delta < 0 ? 'delta-over' : cat.delta > 0 ? 'delta-under' : 'delta-zero'}`}>{cat.delta === 0 ? '—' : `${cat.delta < 0 ? '−' : '+'}${BRL_NUM.format(Math.abs(cat.delta))}`}</span></small></button>
            );
          })()}
          {openCategories[category] && groupByEnvironment(rows).map(({ environment, rows: envRows }) => {
            const totals = envTotals(envRows);
            return (
              <div className="spec-env-block" key={environment}>
                <div className={`env-cell ${totals.delta < 0 ? 'env-over' : 'env-under'}`}>
                  <strong>{environment}</strong>
                  <small>{envRows.length} {envRows.length === 1 ? 'item' : 'itens'}</small>
                  <span className={`env-delta ${totals.delta < 0 ? 'delta-over' : totals.delta > 0 ? 'delta-under' : 'delta-zero'}`}>{totals.delta === 0 ? '—' : `${totals.delta < 0 ? '−' : '+'}${BRL_NUM.format(Math.abs(totals.delta))}`}</span>
                </div>
                <div className="env-rows">
                  {envRows.map((row) => {
                    const under = specTotalValue(row) <= specBudgetValue(row);
                    const approved = row.status === 'aprovado';
                    return (
                      <div className="spec-row" role="row" key={row.id} data-testid={`row-spec-${row.id}`}>
                        <div className="element-cell"><Tooltip delayDuration={150}><TooltipTrigger asChild><span className="element-icon" data-testid={`icon-element-${row.id}`}><ElementGlyph element={row.element} /></span></TooltipTrigger><TooltipContent side="right">{row.element}</TooltipContent></Tooltip></div>
                        <div className="item-cell"><AutoTextarea value={row.item} onChange={(value) => edit(row, 'item', value)} onCommit={() => onSave(row)} testId={`input-item-${row.id}`} /></div>
                        <div><EditableCell value={row.dimension} onChange={(value) => edit(row, 'dimension', value)} onCommit={() => onSave(row)} testId={`input-dimension-${row.id}`} /></div>
                        <div><EditableCell value={row.finish} onChange={(value) => edit(row, 'finish', value)} onCommit={() => onSave(row)} testId={`input-finish-${row.id}`} /></div>
                        <div><EditableCell value={row.budget} onChange={(value) => edit(row, 'budget', value)} onCommit={() => onSave(row)} numeric testId={`input-budget-${row.id}`} /></div>
                        <div><span className={`price-inline ${under ? 'price-under' : 'price-over'}`}><EditableCell value={row.quotedPrice} onChange={(value) => edit(row, 'quotedPrice', value)} onCommit={() => onSave(row)} numeric testId={`input-quoted-${row.id}`} /></span></div>
                        <div><EditableCell value={row.areaTotal ?? ''} onChange={(value) => edit(row, 'areaTotal', value)} onCommit={() => onSave(row)} numeric testId={`input-area-${row.id}`} /></div>
                        <div>{specArea(row) > 0 ? <span className="total-value price-inline"><strong>{money(specTotalValue(row))}</strong></span> : <span className="total-value-empty">—</span>}</div>
                        <div><span className={`delta-value ${deltaClass(row)}`}>{deltaLabel(row)}</span></div>
                        <div>{approved ? <Tooltip delayDuration={150}><TooltipTrigger asChild><span className="approve-icon ok" data-testid={`approve-ok-${row.id}`}><CheckCircle2 size={14} /></span></TooltipTrigger><TooltipContent side="right">Aprovado por {row.assignedTo}</TooltipContent></Tooltip> : <Tooltip delayDuration={150}><TooltipTrigger asChild><button type="button" className="approve-icon pending approve-action" title={`Revisar ${row.item}`} onClick={() => onOpenApproval(row)} data-testid={`button-approve-${row.id}`}><Clock size={14} /></button></TooltipTrigger><TooltipContent side="right">Revisar aprovação — responsável: {row.assignedTo}</TooltipContent></Tooltip>}</div>
                        <div className="row-actions"><IconButton label="Solicitar troca" className="change-icon" testId={`button-request-change-${row.id}`} onClick={() => onRequestChange(row)}><ArrowLeftRight size={14} /></IconButton>{row.id.startsWith('draft-') && <Tooltip delayDuration={150}><TooltipTrigger asChild><button type="button" className="save-row save-row-action" title="Salvar linha na matriz" onClick={() => onSave(row)} data-testid={`button-save-row-${row.id}`}><Check size={14} /></button></TooltipTrigger><TooltipContent side="right">Salvar esta linha na matriz</TooltipContent></Tooltip>}<IconButton label={`Remover ${row.item}`} className="delete-row" testId={`button-delete-row-${row.id}`} onClick={() => onDelete(row)}><Trash2 size={14} /></IconButton></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </Fragment>)}
      </div>
    </div>
  );
}

function BudgetHealthPanel({ totalBudget, totalQuoted, overBudgetCount, linesCount, zoneLabel }: { totalBudget: number; totalQuoted: number; overBudgetCount: number; linesCount: number; zoneLabel: string }) {
  const delta = totalQuoted - totalBudget;
  const over = delta > 0;
  return (
    <section className={`budget-health ${over ? 'is-over' : 'is-under'}`} aria-label="Saúde orçamentária" data-testid="budget-health">
      <div className="budget-health-head">
        <span className="budget-health-title">SAÚDE ORÇAMENTÁRIA · {zoneLabel.toUpperCase()}</span>
        <span className={`budget-status-pill ${over ? 'over' : 'under'}`}>
          {over ? <AlertTriangle size={12} strokeWidth={2.5} /> : <CheckCircle2 size={12} strokeWidth={2.5} />}
          {over ? `${overBudgetCount} ${overBudgetCount === 1 ? 'item' : 'itens'} acima da verba` : 'Dentro da verba'}
        </span>
      </div>
      <div className="budget-health-metrics">
        <div className="health-metric"><span>CUSTO PREVISTO</span><strong className="health-budget">{money(totalBudget)}</strong><small>{linesCount} linhas mapeadas</small></div>
        <div className="health-metric"><span>VALOR TOTAL (COTADO)</span><strong className="health-quoted">{money(totalQuoted)}</strong><small>soma dos valores totais</small></div>
        <div className="health-metric"><span>{over ? 'ESTOURO' : 'SALDO'}</span><strong className={`health-delta ${over ? 'over' : 'under'}`}>{over ? <AlertTriangle size={16} strokeWidth={2.5} /> : <CheckCircle2 size={16} strokeWidth={2.5} />}{over ? `−${money(delta)}` : `+${money(-delta)}`}</strong><small>{over ? 'compromete o orçamento' : 'folga disponível'}</small></div>
      </div>
    </section>
  );
}

function MatrixActivity({ entries, projectName }: { entries: ActivityEntry[]; projectName: string }) {
  return (
    <section className="activity-section matrix-activity">
      <div className="section-heading">
        <div><p className="section-kicker">RASTRO DE ALTERAÇÕES</p><h3>O que mudou</h3></div>
        <button type="button" className="text-button" data-testid="button-matrix-activity-all">Ver atividade completa <ArrowUpRight size={15} /></button>
      </div>
      <div className="activity-list">
        {entries.map((entry, index) => (
          <ActivityItem key={`${entry.mark}-${index}`} mark={entry.mark} label={entry.label} action={entry.action} target={entry.target} project={projectName} time={entry.time} tone={entry.tone} />
        ))}
      </div>
    </section>
  );
}

function ModalShell({ children }: { children: ReactNode }) {
  return createPortal(<div className="modal-backdrop" role="presentation">{children}</div>, document.body);
}

function ImportModal({ currentUser = CURRENT_USER, onClose, onImport }: { currentUser?: string; onClose: () => void; onImport: (rows: MatrixSpec[]) => void }) {
  const [rows, setRows] = useState<MatrixSpec[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'idle' | 'ready' | 'done'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError('');
    try {
      let jsonRows: Record<string, unknown>[];
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        jsonRows = parseCsvText(text);
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      }
      const parsed = parseWorkbookRows(jsonRows, currentUser);
      if (!parsed.length) {
        setError('A planilha parece estar vazia.');
        return;
      }
      const hasRecognizable = parsed.some((spec) => spec.item !== 'Item não informado' || spec.environment !== 'Ambiente não informado');
      if (!hasRecognizable) {
        setError('Não reconhecemos as colunas da planilha. Use cabeçalhos como: Ambiente, Elemento, Item, Marca, Verba, Cotado.');
        return;
      }
      setRows(parsed);
      setFileName(file.name);
      setStep('ready');
    } catch {
      setError('Não foi possível ler este arquivo. Use um arquivo .xlsx ou .csv.');
    }
  };

  const incompleteCount = (rows ?? []).filter((spec) => specCompletion([spec]) < 100).length;

  return (
    <ModalShell>
      <div className="import-modal import-modal-wide page-enter" role="dialog" aria-modal="true" aria-labelledby="import-title">
        <div className="modal-top"><div><p className="section-kicker">ENTRADA DE DADOS</p><h2 id="import-title">Importar planilha de especificações</h2></div><IconButton label="Fechar modal" testId="button-close-import" onClick={onClose}><X size={18} /></IconButton></div>
        {step === 'idle' && <>
          <label className="drop-zone" htmlFor="import-file"><CloudUpload size={30} /><strong>Solte sua planilha aqui</strong><span>ou selecione um arquivo do computador (.xlsx ou .csv)</span><input id="import-file" ref={fileInputRef} type="file" accept=".xlsx,.csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) handleFile(file); }} data-testid="input-import-file" /></label>
          <div className="modal-footnote"><FileSpreadsheet size={15} /> A primeira linha deve conter os nomes das colunas (Ambiente, Elemento, Item, Dimensão, Acabamento, Marca, Verba, Cotado).</div>
          {error && <div className="import-error">{error}</div>}
        </>}
        {step === 'ready' && rows && <div className="import-ready">
          <div className="import-file"><FileSpreadsheet size={20} /><span><strong>{fileName}</strong><small>{rows.length} {rows.length === 1 ? 'linha encontrada' : 'linhas encontradas'} · pronta para revisão</small></span><Check size={17} /></div>
          <div className="import-preview">
            <span>PRÉVIA DA LEITURA</span>
            <strong>{rows.length} {rows.length === 1 ? 'item' : 'itens'} serão adicionados</strong>
            <p>{incompleteCount > 0 ? `${incompleteCount} ${incompleteCount === 1 ? 'item está incompleto' : 'itens estão incompletos'} e ficarão marcados para revisão.` : 'Todos os itens estão completos.'}</p>
          </div>
          <div className="import-table-preview">
            <div className="import-preview-row import-preview-head"><span>Ambiente</span><span>Elemento</span><span>Item / Descrição</span><span>Verba (R$)</span><span>Cotado (R$)</span></div>
            {rows.slice(0, 12).map((spec) => (
              <div className={`import-preview-row ${specCompletion([spec]) < 100 ? 'incomplete' : ''}`} key={spec.id}><span>{spec.environment}</span><span>{spec.element}</span><span>{spec.item}</span><span>{BRL_NUM.format(spec.budget)}</span><span>{BRL_NUM.format(spec.quotedPrice)}</span></div>
            ))}
            {rows.length > 12 && <div className="import-preview-row muted">… e mais {rows.length - 12} linhas</div>}
          </div>
          <div className="import-ready-actions"><button type="button" className="button button-quiet" onClick={() => { setRows(null); setFileName(''); setStep('idle'); if (fileInputRef.current) fileInputRef.current.value = ''; }}>Escolher outro arquivo</button><button type="button" className="button button-primary full-button" onClick={() => { onImport(rows); setStep('done'); }} data-testid="button-confirm-import"><Download size={15} /> Adicionar à matriz</button></div>
        </div>}
        {step === 'done' && <div className="import-done"><span className="done-mark"><Check size={28} /></span><h3>Importação concluída</h3><p>As linhas foram adicionadas no topo da matriz e estão prontas para revisão.</p><button type="button" className="button button-primary full-button" onClick={onClose} data-testid="button-finish-import">Voltar à matriz</button></div>}
      </div>
    </ModalShell>
  );
}

function ChangeRequestModal({ row, reason, responsible, onReasonChange, onResponsibleChange, onClose, onSubmit }: { row: MatrixSpec; reason: string; responsible: string; onReasonChange: (value: string) => void; onResponsibleChange: (value: string) => void; onClose: () => void; onSubmit: () => void }) {
  return (
    <ModalShell>
      <div className="import-modal change-request-modal page-enter" role="dialog" aria-modal="true" aria-labelledby="change-request-title">
        <div className="modal-top"><div><p className="section-kicker">FLUXO DE APROVAÇÃO</p><h2 id="change-request-title">Solicitar troca</h2></div><IconButton label="Fechar solicitação" testId="button-close-change-request" onClick={onClose}><X size={18} /></IconButton></div>
        <div className="change-comparison">
          <div><span>ITEM ATUAL</span><strong>{row.item}</strong><small>{row.brand} · {money(Number(row.quotedPrice))}</small></div>
          <ArrowUpRight size={18} />
          <div><span>ITEM PROPOSTO</span><strong>A definir</strong><small>Informe o novo item após enviar</small></div>
        </div>
        <div className="cost-difference"><span>Diferença estimada</span><strong className={Number(row.quotedPrice) > Number(row.budget) ? 'over-text' : 'under-text'}>{Number(row.quotedPrice) > Number(row.budget) ? '+' : '-'}{money(Math.abs(Number(row.quotedPrice) - Number(row.budget)))}</strong></div>
        <label className="reason-field"><span>Pessoa / setor responsável</span><select value={responsible} onChange={(event) => onResponsibleChange(event.target.value)} data-testid="select-change-responsible"><option value="Marina Reis">Marina Reis (Arquitetura)</option><option value="Felipe">Felipe (Orçamento)</option><option value="Lucas">Lucas (Projeto)</option></select></label>
        <label className="reason-field"><span>Motivo da solicitação</span><textarea value={reason} onChange={(event) => onReasonChange(event.target.value)} placeholder="Explique por que este item precisa ser substituído." data-testid="input-change-reason" /></label>
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancelar</button><button type="button" className="button button-primary" onClick={onSubmit} disabled={!reason.trim()} data-testid="button-submit-change-request">Enviar para Aprovação Simultânea</button></div>
      </div>
    </ModalShell>
  );
}

function NewSpecModal({ defaultResponsible = CURRENT_USER, defaultZone, onClose, onSubmit }: { defaultResponsible?: string; defaultZone: Zone; onClose: () => void; onSubmit: (input: { zone: Zone; category: string; environment: string; element: string; item: string; dimension: string; finish: string; brand: string; budget: number; quotedPrice: number; areaTotal: number; responsible: string }) => void }) {
  const { specsByProject } = useWorkspace();
  const [form, setForm] = useState({ zone: defaultZone, category: 'Revestimentos', environment: '', element: '', item: '', dimension: '', finish: '', brand: '', budget: '', quotedPrice: '', areaTotal: '', responsible: defaultResponsible });
  const elementOptions = useMemo(() => {
    const used = Object.values(specsByProject).flat().map((row) => row.element).filter((value): value is string => Boolean(value && value.trim()));
    return Array.from(new Set([...used, ...Object.keys(ELEMENT_ICONS)]));
  }, [specsByProject]);
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const valid = form.item.trim().length > 0 && form.element.trim().length > 0;
  const submit = () => onSubmit({ ...form, zone: form.zone as Zone, budget: Number(form.budget) || 0, quotedPrice: Number(form.quotedPrice) || 0, areaTotal: Number(form.areaTotal) || 0 });

  const matchedProduct = useMemo(() => {
    const brand = form.brand.trim();
    const item = form.item.trim();
    if (!brand || !item) return null;
    const bn = normalizeHeader(brand);
    const inn = normalizeHeader(item);
    for (const specs of Object.values(specsByProject)) {
      const found = specs.find((spec) => normalizeHeader(spec.brand || '') === bn && normalizeHeader(spec.item || '') === inn);
      if (found) return found;
    }
    return null;
  }, [form.brand, form.item, specsByProject]);

  useEffect(() => {
    if (!matchedProduct) return;
    setForm((current) => ({
      ...current,
      dimension: matchedProduct.dimension || current.dimension,
      finish: matchedProduct.finish || current.finish,
      quotedPrice: matchedProduct.quotedPrice ? String(matchedProduct.quotedPrice) : current.quotedPrice,
      areaTotal: matchedProduct.areaTotal ? String(matchedProduct.areaTotal) : current.areaTotal,
    }));
  }, [matchedProduct]);

  return (
    <ModalShell>
      <div className="import-modal new-spec-modal page-enter" role="dialog" aria-modal="true" aria-labelledby="new-spec-title">
        <div className="modal-top"><div><p className="section-kicker">MATRIZ DE ESPECIFICAÇÕES</p><h2 id="new-spec-title">Cadastrar nova especificação</h2></div><IconButton label="Fechar" testId="button-close-new-spec" onClick={onClose}><X size={18} /></IconButton></div>
        {matchedProduct && <div className="spec-match-note"><CheckCircle2 size={14} /> Preenchido do cadastro: <b>{matchedProduct.item}</b> · {matchedProduct.brand} · {money(Number(matchedProduct.quotedPrice))}</div>}
        <div className="spec-form">
          <label className="spec-form-field"><span>Macrozona</span><select value={form.zone} onChange={(event) => set('zone', event.target.value)} data-testid="input-new-zone"><option value="Apartamentos">Apartamentos</option><option value="Áreas Comuns">Áreas Comuns</option><option value="Fachada">Fachada</option></select></label>
          <label className="spec-form-field"><span>Categoria</span><select value={form.category} onChange={(event) => set('category', event.target.value)} data-testid="input-new-category"><option>Revestimentos</option><option>Louças e Metais</option><option>Complementares</option></select></label>
          <label className="spec-form-field"><span>Ambiente</span><input value={form.environment} onChange={(event) => set('environment', event.target.value)} placeholder="Ex: Cozinha" data-testid="input-new-environment" /></label>
          <label className="spec-form-field"><span>Elemento</span><select value={form.element} onChange={(event) => set('element', event.target.value)} data-testid="input-new-element"><option value="" disabled>Selecione um elemento</option>{elementOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label className="spec-form-field"><span>Item / Descrição *</span><input value={form.item} onChange={(event) => set('item', event.target.value)} placeholder="Ex: Porcelanato Bianco Covelano" data-testid="input-new-item" /></label>
          <label className="spec-form-field"><span>Dimensão</span><input value={form.dimension} onChange={(event) => set('dimension', event.target.value)} placeholder="Ex: 90x90 cm" data-testid="input-new-dimension" /></label>
          <label className="spec-form-field"><span>Acabamento</span><input value={form.finish} onChange={(event) => set('finish', event.target.value)} placeholder="Ex: Nat. Retificado" data-testid="input-new-finish" /></label>
          <label className="spec-form-field"><span>Marca / Fornecedor</span><input value={form.brand} onChange={(event) => set('brand', event.target.value)} placeholder="Ex: Portobello" data-testid="input-new-brand" /></label>
          <label className="spec-form-field"><span>Responsável pela aprovação</span><select value={form.responsible} onChange={(event) => set('responsible', event.target.value)} data-testid="input-new-responsible">{!['Marina Reis', 'Felipe', 'Lucas', 'André Ribeiro', 'Carla Souza'].includes(defaultResponsible) && <option value={defaultResponsible}>{defaultResponsible}</option>}<option value="Marina Reis">Marina Reis</option><option value="Felipe">Felipe</option><option value="Lucas">Lucas</option><option value="André Ribeiro">André Ribeiro</option><option value="Carla Souza">Carla Souza</option></select></label>
          <label className="spec-form-field"><span>Verba prevista (R$)</span><input type="number" value={form.budget} onChange={(event) => set('budget', event.target.value)} placeholder="0,00" data-testid="input-new-budget" /></label>
          <label className="spec-form-field"><span>Preço cotado (R$)</span><input type="number" value={form.quotedPrice} onChange={(event) => set('quotedPrice', event.target.value)} placeholder="0,00" data-testid="input-new-quoted" /></label>
          <label className="spec-form-field"><span>Área total (opcional)</span><input type="number" value={form.areaTotal} onChange={(event) => set('areaTotal', event.target.value)} placeholder="Ex: 38" data-testid="input-new-area" /></label>
        </div>
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancelar</button><button type="button" className="button button-primary" onClick={submit} disabled={!valid} data-testid="button-submit-new-spec">Adicionar à matriz</button></div>
      </div>
    </ModalShell>
  );
}

function ApprovalModal({ spec, projectName, onClose, onApprove }: { spec: MatrixSpec; projectName: string; onClose: () => void; onApprove: (spec: MatrixSpec) => void }) {
  const under = Number(spec.quotedPrice) <= Number(spec.budget);
  const delta = Number(spec.quotedPrice) - Number(spec.budget);
  const statusLabel = spec.status === 'troca' ? 'Solicitação de troca' : spec.status === 'revisao' ? 'Revisão pendente' : 'Aprovação pendente';
  return (
    <ModalShell>
      <div className="import-modal approval-modal page-enter" role="dialog" aria-modal="true" aria-labelledby="approval-title">
        <div className="modal-top"><div><p className="section-kicker">APROVAÇÃO</p><h2 id="approval-title">{statusLabel}</h2></div><IconButton label="Fechar" testId="button-close-approval" onClick={onClose}><X size={18} /></IconButton></div>
        <div className="approval-item-head">
          <span className="element-icon"><ElementGlyph element={spec.element} /></span>
          <div><strong>{spec.item}</strong><small>{spec.environment} · {spec.zone} · {projectName}</small></div>
        </div>
        <dl className="approval-details">
          <div><dt>Elemento</dt><dd>{spec.element}</dd></div>
          <div><dt>Marca / Fornecedor</dt><dd>{spec.brand}</dd></div>
          <div><dt>Dimensão</dt><dd>{spec.dimension}</dd></div>
          <div><dt>Acabamento</dt><dd>{spec.finish}</dd></div>
          <div><dt>Custo previsto</dt><dd>{money(Number(spec.budget))}</dd></div>
          <div><dt>Cotado</dt><dd className={under ? 'under-text' : 'over-text'}>{money(Number(spec.quotedPrice))}</dd></div>
          <div><dt>Δ</dt><dd className={delta > 0 ? 'over-text' : 'under-text'}>{delta === 0 ? '—' : `${delta > 0 ? '+' : '−'}${BRL_NUM.format(Math.abs(delta))}`}</dd></div>
          <div><dt>Responsável</dt><dd>{spec.assignedTo}</dd></div>
        </dl>
        {spec.status === 'troca' && <div className="approval-note"><AlertTriangle size={14} /> Solicitação de troca — um novo item será proposto pelo responsável.</div>}
        <div className="modal-actions">
          <button type="button" className="button button-quiet" onClick={onClose}>Agora não</button>
          <button type="button" className="button button-primary" onClick={() => onApprove(spec)} data-testid="button-approve-modal"><Check size={15} /> Aprovar especificação</button>
        </div>
      </div>
    </ModalShell>
  );
}

function NewProjectModal({ onClose, onCreate }: { onClose: () => void; onCreate: (input: { name: string; client: string; location: string; startWith: 'blank' | 'import' }) => void }) {
  const [form, setForm] = useState({ name: '', client: '', location: '', startWith: 'blank' as 'blank' | 'import' });
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const valid = form.name.trim().length > 0;
  return (
    <ModalShell>
      <div className="import-modal new-project-modal page-enter" role="dialog" aria-modal="true" aria-labelledby="new-project-title">
        <div className="modal-top"><div><p className="section-kicker">PORTFÓLIO</p><h2 id="new-project-title">Criar novo projeto</h2></div><IconButton label="Fechar" testId="button-close-new-project" onClick={onClose}><X size={18} /></IconButton></div>
        <div className="spec-form">
          <label className="spec-form-field spec-form-field-wide"><span>Nome do empreendimento *</span><input value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="Ex: Torre Primavera" data-testid="input-new-project-name" /></label>
          <label className="spec-form-field"><span>Construtora / cliente</span><input value={form.client} onChange={(event) => set('client', event.target.value)} placeholder="Ex: Construtora Horizonte" data-testid="input-new-project-client" /></label>
          <label className="spec-form-field"><span>Localização</span><input value={form.location} onChange={(event) => set('location', event.target.value)} placeholder="Ex: São Paulo, SP" data-testid="input-new-project-location" /></label>
        </div>
        <div className="project-start-field">
          <span>Ponto de partida</span>
          <div className="project-start-options">
            <button type="button" className={form.startWith === 'blank' ? 'selected' : ''} onClick={() => set('startWith', 'blank')} data-testid="start-blank"><span className="start-radio" /> <span><strong>Grade em branco</strong><small>Você cadastra as especificações do zero</small></span></button>
            <button type="button" className={form.startWith === 'import' ? 'selected' : ''} onClick={() => set('startWith', 'import')} data-testid="start-import"><span className="start-radio" /> <span><strong>Importar planilha (Excel)</strong><small>Preenche a grade a partir de um arquivo .xlsx/.csv</small></span></button>
          </div>
        </div>
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancelar</button><button type="button" className="button button-primary" onClick={() => onCreate(form)} disabled={!valid} data-testid="button-create-project">Criar projeto</button></div>
      </div>
    </ModalShell>
  );
}

function RenameProjectModal({ project, onClose, onSave }: { project: LocalProject; onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState(project.name);
  return (
    <ModalShell>
      <div className="import-modal page-enter" role="dialog" aria-modal="true" aria-labelledby="rename-project-title">
        <div className="modal-top"><div><p className="section-kicker">PORTFÓLIO</p><h2 id="rename-project-title">Renomear projeto</h2></div><IconButton label="Fechar" testId="button-close-rename-project" onClick={onClose}><X size={18} /></IconButton></div>
        <label className="reason-field"><span>Nome do empreendimento</span><input className="rename-input" value={name} onChange={(event) => setName(event.target.value)} autoFocus data-testid="input-rename-project" /></label>
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancelar</button><button type="button" className="button button-primary" onClick={() => onSave(name.trim())} disabled={!name.trim()} data-testid="button-save-rename-project">Salvar</button></div>
      </div>
    </ModalShell>
  );
}

function MatrixSkeleton() {
  return <div className="page-wrap"><div className="matrix-skeleton"><div className="skeleton-line w-20" /><div className="skeleton-line w-40" /><div className="skeleton-table" /></div></div>;
}

const SUPPLIER_TONES = ['ink', 'teal', 'amber', 'coral', 'violet'];

function NewSupplierModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <ModalShell>
      <div className="import-modal page-enter" role="dialog" aria-modal="true" aria-labelledby="new-supplier-title">
        <div className="modal-top"><div><p className="section-kicker">DIRETÓRIO DE COMPRAS</p><h2 id="new-supplier-title">Cadastrar fornecedor</h2></div><IconButton label="Fechar" testId="button-close-new-supplier" onClick={onClose}><X size={18} /></IconButton></div>
        <label className="reason-field"><span>Nome do fornecedor</span><input className="rename-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex: Marmoraria Z" autoFocus data-testid="input-new-supplier" /></label>
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancelar</button><button type="button" className="button button-primary" onClick={() => onSubmit(name.trim())} disabled={!name.trim()} data-testid="button-submit-new-supplier">Adicionar fornecedor</button></div>
      </div>
    </ModalShell>
  );
}

function Suppliers() {
  const projectsQuery = useListProjects({ query: { queryKey: getListProjectsQueryKey(), staleTime: 30000 } });
  const { localProjects, hiddenProjects, projectNameOverrides, specsByProject, manualSuppliers, addSupplier } = useWorkspace();
  const allProjects = effectiveProjects(Array.isArray(projectsQuery.data) && projectsQuery.data.length ? projectsQuery.data : FALLBACK_PROJECTS, localProjects, hiddenProjects, projectNameOverrides);
  const projectNameOf = (projectId: string) => allProjects.find((project) => project.id === projectId)?.name ?? projectId;
  const [search, setSearch] = useState('');
  const [newSupplierOpen, setNewSupplierOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const pushNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3200);
  };

  const suppliers = useMemo(() => {
    const map = new Map<string, { projectId: string; spec: MatrixSpec }[]>();
    const seen = new Set<string>();
    for (const [projectId, specs] of Object.entries(specsByProject)) {
      for (const spec of specs) {
        const brand = spec.brand?.trim();
        if (!brand || brand === '—') continue;
        const key = productKey(spec);
        if (seen.has(key)) continue;
        seen.add(key);
        if (!map.has(brand)) map.set(brand, []);
        map.get(brand)!.push({ projectId, spec });
      }
    }
    const names = Array.from(new Set([...map.keys(), ...manualSuppliers]));
    return names
      .map((name) => ({ name, items: map.get(name) ?? [] }))
      .filter((supplier) => supplier.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [specsByProject, manualSuppliers, search]);

  const onSubmitSupplier = (name: string) => {
    addSupplier(name);
    setNewSupplierOpen(false);
    pushNotice('Fornecedor cadastrado no repositório.');
  };

  return (
    <div className="page-wrap page-enter">
      <Topbar
        eyebrow="WORKSPACE / RELACIONAMENTOS"
        title="Fornecedores"
        action={<button type="button" className="button button-primary" onClick={() => setNewSupplierOpen(true)} data-testid="button-new-supplier"><Plus size={16} /> Novo fornecedor</button>}
      />
      <section className="suppliers-section stagger-1">
        <div className="section-heading">
          <div><p className="section-kicker">REPOSITÓRIO DE ESPECIFICAÇÕES</p><h3>Fornecedores</h3></div>
          <label className="search-box supplier-search"><Search size={15} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar fornecedor..." aria-label="Buscar fornecedor" data-testid="input-search-supplier" />{search && <IconButton label="Limpar busca" testId="button-clear-supplier-search" onClick={() => setSearch('')}><X size={13} /></IconButton>}</label>
        </div>
        {suppliers.length === 0 ? (
          <div className="empty-search"><PackageSearch size={26} /><strong>Nenhum fornecedor encontrado</strong><span>{search ? 'Ajuste a busca ou cadastre um novo fornecedor.' : 'Cadastre um fornecedor ou importe especificações com marca para começar.'}</span></div>
        ) : (
          <div className="supplier-gallery">
            {suppliers.map((supplier, index) => {
              const projects = new Set(supplier.items.map((entry) => entry.projectId));
              const isSelected = selected === supplier.name;
              return (
                <Fragment key={supplier.name}>
                  <button type="button" className={`supplier-tile ${isSelected ? 'selected' : ''}`} onClick={() => setSelected(isSelected ? null : supplier.name)} aria-expanded={isSelected} data-testid={`supplier-card-${supplier.name}`}>
                    <span className={`supplier-tile-avatar activity-avatar ${SUPPLIER_TONES[index % SUPPLIER_TONES.length]}`}>{supplier.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
                    <span className="supplier-tile-name">{supplier.name}</span>
                    <span className="supplier-tile-meta">{supplier.items.length} {supplier.items.length === 1 ? 'item' : 'itens'} · {projects.size} {projects.size === 1 ? 'projeto' : 'projetos'}</span>
                  </button>
                  {isSelected && (
                    <div className="supplier-detail" data-testid="supplier-detail">
                      <div className="supplier-detail-head">
                        <span className={`activity-avatar ${SUPPLIER_TONES[index % SUPPLIER_TONES.length]}`}>{supplier.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
                        <div><strong>{supplier.name}</strong><small>{supplier.items.length} {supplier.items.length === 1 ? 'produto cadastrado' : 'produtos cadastrados'}</small></div>
                        <IconButton label="Fechar detalhe" testId="button-close-supplier-detail" onClick={() => setSelected(null)}><X size={16} /></IconButton>
                      </div>
                      {supplier.items.length === 0 ? (
                        <div className="supplier-empty">Sem especificações cadastradas ainda.</div>
                      ) : (
                        <div className="product-gallery">
                          {supplier.items.map(({ projectId, spec }) => {
                            const over = Number(spec.quotedPrice) > Number(spec.budget);
                            return (
                              <div className="product-card" key={spec.id}>
                                <div className="product-thumb">{spec.item.trim().charAt(0).toUpperCase()}</div>
                                <div className="product-card-body">
                                  <strong>{spec.item}</strong>
                                  <small>{spec.finish}{spec.dimension !== '—' ? ` · ${spec.dimension}` : ''}</small>
                                  <div className="product-price"><span>{projectNameOf(projectId)}</span><b className={over ? 'over' : ''}>{money(Number(spec.quotedPrice))}</b></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        )}
      </section>
      {newSupplierOpen && <NewSupplierModal onClose={() => setNewSupplierOpen(false)} onSubmit={onSubmitSupplier} />}
      {notice && <div className="toast-note page-enter" role="status" data-testid="status-suppliers-toast"><Check size={15} /> {notice}</div>}
    </div>
  );
}

function EmptyPage({ type }: { type: 'suppliers' | 'settings' }) {
  const isSuppliers = type === 'suppliers';
  return (
    <div className="page-wrap page-enter">
      <Topbar eyebrow={isSuppliers ? 'WORKSPACE / RELACIONAMENTOS' : 'WORKSPACE / PREFERÊNCIAS'} title={isSuppliers ? 'Fornecedores' : 'Configurações'} action={isSuppliers ? <button type="button" className="button button-primary" onClick={() => window.alert('O cadastro de fornecedores será habilitado em breve.')} data-testid="button-new-supplier"><Plus size={16} /> Novo fornecedor</button> : undefined} />
      <div className={`useful-empty ${isSuppliers ? 'suppliers-empty' : 'settings-empty'}`}>
        <div className="empty-orbit"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" />{isSuppliers ? <Users size={34} /> : <Settings size={34} />}</div>
        <p className="section-kicker">{isSuppliers ? 'DIRETÓRIO DE COMPRAS' : 'SEU WORKSPACE'}</p>
         <h2>{isSuppliers ? <>Um lugar para cada<br /><span>parceiro de confiança.</span></> : <>Ajustes que deixam<br /><span>o trabalho no ritmo certo.</span></>}</h2>
        <p>{isSuppliers ? 'O diretório ainda está vazio. Cadastre os fornecedores que acompanham suas obras para encontrar marcas, contatos e condições sem sair do contexto da especificação.' : 'As preferências do workspace serão liberadas quando sua equipe começar a compartilhar matrizes. Por enquanto, seu espaço já está funcionando com as configurações essenciais.'}</p>
        <div className="empty-actions">{isSuppliers ? <button type="button" className="button button-primary" onClick={() => window.alert('Convite de fornecedor preparado.')} data-testid="button-invite-supplier"><Users size={15} /> Convidar fornecedor</button> : <Link href="/" className="button button-primary" data-testid="link-settings-portfolio"><LayoutDashboard size={15} /> Voltar ao portfólio</Link>}<button type="button" className="text-button" onClick={() => window.alert('Guia rápido aberto.')} data-testid="button-empty-guide">Como funciona <ArrowUpRight size={15} /></button></div>
      </div>
      <div className="empty-context"><span><BookOpen size={16} /> Dica de operação</span><p>{isSuppliers ? 'Comece pelas marmorarias e marcenarias que aparecem em mais de um projeto.' : 'Você pode editar cada célula diretamente na matriz. As cores mudam no mesmo instante.'}</p></div>
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  return (
    <ErrorBoundary resetKey={location}>
      <Shell>
        <Switch>
          <Route path="/" component={Portfolio} />
          <Route path="/matriz" component={MatrixPage} />
          <Route path="/projects/:projectId" component={MatrixPage} />
          <Route path="/suppliers" component={Suppliers} />
          <Route path="/settings"><EmptyPage type="settings" /></Route>
          <Route component={NotFound} />
        </Switch>
      </Shell>
    </ErrorBoundary>
  );
}

function AuthenticatedApp({ userKey, userName }: { userKey: string; userName: string }) {
  const { user: currentUser } = useAuth();
  const isSample = currentUser?.email === DEMO_EMAIL;
  const exampleId = 'casa-serra';
  return (
    <WorkspaceProvider key={userKey} userKey={userKey} userName={userName} sampleMode={isSample} initialSpecs={isSample ? INITIAL_SPECS : {}} initialActivity={isSample ? INITIAL_ACTIVITY : []} exampleId={exampleId} exampleMeta={FALLBACK_PROJECTS.find((project) => project.id === exampleId)} exampleSpecs={INITIAL_SPECS[exampleId]}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </WorkspaceProvider>
  );
}

function AppGate() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="grid min-h-[100dvh] place-items-center bg-[#F6F5F2]">
          <div className="flex flex-col items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-[#0B1E63] text-white"><HardHat size={22} /></span>
            <span className="text-sm font-semibold tracking-tight text-[#0B1E63]">specmaster</span>
          </div>
        </div>
      </QueryClientProvider>
    );
  }
  return (
    <QueryClientProvider client={queryClient}>
      {user ? <AuthenticatedApp userKey={user.id} userName={user.name} /> : <AuthScreen />}
    </QueryClientProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}

export default App;