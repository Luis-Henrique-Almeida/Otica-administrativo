import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="explore" options={{ title: "Explorar" }} />
      <Stack.Screen
        name="historico-vendas"
        options={{ title: "Histórico de Vendas" }}
      />
      <Stack.Screen name="produtos" options={{ title: "Estoque" }} />
      <Stack.Screen name="vendas" options={{ title: "Registrar Vendas" }} />
    </Stack>
  );
}
