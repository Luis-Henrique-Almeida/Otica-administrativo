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
  limite_estoque_baixo: number;
};

export default function Produtos() {
  const router = useRouter();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");

  async function alterarStatusProduto(item: Produto) {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      Alert.alert("Sessão encerrada", "Faça login novamente.");
      router.replace("/");
      return;
    }

    const { data: perfil, error: perfilError } = await supabase
      .from("usuarios")
      .select("otica_id, ativo")
      .eq("id", authData.user.id)
      .single();

    if (perfilError || !perfil || !perfil.ativo || !perfil.otica_id) {
      Alert.alert("Erro", "Não foi possível validar sua ótica.");
      return;
    }

    const novoStatus = !item.ativo;

    Alert.alert(
      novoStatus ? "Reativar produto" : "Desativar produto",
      `Deseja realmente ${novoStatus ? "reativar" : "desativar"} "${item.nome}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            const { data: atualizado, error } = await supabase
              .from("produtos")
              .update({ ativo: novoStatus })
              .eq("id", item.id)
              .eq("otica_id", perfil.otica_id)
              .select("id")
              .maybeSingle();

            if (error) {
              Alert.alert("Erro ao alterar status", error.message);
              return;
            }

            if (!atualizado) {
              Alert.alert(
                "Não foi possível alterar",
                "O produto não foi encontrado ou você não tem permissão.",
              );
              return;
            }

            await carregarProdutos();
            Alert.alert(
              "Sucesso",
              `Produto ${novoStatus ? "reativado" : "desativado"}!`,
            );
          },
        },
      ],
    );
  }

  async function carregarProdutos() {
    try {
      setCarregando(true);

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.replace("/");
        return;
      }

      const { data: perfil, error: perfilError } = await supabase
        .from("usuarios")
        .select("otica_id, ativo")
        .eq("id", authData.user.id)
        .single();

      if (perfilError || !perfil || !perfil.ativo || !perfil.otica_id) {
        Alert.alert("Erro", "Não foi possível identificar sua ótica.");
        return;
      }

      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, preco, estoque, ativo, limite_estoque_baixo")
        .eq("otica_id", perfil.otica_id)
        .order("nome");

      if (error) {
        Alert.alert("Erro ao carregar produto", error.message);
        return;
      }

      setProdutos(data ?? []);
    } catch (erro) {
      Alert.alert("Erro", String(erro));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarProdutos();
  }, []);

  function formatarPreco(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function renderizarProduto({ item }: { item: Produto }) {
    return (
      <View style={styles.produto}>
        <View style={styles.info}>
          <Text style={styles.nome}>{item.nome}</Text>
          <Text style={styles.preco}>{formatarPreco(Number(item.preco))}</Text>

          <Text style={styles.estoque}>Estoque: {item.estoque} unidades</Text>

          <View
            style={[
              styles.alertaEstoque,
              {
                backgroundColor:
                  item.estoque === 0
                    ? "#FEE2E2"
                    : item.estoque <= (item.limite_estoque_baixo ?? 5)
                      ? "#FEF3C7"
                      : "#DCFCE7",
              },
            ]}
          >
            <Text
              style={{
                color:
                  item.estoque === 0
                    ? "#991B1B"
                    : item.estoque <= (item.limite_estoque_baixo ?? 5)
                      ? "#92400E"
                      : "#166534",

                fontWeight: "600",
                fontSize: 12,
              }}
            >
              {item.estoque === 0
                ? "Esgotado"
                : item.estoque <= (item.limite_estoque_baixo ?? 5)
                  ? "Estoque baixo"
                  : "Em estoque"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.botaoEditar}
            onPress={() =>
              router.push({
                pathname: "/editar-produto",
                params: { id: item.id },
              })
            }
            activeOpacity={0.7}
          >
            <Text style={styles.botaoEditarTexto}>Editar produto</Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.status,
            { backgroundColor: item.ativo ? "#dcfce7" : "#fee2e2" },
          ]}
        >
          <Text style={{ color: item.ativo ? "#166534" : "#991b1b" }}>
            {item.ativo ? "Ativo" : "Inativo"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.voltar}>‹ Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.titulo}>Produtos e estoque</Text>
        <Text style={styles.subtitulo}>Produtos cadastrados na sua ótica</Text>
      </View>

      <View style={styles.acoes}>
        <TouchableOpacity
          style={styles.botaoNovo}
          onPress={() => router.push("/cadastro-produto")}
          activeOpacity={0.7}
        >
          <Text style={styles.botaoNovoTexto}>+ Novo produto</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.botao}
          onPress={carregarProdutos}
          disabled={carregando}
          activeOpacity={0.7}
        >
          <Text style={styles.botaoTexto}>Atualizar produtos</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.campoBusca}
        placeholder="Buscar produto pelo nome:"
        placeholderTextColor="#9CA3AF"
        value={busca}
        onChangeText={setBusca}
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />

      {carregando ? (
        <ActivityIndicator size="large" color="#111827" />
      ) : (
        <FlatList
          data={produtos.filter((produto) =>
            produto.nome.toLowerCase().includes(busca.trim().toLowerCase()),
          )}
          keyExtractor={(item) => item.id}
          renderItem={renderizarProduto}
          contentContainerStyle={styles.lista}
          refreshing={carregando}
          onRefresh={carregarProdutos}
          ListEmptyComponent={
            <Text style={styles.vazio}>Nenhum produto encontrado.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    padding: 20,
    paddingTop: 55,
  },
  cabecalho: {
    marginBottom: 22,
  },
  voltar: {
    color: "#4b5563",
    fontSize: 16,
    marginBottom: 18,
  },
  titulo: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#111827",
  },
  subtitulo: {
    color: "#6b7280",
    marginTop: 6,
  },
  botao: {
    backgroundColor: "#111827",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 18,
  },
  botaoTexto: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  lista: {
    paddingBottom: 30,
  },
  produto: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  info: {
    flex: 1,
  },
  nome: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#111827",
  },
  preco: {
    color: "#15803d",
    fontSize: 16,
    marginTop: 7,
    fontWeight: "600",
  },
  estoque: {
    color: "#6b7280",
    marginTop: 5,
  },
  status: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  vazio: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 30,
  },

  acoes: {
    gap: 10,
    marginBottom: 16,
  },
  botaoNovo: {
    backgroundColor: "#111827",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  botaoNovoTexto: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },

  botaoEditar: {
    backgroundColor: "#E5E7EB",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 10,
  },
  botaoEditarTexto: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },

  botaoStatus: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 8,
  },

  alertaEstoque: {
    alignSelf: "flex-start",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginTop: 8,
  },

  campoBusca: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    marginBottom: 14,
  },
});
