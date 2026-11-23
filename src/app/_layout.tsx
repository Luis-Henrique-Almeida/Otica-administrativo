import { Stack } from "expo-router";
import { BotaoVoltar } from "../botaoVoltar";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen
        name="produtos"
        options={{
          title: "Estoque",
          headerLeft: () => <BotaoVoltar destino="/dashboard" />,
        }}
      />
      <Stack.Screen
        name="cadastro-produto"
        options={{
          title: "Novo produto",
          headerLeft: () => <BotaoVoltar destino="/produtos" />,
        }}
      />
      <Stack.Screen
        name="editar-produto"
        options={{
          title: "Editar produto",
          headerLeft: () => <BotaoVoltar destino="/produtos" />,
        }}
      />
      <Stack.Screen
        name="vendas"
        options={{
          title: "Vendas",
          headerLeft: () => <BotaoVoltar destino="/dashboard" />,
        }}
      />
      <Stack.Screen
        name="historico-vendas"
        options={{
          title: "Histórico de vendas",
          headerLeft: () => <BotaoVoltar destino="/dashboard" />,
        }}
      />
      <Stack.Screen
        name="editar-venda"
        options={{
          title: "Editar venda",
          headerLeft: () => <BotaoVoltar destino="/historico-vendas" />,
        }}
      />
    </Stack>
  );
}
