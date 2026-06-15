/**

* SalárioPro PWA
* Módulo de Horas
    */

class HorasService {

constructor() {
    this.JORNADA_SEG_QUI = 9;
    this.JORNADA_SEX = 8;
}
converterParaMinutos(hora) {
    const [h, m] = hora
        .split(":")
        .map(Number);
    return (h * 60) + m;
}
calcularHorasTrabalhadas(
    entrada,
    saidaAlmoco,
    retornoAlmoco,
    saida
) {
    const inicio =
        this.converterParaMinutos(
            entrada
        );
    const almocoSaida =
        this.converterParaMinutos(
            saidaAlmoco
        );
    const almocoRetorno =
        this.converterParaMinutos(
            retornoAlmoco
        );
    const fim =
        this.converterParaMinutos(
            saida
        );
    const minutosTrabalhados =
        (fim - inicio) -
        (almocoRetorno - almocoSaida);
    return minutosTrabalhados / 60;
}
obterJornadaEsperada(data) {
    const diaSemana =
        new Date(data).getDay();
    switch (diaSemana) {
        case 5:
            return this.JORNADA_SEX;
        case 6:
            return 0;
        case 0:
            return 0;
        default:
            return this.JORNADA_SEG_QUI;
    }
}
calcularDia(
    data,
    entrada,
    saidaAlmoco,
    retornoAlmoco,
    saida
) {
    const horasTrabalhadas =
        this.calcularHorasTrabalhadas(
            entrada,
            saidaAlmoco,
            retornoAlmoco,
            saida
        );
    const diaSemana =
        new Date(data).getDay();
    const jornada =
        this.obterJornadaEsperada(
            data
        );
    let horasNormais = 0;
    let horasFaltantes = 0;
    let he60 = 0;
    let he70 = 0;
    let he100 = 0;
    if (diaSemana >= 1 && diaSemana <= 5) {
        horasNormais =
            Math.min(
                horasTrabalhadas,
                jornada
            );
        if (
            horasTrabalhadas >
            jornada
        ) {
            he60 =
                horasTrabalhadas -
                jornada;
        }
        if (
            horasTrabalhadas <
            jornada
        ) {
            horasFaltantes =
                jornada -
                horasTrabalhadas;
        }
    }
    if (diaSemana === 6) {
        he70 =
            horasTrabalhadas;
    }
    if (diaSemana === 0) {
        he100 =
            horasTrabalhadas;
    }
    return {
        horasTrabalhadas,
        horasNormais,
        horasFaltantes,
        he60,
        he70,
        he100
    };
}
somarCompetencia(
    apontamentos
) {
    const total = {
        horasTrabalhadas: 0,
        horasNormais: 0,
        horasFaltantes: 0,
        he60: 0,
        he70: 0,
        he100: 0
    };
    apontamentos.forEach(
        apontamento => {
            const calculo =
                this.calcularDia(
                    apontamento.data,
                    apontamento.entrada,
                    apontamento.saidaAlmoco,
                    apontamento.retornoAlmoco,
                    apontamento.saida
                );
            total.horasTrabalhadas +=
                calculo.horasTrabalhadas;
            total.horasNormais +=
                calculo.horasNormais;
            total.horasFaltantes +=
                calculo.horasFaltantes;
            total.he60 +=
                calculo.he60;
            total.he70 +=
                calculo.he70;
            total.he100 +=
                calculo.he100;
        }
    );
    return total;
}

}

const Horas =
new HorasService();

window.Horas =
Horas;