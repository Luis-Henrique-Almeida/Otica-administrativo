import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../supabase";

export default function Dashboard() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [totalProdutos, setTotalProdutos] = useState(0);
  const [estoqueBaixo, setEstoqueBaixo] = useState(0);
  const [produtosEsgotados, setProdutosEsgotados] = useState(0);
  const [totalVendas, setTotalVendas] = useState(0);
  const [faturamento, setFaturamento] = useState(0);

  const [vendasHoje, setVendasHoje] = useState(0);
  const [faturamentoHoje, setFaturamentoHoje] = useState(0);
  const [faturamentoMes, setFaturamentoMes] = useState(0);
  const [ticketMedio, setTicketMedio] = useState(0);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarDashboard();
  }, []);

  async function carregarDashboard() {
    try {
      const { data: usuarioData, error: usuarioErro } =
        await supabase.auth.getUser();

      if (usuarioErro || !usuarioData.user) {
        router.replace("/");
        return;
      }

      const { data: perfil, error: perfilErro } = await supabase
        .from("usuarios")
        .select("nome, otica_id, ativo")
        .eq("id", usuarioData.user.id)
        .single();

      if (perfilErro || !perfil || !perfil.ativo) {
        Alert.alert("Erro", "Não foi possível carregar seu perfil.");
        return;
      }

      setNome(perfil.nome);

      const { data: produtos, error: produtosErro } = await supabase
        .from("produtos")
        .select("id, estoque, limite_estoque_baixo")
        .eq("otica_id", perfil.otica_id)
        .eq("ativo", true);

      if (produtosErro) throw produtosErro;

      setTotalProdutos(produtos?.length ?? 0);

      setEstoqueBaixo(
        produtos?.filter(
          (produto) =>
            produto.estoque > 0 &&
            produto.estoque <= (produto.limite_estoque_baixo ?? 5),
        ).length ?? 0,
      );

      setProdutosEsgotados(
        produtos?.filter((produto) => produto.estoque === 0).length ?? 0,
      );

      const { data: vendas, error: vendasErro } = await supabase
        .from("vendas")
        .select("valor_total, data_venda, created_at")
        .eq("otica_id", perfil.otica_id);

      if (vendasErro) throw vendasErro;

      const listaVendas = vendas ?? [];

      const agora = new Date();

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

      const vendasDoDia = listaVendas.filter((venda) => {
        const data = new Date(venda.data_venda || venda.created_at);
        return data >= inicioHoje && data < inicioAmanha;
      });

      const vendasDoMes = listaVendas.filter((venda) => {
        const data = new Date(venda.data_venda || venda.created_at);
        return data >= inicioMes && data < inicioAmanha;
      });

      const totalFaturamento = listaVendas.reduce(
        (soma, venda) => soma + Number(venda.valor_total),
        0,
      );

      const totalHoje = vendasDoDia.reduce(
        (soma, venda) => soma + Number(venda.valor_total),
        0,
      );

      const totalMes = vendasDoMes.reduce(
        (soma, venda) => soma + Number(venda.valor_total),
        0,
      );

      setTotalVendas(listaVendas.length);
      setFaturamento(totalFaturamento);
      setVendasHoje(vendasDoDia.length);
      setFaturamentoHoje(totalHoje);
      setFaturamentoMes(totalMes);
      setTicketMedio(
        listaVendas.length > 0 ? totalFaturamento / listaVendas.length : 0,
      );
    } catch (erro) {
      console.error("Erro ao carregar dashboard:", erro);
      Alert.alert("Erro", "Não foi possível carregar os dados.");
    } finally {
      setCarregando(false);
    }
  }

  async function sair() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert("Erro", "Não foi possível sair da conta.");
      return;
    }

    router.replace("/");
  }

  if (carregando) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.loadingText}>Carregando painel...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Vision</Text>
          <Text style={styles.subtitle}>
            Painel administrativo da usa ótica!
          </Text>
        </View>

        <TouchableOpacity onPress={sair} style={styles.logout}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.welcome}>Olá, {nome}!</Text>
      <Text style={styles.description}>Confira o resumo da sua ótica.</Text>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Produtos ativos</Text>
          <Text style={styles.cardValue}>{totalProdutos}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Estoque baixo</Text>
          <Text style={styles.cardValue}>{estoqueBaixo}</Text>
          <Text style={styles.cardHint}>No limite definido</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Produtos esgotados</Text>
          <Text style={styles.cardValue}>{produtosEsgotados}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.menuCard, { marginTop: 12 }]}
        onPress={() => router.push("/produtos")}
        activeOpacity={0.7}
      >
        <Text style={styles.menuTitle}>Produtos e estoque</Text>
        <Text style={styles.menuDescription}>
          Consulte os produtos cadastrados, quantidades e níveis de estoque.
        </Text>
      </TouchableOpacity>

      <View style={styles.menuCard}>
        <Text style={styles.menuTitle}>Vendas</Text>
        <Text style={styles.menuDescription}>
          Registre vendas e atualize o estoque automaticamente.
        </Text>

        <TouchableOpacity
          style={styles.botao}
          onPress={() => router.push("/vendas")}
        >
          <Text style={styles.textoBotao}>Registrar venda</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.menuCard}
        onPress={() => router.push("/historico-vendas")}
        activeOpacity={0.7}
      >
        <Text style={styles.menuTitle}>Histórico de vendas</Text>
        <Text style={styles.menuDescription}>
          Consulte as vendas realizadas e o faturamento acumulado.
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    padding: 20,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
  loadingText: {
    marginTop: 12,
    color: "#4b5563",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 30,
  },
  brand: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#111827",
  },
  subtitle: {
    color: "#6b7280",
    marginTop: 4,
  },
  logout: {
    backgroundColor: "#e5e7eb",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  logoutText: {
    color: "#111827",
    fontWeight: "600",
  },
  welcome: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#111827",
  },
  description: {
    color: "#6b7280",
    marginTop: 6,
    marginBottom: 24,
  },
  grid: {
    gap: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardLabel: {
    color: "#6b7280",
    fontSize: 14,
  },
  cardValue: {
    color: "#111827",
    fontSize: 25,
    fontWeight: "bold",
    marginTop: 10,
  },
  cardHint: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 30,
    marginBottom: 14,
  },
  menuCard: {
    backgroundColor: "#ffffff",
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },
  menuDescription: {
    color: "#6b7280",
    marginTop: 6,
    lineHeight: 20,
  },

  botao: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },

  textoBotao: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
