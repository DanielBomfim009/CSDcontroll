/**
 * CSDControl PWA
 * Motor financeiro
 */

class FolhaService {
    constructor() {
        this.VALOR_HORA = 36.35;
        this.HORAS_BASE_MENSAL = 220;
        this.DIAS_BASE_MENSAL = 30;
        this.DATA_ADMISSAO = "2025-10-07";
        this.PERICULOSIDADE = 0.30;
        this.FGTS = 0.08;
        this.DEPENDENTES_IRRF = 1;
        this.DEDUCAO_DEPENDENTE_IRRF = 189.59;
        this.IRRF_ADIANTAMENTO_FATOR = 0.11;
        this.INSS_TABELAS = {
            2025: {
                teto: 951.62,
                faixas: [
                    { limite: 1518.00, taxa: 0.075 },
                    { limite: 2793.88, taxa: 0.09 },
                    { limite: 4190.83, taxa: 0.12 },
                    { limite: 8157.41, taxa: 0.14 }
                ]
            },
            2026: {
                teto: 988.09,
                faixas: [
                    { limite: 1518.00, taxa: 0.075 },
                    { limite: 2793.88, taxa: 0.09 },
                    { limite: 4190.83, taxa: 0.12 },
                    { limite: 8157.41, taxa: 0.14 }
                ]
            }
        };
    }

    arredondar(valor, casas = 2) {
        const fator = 10 ** casas;
        return Math.round((Number(valor) + Number.EPSILON) * fator) / fator;
    }

    calcularSalarioNormal(horasBase = this.HORAS_BASE_MENSAL) {
        return this.arredondar((horasBase || 0) * this.VALOR_HORA);
    }

    obterDataAdmissao() {
        const [ano, mes, dia] = this.DATA_ADMISSAO.split("-").map(Number);
        return new Date(ano, mes - 1, dia);
    }

