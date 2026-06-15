/**
 * SalárioPro PWA
 * Módulo de Competência
 */

class CompetenciaService {

    /**
     * Retorna a competência da data informada
     */
    getCompetencia(data = new Date()) {

        const dia = data.getDate();

        let inicio;
        let fim;

        if (dia <= 10) {

            inicio = new Date(
                data.getFullYear(),
                data.getMonth() - 1,
                11
            );

            fim = new Date(
                data.getFullYear(),
                data.getMonth(),
                10
            );

        } else {

            inicio = new Date(
                data.getFullYear(),
                data.getMonth(),
                11
            );

            fim = new Date(
                data.getFullYear(),
                data.getMonth() + 1,
                10
            );
        }

        return {
            inicio,
            fim,
            codigo: this.gerarCodigo(inicio, fim)
        };
    }

    /**
     * Gera código da competência
     * Ex: 2026-07
     */
    gerarCodigo(inicio, fim) {

        const ano = fim.getFullYear();

        const mes = String(
            fim.getMonth() + 1
        ).padStart(2, "0");

        return `${ano}-${mes}`;
    }

    /**
     * Formata competência para tela
     */
    formatarCompetencia(competencia) {

        const inicio =
            this.formatarData(
                competencia.inicio
            );

        const fim =
            this.formatarData(
                competencia.fim
            );

        return `${inicio} até ${fim}`;
    }

    /**
     * Formata data dd/mm/yyyy
     */
    formatarData(data) {

        return data.toLocaleDateString(
            "pt-BR"
        );
    }

    /**
     * Verifica se data pertence à competência
     */
    pertenceCompetencia(
        data,
        competencia
    ) {

        const alvo = new Date(data);

        return (
            alvo >= competencia.inicio &&
            alvo <= competencia.fim
        );
    }

    /**
     * Retorna dias da competência
     */
    listarDiasCompetencia(
        competencia
    ) {

        const dias = [];

        const atual = new Date(
            competencia.inicio
        );

        while (
            atual <= competencia.fim
        ) {

            dias.push(
                new Date(atual)
            );

            atual.setDate(
                atual.getDate() + 1
            );
        }

        return dias;
    }

    /**
     * Retorna quantidade de dias
     */
    quantidadeDias(
        competencia
    ) {

        const diferenca =
            competencia.fim -
            competencia.inicio;

        return (
            Math.floor(
                diferenca /
                (1000 * 60 * 60 * 24)
            ) + 1
        );
    }
}

const Competencia =
    new CompetenciaService();

window.Competencia =
    Competencia;