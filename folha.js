/**
 * SalárioPro PWA
 * Motor Financeiro
 * Baseado nos holerites reais Consag
 */

class FolhaService {

    constructor() {

        this.VALOR_HORA = 36.35;
        this.PERICULOSIDADE = 0.30;

        // Atualizar futuramente conforme tabela vigente
        this.TETO_INSS = 908.85;

    }

    /**
     * Salário Horas Normais
     */
    calcularSalarioNormal(horasNormais) {

        return horasNormais *
            this.VALOR_HORA;
    }

    /**
     * Periculosidade
     * 30% sobre salário normal
     */
    calcularPericulosidade(
        salarioNormal
    ) {

        return salarioNormal *
            this.PERICULOSIDADE;
    }

    /**
     * HE 60%
     */
    calcularHE60(horas) {

        return horas *
            this.VALOR_HORA *
            1.60;
    }

    /**
     * HE 70%
     */
    calcularHE70(horas) {

        return horas *
            this.VALOR_HORA *
            1.70;
    }

    /**
     * HE 100%
     */
    calcularHE100(horas) {

        return horas *
            this.VALOR_HORA *
            2.00;
    }

    /**
     * Soma das horas extras
     */
    calcularTotalExtras(
        he60,
        he70,
        he100
    ) {

        return he60 + he70 + he100;
    }

    /**
     * Periculosidade sobre Extras
     *
     * Regra identificada nos holerites:
     * Evento:
     * Adic.Periculo.Sobre H.Extra
     */
    calcularPericulosidadeExtras(
        totalExtras
    ) {

        return totalExtras *
            this.PERICULOSIDADE;
    }

    /**
     * RSR estimado
     *
     * Fórmula simplificada V1
     * Ajustaremos após mais holerites
     */
    calcularRSR(
        totalExtras
    ) {

        return totalExtras *
            0.25;
    }

    /**
     * Desconto de atrasos
     */
    calcularDescontoAtrasos(
        horasFaltantes
    ) {

        return horasFaltantes *
            this.VALOR_HORA;
    }

    /**
     * INSS estimado
     */
    calcularINSS(
        bruto
    ) {

        const aliquotas = [
            { limite: 1518.00, taxa: 0.075 },
            { limite: 2793.88, taxa: 0.09 },
            { limite: 4190.83, taxa: 0.12 },
            { limite: 8157.41, taxa: 0.14 }
        ];

        let total = 0;
        let anterior = 0;

        for (const faixa of aliquotas) {

            if (bruto > faixa.limite) {

                total +=
                    (faixa.limite - anterior)
                    * faixa.taxa;

                anterior =
                    faixa.limite;

            } else {

                total +=
                    (bruto - anterior)
                    * faixa.taxa;

                break;
            }
        }

        return Math.min(
            total,
            this.TETO_INSS
        );
    }

    /**
     * IRRF estimado
     */
    calcularIRRF(
        base
    ) {

        if (base <= 2428.80)
            return 0;

        if (base <= 2826.65)
            return (base * 0.075) - 182.16;

        if (base <= 3751.05)
            return (base * 0.15) - 394.16;

        if (base <= 4664.68)
            return (base * 0.225) - 675.49;

        return (base * 0.275) - 908.73;
    }

    /**
     * Motor principal
     */
    calcularFolha(
        totaisHoras
    ) {

        const salarioNormal =
            this.calcularSalarioNormal(
                totaisHoras.horasNormais
            );

        const periculosidade =
            this.calcularPericulosidade(
                salarioNormal
            );

        const he60 =
            this.calcularHE60(
                totaisHoras.he60
            );

        const he70 =
            this.calcularHE70(
                totaisHoras.he70
            );

        const he100 =
            this.calcularHE100(
                totaisHoras.he100
            );

        const totalExtras =
            this.calcularTotalExtras(
                he60,
                he70,
                he100
            );

        const periculosidadeExtras =
            this.calcularPericulosidadeExtras(
                totalExtras
            );

        const rsr =
            this.calcularRSR(
                totalExtras
            );

        const descontoAtrasos =
            this.calcularDescontoAtrasos(
                totaisHoras.horasFaltantes
            );

        const bruto =
            salarioNormal +
            periculosidade +
            totalExtras +
            periculosidadeExtras +
            rsr -
            descontoAtrasos;

        const inss =
            this.calcularINSS(
                bruto
            );

        const baseIR =
            bruto - inss;

        const irrf =
            this.calcularIRRF(
                baseIR
            );

        const liquido =
            bruto -
            inss -
            irrf;

        return {

            salarioNormal,

            periculosidade,

            he60,

            he70,

            he100,

            totalExtras,

            periculosidadeExtras,

            rsr,

            descontoAtrasos,

            bruto,

            inss,

            irrf,

            liquido

        };
    }

    /**
     * Formatar moeda
     */
    moeda(valor) {

        return valor.toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
    }
}

const Folha =
    new FolhaService();

window.Folha =
    Folha;