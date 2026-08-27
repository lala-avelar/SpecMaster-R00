# Brainstorm — Redesenho da Tabela "Matriz de Especificações"

> Documento de discussão registrado em 27/08/2026, antes da implementação.

## Contexto

A tela **Matriz de Especificações** do SpecMaster (mockup web em `artifacts/specmaster-web`) precisa garantir que o usuário entenda em menos de 5 segundos se o projeto está dentro ou fora do orçamento, quais itens estão causando problema e o que a equipe fez recentemente — tudo na mesma tela, rolando naturalmente para baixo.

Uma primeira refatoração já foi entregue (painel de saúde orçamentária, delta por linha, filtro de estouros, rastro de alterações). Este documento trata especificamente da **visualização da tabela de especificações**.

## Problema da tabela atual

Não é falta de dado — é **distribuição de espaço**. Com 11 colunas num container de ~1000px, a coluna mais importante (**Item / Descrição**) fica com ~150px e trunca o texto com ellipsis ("…"). O usuário precisa ver o texto completo.

## Pesquisa de mercado (padrões observados)

### Notion — table view
- **"Wrap text"** em vez de ellipsis: a linha cresce e o texto fica sempre visível.
- **"Group by"** (agrupamento visual): o agrupador vira uma barra com nome + contagem de itens.
- **Conditional color** em células/linhas (verde/vermelho conforme regra de negócio).
- Nunca sacrifica a coluna-título da linha; ela é a mais larga.

### Procore (construção civil)
- Tabelas densas com **header fixo (sticky)** — os rótulos das colunas nunca somem ao rolar.
- **Status colorido** para leitura imediata.
- **Ações colapsadas em ícones** (colunas de ação estreitas).
- Agrupamento por categoria com cabeçalhos de seção.

### Excel / Smartsheet (listas de materiais / BOM de obra)
- **Célula de ambiente mesclada** (merged cells): o ambiente aparece **uma vez** e "puxa" várias linhas de elemento (piso, parede, rodapé…).
- Congelamento de header ("Freeze panes").
- Linhas de subtotal por grupo.

## Requisitos do usuário (informações obrigatórias na tabela)

1. **Agrupamento por categoria** obrigatório: Revestimentos | Louças e Metais | Complementares.
2. **Ambiente** — um mesmo ambiente reúne várias especificações (ver abaixo) e elas precisam ser **unificadas** numa visualização completa do ambiente.
3. **Classe do elemento** — se a especificação é piso, bacia sanitária, etc.
4. **Item / Descrição** — o elemento mais importante da tabela.
5. **Informações complementares importantes de identificar**: Dimensão e Acabamento.
6. **Valor previsto total (R$)**
7. **Valor cotado (R$)**
8. **Delta do valor**
9. **Aprovado por** — dispensável; pode ser ícone representando pendência de aprovação.
10. **Solicitar troca** — ícone reduzido.

### Elementos por ambiente (referência de domínio)

- **Revestimentos:** piso, parede, rodapé, soleira/filete, bancada, teto, peitoril, soco.
- **Louças e Metais:** louças/cubas/tanques, válvulas de cubas, sifões, torneiras, bacia sanitária, ducha higiênica, acabamento de registro, acionamento de chuveiro, ralos.
- **Complementares:** acabamentos elétricos, portas, maçanetas, iluminação.

> Nem todas as especificações se aplicam em todos os ambientes, mas haverá **mais de uma por ambiente**.

## Diagnóstico → Solução recomendada

Padrão que casa **Procore + Excel/Notion**: a **"matriz por bloco de ambiente"**.

- **Ambiente mesclado** (célula vertical única, com nome + contagem/subtotal) agrupando os elementos de um mesmo ambiente, dentro de cada categoria.
- **Item/Descrição como coluna rainha** — a mais larga, com **wrap text** (texto completo, sem cortar).
- **Colunas complementares compactas**: Dimensão e Acabamento.
- **Valores compactos e alinhados à direita**: Verba / Cotado / Δ (Δ colorido: vermelho estouro, verde sobra).
- **Aprovado → ícone** (✓ aprovado / ⏳ pendente).
- **Solicitar Troca → ícone**.
- **Header da tabela fixo (sticky)** ao rolar.
- Cor verde/vermelha aplicada nos **valores**, mantendo o texto do item legível.

Para o protótipo demonstrar isso, será necessário **enriquecer os dados de exemplo** para que cada ambiente tenha múltiplas especificações (ex.: Cozinha → Piso + Parede + Bancada + Rodapé; Banho → Bacia + Torneira + Cuba + Ralo; etc.).

## Opções de layout consideradas

| Opção | Descrição | Prós | Contras |
| --- | --- | --- | --- |
| **A. Bloco de ambiente mesclado** (recomendada) | Ambiente em 1 célula vertical (Excel), Item larga com wrap, ícones em Aprovado/Troca, header fixo | Texto completo visível, menos repetição, padrão Procore/Excel | Mais complexo de montar (linhas mescladas) |
| **B. Linha de ambiente + sub-linhas** | Ambiente como cabeçalho de grupo com subtotal; especificações recuadas abaixo (Notion group-by / Airtable) | Muito espaçoso e legível | Mais vertical, rolagem maior |
| **C. Tabela plana** | 1 linha por especificação, ambiente repetido, wrap text + colunas balanceadas | Simples | Repete ambiente em cada linha, mais densa |

## Próximos passos

1. Escolher o layout (A recomendado).
2. Implementar a nova estrutura da `SpecificationTable`.
3. Enriquecer dados de exemplo com múltiplas especificações por ambiente.
4. Revisar cores (row/valores) e responsividade.
5. Validar com typecheck + build.