    obterDiasMesCompetencia(competencia = null) {
        const referencia = competencia?.fim || new Date();
        return new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0).getDate();
    }

    calcularHorasBaseCompetencia(competencia = null) {
        const referencia = competencia?.fim || new Date();
        const ano = referencia.getFullYear();
        const mes = referencia.getMonth();
        const diasMes = this.obterDiasMesCompetencia(competencia);
        let diasConsiderados = diasMes;
        const admissao = this.obterDataAdmissao();

        if (admissao.getFullYear() === ano && admissao.getMonth() === mes) {
            diasConsiderados = Math.max(0, diasMes - admissao.getDate() + 1);
        }

        return this.arredondar((this.HORAS_BASE_MENSAL / this.DIAS_BASE_MENSAL) * diasConsiderados);
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

    obterTabelaINSS(competencia = null) {
        const ano = competencia?.fim?.getFullYear?.() || new Date().getFullYear();
        return this.INSS_TABELAS[ano] || this.INSS_TABELAS[2026];
    }

    calcularPericulosidadeExtras(totalExtras, rsr = 0) {
        return this.calcularPericulosidade((totalExtras || 0) + (rsr || 0));
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

    calcularINSS(bruto, competencia = null) {
        if (!bruto || bruto <= 0) {
            return 0;
        }

        const tabela = this.obterTabelaINSS(competencia);
        let total = 0;
        let anterior = 0;

        for (const faixa of tabela.faixas) {
            if (bruto > faixa.limite) {
                total += (faixa.limite - anterior) * faixa.taxa;
                anterior = faixa.limite;
            } else {
                total += Math.max(0, bruto - anterior) * faixa.taxa;
                break;
            }
        }

        return this.arredondar(Math.min(total, tabela.teto));
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

    calcularTaxaAdiantamento(horasNormais, competencia = null) {
        const codigo = competencia?.codigo || "";
        const ano = competencia?.fim?.getFullYear?.() || new Date().getFullYear();

        if (codigo === "2025-10") {
            return 0.375;
        }

        if (ano <= 2025) {
            return 0.29;
        }

        const taxa = 0.102 + (horasNormais || 0) * 0.000605;
        return Math.min(0.24, Math.max(0.22, taxa));
    }

    calcularAdiantamento(salarioNormal, horasNormais, competencia = null) {
        if (!salarioNormal || salarioNormal <= 0) {
            return 0;
        }

        const taxa = this.calcularTaxaAdiantamento(horasNormais, competencia);
        return this.arredondar(salarioNormal * taxa);
    }

    calcularIRRFAdiantamento(salarioNormal, competencia = null) {
        if (!salarioNormal || salarioNormal <= 0) {
            return 0;
        }

        if (competencia?.codigo === "2025-10") {
            return 0;
        }

        return this.arredondar(salarioNormal * this.IRRF_ADIANTAMENTO_FATOR);
    }

    calcularDescontoPericulosidadeAtrasos(descontoAtrasos, competencia = null) {
        if (!descontoAtrasos || descontoAtrasos <= 0) {
            return 0;
        }

        if ((competencia?.codigo || "") < "2026-03") {
            return 0;
        }

        return this.calcularPericulosidade(descontoAtrasos);
    }

    calcularFolha(totaisHoras = {}, competencia = null) {
        const horasBaseMensal = this.calcularHorasBaseCompetencia(competencia);
        const salarioNormal = this.calcularSalarioNormal(horasBaseMensal);
        const periculosidade = this.calcularPericulosidade(salarioNormal);
        const he60 = this.calcularHE60(totaisHoras.he60);
        const he70 = this.calcularHE70(totaisHoras.he70);
        const he100 = this.calcularHE100(totaisHoras.he100);
        const totalExtras = this.calcularTotalExtras(he60, he70, he100);
        const rsr = this.calcularRSR(totalExtras, totaisHoras);
        const periculosidadeExtras = this.calcularPericulosidadeExtras(totalExtras, rsr);
        const descontoAtrasos = this.calcularDescontoAtrasos(totaisHoras.horasFaltantes);
        const descontoPericulosidadeAtrasos = this.calcularDescontoPericulosidadeAtrasos(
            descontoAtrasos,
            competencia
        );

        const proventos = this.arredondar(
            salarioNormal +
            periculosidade +
            totalExtras +
            periculosidadeExtras +
            rsr
        );

        const baseTrabalhista = this.arredondar(
            proventos - descontoAtrasos - descontoPericulosidadeAtrasos
        );
        const fgts = this.calcularFGTS(baseTrabalhista);
        const inss = this.calcularINSS(baseTrabalhista, competencia);
        const baseIR = this.arredondar(baseTrabalhista - inss);
        const irrfTotal = this.calcularIRRF(baseIR);
        const adiantamento = this.calcularAdiantamento(
            salarioNormal,
            horasBaseMensal,
            competencia
        );
        const irrfAdiantamento = this.calcularIRRFAdiantamento(salarioNormal, competencia);
        const irrf = this.arredondar(Math.max(0, irrfTotal - irrfAdiantamento));
        const descontosLegais = this.arredondar(
            descontoAtrasos +
            descontoPericulosidadeAtrasos +
            inss +
            irrf +
            irrfAdiantamento +
            adiantamento
        );
        const pagamentoFinal = this.arredondar(Math.max(0, proventos - descontosLegais));
        const liquidoMes = this.arredondar(pagamentoFinal + adiantamento);

        return {
            salarioNormal,
            horasBaseMensal,
            periculosidade,
            he60,
            he70,
            he100,
            totalExtras,
            periculosidadeExtras,
            rsr,
            descontoAtrasos,
            descontoPericulosidadeAtrasos,
            proventos,
            bruto: baseTrabalhista,
            baseTrabalhista,
            fgts,
            inss,
            baseIR,
            irrfTotal,
            irrf,
            irrfAdiantamento,
            adiantamento,
            descontosLegais,
            descontos: descontosLegais,
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
