# Jornada do usuário — SpecMaster (MVP)

Documento de referência da jornada que o usuário precisa conseguir percorrer na plataforma.
Cada etapa indica o **objetivo**, o **estado atual** no mockup, **o que já existe** e **o plano** para completar.

Status: ✅ implementado · 🟡 parcial · ⬜ não implementado

---

## 2. Identificar um resumo de aprovações e revisões ✅

**Objetivo:** o usuário logado (hoje **Marina Reis**) abre o app e vê, rapidamente, tudo que está pendente de aprovação/revisão **para ele**, em todos os empreendimentos e dentro de cada matriz — e consegue agir (aprovar item por item).

**O que já existe:**
- Modelo de aprovação: cada spec tem `assignedTo` (responsável) e `status` (`aprovado | pendente | revisao | troca`).
- Estado compartilhado (`workspace-store.tsx`): specs por projeto, rastro global, `approveSpec`, `requestChange`, `requestApproval`.
- Portfólio:
  - Métrica "Itens em revisão" **computada** (pendências do usuário em todos os projetos).
  - Painel **"Suas pendências (N)"**: lista de itens pendentes com projeto, ambiente, item, status e ação **"Revisar"**.
  - Clicar numa pendência navega para a matriz do projeto e abre um **pop-up de aprovação** com os detalhes do item (elemento, marca, dimensão, acabamento, custo previsto, cotado, Δ, responsável) e o botão **"Aprovar especificação"**.
- Matriz:
  - Botão **"Suas pendências"** na toolbar (filtra os pendentes do usuário naquele projeto).
  - Ícone ⏳ na linha abre o mesmo pop-up de revisão; ✓ indica "Aprovado por …".
- Aprovar registra no rastro ("Marina Reis aprovou X") e atualiza métrica/painéis na hora.

**Plano/evoluções futuras:**
- Suporte a aprovação em massa (selecionar vários e aprovar).
- Histórico de quem aprovou e quando (timestamp de aprovação).
- Notificações (badge no sino).

---

## 3. Identificar os projetos ativos 🟡

**Objetivo:** o usuário vê, na primeira tela, todos os empreendimentos em andamento e uma noção rápida do estágio de cada um.

**O que já existe:**
- Grid de projetos no Portfólio, alimentado pela API com fallback local + projetos criados pelo usuário.
- Card com nome, construtora, localização, **% de especificação calculada** (completude real das specs) e data de atualização.
- Menu **⋮** no card: **Renomear** (modal) e **Apagar** (com confirmação); renomeação reflete também na matriz do projeto.

**Plano:**
- Contagem de itens/verba por projeto no card (puxado do store).
- Indicador de pendências por projeto (ex.: badge "2 pendências").
- Ordenação/filtro por status do projeto.

---

## 4. Rastrear o que mudou em todos os empreendimentos 🟡

**Objetivo:** o usuário acompanha, de um lugar só, o que a equipe alterou em qualquer empreendimento (verba, troca, cadastro, importação, aprovação).

**O que já existe:**
- Rastro **global** no `workspace-store` (todas as ações alimentam um único feed).
- Portfólio: seção **"O que mudou"** mostra os últimos eventos de todos os projetos.
- Matriz: **"Rastro de alterações"** mostra apenas os eventos do projeto atual.

**Plano:**
- Página/visão completa de atividade ("Ver atividade completa" funcional) com filtro por projeto/pessoa.
- Verbos padronizados: atualizou a verba, comentou, aprovou, solicitou troca, alterou o fornecedor, cadastrou, importou.
- Timestamps relativos já existem; evoluir para histórico persistente (quando houver backend).

---

## 5. Criar um novo projeto ✅

**Objetivo:** o usuário cria um empreendimento e escolhe como começar a grade de especificações.

**O que já existe:**
- Modal **"Novo projeto"** no Portfólio com: nome do empreendimento, construtora/cliente, localização e **ponto de partida**:
  - "Grade em branco" → navega para a matriz vazia do novo projeto.
  - "Importar planilha (Excel)" → navega e abre direto o fluxo de importação (etapa 6).
- Projeto criado aparece no grid, no switcher da barra superior e nas telas de pendências/rastro.
- *Nota:* a API não tem `POST /projects` — no MVP o projeto vive no store local (`localProjects`); documentado como gap de API.

---

## 6. Importar grade de especificações existente (Excel) ✅

