/**
 * CSDControl PWA
 * Módulo de competência
 */

class CompetenciaService {
    parseData(data = new Date()) {
        if (data instanceof Date) {
            return new Date(data.getFullYear(), data.getMonth(), data.getDate());
        }

        if (typeof data === "string") {
            const [ano, mes, dia] = data.split("-").map(Number);

            if (ano && mes && dia) {
                return new Date(ano, mes - 1, dia);
            }
        }

        const fallback = new Date(data);
        return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
    }

    getCompetencia(data = new Date()) {
        const referencia = this.parseData(data);
        const dia = referencia.getDate();
        let inicio;
        let fim;

        if (dia <= 10) {
            inicio = new Date(referencia.getFullYear(), referencia.getMonth() - 1, 11);
            fim = new Date(referencia.getFullYear(), referencia.getMonth(), 10);
        } else {
            inicio = new Date(referencia.getFullYear(), referencia.getMonth(), 11);
            fim = new Date(referencia.getFullYear(), referencia.getMonth() + 1, 10);
        }

        return {
            inicio,
            fim,
            codigo: this.gerarCodigo(inicio, fim)
        };
    }

    gerarCodigo(inicio, fim) {
        const ano = fim.getFullYear();
        const mes = String(fim.getMonth() + 1).padStart(2, "0");

        return `${ano}-${mes}`;
    }

    competenciaPorCodigo(codigo) {
        const [ano, mes] = codigo.split("-").map(Number);
        const fim = new Date(ano, mes - 1, 10);
        const inicio = new Date(ano, mes - 2, 11);

        return {
            inicio,
            fim,
            codigo
        };
    }

    formatarCompetencia(competencia) {
        const inicio = this.formatarData(competencia.inicio);
        const fim = this.formatarData(competencia.fim);

        return `${inicio} até ${fim}`;
    }

    formatarData(data) {
        return this.parseData(data).toLocaleDateString("pt-BR");
    }

    formatarDataISO(data) {
        const local = this.parseData(data);
        const ano = local.getFullYear();
        const mes = String(local.getMonth() + 1).padStart(2, "0");
        const dia = String(local.getDate()).padStart(2, "0");

        return `${ano}-${mes}-${dia}`;
    }

    pertenceCompetencia(data, competencia) {
        const alvo = this.parseData(data);
        const inicio = this.parseData(competencia.inicio);
        const fim = this.parseData(competencia.fim);

        return alvo >= inicio && alvo <= fim;
    }

    listarDiasCompetencia(competencia) {
        const dias = [];
        const atual = this.parseData(competencia.inicio);
        const fim = this.parseData(competencia.fim);

        while (atual <= fim) {
            dias.push(new Date(atual));
            atual.setDate(atual.getDate() + 1);
        }

        return dias;
    }

    quantidadeDias(competencia) {
        return this.listarDiasCompetencia(competencia).length;
    }

    resumoCalendario(competencia, feriados = []) {
        const feriadosSet = new Set(feriados);
        let diasUteis = 0;
        let repousos = 0;
        let sabados = 0;

        this.listarDiasCompetencia(competencia).forEach(data => {
            const iso = this.formatarDataISO(data);
            const diaSemana = data.getDay();
            const feriado = feriadosSet.has(iso);

            if (diaSemana === 0 || feriado) {
                repousos += 1;
                return;
            }

            if (diaSemana === 6) {
                sabados += 1;
                return;
            }

            diasUteis += 1;
        });

        return {
            diasUteis,
            repousos,
            sabados,
            totalDias: this.quantidadeDias(competencia)
        };
    }
}

const Competencia = new CompetenciaService();

window.Competencia = Competencia;
