import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  type ProjectDetail,
  type Specification,
  useGetProject,
  useUpdateSpecification,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

const PROJECT_ID = 'ed-santa-monica';
const money = (value: number) =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function TabOneScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const { data, isLoading, isError, refetch, isRefetching } =
    useGetProject(PROJECT_ID);

  if (isLoading || !data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.muted, { color: colors.mutedForeground }]}>
          Carregando projeto
        </Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="wifi-off" size={28} color={colors.destructive} />
        <Text style={[styles.heroTitle, { color: colors.foreground }]}>
          Não foi possível carregar
        </Text>
        <Pressable onPress={() => refetch()} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
          <Text style={styles.primaryButtonText}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  return <ProjectHome data={data} query={query} setQuery={setQuery} insets={insets} colors={colors} isRefetching={isRefetching} refetch={refetch} />;
}

function ProjectHome({
  data,
  query,
  setQuery,
  insets,
  colors,
  isRefetching,
  refetch,
}: {
  data: ProjectDetail;
  query: string;
  setQuery: (value: string) => void;
  insets: ReturnType<typeof useSafeAreaInsets>;
  colors: ReturnType<typeof useColors>;
  isRefetching: boolean;
  refetch: () => void;
}) {
  const update = useUpdateSpecification();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const specs = useMemo(
    () =>
      data.specifications.filter((item) =>
        `${item.item} ${item.environment} ${item.brand}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [data.specifications, query],
  );
  const overBudget = data.specifications.filter((item) => item.quotedPrice > item.budget).length;
  const onPriceChange = (item: Specification, value: string) => {
    const parsed = Number(value.replace(',', '.'));
    if (!Number.isNaN(parsed)) {
      update.mutate({
        projectId: PROJECT_ID,
        specificationId: item.id,
        data: { ...item, quotedPrice: parsed },
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
      <FlatList
        data={specs}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 28 }}
        ListHeaderComponent={
          <View>
            <View style={styles.brandRow}>
              <View style={[styles.brandMark, { backgroundColor: colors.foreground }]}>
                <Feather name="grid" size={16} color={colors.accent} />
              </View>
              <Text style={[styles.brand, { color: colors.foreground }]}>SPEСMASTER</Text>
              <View style={styles.spacer} />
              <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                <Text style={[styles.avatarText, { color: colors.foreground }]}>LM</Text>
              </View>
            </View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>PROJETO ATIVO</Text>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>{data.name}</Text>
            <Text style={[styles.muted, { color: colors.mutedForeground }]}>
              {data.client} · {data.location}
            </Text>
            <View style={styles.metricsRow}>
              <Metric label="AVANÇO" value={`${data.completion}%`} colors={colors} />
              <Metric label="ITENS" value={`${data.specifications.length}`} colors={colors} />
              <Metric label="ATENÇÃO" value={`${overBudget}`} accent={overBudget > 0} colors={colors} />
            </View>
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="search" size={17} color={colors.mutedForeground} />
              <TextInput
                testID="mobile-search"
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar item, ambiente ou marca"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.searchInput, { color: colors.foreground }]}
              />
            </View>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Matriz de especificações</Text>
              <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>{specs.length} itens</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const withinBudget = item.quotedPrice <= item.budget;
          const expanded = expandedId === item.id;
          return (
            <Pressable
              testID={`spec-${item.id}`}
              onPress={() => setExpandedId(expanded ? null : item.id)}
              style={[
                styles.itemCard,
                {
                  backgroundColor: withinBudget ? colors.card : '#f8e9e6',
                  borderColor: withinBudget ? colors.border : '#e7c5bf',
                },
              ]}
            >
              <View style={styles.itemTop}>
                <View style={[styles.environmentPill, { backgroundColor: withinBudget ? colors.accent : '#f3d8d2' }]}>
                  <Text style={[styles.environmentText, { color: colors.foreground }]}>{item.environment}</Text>
                </View>
                <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.itemTitle, { color: colors.foreground }]}>{item.item}</Text>
              <Text style={[styles.itemBrand, { color: colors.mutedForeground }]}>{item.brand} · {item.finish} · {item.dimension}</Text>
              <View style={styles.priceRow}>
                <View>
                  <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>COTADO</Text>
                  {expanded ? (
                    <TextInput
                      testID={`price-${item.id}`}
                      defaultValue={String(item.quotedPrice)}
                      keyboardType="decimal-pad"
                      onEndEditing={(event) => onPriceChange(item, event.nativeEvent.text)}
                      style={[styles.priceInput, { color: withinBudget ? colors.foreground : colors.destructive, borderColor: colors.border }]}
                    />
                  ) : (
                    <Text style={[styles.price, { color: withinBudget ? colors.foreground : colors.destructive }]}>{money(item.quotedPrice)}</Text>
                  )}
                </View>
                <View style={styles.budgetBox}>
                  <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>VERBA TETO</Text>
                  <Text style={[styles.budget, { color: colors.mutedForeground }]}>{money(item.budget)}</Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: withinBudget ? '#6d9a7c' : colors.destructive }]} />
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={[styles.muted, { color: colors.mutedForeground, paddingVertical: 28 }]}>Nenhum item encontrado.</Text>}
      />
    </View>
  );
}

function Metric({ label, value, accent, colors }: { label: string; value: string; accent?: boolean; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: accent ? colors.destructive : colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 34,
  },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  brand: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  spacer: { flex: 1 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 11, fontWeight: '700' },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.7,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  muted: {
    fontSize: 14,
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    marginTop: 26,
    marginBottom: 24,
    gap: 18,
  },
  metric: { minWidth: 62 },
  metricLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.1, marginBottom: 5 },
  metricValue: { fontSize: 22, fontWeight: '700' },
  searchBox: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 30,
  },
  searchInput: { flex: 1, fontSize: 14, marginLeft: 10, paddingVertical: 10 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  sectionCount: { fontSize: 12 },
  itemCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  environmentPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  environmentText: { fontSize: 11, fontWeight: '700' },
  itemTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  itemBrand: { fontSize: 13, marginBottom: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end' },
  priceLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.1, marginBottom: 4 },
  price: { fontSize: 16, fontWeight: '700' },
  budgetBox: { marginLeft: 'auto' },
  budget: { fontSize: 13, fontWeight: '600' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 12, marginBottom: 5 },
  priceInput: { minWidth: 100, borderBottomWidth: 1, paddingVertical: 2, fontSize: 16, fontWeight: '700' },
  primaryButton: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
});