**Objetivo:** o usuário sobe uma planilha com as especificações já usadas pela empresa e a plataforma **preenche a grade automaticamente**, evidenciando o que ainda falta preencher.

**O que já existe:**
- Importação **real** de **Excel (.xlsx/.csv)** com a lib SheetJS (`xlsx`):
  - `.csv` é lido como texto UTF-8 (acentos e decimais com vírgula tratados).
  - Mapeamento de colunas por cabeçalho (Ambiente, Elemento, Item/Descrição, Dimensão, Acabamento, Marca/Fornecedor, Verba/Previsto, Cotado/Preço, Macrozona).
  - **Prévia editável** antes de confirmar, com contagem de itens completos/incompletos.
- **Evidenciar o que falta:** linhas com campos vazios entram marcadas como **pendentes** (atribuídas ao usuário logado → caem em "Suas pendências") e a % de especificação do card do projeto é calculada pela completude real (itens com item, marca, acabamento, verba e cotado preenchidos).
- PDF foi **descartado** a pedido do usuário — apenas Excel.

**Plano/evoluções futuras:**
- Prévia totalmente editável (não só leitura) antes do confirmar.
- Validação por categoria/elemento com sugestões automáticas.

---

## 7. Criar grade de especificações do zero ✅

**Objetivo:** o usuário monta a grade manualmente, com todas as informações do projeto.

**O que já existe:**
- Modal **"Cadastrar nova especificação"** (item a item) com: macrozona, categoria, ambiente, elemento, item/descrição, dimensão, acabamento, marca/fornecedor, verba, cotado e responsável pela aprovação.
- **Cadastro de produtos:** adicionar uma especificação "cria o produto" no repositório. Se o mesmo item (mesma marca) já estiver cadastrado em outro projeto, o modal **preenche automaticamente** acabamento, dimensão e preço cotado — garantindo texto igual.
- Conectado ao fluxo de **novo projeto** (etapa 5): projeto novo com "grade em branco" começa vazio e o usuário preenche via "Adicionar linha".
- Edição direta nas células da matriz, agrupamento por categoria + ambiente, zonas e filtros.

**Plano:**
- Template por categoria no modal (pré-seleção de elementos comuns) para acelerar o preenchimento.
- Validação e salvamento em lote quando houver backend.

---

## 8. Compartilhar a grade 🟡

**Objetivo:** o usuário compartilha a grade de um empreendimento com pessoas/setores, controlando permissão de visualização ou edição.

**O que já existe:**
- Botão "Compartilhar" na matriz (copia o link atual para a área de transferência).

**Plano:**
- **Modal de compartilhamento** com:
  - Link da grade (copiar).
  - Seleção de pessoa/setor (Arquitetura, Orçamento, Projeto — mesmos do fluxo de troca).
  - Permissão: visualização ou edição.
- *Nota:* no MVP o link é o do próprio app; backend real de share fica como gap.

---

## 9. Repositório de acabamentos por fornecedor ✅

**Objetivo:** o usuário visualiza os acabamentos/materiais já usados, construindo um repositório de especificações **por fornecedor**.

**O que já existe:**
- Tela **Fornecedores** (`/suppliers`) com visualização em **galeria**:
  - Grade de fornecedores (marcas extraídas de todas as specs de todos os projetos + fornecedores manuais), com busca.
  - Ao selecionar um fornecedor, abre um **detalhe em galeria** com os produtos (thumb com iniciais, item, acabamento · dimensão e **preço cotado** — vermelho se acima da verba).
  - **Sem repetição**: o mesmo produto (marca + item + acabamento + dimensão) aparece uma única vez por fornecedor.
  - **"Novo fornecedor"** manual (modal).

**Plano:**
- Cadastrar marca/fornecedor junto à criação de especificação (hoje é texto livre na célula).
- Detalhe do fornecedor (contato, condições) e histórico por fornecedor.

---

## Mapa de dependências

```
5. Criar projeto ──► 6. Importar grade  /  7. Grade do zero
        └────────────► 8. Compartilhar
2. Pendências ───────► alimenta 4. Rastro global
9. Fornecedores ─────► agrega specs de todos os projetos
```

## Gaps de API (para quando o backend evoluir)

- `POST /projects` (criar projeto)
- `POST /projects/:id/import` (importação em lote)
- Compartilhamento / permissões
- Fornecedores (diretório + vínculo com specs)
- Histórico persistente de aprovações e rastro
