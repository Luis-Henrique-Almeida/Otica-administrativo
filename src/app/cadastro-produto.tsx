import { useRouter } from "expo-router";
import { useState } from "react";
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

export default function CadastroProduto() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [estoque, setEstoque] = useState("");
  const [limiteEstoqueBaixo, setLimiteEstoqueBaixo] = useState("5");
  const [salvando, setSalvando] = useState(false);

  async function cadastrarProduto() {
    const nomeLimpo = nome.trim();
    const precoNumerico = Number(preco.trim().replace(",", "."));
    const estoqueNumerico = Number(estoque);

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

      if (perfilError || !perfil || !perfil.ativo || !perfil.otica_id) {
        Alert.alert("Erro", "Não foi possível identificar sua ótica.");
        return;
      }

      const { error: cadastroError } = await supabase.from("produtos").insert({
        limite_estoque_baixo: Number(limiteEstoqueBaixo),
        otica_id: perfil.otica_id,
        nome: nomeLimpo,
        preco: precoNumerico,
        estoque: estoqueNumerico,
        ativo: true,
      });

      if (cadastroError) {
        Alert.alert("Erro ao cadastrar produto", cadastroError.message);
        return;
      }

      Alert.alert("Sucesso!", "Produto cadastrado com sucesso.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (erro) {
      Alert.alert("Erro inesperado", String(erro));
    } finally {
      setSalvando(false);
    }
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

        <Text style={styles.titulo}>Novo produto</Text>
        <Text style={styles.subtitulo}>
          Cadastre um produto no estoque da sua ótica.
        </Text>

        <View style={styles.formulario}>
          <Text style={styles.label}>Nome do produto</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: Ray-Ban Aviador"
            placeholderTextColor="#9CA3AF"
            value={nome}
            onChangeText={setNome}
            maxLength={120}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Preço de venda (R$)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: 499,90"
            placeholderTextColor="#9CA3AF"
            value={preco}
            onChangeText={setPreco}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Quantidade em estoque</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: 8"
            placeholderTextColor="#9CA3AF"
            value={estoque}
            onChangeText={setEstoque}
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

          <TouchableOpacity
            style={[styles.botao, salvando && styles.botaoDesativado]}
            onPress={cadastrarProduto}
            disabled={salvando}
            activeOpacity={0.7}
          >
            {salvando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.botaoTexto}>Cadastrar produto</Text>
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
  ajuda: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 12,
  },
});
