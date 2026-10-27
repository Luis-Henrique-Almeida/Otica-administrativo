import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";
import { supabase } from "../supabase";

type ProdutoMaisVendido = {
  produto_id: string;
  nome: string;
  quantidade: number;
  faturamento: number;
};
type Venda = {
  id: string;
  valor_total: number;
  forma_pagamento: string;
  data_venda: string;
  created_at: string;
};

export default function HistoricoVendas() {
  const router = useRouter();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [itensVenda, setItensVenda] = useState<
    {
      venda_id: string;
      produto_id: string;
      quantidade: number;
      subtotal: number;
    }[]
  >([]);
  const [nomesProdutos, setNomesProdutos] = useState<
    { id: string; nome: string }[]
  >([]);
  const [periodo, setPeriodo] = useState<"hoje" | "7dias" | "mes" | "ano">(
    "hoje",
  );
  const [produtosMaisVendidos, setProdutosMaisVendidos] = useState<
    ProdutoMaisVendido[]
  >([]);
  useEffect(() => {
    const agora = new Date();
    const inicio = new Date(agora);

    if (periodo === "hoje") {
      inicio.setHours(0, 0, 0, 0);
    } else if (periodo === "7dias") {
      inicio.setDate(inicio.getDate() - 6);
      inicio.setHours(0, 0, 0, 0);
    } else if (periodo === "mes") {
      inicio.setDate(1);
      inicio.setHours(0, 0, 0, 0);
    } else {
      inicio.setMonth(0, 1);
      inicio.setHours(0, 0, 0, 0);
    }

    const amanha = new Date(agora);
    amanha.setDate(amanha.getDate() + 1);
    amanha.setHours(0, 0, 0, 0);

    const idsPeriodo = new Set(
      vendas
        .filter((venda) => {
          const data = new Date(venda.data_venda || venda.created_at);
          return data >= inicio && data < amanha;
        })
        .map((venda) => venda.id),
    );

    const resumo = new Map<
      string,
      { quantidade: number; faturamento: number }
    >();

    for (const item of itensVenda) {
      if (!idsPeriodo.has(item.venda_id)) continue;

      const atual = resumo.get(item.produto_id) ?? {
        quantidade: 0,
        faturamento: 0,
      };

      atual.quantidade += Number(item.quantidade);
      atual.faturamento += Number(item.subtotal);
      resumo.set(item.produto_id, atual);
    }

    const ranking = nomesProdutos
      .map((produto) => ({
        produto_id: produto.id,
        nome: produto.nome,
        quantidade: resumo.get(produto.id)?.quantidade ?? 0,
        faturamento: resumo.get(produto.id)?.faturamento ?? 0,
      }))
      .filter((produto) => produto.quantidade > 0)
      .sort((a, b) => b.quantidade - a.quantidade);

    setProdutosMaisVendidos(ranking);
  }, [periodo, vendas, itensVenda, nomesProdutos]);

  const carregarVendas = useCallback(async () => {
    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        Alert.alert("Sessão expirada", "Faça login novamente.");
        router.replace("/");
        return;
      }

      const { data: perfil, error: perfilError } = await supabase
        .from("usuarios")
        .select("otica_id, ativo")
        .eq("id", authData.user.id)
        .single();

      if (perfilError) throw perfilError;

      if (!perfil?.ativo || !perfil.otica_id) {
        Alert.alert("Acesso bloqueado", "Usuário inativo ou sem ótica.");
        return;
      }

      const { data, error } = await supabase
        .from("vendas")
        .select("id, valor_total, forma_pagamento, data_venda, created_at")
        .eq("otica_id", perfil.otica_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setVendas((data ?? []) as Venda[]);

      const todosIdsVendas = (data ?? []).map((venda) => venda.id);

      if (todosIdsVendas.length === 0) {
        setItensVenda([]);
        setNomesProdutos([]);
      } else {
        const { data: itens, error: itensErro } = await supabase
          .from("itens_venda")
          .select("venda_id, produto_id, quantidade, subtotal")
          .in("venda_id", todosIdsVendas);

        if (itensErro) throw itensErro;

        setItensVenda(itens ?? []);

        const idsProdutos = [
          ...new Set((itens ?? []).map((item) => item.produto_id)),
        ];

        if (idsProdutos.length === 0) {
          setNomesProdutos([]);
        } else {
          const { data: produtos, error: produtosErro } = await supabase
            .from("produtos")
            .select("id, nome")
            .in("id", idsProdutos)
            .eq("otica_id", perfil.otica_id);

          if (produtosErro) throw produtosErro;

          setNomesProdutos(produtos ?? []);
        }
      }
    } catch (error) {
      Alert.alert(
        "Erro",
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o histórico.",
      );
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      carregarVendas();
    }, [carregarVendas]),
  );

  function formatarPreco(valor: number) {
    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatarData(data: string) {
    const dataConvertida = new Date(data);

    if (Number.isNaN(dataConvertida.getTime())) {
      return "Data indisponível";
    }

    return dataConvertida.toLocaleString("pt-BR");
  }

  const agora = new Date();
  const inicioPeriodo = new Date(agora);
  if (periodo === "hoje") {
    inicioPeriodo.setHours(0, 0, 0, 0);
  } else if (periodo === "7dias") {
    inicioPeriodo.setDate(inicioPeriodo.getDate() - 6);
    inicioPeriodo.setHours(0, 0, 0, 0);
  } else if (periodo === "mes") {
    inicioPeriodo.setDate(1);
    inicioPeriodo.setHours(0, 0, 0, 0);
  } else {
    inicioPeriodo.setMonth(0, 1);
    inicioPeriodo.setHours(0, 0, 0, 0);
  }

  const inicioHoje = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate(),
  );

  const inicioAmanha = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate() + 1,
  );

  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

  const dataDaVenda = (venda: Venda) =>
    new Date(venda.data_venda || venda.created_at);

  if (periodo === "hoje") {
    inicioPeriodo.setHours(0, 0, 0, 0);
  } else if (periodo === "7dias") {
    inicioPeriodo.setDate(inicioPeriodo.getDate() - 6);
    inicioPeriodo.setHours(0, 0, 0, 0);
  } else {
    inicioPeriodo.setDate(1);
    inicioPeriodo.setHours(0, 0, 0, 0);
  }

  const vendasFiltradas = vendas.filter((venda) => {
    const data = dataDaVenda(venda);
    return data >= inicioPeriodo && data < inicioAmanha;
  });

  const vendasHoje = vendas.filter((venda) => {
    const data = dataDaVenda(venda);
    return data >= inicioHoje && data < inicioAmanha;
  });

  const vendasMes = vendas.filter((venda) => {
    const data = dataDaVenda(venda);
    return data >= inicioMes && data < inicioAmanha;
  });

  const faturamento = vendasFiltradas.reduce(
    (soma, venda) => soma + Number(venda.valor_total),
    0,
  );

  const faturamentoHoje = vendasHoje.reduce(
    (soma, venda) => soma + Number(venda.valor_total),
    0,
  );

  const faturamentoMes = vendasMes.reduce(
    (soma, venda) => soma + Number(venda.valor_total),
    0,
  );

  const ticketMedio =
    vendasFiltradas.length > 0 ? faturamento / vendasFiltradas.length : 0;

  const dadosGrafico = (() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let pontos: { label: string; valor: number }[] = [];

    if (periodo === "hoje") {
      // Hoje: 24 horas
      pontos = Array.from({ length: 24 }, (_, i) => ({
        label: `${String(i).padStart(2, "0")}h`,
        valor: 0,
      }));
    } else if (periodo === "7dias") {
      // Últimos 7 dias, incluindo hoje
      pontos = Array.from({ length: 7 }, (_, i) => {
        const data = new Date(hoje);
        data.setDate(hoje.getDate() - (6 - i));

        return {
          label: `${String(data.getDate()).padStart(2, "0")}/${String(
            data.getMonth() + 1,
          ).padStart(2, "0")}`,
          valor: 0,
        };
      });
    } else if (periodo === "mes") {
      // Este mês: todos os dias do mês atual
      const ano = hoje.getFullYear();
      const mes = hoje.getMonth();
      const quantidadeDias = new Date(ano, mes + 1, 0).getDate();

      pontos = Array.from({ length: quantidadeDias }, (_, i) => ({
        label: String(i + 1).padStart(2, "0"),
        valor: 0,
      }));
    } else {
      // Este ano: janeiro a dezembro
      const meses = [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
      ];

      pontos = meses.map((mes) => ({
        label: mes,
        valor: 0,
      }));
    }

    for (const venda of vendasFiltradas) {
      const data = dataDaVenda(venda);
      let indice = -1;

      if (periodo === "hoje") {
        indice = data.getHours();
      } else if (periodo === "7dias") {
        const diaVenda = new Date(data);
        diaVenda.setHours(0, 0, 0, 0);

        const diferenca = Math.round(
          (diaVenda.getTime() - (hoje.getTime() - 6 * 86400000)) / 86400000,
        );

        indice = diferenca;
      } else if (periodo === "mes") {
        indice = data.getDate() - 1;
      } else {
        indice = data.getMonth();
      }

      if (indice >= 0 && indice < pontos.length) {
        pontos[indice].valor += Number(venda.valor_total);
      }
    }

    return pontos;
  })();

  if (carregando) {
    return (
      <View style={styles.centralizado}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.textoAuxiliar}>Carregando vendas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={vendasFiltradas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => {
              setAtualizando(true);
              carregarVendas();
            }}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.cabecalho}>
              <Text style={styles.titulo}>Histórico de vendas</Text>
              <Text style={styles.subtitulo}>
                Consulte as vendas registradas na sua ótica.
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filtrosPeriodo}
              contentContainerStyle={styles.conteudoFiltros}
            >
              <TouchableOpacity
                style={[
                  styles.botaoPeriodo,
                  periodo === "hoje" && styles.botaoPeriodoAtivo,
                ]}
                onPress={() => setPeriodo("hoje")}
              >
                <Text
                  style={[
                    styles.textoPeriodo,
                    periodo === "hoje" && styles.textoPeriodoAtivo,
                  ]}
                >
                  Hoje
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.botaoPeriodo,
                  periodo === "7dias" && styles.botaoPeriodoAtivo,
                ]}
                onPress={() => setPeriodo("7dias")}
              >
                <Text
                  style={[
                    styles.textoPeriodo,
                    periodo === "7dias" && styles.textoPeriodoAtivo,
                  ]}
                >
                  Últimos 7 dias
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.botaoPeriodo,
                  periodo === "mes" && styles.botaoPeriodoAtivo,
                ]}
                onPress={() => setPeriodo("mes")}
              >
                <Text
                  style={[
                    styles.textoPeriodo,
                    periodo === "mes" && styles.textoPeriodoAtivo,
                  ]}
                >
                  Este mês
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.botaoPeriodo,
                  periodo === "ano" && styles.botaoPeriodoAtivo,
                ]}
                onPress={() => setPeriodo("ano")}
              >
                <Text
                  style={[
                    styles.textoPeriodo,
                    periodo === "ano" && styles.textoPeriodoAtivo,
                  ]}
                >
                  Este Ano
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.graficoCard}>
              <Text style={styles.tituloRanking}>Faturamento por período</Text>

              <Text style={styles.subtituloRanking}>
                Valores de acordo com o filtro selecionado.
              </Text>

              <View style={styles.grafico}>
                <Svg width="100%" height={220} viewBox="0 0 320 220">
                  <Line
                    x1="35"
                    y1="20"
                    x2="35"
                    y2="180"
                    stroke="#D1D5DB"
                    strokeWidth="1"
                  />

                  <Line
                    x1="35"
                    y1="180"
                    x2="305"
                    y2="180"
                    stroke="#D1D5DB"
                    strokeWidth="1"
                  />

                  {dadosGrafico.map((ponto, i) => {
                    const x =
                      35 + (i * 270) / Math.max(dadosGrafico.length - 1, 1);

                    const maximo = Math.max(
                      ...dadosGrafico.map((p) => p.valor),
                      1,
                    );

                    const y = 180 - (ponto.valor / maximo) * 140;

                    const intervalo =
                      periodo === "hoje"
                        ? 4
                        : periodo === "7dias"
                          ? 1
                          : periodo === "mes"
                            ? 5
                            : 1;

                    const mostrarData =
                      i % intervalo === 0 || i === dadosGrafico.length - 1;

                    return (
                      <React.Fragment key={`${ponto.label}-${i}`}>
                        <Circle cx={x} cy={y} r="3" fill="#2563EB" />

                        {mostrarData && (
                          <SvgText
                            x={x}
                            y={198}
                            fontSize={periodo === "mes" ? 8 : 9}
                            fill="#6B7280"
                            textAnchor="middle"
                          >
                            {ponto.label}
                          </SvgText>
                        )}
                      </React.Fragment>
                    );
                  })}

                  <Polyline
                    points={dadosGrafico
                      .map((ponto, i) => {
                        const x =
                          35 + (i * 270) / Math.max(dadosGrafico.length - 1, 1);

                        const maximo = Math.max(
                          ...dadosGrafico.map((p) => p.valor),
                          1,
                        );

                        const y = 180 - (ponto.valor / maximo) * 140;

                        return `${x},${y}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </Svg>
              </View>

              <Text style={styles.valorGrafico}>
                Total: {formatarPreco(faturamento)}
              </Text>
            </View>

            <View style={styles.ranking}>
              <Text style={styles.tituloRanking}>Produtos mais vendidos</Text>

              <Text style={styles.subtituloRanking}>
                Ordenados pela quantidade de unidades vendidas.
              </Text>

              {produtosMaisVendidos.length === 0 ? (
                <Text style={styles.textoAuxiliar}>
                  Ainda não há produtos vendidos para exibir.
                </Text>
              ) : (
                produtosMaisVendidos.slice(0, 5).map((produto, index) => (
                  <View key={produto.produto_id} style={styles.itemRanking}>
                    <View style={styles.posicaoRanking}>
                      <Text style={styles.textoPosicao}>{index + 1}º</Text>
                    </View>

                    <View style={styles.infoRanking}>
                      <Text style={styles.nomeRanking}>{produto.nome}</Text>

                      <Text style={styles.textoAuxiliar}>
                        {produto.quantidade} unidades vendidas
                      </Text>

                      <Text style={styles.textoAuxiliar}>
                        Faturamento: {formatarPreco(produto.faturamento)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={styles.resumo}>
              <Text style={styles.textoAuxiliar}>
                Total de vendas registradas
              </Text>

              <Text style={styles.numero}>{vendas.length}</Text>

              <View style={styles.indicador}>
                <Text style={styles.textoAuxiliar}>Vendas de hoje</Text>
                <Text style={styles.numeroPequeno}>{vendasHoje.length}</Text>
              </View>

              <View style={styles.indicador}>
                <Text style={styles.textoAuxiliar}>Faturamento de hoje</Text>
                <Text style={styles.faturamento}>
                  {formatarPreco(faturamentoHoje)}
                </Text>
              </View>

              <View style={styles.indicador}>
                <Text style={styles.textoAuxiliar}>Faturamento do mês</Text>
                <Text style={styles.faturamento}>
                  {formatarPreco(faturamentoMes)}
                </Text>
              </View>

              <View style={styles.indicador}>
                <Text style={styles.textoAuxiliar}>Ticket médio</Text>
                <Text style={styles.faturamento}>
                  {formatarPreco(ticketMedio)}
                </Text>
              </View>

              <View style={styles.indicador}>
                <Text style={styles.textoAuxiliar}>Faturamento acumulado</Text>
                <Text style={styles.faturamento}>
                  {formatarPreco(faturamento)}
                </Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.vazio}>Nenhuma venda registrada ainda.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.linha}>
              <Text style={styles.valor}>
                {formatarPreco(Number(item.valor_total))}
              </Text>

              <View style={styles.acoesVenda}>
                <Text style={styles.pagamento}>{item.forma_pagamento}</Text>

                <Pressable
                  onPress={() => {
                    Alert.alert(
                      "Opções da venda",
                      `Venda ${item.id.slice(0, 8)}`,
                      [
                        {
                          text: "Cancelar",
                          style: "cancel",
                        },
                        {
                          text: "Editar venda",
                          onPress: () => {
                            Alert.alert(
                              "Em desenvolvimento",
                              "Vamos implementar a edição da venda no próximo passo.",
                            );
                          },
                        },
                        {
                          text: "Excluir venda",
                          style: "destructive",
                          onPress: () => {
                            Alert.alert(
                              "Em desenvolvimento",
                              "Vamos implementar a exclusão com atualização segura do estoque.",
                            );
                          },
                        },
                      ],
                    );
                  }}
                  style={styles.botaoOpcoes}
                >
                  <Text style={styles.textoOpcoes}>⋮</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.data}>
              {formatarData(item.data_venda || item.created_at)}
            </Text>

            <Text style={styles.identificador}>
              Venda: {item.id.slice(0, 8)}
            </Text>
          </View>
        )}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.botaoVoltar}
            onPress={() => router.back()}
          >
            <Text style={styles.textoBotao}>Voltar ao painel</Text>
          </TouchableOpacity>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  centralizado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    padding: 20,
  },

  cabecalho: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
  },

  titulo: {
    fontSize: 25,
    fontWeight: "700",
    color: "#0F172A",
    flexShrink: 1,
  },

  subtitulo: {
    marginTop: 6,
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 1,
  },

  resumo: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  textoAuxiliar: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    flexShrink: 1,
  },

  numero: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
    marginVertical: 4,
  },

  faturamento: {
    fontSize: 23,
    fontWeight: "700",
    color: "#15803D",
    marginTop: 4,
    flexShrink: 1,
  },

  observacao: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 8,
  },

  lista: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 24,
    flexGrow: 1,
  },

  card: {
    padding: 14,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  linha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },

  valor: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    flexShrink: 1,
  },

  pagamento: {
    fontSize: 12,
    color: "#2563EB",
    flexShrink: 1,
  },

  data: {
    marginTop: 8,
    fontSize: 13,
    color: "#475569",
  },

  identificador: {
    marginTop: 5,
    fontSize: 11,
    color: "#94A3B8",
  },

  vazio: {
    textAlign: "center",
    padding: 24,
    color: "#64748B",
    lineHeight: 20,
  },

  botaoVoltar: {
    padding: 16,
    marginTop: 8,
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    minHeight: 52,
  },

  textoBotao: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 15,
    textAlign: "center",
  },

  indicador: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },

  numeroPequeno: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 4,
  },

  ranking: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  tituloRanking: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    flexShrink: 1,
  },

  subtituloRanking: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 18,
    flexShrink: 1,
  },

  itemRanking: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 12,
  },

  posicaoRanking: {
    width: 36,
    height: 36,
    flexShrink: 0,
    borderRadius: 10,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },

  textoPosicao: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1D4ED8",
  },

  infoRanking: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },

  nomeRanking: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    flexShrink: 1,
  },

  filtrosPeriodo: {
    marginTop: 12,
    marginBottom: 16,
    flexGrow: 0,
    flexShrink: 0,
    height: 48,
  },

  conteudoFiltros: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
  },

  botaoPeriodo: {
    minWidth: 110,
    height: 42,
    flexShrink: 0,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  botaoPeriodoAtivo: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },

  textoPeriodo: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },

  textoPeriodoAtivo: {
    color: "#FFFFFF",
  },

  graficoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  grafico: {
    width: "100%",
    marginTop: 12,
    alignItems: "center",
  },

  valorGrafico: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2563EB",
    marginTop: 8,
    textAlign: "center",
    flexShrink: 1,
  },

  acoesVenda: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    flexShrink: 1,
  },

  botaoOpcoes: {
    width: 40,
    height: 40,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },

  textoOpcoes: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2563EB",
    lineHeight: 32,
  },
});
