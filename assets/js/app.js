const App = {
    state: {
        competencia: null,
        apontamentos: [],
        todosApontamentos: [],
        view: "dashboard",
        editId: null,
        pendingDeleteId: null
    },

    async init() {
        this.cacheDom();
        this.state.competencia = Competencia.getCompetencia();
        this.definirDataPadrao();
        this.bindEvents();
        this.setView(this.state.view);

        try {
            await DB.init();
            await this.carregarApontamentos();
            this.render();
        } catch (error) {
            console.error(error);
            this.showToast(error.message || "Não foi possível iniciar o banco local.");
        }

        this.registrarServiceWorker();
    },

    cacheDom() {
        this.$ = seletor => document.querySelector(seletor);
        this.$$ = seletor => Array.from(document.querySelectorAll(seletor));
        this.dom = {
            pageTitle: this.$("#pageTitle"),
            competenciaAtual: this.$("#competenciaAtual"),
            navItems: this.$$(".nav-item"),
            views: this.$$(".view"),
            form: this.$("#apontamentoForm"),
            formPreview: this.$("#formPreview"),
            apontamentoId: this.$("#apontamentoId"),
            data: this.$("#data"),
            entrada: this.$("#entrada"),
            saidaAlmoco: this.$("#saidaAlmoco"),
            retornoAlmoco: this.$("#retornoAlmoco"),
            saida: this.$("#saida"),
            feriado: this.$("#feriado"),
            cancelEditBtn: this.$("#cancelEditBtn"),
            saveEntryBtn: this.$("#saveEntryBtn"),
            newEntryBtn: this.$("#newEntryBtn"),
            toast: this.$("#toast")
        };
    },

    bindEvents() {
        this.dom.navItems.forEach(button => {
            button.addEventListener("click", () => this.setView(button.dataset.view));
        });

        this.$$(".text-button[data-view-shortcut]").forEach(button => {
            button.addEventListener("click", () => this.setView(button.dataset.viewShortcut));
        });

        this.dom.newEntryBtn.addEventListener("click", () => {
            this.resetForm();
            this.setView("apontamentos");
            this.dom.data.focus();
        });

        this.dom.form.addEventListener("submit", event => this.salvarApontamento(event));
        this.dom.cancelEditBtn.addEventListener("click", () => this.resetForm());

        ["data", "entrada", "saidaAlmoco", "retornoAlmoco", "saida", "feriado"].forEach(id => {
            this.dom[id].addEventListener("input", () => this.renderPreview());
            this.dom[id].addEventListener("change", () => this.renderPreview());
        });

        this.$("#apontamentosTable").addEventListener("click", event => {
            const button = event.target.closest("[data-action]");

            if (!button) {
                return;
            }

            const id = Number(button.dataset.id);

            if (button.dataset.action === "edit") {
                this.editarApontamento(id);
            }

            if (button.dataset.action === "delete") {
                this.excluirApontamento(id);
            }
        });
    },

    definirDataPadrao() {
        const hoje = Competencia.formatarDataISO(new Date());
        this.dom.data.value = hoje;
    },

    async carregarApontamentos() {
        const registros = await DB.getAll(STORES.APONTAMENTOS);

        this.state.todosApontamentos = registros
            .map(registro => this.normalizarRegistro(registro))
            .sort((a, b) => b.data.localeCompare(a.data));

        this.state.apontamentos = this.state.todosApontamentos
            .filter(apontamento => Competencia.pertenceCompetencia(apontamento.data, this.state.competencia));
    },

    normalizarRegistro(registro) {
        const competencia = registro.competencia || Competencia.getCompetencia(registro.data).codigo;

        return {
            ...registro,
            competencia,
            feriado: Boolean(registro.feriado)
        };
    },

    coletarFormulario() {
        const data = this.dom.data.value;
        const competencia = Competencia.getCompetencia(data);

        return {
            data,
            entrada: this.dom.entrada.value,
            saidaAlmoco: this.dom.saidaAlmoco.value,
            retornoAlmoco: this.dom.retornoAlmoco.value,
            saida: this.dom.saida.value,
            feriado: this.dom.feriado.checked,
            competencia: competencia.codigo
        };
    },

    async salvarApontamento(event) {
        event.preventDefault();

        const dados = this.coletarFormulario();
        const agora = new Date().toISOString();
        const existente = this.state.todosApontamentos.find(apontamento => apontamento.data === dados.data);
        const idEdicao = Number(this.dom.apontamentoId.value || 0);
        const calculo = Horas.calcularDia(
            dados.data,
            dados.entrada,
            dados.saidaAlmoco,
            dados.retornoAlmoco,
            dados.saida,
            { feriado: dados.feriado }
        );

        const payload = {
            ...dados,
            calculo,
            atualizadoEm: agora
        };

        if (idEdicao) {
            payload.id = idEdicao;
            payload.criadoEm = this.state.todosApontamentos.find(item => item.id === idEdicao)?.criadoEm || agora;
            await DB.update(STORES.APONTAMENTOS, payload);
            this.showToast("Apontamento atualizado.");
        } else if (existente) {
            payload.id = existente.id;
            payload.criadoEm = existente.criadoEm || agora;
            await DB.update(STORES.APONTAMENTOS, payload);
            this.showToast("Data já existia. Apontamento substituído.");
        } else {
            payload.criadoEm = agora;
            await DB.add(STORES.APONTAMENTOS, payload);
            this.showToast("Apontamento salvo.");
        }

        await this.carregarApontamentos();
        this.state.pendingDeleteId = null;
        this.resetForm(false);
        this.render();
    },

    editarApontamento(id) {
        const registro = this.state.todosApontamentos.find(item => item.id === id);

        if (!registro) {
            return;
        }

        this.state.editId = id;
        this.state.pendingDeleteId = null;
        this.dom.apontamentoId.value = registro.id;
        this.dom.data.value = registro.data;
        this.dom.entrada.value = registro.entrada;
        this.dom.saidaAlmoco.value = registro.saidaAlmoco;
        this.dom.retornoAlmoco.value = registro.retornoAlmoco;
        this.dom.saida.value = registro.saida;
        this.dom.feriado.checked = Boolean(registro.feriado);
        this.dom.saveEntryBtn.textContent = "Atualizar apontamento";
        this.renderPreview();
        this.setView("apontamentos");
    },

    async excluirApontamento(id) {
        const registro = this.state.todosApontamentos.find(item => item.id === id);

        if (!registro) {
            return;
        }

        if (this.state.pendingDeleteId !== id) {
            this.state.pendingDeleteId = id;
            this.renderTabela();
            this.showToast(`Toque em Confirmar para excluir ${Competencia.formatarData(registro.data)}.`);
            return;
        }

        await DB.delete(STORES.APONTAMENTOS, id);
        this.state.pendingDeleteId = null;
        await this.carregarApontamentos();
        this.render();
        this.showToast("Apontamento excluído.");
    },

    resetForm(restaurarData = true) {
        this.state.editId = null;
        this.dom.form.reset();
        this.dom.apontamentoId.value = "";
        this.dom.entrada.value = "07:00";
        this.dom.saidaAlmoco.value = "12:00";
        this.dom.retornoAlmoco.value = "13:00";
        this.dom.saida.value = "17:00";
        this.dom.saveEntryBtn.textContent = "Salvar apontamento";

        if (restaurarData) {
            this.definirDataPadrao();
        }

        this.renderPreview();
    },

    setView(view) {
        this.state.view = view;
        document.body.dataset.view = view;
        const titles = {
            dashboard: "Dashboard financeiro",
            apontamentos: "Apontamentos",
            folha: "Folha prevista",
            historico: "Histórico",
            configuracoes: "Configurações"
        };

        this.dom.navItems.forEach(item => {
            item.classList.toggle("is-active", item.dataset.view === view);
        });

        this.dom.views.forEach(panel => {
            panel.classList.toggle("is-active", panel.dataset.panel === view);
        });

        this.dom.pageTitle.textContent = titles[view] || "SalárioPro";
    },

    obterResumo() {
        const totais = Horas.somarCompetencia(this.state.apontamentos, this.state.competencia);
        const folha = Folha.calcularFolha(totais);

        return { totais, folha };
    },

    render() {
        this.dom.competenciaAtual.textContent = Competencia.formatarCompetencia(this.state.competencia);
        this.renderDashboard();
        this.renderTabela();
        this.renderFolha();
        this.renderHistorico();
        this.renderPreview();
    },

    renderDashboard() {
        const { totais, folha } = this.obterResumo();
        const totalHoras = totais.horasTrabalhadas || 0;
        const totalExtras = Horas.totalExtras(totais);

        this.text("#liquidoPrevisto", Folha.moeda(folha.liquido));
        this.text("#brutoPrevisto", Folha.moeda(folha.bruto));
        this.text("#horasNormais", Horas.formatarHoras(totais.horasNormais));
        this.text("#faltantes", Horas.formatarHoras(totais.horasFaltantes));
        this.text("#he60", Horas.formatarHoras(totais.he60));
        this.text("#he70", Horas.formatarHoras(totais.he70));
        this.text("#he100", Horas.formatarHoras(totais.he100));
        this.text("#periculosidadeTotal", Folha.moeda(folha.periculosidade + folha.periculosidadeExtras));
        this.text("#rsrTotal", Folha.moeda(folha.rsr));
        this.text("#diasRegistrados", String(totais.diasRegistrados));
        this.text("#totalHorasMix", `${Horas.formatarHoras(totalHoras)} totais`);
        this.text("#jornadaHint", `Jornada ${Horas.formatarHoras(totais.jornadaRegistrada)}`);
        this.text("#liquidoHint", `Proventos ${Folha.moeda(folha.proventos)}`);
        this.text("#brutoHint", `Descontos ${Folha.moeda(folha.descontos)}`);
        this.text("#faltasHint", `${totais.diasComFalta} dia(s)`);
        this.text(
            "#dashboardSubtitle",
            totais.diasRegistrados
                ? `${totais.diasRegistrados} dia(s) | ${Horas.formatarHoras(totalExtras)} HE`
                : "Sem apontamentos"
        );

        this.renderMixBars(totais);
        this.renderRecentes();
    },

    renderMixBars(totais) {
        const itens = [
            { label: "Normais", valor: totais.horasNormais, cor: "var(--accent)" },
            { label: "HE 60%", valor: totais.he60, cor: "var(--accent-2)" },
            { label: "HE 70%", valor: totais.he70, cor: "var(--warning)" },
            { label: "HE 100%", valor: totais.he100, cor: "var(--purple)" },
            { label: "Faltas", valor: totais.horasFaltantes, cor: "var(--danger)" }
        ];
        const maior = Math.max(...itens.map(item => item.valor), 1);

        this.$("#mixBars").innerHTML = itens.map(item => {
            const largura = Math.round((item.valor / maior) * 100);

            return `
                <div class="bar-row">
                    <div class="bar-meta">
                        <span>${item.label}</span>
                        <strong>${Horas.formatarHoras(item.valor)}</strong>
                    </div>
                    <div class="bar-track">
                        <div class="bar-fill" style="width: ${largura}%; background: ${item.cor};"></div>
                    </div>
                </div>
            `;
        }).join("");
    },

    renderRecentes() {
        const recentes = this.state.apontamentos.slice(0, 5);
        const alvo = this.$("#recentEntries");

        if (!recentes.length) {
            alvo.innerHTML = '<div class="empty-state">Sem apontamentos</div>';
            return;
        }

        alvo.innerHTML = recentes.map(apontamento => {
            const calculo = this.calcularRegistro(apontamento);
            const extras = calculo.he60 + calculo.he70 + calculo.he100;

            return `
                <div class="list-row">
                    <div>
                        <strong>${Competencia.formatarData(apontamento.data)} - ${calculo.tipoDia}</strong>
                        <span>${apontamento.entrada} às ${apontamento.saida} | ${Horas.formatarHoras(calculo.horasTrabalhadas)} trabalhadas</span>
                    </div>
                    <strong>${Horas.formatarHoras(extras)} HE</strong>
                </div>
            `;
        }).join("");
    },

    renderTabela() {
        const tbody = this.$("#apontamentosTable");
        this.text("#tableCount", `${this.state.apontamentos.length} registro(s)`);

        if (!this.state.apontamentos.length) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="6">
                        <div class="empty-state">Sem apontamentos</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.state.apontamentos.map(apontamento => {
            const calculo = this.calcularRegistro(apontamento);
            const extras = calculo.he60 + calculo.he70 + calculo.he100;
            const aguardandoConfirmacao = this.state.pendingDeleteId === apontamento.id;

            return `
                <tr>
                    <td data-label="Data">
                        <strong>${Competencia.formatarData(apontamento.data)}</strong>
                        <span>${calculo.tipoDia}</span>
                    </td>
                    <td data-label="Jornada">${Horas.formatarHoras(calculo.jornada)}</td>
                    <td data-label="Trabalhadas">${Horas.formatarHoras(calculo.horasTrabalhadas)}</td>
                    <td data-label="Extras">${Horas.formatarHoras(extras)}</td>
                    <td data-label="Falta">${Horas.formatarHoras(calculo.horasFaltantes)}</td>
                    <td data-label="Ações">
                        <div class="row-actions">
                            <button class="row-action" type="button" data-action="edit" data-id="${apontamento.id}">Editar</button>
                            <button class="row-action danger" type="button" data-action="delete" data-id="${apontamento.id}">
                                ${aguardandoConfirmacao ? "Confirmar" : "Excluir"}
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    },

    renderFolha() {
        const { totais, folha } = this.obterResumo();
        const proventos = [
            ["Horas normais", folha.salarioNormal],
            ["Periculosidade sobre normais", folha.periculosidade],
            ["HE 60%", folha.he60],
            ["HE 70%", folha.he70],
            ["HE 100%", folha.he100],
            ["Periculosidade sobre extras", folha.periculosidadeExtras],
            ["RSR sobre extras", folha.rsr]
        ];
        const descontos = [
            ["Faltas / atrasos", folha.descontoAtrasos],
            ["INSS", folha.inss],
            ["IRRF", folha.irrf]
        ];

        this.text("#folhaLiquido", Folha.moeda(folha.liquido));
        this.text("#folhaResumo", `${totais.diasRegistrados} registro(s)`);
        this.text("#proventosTotal", Folha.moeda(folha.proventos));
        this.text("#descontosTotal", Folha.moeda(folha.descontos));
        this.renderBreakdown("#proventosList", proventos);
        this.renderBreakdown("#descontosList", descontos);
    },

    renderBreakdown(seletor, itens) {
        this.$(seletor).innerHTML = itens.map(([label, valor]) => `
            <div class="breakdown-row">
                <div>
                    <strong>${label}</strong>
                </div>
                <strong>${Folha.moeda(valor)}</strong>
            </div>
        `).join("");
    },

    renderHistorico() {
        const grupos = this.state.todosApontamentos.reduce((acc, apontamento) => {
            const codigo = apontamento.competencia || Competencia.getCompetencia(apontamento.data).codigo;
            acc[codigo] = acc[codigo] || [];
            acc[codigo].push(apontamento);
            return acc;
        }, {});
        const codigos = Object.keys(grupos).sort().reverse();
        const alvo = this.$("#historicoLista");

        if (!codigos.length) {
            alvo.innerHTML = '<div class="empty-state">Sem histórico</div>';
            return;
        }

        alvo.innerHTML = codigos.map(codigo => {
            const competencia = Competencia.competenciaPorCodigo(codigo);
            const totais = Horas.somarCompetencia(grupos[codigo], competencia);
            const folha = Folha.calcularFolha(totais);

            return `
                <article class="history-row">
                    <div>
                        <strong>${codigo}</strong>
                        <span>${Competencia.formatarCompetencia(competencia)}</span>
                        <span>${totais.diasRegistrados} registro(s) | ${Horas.formatarHoras(totais.horasTrabalhadas)}</span>
                    </div>
                    <strong>${Folha.moeda(folha.liquido)}</strong>
                </article>
            `;
        }).join("");
    },

    renderPreview() {
        const dados = this.coletarFormulario();

        if (!dados.data || !dados.entrada || !dados.saida) {
            this.dom.formPreview.innerHTML = "<span>Prévia do dia</span><strong>Sem prévia</strong>";
            return;
        }

        const calculo = Horas.calcularDia(
            dados.data,
            dados.entrada,
            dados.saidaAlmoco,
            dados.retornoAlmoco,
            dados.saida,
            { feriado: dados.feriado }
        );
        const extras = calculo.he60 + calculo.he70 + calculo.he100;

        this.dom.formPreview.innerHTML = `
            <span>${calculo.tipoDia} | jornada ${Horas.formatarHoras(calculo.jornada)}</span>
            <strong>${Horas.formatarHoras(calculo.horasTrabalhadas)} trabalhadas, ${Horas.formatarHoras(extras)} extras, ${Horas.formatarHoras(calculo.horasFaltantes)} faltantes</strong>
        `;
    },

    calcularRegistro(apontamento) {
        return Horas.calcularDia(
            apontamento.data,
            apontamento.entrada,
            apontamento.saidaAlmoco,
            apontamento.retornoAlmoco,
            apontamento.saida,
            { feriado: apontamento.feriado }
        );
    },

    text(seletor, valor) {
        const el = this.$(seletor);

        if (el) {
            el.textContent = valor;
        }
    },

    showToast(mensagem) {
        window.clearTimeout(this.toastTimer);
        this.dom.toast.textContent = mensagem;
        this.dom.toast.classList.add("is-visible");
        this.toastTimer = window.setTimeout(() => {
            this.dom.toast.classList.remove("is-visible");
        }, 3200);
    },

    registrarServiceWorker() {
        if (!("serviceWorker" in navigator)) {
            return;
        }

        window.addEventListener("load", () => {
            navigator.serviceWorker
                .register("./sw.js")
                .catch(error => console.warn("Service worker não registrado", error));
        });
    }
};

document.addEventListener("DOMContentLoaded", () => App.init());
