import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
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
  limite_estoque_baixo: number;
};

export default function EditarProduto() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [estoque, setEstoque] = useState("");
  const [oticaId, setOticaId] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [limiteEstoqueBaixo, setLimiteEstoqueBaixo] = useState("5");

  useEffect(() => {
    carregarProduto();
  }, [id]);

  async function carregarProduto() {
    if (!id || Array.isArray(id)) {
      Alert.alert("Erro", "Produto não identificado.");
      router.back();
      return;
    }

    setCarregando(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

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
        Alert.alert("Erro", "Não foi possível identificar sua ótica.");
        return;
      }

      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, preco, estoque, ativo, limite_estoque_baixo")
        .eq("id", id)
        .eq("otica_id", perfil.otica_id)
        .single();

      if (error || !data) {
        Alert.alert("Erro", "Não foi possível carregar esse produto.");
        return;
      }

      const produto = data as Produto;

      setOticaId(perfil.otica_id);
      setNome(produto.nome);
      setPreco(String(produto.preco).replace(".", ","));
      setEstoque(String(produto.estoque));
      setAtivo(produto.ativo);
      setLimiteEstoqueBaixo(String(produto.limite_estoque_baixo ?? 5));
    } catch (erro) {
      Alert.alert("Erro inesperado", String(erro));
    } finally {
      setCarregando(false);
    }
  }

  async function salvarAlteracoes() {
    const nomeLimpo = nome.trim();
    const precoNumerico = Number(preco.trim().replace(",", "."));
    const estoqueNumerico = Number(estoque.trim());

    if (!nomeLimpo || !preco.trim() || !estoque.trim()) {
      Alert.alert("Atenção", "Preencha todos os campos.");
      return;
    }

    if (!Number.isFinite(precoNumerico) || precoNumerico <= 0) {
      Alert.alert("Atenção", "Informe um preço válido.");
      return;
    }

    if (!Number.isInteger(estoqueNumerico) || estoqueNumerico < 0) {
      Alert.alert(
        "Atenção",
        "O estoque deve ser um número inteiro igual ou maior que zero.",
      );
      return;
    }

    if (!id || Array.isArray(id) || !oticaId) {
      Alert.alert("Erro", "Não foi possível identificar o produto.");
      return;
    }

    setSalvando(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

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

      if (
        perfilError ||
        !perfil ||
        !perfil.ativo ||
        perfil.otica_id !== oticaId
      ) {
        Alert.alert("Erro", "Não foi possível validar o acesso à ótica.");
        return;
      }

      const { data: atualizado, error } = await supabase
        .from("produtos")
        .update({
          nome: nomeLimpo,
          preco: precoNumerico,
          estoque: estoqueNumerico,
          limite_estoque_baixo: Number(limiteEstoqueBaixo),
          ativo: ativo,
        })
        .eq("id", id)
        .eq("otica_id", perfil.otica_id)
        .select("id")
        .maybeSingle();

      if (error) {
        Alert.alert("Erro ao salvar", error.message);
        return;
      }

      if (!atualizado) {
        Alert.alert(
          "Nenhuma alteração salva",
          "O produto não foi encontrado ou você não tem permissão para editá-lo.",
        );
        return;
      }

      Alert.alert("Sucesso!", "Produto atualizado com sucesso.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (erro) {
      Alert.alert("Erro inesperado", String(erro));
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <View style={styles.carregando}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.textoCarregando}>Carregando produto...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.voltar}>‹ Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.titulo}>Editar produto</Text>
        <Text style={styles.subtitulo}>
          Atualize as informações do produto.
        </Text>

        <View style={styles.formulario}>
          <Text style={styles.label}>Nome do produto</Text>
          <TextInput
            style={styles.input}
            value={nome}
            onChangeText={setNome}
            placeholder="Nome do produto"
            placeholderTextColor="#9CA3AF"
            maxLength={120}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Preço de venda (R$)</Text>
          <TextInput
            style={styles.input}
            value={preco}
            onChangeText={setPreco}
            placeholder="Ex.: 499,90"
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Quantidade em estoque</Text>
          <TextInput
            style={styles.input}
            value={estoque}
            onChangeText={setEstoque}
            placeholder="Ex.: 8"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Limite para estoque baixo</Text>

          <TextInput
            style={styles.input}
            value={limiteEstoqueBaixo}
            onChangeText={setLimiteEstoqueBaixo}
            placeholder="Ex.: 5"
            keyboardType="numeric"
          />

          <Text style={styles.ajuda}>
            O alerta aparecerá quando o estoque chegar a essa quantidade ou
            menos.
          </Text>

          <View style={styles.statusContainer}>
            <View style={styles.statusInfo}>
              <Text style={styles.labelStatus}>Status do produto</Text>
              <Text style={styles.descricaoStatus}>
                {ativo
                  ? "O produto está disponível na lista."
                  : "O produto está desativado."}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.botaoStatus,
                {
                  backgroundColor: ativo ? "#FEE2E2" : "#DCFCE7",
                },
              ]}
              onPress={() => setAtivo((statusAtual) => !statusAtual)}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  color: ativo ? "#991B1B" : "#166534",
                  fontWeight: "600",
                }}
              >
                {ativo ? "Desativar" : "Ativar"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.botao, salvando && styles.botaoDesativado]}
            onPress={salvarAlteracoes}
            disabled={salvando}
            activeOpacity={0.7}
          >
            {salvando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.botaoTexto}>Salvar alterações</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  conteudo: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },
  carregando: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  textoCarregando: {
    color: "#6B7280",
    fontSize: 15,
  },
  voltar: {
    color: "#374151",
    fontSize: 16,
    marginBottom: 24,
  },
  titulo: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "bold",
  },
  subtitulo: {
    color: "#6B7280",
    fontSize: 15,
    marginTop: 8,
    marginBottom: 24,
  },
  formulario: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  label: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: "#111827",
  },
  botao: {
    backgroundColor: "#111827",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 28,
  },
  botaoDesativado: {
    opacity: 0.6,
  },
  botaoTexto: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 22,
  },
  statusInfo: {
    flex: 1,
  },
  labelStatus: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
  descricaoStatus: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 5,
  },
  botaoStatus: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },

  ajuda: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 12,
  },
});
