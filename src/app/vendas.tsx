import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

export default function Vendas() {
  const router = useRouter();

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [quantidades, setQuantidades] = useState<Record<string, string>>({});
  const [formaPagamento, setFormaPagamento] = useState("PIX");
  const [carregando, setCarregando] = useState(true);

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
      </View>

      <FlatList
        data={produtos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
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
        ListFooterComponent={
          <View style={styles.rodape}>
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

            <TouchableOpacity
              style={styles.botaoRegistrar}
              onPress={revisarVenda}
            >
              <Text style={styles.textoBotao}>Conferir venda</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botaoVoltar}
              onPress={() => router.back()}
            >
              <Text style={styles.textoVoltar}>Voltar</Text>
            </TouchableOpacity>
          </View>
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
  },
  textoCarregando: {
    marginTop: 12,
    color: "#64748B",
  },
  cabecalho: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  infoProduto: {
    flex: 1,
    paddingRight: 10,
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
  },
  label: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 6,
  },
  inputQuantidade: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    textAlign: "center",
    color: "#0F172A",
  },
  rodape: {
    marginTop: 8,
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
    gap: 8,
  },
  opcaoPagamento: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
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
    marginTop: 20,
    padding: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  textoTotal: {
    color: "#64748B",
    fontSize: 14,
  },
  valorTotal: {
    marginTop: 6,
    fontSize: 28,
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
    padding: 16,
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 10,
  },
  textoBotao: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  botaoVoltar: {
    marginTop: 10,
    padding: 14,
    alignItems: "center",
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
});
