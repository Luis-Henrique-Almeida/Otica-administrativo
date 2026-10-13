import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../supabase";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function fazerLogin() {
    if (!email.trim() || !senha) {
      Alert.alert("Atenção", "Preencha o e-mail e a senha.");
      return;
    }

    try {
      setCarregando(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });

      if (error) {
        Alert.alert("Erro ao entrar", error.message);
        return;
      }

      const { data: perfil, error: erroPerfil } = await supabase
        .from("usuarios")
        .select("id, nome, role, otica_id, ativo")
        .eq("id", data.user.id)
        .single();

      if (erroPerfil || !perfil) {
        Alert.alert(
          "Erro no perfil",
          "Login realizado, mas não foi possível encontrar seu perfil na tabela usuarios.",
        );
        return;
      }

      if (!perfil.ativo) {
        await supabase.auth.signOut();
        Alert.alert("Acesso bloqueado", "Este usuário está inativo.");
        return;
      }

      router.replace("/dashboard");
    } catch (erro) {
      Alert.alert("Erro", String(erro));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>ÓTICA</Text>

        <Text style={styles.subtitle}>Painel Administrativo</Text>

        <TextInput
          style={styles.input}
          placeholder="Digite seu e-mail"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Digite sua senha"
          secureTextEntry
          value={senha}
          onChangeText={setSenha}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={fazerLogin}
          disabled={carregando}
        >
          <Text style={styles.buttonText}>
            {carregando ? "ENTRANDO..." : "ENTRAR"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Sistema de gestão para óticas</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    justifyContent: "center",
    padding: 20,
  },

  card: {
    backgroundColor: "#ffffff",
    padding: 25,
    borderRadius: 15,
  },

  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 25,
    color: "#666",
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 14,
    marginBottom: 15,
  },

  button: {
    backgroundColor: "#111",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },

  footer: {
    textAlign: "center",
    marginTop: 20,
    color: "#888",
  },
});
