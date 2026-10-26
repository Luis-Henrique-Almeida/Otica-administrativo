import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../supabase";

type Produto = {
  id: string;
  nome: string;
  preco: number;
  estoque: number;
  ativo: boolean;
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    width: "100%",
    alignSelf: "center",
  },
  centralizado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  textoCarregando: {
    marginTop: 12,
    color: "#64748B",
  },
  cabecalho: {
    width: "100%",
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 16,
  },
  titulo: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtitulo: {
    marginTop: 6,
    fontSize: 14,
    color: "#64748B",
  },
  lista: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  infoProduto: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  nomeProduto: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  preco: {
    marginTop: 5,
    fontSize: 15,
    fontWeight: "600",
    color: "#2563EB",
  },
  estoque: {
    marginTop: 5,
    fontSize: 12,
    color: "#64748B",
  },
  quantidadeContainer: {
    width: 100,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 6,
    textAlign: "center",
  },

  inputQuantidade: {
    width: "100%",
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: "center",
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },

  rodape: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: "55%",
    marginTop: 6,
    backgroundColor: "#F8FAFC",
  },

  rodapeConteudo: {
    paddingTop: 6,
    paddingBottom: 12,
  },

  labelPagamento: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 10,
  },

  pagamentos: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 6,
  },

  opcaoPagamento: {
    width: "48%",
    minHeight: 40,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  opcaoSelecionada: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
  },
  textoOpcao: {
    color: "#334155",
    fontSize: 13,
  },
  textoSelecionado: {
    color: "#1D4ED8",
    fontWeight: "600",
  },
  resumo: {
    marginTop: 14,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  textoTotal: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "500",
  },

  valorTotal: {
    marginTop: 6,
    fontSize: 30,
    fontWeight: "700",
    color: "#0F172A",
  },

  resumoItens: {
    marginTop: 6,
    color: "#64748B",
    fontSize: 13,
  },
  botaoRegistrar: {
    marginTop: 16,
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: 12,
  },

  textoBotao: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  botaoVoltar: {
    marginTop: 8,
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
  },
  textoVoltar: {
    color: "#475569",
    fontWeight: "600",
  },
  vazio: {
    textAlign: "center",
    color: "#64748B",
    padding: 24,
  },
  campoBusca: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginTop: 16,
    marginBottom: 12,
  },
});

export default function Vendas() {
  const router = useRouter();

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [quantidades, setQuantidades] = useState<Record<string, string>>({});
  const [formaPagamento, setFormaPagamento] = useState("PIX");
  const [carregando, setCarregando] = useState(true);
  const [buscaProduto, setBuscaProduto] = useState("");

  useEffect(() => {
    carregarProdutos();
  }, []);

  async function carregarProdutos() {
    try {
      setCarregando(true);

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
        .from("produtos")
        .select("id, nome, preco, estoque, ativo")
        .eq("otica_id", perfil.otica_id)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;

      setProdutos((data ?? []) as Produto[]);
    } catch (error) {
      Alert.alert(
        "Erro",
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os produtos.",
      );
    } finally {
      setCarregando(false);
    }
  }

  function alterarQuantidade(id: string, valor: string) {
    const somenteNumeros = valor.replace(/[^0-9]/g, "");

    setQuantidades((anterior) => ({
      ...anterior,
      [id]: somenteNumeros,
    }));
  }

  function formatarPreco(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  const itensSelecionados = produtos
    .map((produto) => ({
      produto,
      quantidade: Number(quantidades[produto.id] || 0),
    }))
    .filter((item) => item.quantidade > 0);

  const total = itensSelecionados.reduce(
    (soma, item) => soma + Number(item.produto.preco) * item.quantidade,
    0,
  );

  async function revisarVenda() {
    if (itensSelecionados.length === 0) {
      Alert.alert("Atenção", "Selecione pelo menos um produto.");
      return;
    }

    const itemSemEstoque = itensSelecionados.find(
      (item) => item.quantidade > item.produto.estoque,
    );

    if (itemSemEstoque) {
      Alert.alert(
        "Estoque insuficiente",
        `O produto "${itemSemEstoque.produto.nome}" tem apenas ${itemSemEstoque.produto.estoque} unidade(s).`,
      );
      return;
    }

    try {
      const itens = itensSelecionados.map((item) => ({
        produto_id: item.produto.id,
        quantidade: item.quantidade,
      }));

      const { data, error } = await supabase.rpc("registrar_venda", {
        p_itens: itens,
        p_forma_pagamento: formaPagamento,
      });

      if (error) throw error;

      Alert.alert(
        "Venda registrada!",
        `Venda registrada com sucesso.\nTotal: ${formatarPreco(total)}`,
        [
          {
            text: "OK",
            onPress: () => {
              setQuantidades({});
              carregarProdutos();
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "Erro ao registrar venda",
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a venda.",
      );
    }
  }

  if (carregando) {
    return (
      <View style={styles.centralizado}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.textoCarregando}>Carregando produtos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cabecalho}>
        <Text style={styles.titulo}>Registrar venda</Text>
        <Text style={styles.subtitulo}>
          Selecione os produtos e informe as quantidades.
        </Text>

        <TextInput
          style={styles.campoBusca}
          placeholder="Buscar produto pelo nome:"
          placeholderTextColor="#9CA3AF"
          value={buscaProduto}
          onChangeText={setBuscaProduto}
          autoCapitalize="none"
        />
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={produtos.filter((produto) =>
          produto.nome
            .toLowerCase()
            .includes(buscaProduto.trim().toLowerCase()),
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        nestedScrollEnabled
        ListEmptyComponent={
          <Text style={styles.vazio}>Nenhum produto encontrado.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.infoProduto}>
              <Text style={styles.nomeProduto}>{item.nome}</Text>
              <Text style={styles.preco}>
                {formatarPreco(Number(item.preco))}
              </Text>
              <Text style={styles.estoque}>
                Estoque disponível: {item.estoque}
              </Text>
            </View>

            <View style={styles.quantidadeContainer}>
              <Text style={styles.label}>Quantidade</Text>
              <TextInput
                style={styles.inputQuantidade}
                value={quantidades[item.id] ?? ""}
                onChangeText={(valor) => alterarQuantidade(item.id, valor)}
                keyboardType="number-pad"
                placeholder="0"
              />
            </View>
          </View>
        )}
      />

      <ScrollView
        style={styles.rodape}
        contentContainerStyle={styles.rodapeConteudo}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.labelPagamento}>Forma de pagamento</Text>

        <View style={styles.pagamentos}>
          {["PIX", "Dinheiro", "Cartão de crédito", "Cartão de débito"].map(
            (forma) => (
              <TouchableOpacity
                key={forma}
                style={[
                  styles.opcaoPagamento,
                  formaPagamento === forma && styles.opcaoSelecionada,
                ]}
                onPress={() => setFormaPagamento(forma)}
              >
                <Text
                  style={[
                    styles.textoOpcao,
                    formaPagamento === forma && styles.textoSelecionado,
                  ]}
                >
                  {forma}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </View>

        <View style={styles.resumo}>
          <Text style={styles.textoTotal}>Total da venda</Text>
          <Text style={styles.valorTotal}>{formatarPreco(total)}</Text>
          <Text style={styles.resumoItens}>
            {itensSelecionados.length} produto(s) selecionado(s)
          </Text>
        </View>

        <TouchableOpacity style={styles.botaoRegistrar} onPress={revisarVenda}>
          <Text style={styles.textoBotao}>Registrar venda</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.botaoVoltar}
          onPress={() => router.back()}
        >
          <Text style={styles.textoVoltar}>Voltar</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
