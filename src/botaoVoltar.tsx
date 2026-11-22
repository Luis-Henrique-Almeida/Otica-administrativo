import { Href, useRouter } from "expo-router";
import { Text, TouchableOpacity } from "react-native";

type Props = {
  destino: Href;
};

export function BotaoVoltar({ destino }: Props) {
  const router = useRouter();

  function voltar() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(destino);
    }
  }

  return (
    <TouchableOpacity
      onPress={voltar}
      style={{ paddingHorizontal: 12, paddingVertical: 6 }}
      activeOpacity={0.7}
    >
      <Text style={{ fontSize: 16, color: "#111827" }}>‹ Voltar</Text>
    </TouchableOpacity>
  );
}
