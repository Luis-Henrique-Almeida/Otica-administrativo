import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

const formasPagamento = [
  "PIX",
  "Dinheiro",
  "Cartão de crédito",
  "Cartão de débito",
];

export default function EditarVenda() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [quantidades, setQuantidades] = useState<Record<string, string>>({});
  const [formaPagamento, setFormaPagamento] = useState("PIX");
  const [buscaProduto, setBuscaProduto] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, [id]);

  async function carregarDados() {
    try {
      setCarregando(true);

      if (!id || typeof id !== "string") {
        throw new Error("Identificador da venda inválido.");
      }

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error("Faça login novamente.");
      }

      const { data: perfil, error: perfilError } = await supabase
        .from("usuarios")
        .select("otica_id, ativo")
        .eq("id", authData.user.id)
        .single();

      if (perfilError) throw perfilError;

      if (!perfil?.ativo || !perfil.otica_id) {
        throw new Error("Usuário inativo ou sem ótica vinculada.");
      }

      const { data: venda, error: vendaError } = await supabase
        .from("vendas")
        .select("id, forma_pagamento")
        .eq("id", id)
        .eq("otica_id", perfil.otica_id)
        .single();

      if (vendaError) throw vendaError;

      const { data: itens, error: itensError } = await supabase
        .from("itens_venda")
        .select("produto_id, quantidade")
        .eq("venda_id", id);

      if (itensError) throw itensError;

      const { data: listaProdutos, error: produtosError } = await supabase
        .from("produtos")
        .select("id, nome, preco, estoque, ativo")
        .eq("otica_id", perfil.otica_id)
        .eq("ativo", true)
        .order("nome");

      if (produtosError) throw produtosError;

      const quantidadesIniciais: Record<string, string> = {};

      (itens ?? []).forEach((item) => {
        quantidadesIniciais[item.produto_id] = String(
          Number(quantidadesIniciais[item.produto_id] || 0) + item.quantidade,
        );
      });

      setProdutos((listaProdutos ?? []) as Produto[]);
      setQuantidades(quantidadesIniciais);
      setFormaPagamento(venda.forma_pagamento);
    } catch (error) {
      Alert.alert(
        "Erro ao carregar venda",
        error instanceof Error ? error.message : "Não foi possível carregar.",
        [{ text: "Voltar", onPress: () => router.back() }],
      );
    } finally {
      setCarregando(false);
    }
  }

  function alterarQuantidade(idProduto: string, valor: string) {
    setQuantidades((anterior) => ({
      ...anterior,
      [idProduto]: valor.replace(/[^0-9]/g, ""),
    }));
  }

  function formatarPreco(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  const produtosSelecionados = useMemo(
    () =>
      produtos
        .map((produto) => ({
          produto,
          quantidade: Number(quantidades[produto.id] || 0),
        }))
        .filter((item) => item.quantidade > 0),
    [produtos, quantidades],
  );

  const total = produtosSelecionados.reduce(
    (soma, item) => soma + Number(item.produto.preco) * item.quantidade,
    0,
  );

  async function salvarEdicao() {
    if (produtosSelecionados.length === 0) {
      Alert.alert("Atenção", "Selecione pelo menos um produto.");
      return;
    }

    try {
      setSalvando(true);

      const itens = produtosSelecionados.map((item) => ({
        produto_id: item.produto.id,
        quantidade: item.quantidade,
      }));

      const { error } = await supabase.rpc("editar_venda", {
        p_venda_id: id,
        p_itens: itens,
        p_forma_pagamento: formaPagamento,
      });

      if (error) throw error;

      Alert.alert("Venda atualizada!", `Novo total: ${formatarPreco(total)}`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert(
        "Erro ao editar venda",
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a venda.",
      );
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <View style={styles.centralizado}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.auxiliar}>Carregando venda...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cabecalho}>
        <Text style={styles.titulo}>Editar venda</Text>
        <Text style={styles.subtitulo}>
          Altere os produtos, quantidades ou pagamento.
        </Text>

        <TextInput
          style={styles.busca}
          placeholder="Buscar produto pelo nome..."
          placeholderTextColor="#94A3B8"
          value={buscaProduto}
          onChangeText={setBuscaProduto}
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
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={styles.auxiliar}>Nenhum produto encontrado.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.infoProduto}>
              <Text style={styles.nomeProduto}>{item.nome}</Text>
              <Text style={styles.preco}>
                {formatarPreco(Number(item.preco))}
              </Text>
              <Text style={styles.estoque}>Estoque atual: {item.estoque}</Text>
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
      >
        <Text style={styles.labelPagamento}>Forma de pagamento</Text>

        <View style={styles.pagamentos}>
          {formasPagamento.map((forma) => (
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
          ))}
        </View>

        <View style={styles.resumo}>
          <Text style={styles.textoTotal}>Novo total da venda</Text>
          <Text style={styles.valorTotal}>{formatarPreco(total)}</Text>
          <Text style={styles.auxiliar}>
            {produtosSelecionados.length} produto(s) selecionado(s)
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.botaoSalvar, salvando && styles.botaoDesabilitado]}
          onPress={salvarEdicao}
          disabled={salvando}
        >
          <Text style={styles.textoBotao}>
            {salvando ? "Salvando..." : "Salvar alterações"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.botaoVoltar}
          onPress={() => router.back()}
          disabled={salvando}
        >
          <Text style={styles.textoVoltar}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  centralizado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  cabecalho: {
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 12,
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
  busca: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
    color: "#0F172A",
  },
  lista: {
    paddingBottom: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  infoProduto: {
    flex: 1,
    paddingRight: 12,
  },
  nomeProduto: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  preco: {
    marginTop: 5,
    color: "#2563EB",
    fontWeight: "600",
  },
  estoque: {
    marginTop: 5,
    fontSize: 12,
    color: "#64748B",
  },
  quantidadeContainer: {
    width: 100,
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 6,
  },
  inputQuantidade: {
    width: "100%",
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 8,
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
  },
  rodapeConteudo: {
    paddingTop: 6,
    paddingBottom: 16,
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
    padding: 8,
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
  auxiliar: {
    marginTop: 8,
    color: "#64748B",
    textAlign: "center",
  },
  botaoSalvar: {
    marginTop: 16,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: 12,
  },
  botaoDesabilitado: {
    opacity: 0.6,
  },
  textoBotao: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  botaoVoltar: {
    marginTop: 8,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
  },
  textoVoltar: {
    color: "#475569",
    fontWeight: "600",
  },
});
