/**
 * CSDControl PWA
 * Módulo de horas
 */

class HorasService {
    constructor() {
        this.JORNADA_SEG_QUI = 9;
        this.JORNADA_SEX = 8;
    }

    arredondar(valor, casas = 2) {
        const fator = 10 ** casas;
        return Math.round((Number(valor) + Number.EPSILON) * fator) / fator;
    }

    converterParaMinutos(hora) {
        if (!hora || typeof hora !== "string" || !hora.includes(":")) {
            return null;
        }

        const [h, m] = hora.split(":").map(Number);

        if (Number.isNaN(h) || Number.isNaN(m)) {
            return null;
        }

        return h * 60 + m;
    }

    obterDataLocal(data) {
        return Competencia.parseData(data);
    }

    calcularHorasTrabalhadas(entrada, saidaAlmoco, retornoAlmoco, saida) {
        const inicio = this.converterParaMinutos(entrada);
        const almocoSaida = this.converterParaMinutos(saidaAlmoco);
        const almocoRetorno = this.converterParaMinutos(retornoAlmoco);
        const fim = this.converterParaMinutos(saida);

        if (inicio === null || fim === null) {
            return 0;
        }

        let minutosFim = fim;

        if (minutosFim < inicio) {
            minutosFim += 24 * 60;
        }

        let intervalo = 0;

        if (almocoSaida !== null && almocoRetorno !== null && almocoRetorno >= almocoSaida) {
            intervalo = almocoRetorno - almocoSaida;
        }

        const minutosTrabalhados = Math.max(0, minutosFim - inicio - intervalo);

        return this.arredondar(minutosTrabalhados / 60);
    }

    obterDiaSemana(data) {
        return this.obterDataLocal(data).getDay();
    }

    obterJornadaEsperada(data, opcoes = {}) {
        if (opcoes.feriado) {
            return 0;
        }

        const diaSemana = this.obterDiaSemana(data);

        if (diaSemana >= 1 && diaSemana <= 4) {
            return this.JORNADA_SEG_QUI;
        }

        if (diaSemana === 5) {
            return this.JORNADA_SEX;
        }

        return 0;
    }

    obterTipoDia(data, opcoes = {}) {
        if (opcoes.feriado) {
            return "Feriado";
        }

        const diaSemana = this.obterDiaSemana(data);
        const nomes = [
            "Domingo",
            "Segunda",
            "Terça",
            "Quarta",
            "Quinta",
            "Sexta",
            "Sábado"
        ];

        return nomes[diaSemana];
    }

    calcularDia(data, entrada, saidaAlmoco, retornoAlmoco, saida, opcoes = {}) {
        const horasTrabalhadas = this.calcularHorasTrabalhadas(
            entrada,
            saidaAlmoco,
            retornoAlmoco,
            saida
        );
        const diaSemana = this.obterDiaSemana(data);
        const feriado = Boolean(opcoes.feriado);
        const jornada = this.obterJornadaEsperada(data, { feriado });
        let horasNormais = 0;
        let horasFaltantes = 0;
        let he60 = 0;
        let he70 = 0;
        let he100 = 0;

        if (feriado || diaSemana === 0) {
            he100 = horasTrabalhadas;
        } else if (diaSemana === 6) {
            he70 = horasTrabalhadas;
        } else {
            horasNormais = Math.min(horasTrabalhadas, jornada);

            if (horasTrabalhadas > jornada) {
                he60 = horasTrabalhadas - jornada;
            }

            if (horasTrabalhadas < jornada) {
                horasFaltantes = jornada - horasTrabalhadas;
            }
        }

        return {
            data,
            tipoDia: this.obterTipoDia(data, { feriado }),
            jornada,
            horasTrabalhadas: this.arredondar(horasTrabalhadas),
            horasNormais: this.arredondar(horasNormais),
            horasFaltantes: this.arredondar(horasFaltantes),
            he60: this.arredondar(he60),
            he70: this.arredondar(he70),
            he100: this.arredondar(he100)
        };
    }

    somarCompetencia(apontamentos, competencia = null) {
        const total = {
            horasTrabalhadas: 0,
            horasNormais: 0,
            horasFaltantes: 0,
            he60: 0,
            he70: 0,
            he100: 0,
            jornadaRegistrada: 0,
            diasRegistrados: 0,
            diasComFalta: 0,
            feriadosTrabalhados: 0,
            diasUteis: 0,
            repousos: 0,
            sabados: 0
        };

        const feriados = apontamentos
            .filter(apontamento => apontamento.feriado)
            .map(apontamento => apontamento.data);

        if (competencia) {
            Object.assign(total, Competencia.resumoCalendario(competencia, feriados));
        }

        apontamentos.forEach(apontamento => {
            const calculo = apontamento.calculo || this.calcularDia(
                apontamento.data,
                apontamento.entrada,
                apontamento.saidaAlmoco,
                apontamento.retornoAlmoco,
                apontamento.saida,
                { feriado: apontamento.feriado }
            );

            total.horasTrabalhadas += calculo.horasTrabalhadas;
            total.horasNormais += calculo.horasNormais;
            total.horasFaltantes += calculo.horasFaltantes;
            total.he60 += calculo.he60;
            total.he70 += calculo.he70;
            total.he100 += calculo.he100;
            total.jornadaRegistrada += calculo.jornada;
            total.diasRegistrados += 1;

            if (calculo.horasFaltantes > 0) {
                total.diasComFalta += 1;
            }

            if (apontamento.feriado) {
                total.feriadosTrabalhados += 1;
            }
        });

        Object.keys(total).forEach(chave => {
            if (typeof total[chave] === "number") {
                total[chave] = this.arredondar(total[chave]);
            }
        });

        return total;
    }

    totalExtras(totais) {
        return this.arredondar((totais.he60 || 0) + (totais.he70 || 0) + (totais.he100 || 0));
    }

    formatarHoras(valor) {
        const numero = this.arredondar(valor || 0);
        const sinal = numero < 0 ? "-" : "";
        const absoluto = Math.abs(numero);
        const horas = Math.floor(absoluto);
        const minutos = Math.round((absoluto - horas) * 60);

        if (minutos === 0) {
            return `${sinal}${horas}h`;
        }

        return `${sinal}${horas}h${String(minutos).padStart(2, "0")}`;
    }
}

const Horas = new HorasService();

window.Horas = Horas;
