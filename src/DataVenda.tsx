import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

function mesmoDia(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type Props = {
  value: Date;
  onChange: (data: Date) => void;
};

export function DataVenda({ value, onChange }: Props) {
  const [aberto, setAberto] = useState(false);
  const [mesExibido, setMesExibido] = useState(
    new Date(value.getFullYear(), value.getMonth(), 1),
  );

  const hoje = new Date();
  const hojeInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  const ano = mesExibido.getFullYear();
  const mes = mesExibido.getMonth();

  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();

  const celulas: (number | null)[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let d = 1; d <= totalDias; d++) celulas.push(d);
  while (celulas.length % 7 !== 0) celulas.push(null);

  const semanas: (number | null)[][] = [];
  for (let i = 0; i < celulas.length; i += 7) {
    semanas.push(celulas.slice(i, i + 7));
  }

  const podeAvancar =
    ano < hoje.getFullYear() ||
    (ano === hoje.getFullYear() && mes < hoje.getMonth());

  function alternar() {
    if (!aberto) {
      setMesExibido(new Date(value.getFullYear(), value.getMonth(), 1));
    }
    setAberto(!aberto);
  }

  function mudarMes(delta: number) {
    setMesExibido(new Date(ano, mes + delta, 1));
  }

  function selecionar(dia: number) {
    onChange(new Date(ano, mes, dia));
    setAberto(false);
  }

  function irParaHoje() {
    onChange(new Date());
    setAberto(false);
  }

  const textoData = `${value.getDate()} de ${MESES[value.getMonth()].toLowerCase()} de ${value.getFullYear()}${
    mesmoDia(value, hoje) ? " (hoje)" : ""
  }`;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Data da venda</Text>

      <TouchableOpacity
        style={[styles.campo, aberto && styles.campoAberto]}
        onPress={alternar}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={20} color="#2563EB" />
        <Text style={styles.textoCampo}>{textoData}</Text>
        <Ionicons
          name={aberto ? "chevron-up" : "chevron-down"}
          size={18}
          color="#64748B"
        />
      </TouchableOpacity>

      {aberto && (
        <View style={styles.calendario}>
          <View style={styles.cabecalhoMes}>
            <TouchableOpacity
              onPress={() => mudarMes(-1)}
              style={styles.seta}
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={22} color="#0F172A" />
            </TouchableOpacity>

            <Text style={styles.tituloMes}>
              {MESES[mes]} {ano}
            </Text>

            <TouchableOpacity
              onPress={() => mudarMes(1)}
              style={[styles.seta, !podeAvancar && styles.setaDesativada]}
              disabled={!podeAvancar}
              hitSlop={8}
            >
              <Ionicons name="chevron-forward" size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <View style={styles.linhaSemana}>
            {DIAS_SEMANA.map((letra, i) => (
              <View key={i} style={styles.celula}>
                <Text style={styles.diaSemana}>{letra}</Text>
              </View>
            ))}
          </View>

          {semanas.map((semana, i) => (
            <View key={i} style={styles.linhaSemana}>
              {semana.map((dia, j) => {
                if (dia === null) {
                  return <View key={j} style={styles.celula} />;
                }

                const data = new Date(ano, mes, dia);
                const futuro = data > hojeInicio;
                const selecionado = mesmoDia(data, value);
                const ehHoje = mesmoDia(data, hoje);

                return (
                  <View key={j} style={styles.celula}>
                    <TouchableOpacity
                      style={[
                        styles.dia,
                        ehHoje && styles.diaHoje,
                        selecionado && styles.diaSelecionado,
                      ]}
                      onPress={() => selecionar(dia)}
                      disabled={futuro}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.textoDia,
                          futuro && styles.textoDiaFuturo,
                          selecionado && styles.textoDiaSelecionado,
                        ]}
                      >
                        {dia}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ))}

          <TouchableOpacity style={styles.botaoHoje} onPress={irParaHoje}>
            <Text style={styles.textoHoje}>Ir para hoje</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 10,
  },
  campo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  campoAberto: { borderColor: "#2563EB" },
  textoCampo: { flex: 1, fontSize: 15, color: "#0F172A" },

  calendario: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
  },
  cabecalhoMes: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  tituloMes: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  seta: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  setaDesativada: { opacity: 0.3 },

  linhaSemana: { flexDirection: "row" },
  celula: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  diaSemana: { fontSize: 12, fontWeight: "600", color: "#94A3B8" },
  dia: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  diaHoje: { borderWidth: 1, borderColor: "#2563EB" },
  diaSelecionado: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  textoDia: { fontSize: 14, color: "#0F172A" },
  textoDiaFuturo: { color: "#CBD5E1" },
  textoDiaSelecionado: { color: "#FFFFFF", fontWeight: "700" },

  botaoHoje: {
    alignSelf: "center",
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#DBEAFE",
  },
  textoHoje: { color: "#1D4ED8", fontWeight: "600" },
});