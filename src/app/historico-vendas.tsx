import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
  const [periodo, setPeriodo] = useState<"hoje" | "7dias" | "mes">("hoje");
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
    } else {
      inicio.setDate(1);
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
  } else {
    inicioPeriodo.setDate(1);
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
      </ScrollView>

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
        <Text style={styles.textoAuxiliar}>Total de vendas registradas</Text>
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
          <Text style={styles.faturamento}>{formatarPreco(ticketMedio)}</Text>
        </View>

        <View style={styles.indicador}>
          <Text style={styles.textoAuxiliar}>Faturamento acumulado</Text>
          <Text style={styles.faturamento}>{formatarPreco(faturamento)}</Text>
        </View>
      </View>

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
        ListEmptyComponent={
          <Text style={styles.vazio}>Nenhuma venda registrada ainda.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.linha}>
              <Text style={styles.valor}>
                {formatarPreco(Number(item.valor_total))}
              </Text>
              <Text style={styles.pagamento}>{item.forma_pagamento}</Text>
            </View>

            <Text style={styles.data}>
              {formatarData(item.data_venda || item.created_at)}
            </Text>

            <Text style={styles.identificador}>
              Venda: {item.id.slice(0, 8)}
            </Text>
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.botaoVoltar}
        onPress={() => router.back()}
      >
        <Text style={styles.textoBotao}>Voltar ao painel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  centralizado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  cabecalho: {
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  titulo: { fontSize: 25, fontWeight: "700", color: "#0F172A" },
  subtitulo: { marginTop: 6, color: "#64748B", fontSize: 14 },
  resumo: {
    margin: 16,
    marginBottom: 4,
    padding: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  textoAuxiliar: { color: "#64748B", fontSize: 13 },
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
  },
  observacao: { color: "#64748B", fontSize: 11, marginTop: 8 },
  lista: { padding: 16, paddingTop: 12, paddingBottom: 24, flexGrow: 1 },
  card: {
    padding: 16,
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
    gap: 8,
  },
  valor: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  pagamento: { fontSize: 12, color: "#2563EB" },
  data: { marginTop: 8, fontSize: 13, color: "#475569" },
  identificador: { marginTop: 5, fontSize: 11, color: "#94A3B8" },
  vazio: {
    textAlign: "center",
    padding: 24,
    color: "#64748B",
  },
  botaoVoltar: {
    padding: 16,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
  },
  textoBotao: { color: "#2563EB", fontWeight: "700", fontSize: 15 },

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
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tituloRanking: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtituloRanking: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 12,
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
    gap: 3,
  },
  nomeRanking: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },

  filtrosPeriodo: {
    marginTop: 16,
    marginBottom: 20,
    flexGrow: 0,
    flexShrink: 0,
    height: 50,
  },

  conteudoFiltros: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 2,
  },

  botaoPeriodo: {
    width: 145,
    height: 46,
    flexShrink: 0,
    paddingHorizontal: 12,
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
  },
  textoPeriodoAtivo: {
    color: "#FFFFFF",
  },
});
