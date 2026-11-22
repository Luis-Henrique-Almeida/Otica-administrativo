import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";

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
      activeOpacity={0.6}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityLabel="Voltar"
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 8,
      }}
    >
      <Ionicons name="arrow-back" size={22} color="#111827" />
    </TouchableOpacity>
  );
}
