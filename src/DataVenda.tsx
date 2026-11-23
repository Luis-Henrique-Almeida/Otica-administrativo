import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function diasNoMes(ano: number, mes: number) {
  return new Date(ano, mes + 1, 0).getDate();
}

type Props = {
  value: Date;
  onChange: (data: Date) => void;
};

export function DataVenda({ value, onChange }: Props) {
  const ano = value.getFullYear();
  const mes = value.getMonth();

  const [diaTexto, setDiaTexto] = useState(String(value.getDate()));

  useEffect(() => {
    setDiaTexto(String(value.getDate()));
  }, [value]);

  function alterarDia(texto: string) {
    const limpo = texto.replace(/[^0-9]/g, "").slice(0, 2);
    setDiaTexto(limpo);

    const numero = Number(limpo);
    if (limpo && numero >= 1 && numero <= diasNoMes(ano, mes)) {
      onChange(new Date(ano, mes, numero));
    }
  }

  function aoSairDoCampo() {
    // se ficou vazio ou inválido, volta para o último dia válido
    setDiaTexto(String(value.getDate()));
  }

  function mudarMes(delta: number) {
    const primeiroDia = new Date(ano, mes + delta, 1);
    const maxDia = diasNoMes(primeiroDia.getFullYear(), primeiroDia.getMonth());
    const dia = Math.min(value.getDate(), maxDia);
    onChange(new Date(primeiroDia.getFullYear(), primeiroDia.getMonth(), dia));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Data da venda</Text>

      <View style={styles.linha}>
        <TextInput
          style={styles.inputDia}
          value={diaTexto}
          onChangeText={alterarDia}
          onBlur={aoSairDoCampo}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
        />

        <View style={styles.mesAno}>
          <TouchableOpacity
            onPress={() => mudarMes(-1)}
            style={styles.seta}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color="#111827" />
          </TouchableOpacity>

          <Text style={styles.textoMes}>
            {MESES[mes]} de {ano}
          </Text>

          <TouchableOpacity
            onPress={() => mudarMes(1)}
            style={styles.seta}
            hitSlop={8}
          >
            <Ionicons name="chevron-forward" size={20} color="#111827" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => onChange(new Date())}
          style={styles.botaoHoje}
        >
          <Text style={styles.textoHoje}>Hoje</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#0F172A", marginBottom: 8 },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  inputDia: {
    width: 56,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  mesAno: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
  },
  seta: { padding: 10 },
  textoMes: { fontSize: 15, color: "#0F172A", fontWeight: "500" },
  botaoHoje: {
    backgroundColor: "#DBEAFE",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  textoHoje: { color: "#1D4ED8", fontWeight: "600" },
});
