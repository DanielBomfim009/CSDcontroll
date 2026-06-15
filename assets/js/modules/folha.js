/**
 * SalárioPro PWA
 * Motor financeiro
 */

class FolhaService {
    constructor() {
        this.VALOR_HORA = 36.35;
        this.PERICULOSIDADE = 0.30;
        this.TETO_INSS = 908.85;
        this.INSS_FAIXAS = [
            { limite: 1518.00, taxa: 0.075 },
            { limite: 2793.88, taxa: 0.09 },
            { limite: 4190.83, taxa: 0.12 },
            { limite: 8157.41, taxa: 0.14 }
        ];
    }

    arredondar(valor, casas = 2) {
        const fator = 10 ** casas;
        return Math.round((Number(valor) + Number.EPSILON) * fator) / fator;
    }

    calcularSalarioNormal(horasNormais) {
        return this.arredondar((horasNormais || 0) * this.VALOR_HORA);
    }

    calcularPericulosidade(base) {
        return this.arredondar((base || 0) * this.PERICULOSIDADE);
    }

    calcularHE60(horas) {
        return this.arredondar((horas || 0) * this.VALOR_HORA * 1.60);
    }

    calcularHE70(horas) {
        return this.arredondar((horas || 0) * this.VALOR_HORA * 1.70);
    }

    calcularHE100(horas) {
        return this.arredondar((horas || 0) * this.VALOR_HORA * 2.00);
    }

    calcularTotalExtras(he60, he70, he100) {
        return this.arredondar((he60 || 0) + (he70 || 0) + (he100 || 0));
    }

    calcularPericulosidadeExtras(totalExtras) {
        return this.calcularPericulosidade(totalExtras);
    }

    calcularRSR(totalExtras, totaisHoras = {}) {
        if (!totalExtras) {
            return 0;
        }

        const diasUteis = totaisHoras.diasUteis || 0;
        const repousos = totaisHoras.repousos || 0;

        if (!diasUteis || !repousos) {
            return this.arredondar(totalExtras * 0.25);
        }

        return this.arredondar((totalExtras / diasUteis) * repousos);
    }

    calcularDescontoAtrasos(horasFaltantes) {
        return this.arredondar((horasFaltantes || 0) * this.VALOR_HORA);
    }

    calcularINSS(bruto) {
        if (!bruto || bruto <= 0) {
            return 0;
        }

        let total = 0;
        let anterior = 0;

        for (const faixa of this.INSS_FAIXAS) {
            if (bruto > faixa.limite) {
                total += (faixa.limite - anterior) * faixa.taxa;
                anterior = faixa.limite;
            } else {
                total += Math.max(0, bruto - anterior) * faixa.taxa;
                break;
            }
        }

        return this.arredondar(Math.min(total, this.TETO_INSS));
    }

    calcularIRRF(base) {
        if (!base || base <= 2428.80) {
            return 0;
        }

        if (base <= 2826.65) {
            return this.arredondar(Math.max(0, base * 0.075 - 182.16));
        }

        if (base <= 3751.05) {
            return this.arredondar(Math.max(0, base * 0.15 - 394.16));
        }

        if (base <= 4664.68) {
            return this.arredondar(Math.max(0, base * 0.225 - 675.49));
        }

        return this.arredondar(Math.max(0, base * 0.275 - 908.73));
    }

    calcularFolha(totaisHoras = {}) {
        const salarioNormal = this.calcularSalarioNormal(totaisHoras.horasNormais);
        const periculosidade = this.calcularPericulosidade(salarioNormal);
        const he60 = this.calcularHE60(totaisHoras.he60);
        const he70 = this.calcularHE70(totaisHoras.he70);
        const he100 = this.calcularHE100(totaisHoras.he100);
        const totalExtras = this.calcularTotalExtras(he60, he70, he100);
        const periculosidadeExtras = this.calcularPericulosidadeExtras(totalExtras);
        const rsr = this.calcularRSR(totalExtras, totaisHoras);
        const descontoAtrasos = this.calcularDescontoAtrasos(totaisHoras.horasFaltantes);

        const proventos = this.arredondar(
            salarioNormal +
            periculosidade +
            totalExtras +
            periculosidadeExtras +
            rsr
        );

        const bruto = this.arredondar(proventos - descontoAtrasos);
        const inss = this.calcularINSS(bruto);
        const baseIR = this.arredondar(bruto - inss);
        const irrf = this.calcularIRRF(baseIR);
        const descontos = this.arredondar(descontoAtrasos + inss + irrf);
        const liquido = this.arredondar(bruto - inss - irrf);

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
            proventos,
            bruto,
            inss,
            baseIR,
            irrf,
            descontos,
            liquido
        };
    }

    moeda(valor) {
        return (valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }
}

const Folha = new FolhaService();

window.Folha = Folha;
