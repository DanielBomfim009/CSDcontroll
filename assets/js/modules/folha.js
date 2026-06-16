/**
 * CSDControl PWA
 * Motor financeiro
 */

class FolhaService {
    constructor() {
        this.VALOR_HORA = 36.35;
        this.PERICULOSIDADE = 0.30;
        this.FGTS = 0.08;
        this.DEPENDENTES_IRRF = 1;
        this.DEDUCAO_DEPENDENTE_IRRF = 189.59;
        this.ADIANTAMENTO_BRUTO_REFERENCIA = 1926.83;
        this.IRRF_ADIANTAMENTO_REFERENCIA = 928.76;
        this.DEDUCOES_RECORRENTES = [
            { chave: "contribuicaoAssistencial", label: "Contribuição Assistencial", valor: 52.50 },
            { chave: "seguroSaude", label: "Seguro saúde médio", valor: 71.82 },
            { chave: "emprestimo1", label: "Empréstimo Consignado 1", valor: 859.21 },
            { chave: "emprestimo2", label: "Empréstimo Consignado 2", valor: 322.92 }
        ];
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
        const baseTributavel = this.arredondar(
            Math.max(0, (base || 0) - this.DEPENDENTES_IRRF * this.DEDUCAO_DEPENDENTE_IRRF)
        );

        if (!baseTributavel || baseTributavel <= 2428.80) {
            return 0;
        }

        if (baseTributavel <= 2826.65) {
            return this.arredondar(Math.max(0, baseTributavel * 0.075 - 182.16));
        }

        if (baseTributavel <= 3751.05) {
            return this.arredondar(Math.max(0, baseTributavel * 0.15 - 394.16));
        }

        if (baseTributavel <= 4664.68) {
            return this.arredondar(Math.max(0, baseTributavel * 0.225 - 675.49));
        }

        return this.arredondar(Math.max(0, baseTributavel * 0.275 - 908.73));
    }

    calcularFGTS(base) {
        return this.arredondar((base || 0) * this.FGTS);
    }

    calcularAdiantamentoBruto(bruto) {
        if (!bruto || bruto <= 0) {
            return 0;
        }

        return this.arredondar(Math.min(this.ADIANTAMENTO_BRUTO_REFERENCIA, bruto * 0.40));
    }

    calcularIRRFAdiantamento(irrfTotal, adiantamentoBruto) {
        if (!irrfTotal || !adiantamentoBruto) {
            return 0;
        }

        return this.arredondar(Math.min(irrfTotal, this.IRRF_ADIANTAMENTO_REFERENCIA));
    }

    calcularDeducoesRecorrentes(bruto) {
        if (!bruto || bruto <= 0) {
            return {
                total: 0,
                itens: this.DEDUCOES_RECORRENTES.map(item => ({ ...item, valor: 0 }))
            };
        }

        const itens = this.DEDUCOES_RECORRENTES.map(item => ({ ...item }));
        const total = this.arredondar(itens.reduce((acc, item) => acc + item.valor, 0));

        return { total, itens };
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
        const fgts = this.calcularFGTS(bruto);
        const inss = this.calcularINSS(bruto);
        const baseIR = this.arredondar(bruto - inss);
        const irrfTotal = this.calcularIRRF(baseIR);
        const adiantamentoBruto = this.calcularAdiantamentoBruto(bruto);
        const irrfAdiantamento = this.calcularIRRFAdiantamento(irrfTotal, adiantamentoBruto);
        const adiantamentoLiquido = this.arredondar(Math.max(0, adiantamentoBruto - irrfAdiantamento));
        const irrf = this.arredondar(Math.max(0, irrfTotal - irrfAdiantamento));
        const deducoesRecorrentes = this.calcularDeducoesRecorrentes(bruto);
        const descontos = this.arredondar(
            descontoAtrasos +
            inss +
            irrf +
            irrfAdiantamento +
            adiantamentoBruto +
            deducoesRecorrentes.total
        );
        const pagamentoFinal = this.arredondar(Math.max(0, proventos - descontos));
        const liquidoMes = this.arredondar(pagamentoFinal + adiantamentoLiquido);

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
            fgts,
            inss,
            baseIR,
            irrfTotal,
            irrf,
            irrfAdiantamento,
            adiantamentoBruto,
            adiantamentoLiquido,
            deducoesRecorrentes,
            descontos,
            pagamentoFinal,
            liquidoMes,
            liquido: pagamentoFinal
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
