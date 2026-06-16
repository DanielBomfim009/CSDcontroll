const App = {
    state: {
        competencia: null,
        apontamentos: [],
        todosApontamentos: [],
        holerites: [],
        view: "dashboard",
        editId: null,
        pendingDeleteId: null,
        importRecords: [],
        importPayslip: null,
        started: false
    },

    async init() {
        this.cacheDom();
        this.bindAuthEvents();
        this.registrarServiceWorker();

        if (!this.isAuthenticated()) {
            this.showAuth();
            return;
        }

        await this.startApp();
    },

    async startApp() {
        if (this.state.started) {
            this.hideAuth();
            this.render();
            return;
        }

        this.state.started = true;
        this.state.competencia = Competencia.getCompetencia();
        this.definirDataPadrao();
        this.bindEvents();
        this.setView(this.state.view);

        try {
            await DB.init();
            await this.carregarApontamentos();
            await this.carregarHolerites();
            this.aplicarCompetenciaSalva();
            this.render();
        } catch (error) {
            console.error(error);
            this.showToast(error.message || "Não foi possível iniciar o banco local.");
        }

        this.hideAuth();
    },

    cacheDom() {
        this.$ = seletor => document.querySelector(seletor);
        this.$$ = seletor => Array.from(document.querySelectorAll(seletor));
        this.dom = {
            pageTitle: this.$("#pageTitle"),
            competenciaAtual: this.$("#competenciaAtual"),
            competenciaSelect: this.$("#competenciaSelect"),
            adiantamentoPrevisto: this.$("#adiantamentoPrevisto"),
            fgtsPrevisto: this.$("#fgtsPrevisto"),
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
            openImportBtn: this.$("#openImportBtn"),
            importModal: this.$("#importModal"),
            closeImportBtn: this.$("#closeImportBtn"),
            cancelImportBtn: this.$("#cancelImportBtn"),
            importFile: this.$("#importFile"),
            importFileName: this.$("#importFileName"),
            importSummary: this.$("#importSummary"),
            confirmImportBtn: this.$("#confirmImportBtn"),
            historicoRecebidosLista: this.$("#historicoRecebidosLista"),
            historicoRecebidosCount: this.$("#historicoRecebidosCount"),
            historicoProjecoesCount: this.$("#historicoProjecoesCount"),
            comparativoGrid: this.$("#comparativoGrid"),
            comparativoPeriodo: this.$("#comparativoPeriodo"),
            comparativoLista: this.$("#comparativoLista"),
            openPayslipImportBtn: this.$("#openPayslipImportBtn"),
            payslipCount: this.$("#payslipCount"),
            payslipModal: this.$("#payslipModal"),
            closePayslipBtn: this.$("#closePayslipBtn"),
            cancelPayslipBtn: this.$("#cancelPayslipBtn"),
            payslipFile: this.$("#payslipFile"),
            payslipFileName: this.$("#payslipFileName"),
            payslipSummary: this.$("#payslipSummary"),
            confirmPayslipBtn: this.$("#confirmPayslipBtn"),
            resumoFinanceiro: this.$("#resumoFinanceiro"),
            resumoFgts: this.$("#resumoFgts"),
            authScreen: this.$("#authScreen"),
            loginForm: this.$("#loginForm"),
            signupForm: this.$("#signupForm"),
            loginEmail: this.$("#loginEmail"),
            loginPassword: this.$("#loginPassword"),
            signupName: this.$("#signupName"),
            signupEmail: this.$("#signupEmail"),
            signupPassword: this.$("#signupPassword"),
            authMessage: this.$("#authMessage"),
            authModeButtons: this.$$("[data-auth-mode]"),
            logoutBtn: this.$("#logoutBtn"),
            toast: this.$("#toast")
        };
    },

    bindAuthEvents() {
        this.dom.loginForm.addEventListener("submit", event => this.login(event));
        this.dom.signupForm.addEventListener("submit", event => this.signup(event));
        this.dom.authModeButtons.forEach(button => {
            button.addEventListener("click", () => this.setAuthMode(button.dataset.authMode));
        });
        this.dom.logoutBtn.addEventListener("click", () => this.logout());
    },

    getLocalUser() {
        try {
            return JSON.parse(localStorage.getItem("salariopro.user") || "null");
        } catch (error) {
            return null;
        }
    },

    isAuthenticated() {
        const user = this.getLocalUser();
        const session = localStorage.getItem("salariopro.session");
        return Boolean(user && session === user.email);
    },

    showAuth(mode = null) {
        const nextMode = mode || (this.getLocalUser() ? "login" : "signup");
        document.body.classList.add("auth-active");
        this.setAuthMode(nextMode);
    },

    hideAuth() {
        document.body.classList.remove("auth-active");
        this.text("#authMessage", "");
    },

    setAuthMode(mode) {
        const isSignup = mode === "signup";
        document.body.dataset.authMode = isSignup ? "signup" : "login";
        this.dom.loginForm.classList.toggle("is-active", !isSignup);
        this.dom.signupForm.classList.toggle("is-active", isSignup);
        this.text("#authMessage", "");
    },

    async login(event) {
        event.preventDefault();
        const user = this.getLocalUser();
        const email = this.dom.loginEmail.value.trim().toLowerCase();
        const senha = this.dom.loginPassword.value;

        if (!user) {
            this.setAuthMode("signup");
            this.text("#authMessage", "Crie seu cadastro local.");
            return;
        }

        const senhaHash = await this.hashPassword(senha);
        const hashSalvo = user.senhaHash || await this.hashPassword(user.senha || "");

        if (user.email !== email || hashSalvo !== senhaHash) {
            this.text("#authMessage", "E-mail ou senha inválidos.");
            return;
        }

        if (!user.senhaHash) {
            const usuarioAtualizado = { nome: user.nome, email: user.email, senhaHash };
            localStorage.setItem("salariopro.user", JSON.stringify(usuarioAtualizado));
        }

        localStorage.setItem("salariopro.session", user.email);
        this.dom.loginPassword.value = "";
        await this.startApp();
    },

    async signup(event) {
        event.preventDefault();
        const user = {
            nome: this.dom.signupName.value.trim(),
            email: this.dom.signupEmail.value.trim().toLowerCase(),
            senha: this.dom.signupPassword.value
        };

        if (!user.nome || !user.email || user.senha.length < 4) {
            this.text("#authMessage", "Preencha os dados do cadastro.");
            return;
        }

        const usuarioLocal = {
            nome: user.nome,
            email: user.email,
            senhaHash: await this.hashPassword(user.senha)
        };

        localStorage.setItem("salariopro.user", JSON.stringify(usuarioLocal));
        localStorage.setItem("salariopro.session", user.email);
        this.dom.signupPassword.value = "";
        await this.startApp();
    },

    logout() {
        localStorage.removeItem("salariopro.session");
        this.showAuth("login");
    },

    async hashPassword(valor) {
        if (window.crypto?.subtle) {
            const bytes = new TextEncoder().encode(`salariopro:${valor}`);
            const hash = await crypto.subtle.digest("SHA-256", bytes);
            return Array.from(new Uint8Array(hash))
                .map(byte => byte.toString(16).padStart(2, "0"))
                .join("");
        }

        let hash = 5381;

        for (let index = 0; index < valor.length; index += 1) {
            hash = ((hash << 5) + hash) + valor.charCodeAt(index);
            hash >>>= 0;
        }

        return `fallback:${hash.toString(16)}`;
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
        this.dom.openImportBtn.addEventListener("click", () => this.openImportModal());
        this.dom.closeImportBtn.addEventListener("click", () => this.closeImportModal());
        this.dom.cancelImportBtn.addEventListener("click", () => this.closeImportModal());
        this.dom.confirmImportBtn.addEventListener("click", () => this.importarRegistros());
        this.dom.importFile.addEventListener("change", event => this.handleImportFile(event));
        this.dom.openPayslipImportBtn.addEventListener("click", () => this.openPayslipModal());
        this.dom.closePayslipBtn.addEventListener("click", () => this.closePayslipModal());
        this.dom.cancelPayslipBtn.addEventListener("click", () => this.closePayslipModal());
        this.dom.confirmPayslipBtn.addEventListener("click", () => this.importarContracheque());
        this.dom.payslipFile.addEventListener("change", event => this.handlePayslipFile(event));
        this.dom.competenciaSelect.addEventListener("change", event => this.setCompetencia(event.target.value));
        this.dom.importModal.addEventListener("click", event => {
            if (event.target === this.dom.importModal) {
                this.closeImportModal();
            }
        });
        this.dom.payslipModal.addEventListener("click", event => {
            if (event.target === this.dom.payslipModal) {
                this.closePayslipModal();
            }
        });

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

        this.filtrarApontamentos();
    },

    async carregarHolerites() {
        const registros = await DB.getAll(STORES.HISTORICO);
        this.state.holerites = registros
            .filter(registro => registro.tipo === "contracheque")
            .sort((a, b) => (b.competencia || "").localeCompare(a.competencia || ""));
    },

    filtrarApontamentos() {
        this.state.apontamentos = this.state.todosApontamentos
            .filter(apontamento => Competencia.pertenceCompetencia(apontamento.data, this.state.competencia));
    },

    aplicarCompetenciaSalva() {
        const codigo = localStorage.getItem("csdcontrol.competencia");

        if (codigo) {
            try {
                this.state.competencia = Competencia.competenciaPorCodigo(codigo);
                this.filtrarApontamentos();
            } catch (error) {
                localStorage.removeItem("csdcontrol.competencia");
            }
        }
    },

    setCompetencia(codigo) {
        if (!codigo) {
            return;
        }

        this.state.competencia = Competencia.competenciaPorCodigo(codigo);
        localStorage.setItem("csdcontrol.competencia", codigo);
        this.state.pendingDeleteId = null;
        this.filtrarApontamentos();
        this.render();
    },

    getCompetenciasDisponiveis() {
        const codigos = new Set([
            Competencia.getCompetencia().codigo,
            this.state.competencia?.codigo
        ].filter(Boolean));

        this.state.todosApontamentos.forEach(apontamento => {
            codigos.add(apontamento.competencia || Competencia.getCompetencia(apontamento.data).codigo);
        });

        this.state.holerites.forEach(holerite => {
            if (holerite.competencia) {
                codigos.add(holerite.competencia);
            }
        });

        return Array.from(codigos)
            .sort((a, b) => b.localeCompare(a))
            .map(codigo => Competencia.competenciaPorCodigo(codigo));
    },

    normalizarRegistro(registro) {
        const competencia = registro.competencia || Competencia.getCompetencia(registro.data).codigo;

        return {
            ...registro,
            calculo: registro.calculo || null,
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

    openImportModal() {
        this.state.importRecords = [];
        this.dom.importFile.value = "";
        this.dom.importFileName.textContent = "PDF, CSV ou TXT";
        this.dom.importSummary.textContent = "Nenhum arquivo selecionado.";
        this.dom.confirmImportBtn.disabled = true;
        this.dom.importModal.classList.add("is-visible");
        this.dom.importModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
    },

    closeImportModal() {
        this.dom.importModal.classList.remove("is-visible");
        this.dom.importModal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-open");
    },

    openPayslipModal() {
        this.state.importPayslip = null;
        this.dom.payslipFile.value = "";
        this.dom.payslipFileName.textContent = "PDF do contracheque";
        this.dom.payslipSummary.textContent = "Nenhum arquivo selecionado.";
        this.dom.confirmPayslipBtn.disabled = true;
        this.dom.payslipModal.classList.add("is-visible");
        this.dom.payslipModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
    },

    closePayslipModal() {
        this.dom.payslipModal.classList.remove("is-visible");
        this.dom.payslipModal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-open");
    },

    async handleImportFile(event) {
        const [file] = event.target.files;

        if (!file) {
            return;
        }

        this.dom.importFileName.textContent = file.name;
        this.dom.importSummary.textContent = "Processando arquivo...";
        this.dom.confirmImportBtn.disabled = true;

        try {
            const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
            const texto = isPdf ? await this.extractPdfText(file) : await file.text();
            const registros = this.parseImportText(texto);
            this.state.importRecords = registros;
            this.renderImportSummary(registros);
            this.dom.confirmImportBtn.disabled = registros.length === 0;
        } catch (error) {
            console.error(error);
            this.state.importRecords = [];
            this.dom.importSummary.textContent = "Arquivo não reconhecido.";
            this.showToast("Não foi possível importar esse arquivo.");
        }
    },

    async handlePayslipFile(event) {
        const [file] = event.target.files;

        if (!file) {
            return;
        }

        this.dom.payslipFileName.textContent = file.name;
        this.dom.payslipSummary.textContent = "Lendo contracheque...";
        this.dom.confirmPayslipBtn.disabled = true;

        try {
            const texto = await this.extractPdfText(file);
            const contracheque = this.parsePayslipText(texto, file.name);

            if (!contracheque) {
                throw new Error("Contracheque não reconhecido.");
            }

            this.state.importPayslip = contracheque;
            this.dom.confirmPayslipBtn.disabled = false;
            this.dom.payslipSummary.innerHTML = `
                <strong>${contracheque.competencia}</strong>
                <span>${Competencia.formatarCompetencia(Competencia.competenciaPorCodigo(contracheque.competencia))}</span>
                <span>Pagamento ${Folha.moeda(contracheque.liquidoReceber)} · Mês ${Folha.moeda(contracheque.totalRecebidoMes)}</span>
            `;
        } catch (error) {
            console.error(error);
            this.state.importPayslip = null;
            this.dom.payslipSummary.textContent = "Não foi possível reconhecer esse contracheque.";
            this.showToast("PDF do contracheque não reconhecido.");
        }
    },

    async extractPdfText(file) {
        try {
            const pdfjs = await this.loadPdfJs();
            const data = await file.arrayBuffer();
            const pdf = await pdfjs.getDocument({ data }).promise;
            const paginas = [];

            for (let pagina = 1; pagina <= pdf.numPages; pagina += 1) {
                const page = await pdf.getPage(pagina);
                const content = await page.getTextContent();
                paginas.push(this.pdfTextContentToLines(content));
            }

            return paginas.join("\n");
        } catch (error) {
            console.warn("PDF.js indisponível. Usando extração básica.", error);
            return this.extractPdfTextFallback(file);
        }
    },

    loadPdfJs() {
        if (window.pdfjsLib) {
            return Promise.resolve(window.pdfjsLib);
        }

        return new Promise((resolve, reject) => {
            const existente = document.querySelector("[data-pdfjs]");

            if (existente) {
                existente.addEventListener("load", () => resolve(window.pdfjsLib), { once: true });
                existente.addEventListener("error", reject, { once: true });
                return;
            }

            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.async = true;
            script.dataset.pdfjs = "true";
            script.onload = () => {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
                resolve(window.pdfjsLib);
            };
            script.onerror = () => reject(new Error("PDF.js indisponível."));
            document.head.appendChild(script);
        });
    },

    pdfTextContentToLines(content) {
        const linhas = new Map();

        content.items.forEach(item => {
            const texto = String(item.str || "").trim();

            if (!texto) {
                return;
            }

            const x = item.transform?.[4] || 0;
            const y = Math.round((item.transform?.[5] || 0) * 2) / 2;
            const chave = String(y);
            const linha = linhas.get(chave) || [];
            linha.push({ x, texto });
            linhas.set(chave, linha);
        });

        return Array.from(linhas.entries())
            .sort((a, b) => Number(b[0]) - Number(a[0]))
            .map(([, itens]) => itens
                .sort((a, b) => a.x - b.x)
                .map(item => item.texto)
                .join(" ")
                .replace(/\s+/g, " ")
                .trim())
            .filter(Boolean)
            .join("\n");
    },

    async extractPdfTextFallback(file) {
        const buffer = await file.arrayBuffer();
        const raw = new TextDecoder("latin1").decode(buffer);
        const partes = [];
        const literalRegex = /\((?:\\.|[^\\)])*\)/g;
        const hexRegex = /<([0-9A-Fa-f\s]{4,})>/g;
        let match;

        while ((match = literalRegex.exec(raw))) {
            partes.push(this.decodePdfLiteral(match[0].slice(1, -1)));
        }

        while ((match = hexRegex.exec(raw))) {
            const hex = match[1].replace(/\s/g, "");

            if (hex.length % 2 === 0) {
                const bytes = hex.match(/.{2}/g).map(par => parseInt(par, 16));
                partes.push(new TextDecoder("latin1").decode(new Uint8Array(bytes)));
            }
        }

        return partes.join("\n");
    },

    decodePdfLiteral(texto) {
        return texto
            .replace(/\\([nrtbf()\\])/g, (_, char) => {
                const escapes = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" };
                return escapes[char] || char;
            })
            .replace(/\\([0-7]{1,3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)));
    },

    parseImportText(texto) {
        const registrosFolha = this.parseCompanyTimesheetText(texto);

        if (registrosFolha.length) {
            return registrosFolha;
        }

        const linhas = this.parseCsv(texto)
            .map(linha => linha.map(celula => celula.trim()))
            .filter(linha => linha.some(Boolean));

        if (linhas.length === 0) {
            return this.parsePlainTimesheetText(texto);
        }

        const cabecalho = linhas[0].map(celula => this.normalizarCabecalho(celula));
        const temCabecalho = cabecalho.some(celula => ["data", "dia", "dataponto"].includes(celula));
        const dados = temCabecalho ? linhas.slice(1) : linhas;
        const registros = [];

        dados.forEach(linha => {
            const registro = this.mapImportRow(linha, temCabecalho ? cabecalho : null);

            if (registro) {
                registros.push(registro);
            }
        });

        if (registros.length) {
            return this.dedupeImportRecords(registros);
        }

        return this.parsePlainTimesheetText(texto);
    },

    parsePayslipText(texto, fileName = "") {
        const competencia = this.extractPayslipCompetencia(texto, fileName);

        if (!competencia) {
            return null;
        }

        const extrairValor = pattern => {
            const match = String(texto || "").match(pattern);
            return match ? this.moedaParaNumero(match[1]) : 0;
        };
        const extrairTotais = () => {
            const match = String(texto || "").match(/([\d.]+,\d{2})\s+([\d.]+,\d{2})\s*\nTotal L[ií]quido Pgto:\s*([\d.]+,\d{2})/i);

            if (!match) {
                return null;
            }

            return {
                proventos: this.moedaParaNumero(match[1]),
                descontos: this.moedaParaNumero(match[2]),
                liquidoReceber: this.moedaParaNumero(match[3])
            };
        };

        const totais = extrairTotais();

        if (!totais) {
            return null;
        }

        const fgts = extrairValor(/IR:\s*\d+.*?[\d.]+,\d{2}\s+[\d.]+,\d{2}\s+([\d.]+,\d{2})/i);
        const adiantamento = extrairValor(/Desconto Adiantamento Salarial\s+[\d.,]+\s+([\d.]+,\d{2})/i);
        const inss = extrairValor(/INSS\s+[\d.,]+\s+([\d.]+,\d{2})/i);
        const irrf = extrairValor(/Imposto de Renda\s+[\d.,]+\s+([\d.]+,\d{2})/i);
        const irrfAdiantamento = extrairValor(/Imposto de Renda - Adiant\. Quinzenal\s+[\d.,]+\s+([\d.]+,\d{2})/i);

        return {
            tipo: "contracheque",
            competencia,
            arquivo: fileName,
            importadoEm: new Date().toISOString(),
            proventos: totais.proventos,
            descontos: totais.descontos,
            liquidoReceber: totais.liquidoReceber,
            fgts,
            adiantamento,
            totalRecebidoMes: Folha.arredondar(adiantamento + totais.liquidoReceber),
            inss,
            irrf,
            irrfAdiantamento
        };
    },

    extractPayslipCompetencia(texto, fileName = "") {
        const nome = String(fileName || "");
        const matchNome = nome.match(/-(\d{2})-(\d{4})/);

        if (matchNome) {
            const [, mes, ano] = matchNome;
            return `${ano}-${mes}`;
        }

        const matchTexto = String(texto || "").match(/contracheque.*?(\d{2})[\/-](\d{4})/i);

        if (matchTexto) {
            const [, mes, ano] = matchTexto;
            return `${ano}-${mes}`;
        }

        return "";
    },

    parseCompanyTimesheetText(texto) {
        const periodo = this.extractImportPeriod(texto);
        const linhas = String(texto || "")
            .replace(/\r/g, "\n")
            .replace(/\s+(seg|ter|qua|qui|sex|s[áa]b|dom)\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/gi, "\n$1 $2")
            .split("\n")
            .map(linha => linha.replace(/\s+/g, " ").trim())
            .filter(Boolean);
        const registros = [];
        const linhaPontoRegex = /^(seg|ter|qua|qui|sex|s[áa]b|dom)\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(.+)$/i;

        linhas.forEach(linha => {
            const match = linha.match(linhaPontoRegex);

            if (!match) {
                return;
            }

            const [, diaSemanaTexto, dia, mes, anoLinha, restante] = match;
            const tokens = restante.split(/\s+/);
            const pontos = tokens.slice(0, 4);
            const colunasApuradas = tokens.slice(4);

            if (colunasApuradas.length < 7) {
                return;
            }

            const domInterjornada = this.parseDuracaoImportacao(colunasApuradas[0]);
            const feriadoApurado = this.parseDuracaoImportacao(colunasApuradas[1]);
            const adicionalNoturno = this.parseDuracaoImportacao(colunasApuradas[2]);
            const he60Apurada = this.parseDuracaoImportacao(colunasApuradas[3]);
            const he70Apurada = this.parseDuracaoImportacao(colunasApuradas[4]);
            const faltantesApurados = Math.abs(this.parseDuracaoImportacao(colunasApuradas[5]));
            const he100Apurada = this.parseDuracaoImportacao(colunasApuradas[6]);

            if (pontos.length < 4) {
                return;
            }

            const entrada = pontos[0] === "-" ? "" : this.normalizarHorario(pontos[0]);
            const saidaAlmoco = pontos[1] === "-" ? "" : this.normalizarHorario(pontos[1]);
            const retornoAlmoco = pontos[2] === "-" ? "" : this.normalizarHorario(pontos[2]);
            const saida = pontos[3] === "-" ? "" : this.normalizarHorario(pontos[3]);

            const data = this.normalizarDataComPeriodo(dia, mes, anoLinha, periodo);

            if (!data) {
                return;
            }

            const diaSemana = diaSemanaTexto
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase();
            const feriado = diaSemana === "dom" || /\bferiado\b/i.test(linha);
            const jornada = Horas.obterJornadaEsperada(data, { feriado });
            const he60 = this.arredondarDuracaoImportacao(he60Apurada);
            const he70 = this.arredondarDuracaoImportacao(he70Apurada);
            const he100 = this.arredondarDuracaoImportacao(he100Apurada || feriadoApurado || domInterjornada);
            const horasFaltantes = this.arredondarDuracaoImportacao(faltantesApurados);
            const horasNormais = Math.max(0, Horas.arredondar(jornada - horasFaltantes));
            const horasTrabalhadas = Horas.arredondar(horasNormais + he60 + he70 + he100);

            if (!entrada && !saida && !he60 && !he70 && !he100 && !horasFaltantes) {
                return;
            }

            registros.push({
                data,
                entrada: entrada || "07:00",
                saidaAlmoco: saidaAlmoco || "12:00",
                retornoAlmoco: retornoAlmoco || "13:00",
                saida: saida || "17:00",
                feriado,
                competencia: Competencia.getCompetencia(data).codigo,
                calculo: {
                    data,
                    tipoDia: Horas.obterTipoDia(data, { feriado }),
                    jornada: Horas.arredondar(jornada),
                    horasTrabalhadas,
                    horasNormais,
                    horasFaltantes,
                    he60,
                    he70,
                    he100,
                    adicionalNoturno: this.arredondarDuracaoImportacao(adicionalNoturno)
                }
            });
        });

        return this.dedupeImportRecords(registros);
    },

    extractImportPeriod(texto) {
        const match = String(texto || "").match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\s*[-–]\s*(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);

        if (!match) {
            return null;
        }

        const [, diaInicio, mesInicio, anoInicio, diaFim, mesFim, anoFim] = match;

        return {
            inicio: new Date(Number(anoInicio), Number(mesInicio) - 1, Number(diaInicio)),
            fim: new Date(Number(anoFim), Number(mesFim) - 1, Number(diaFim))
        };
    },

    normalizarDataComPeriodo(dia, mes, anoLinha, periodo) {
        if (anoLinha) {
            return this.normalizarDataImportacao(`${dia}/${mes}/${anoLinha}`);
        }

        const diaNumero = Number(dia);
        const mesNumero = Number(mes);

        if (!diaNumero || !mesNumero) {
            return "";
        }

        if (!periodo) {
            const anoAtual = new Date().getFullYear();
            return this.normalizarDataImportacao(`${dia}/${mes}/${anoAtual}`);
        }

        const anos = [
            periodo.inicio.getFullYear() - 1,
            periodo.inicio.getFullYear(),
            periodo.fim.getFullYear(),
            periodo.fim.getFullYear() + 1
        ];
        const escolhido = anos
            .map(ano => new Date(ano, mesNumero - 1, diaNumero))
            .find(data => data >= periodo.inicio && data <= periodo.fim);

        if (!escolhido) {
            return "";
        }

        return Competencia.formatarDataISO(escolhido);
    },

    parsePlainTimesheetText(texto) {
        const linhas = String(texto || "")
            .replace(/\r/g, "\n")
            .split("\n")
            .map(linha => linha.replace(/\s+/g, " ").trim())
            .filter(Boolean);
        const registros = [];
        const dataRegex = /(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/;
        const horaRegex = /\b(?:[01]?\d|2[0-3])[:h.][0-5]\d\b/g;

        linhas.forEach((linha, index) => {
            const bloco = [linha, linhas[index + 1], linhas[index + 2]]
                .filter(Boolean)
                .join(" ");
            const dataMatch = bloco.match(dataRegex);

            if (!dataMatch) {
                return;
            }

            const horarios = Array.from(bloco.matchAll(horaRegex))
                .map(match => this.normalizarHorario(match[0]))
                .filter(Boolean);

            if (horarios.length < 2) {
                return;
            }

            const data = this.normalizarDataImportacao(dataMatch[1]);
            const entrada = horarios[0];
            const saidaAlmoco = horarios.length >= 4 ? horarios[1] : "12:00";
            const retornoAlmoco = horarios.length >= 4 ? horarios[2] : "13:00";
            const saida = horarios[horarios.length - 1];
            const feriado = /feriado|domingo|he\s*100/i.test(bloco);

            if (!data || !entrada || !saida) {
                return;
            }

            registros.push({
                data,
                entrada,
                saidaAlmoco,
                retornoAlmoco,
                saida,
                feriado,
                competencia: Competencia.getCompetencia(data).codigo
            });
        });

        return this.dedupeImportRecords(registros);
    },

    dedupeImportRecords(registros) {
        return Array.from(new Map(registros.map(registro => [registro.data, registro])).values())
            .sort((a, b) => b.data.localeCompare(a.data));
    },

    parseCsv(texto) {
        const delimitador = this.detectarDelimitador(texto);
        const linhas = texto.replace(/\r/g, "").split("\n");

        return linhas.map(linha => {
            const colunas = [];
            let atual = "";
            let dentroAspas = false;

            for (let i = 0; i < linha.length; i += 1) {
                const char = linha[i];
                const proximo = linha[i + 1];

                if (char === '"' && dentroAspas && proximo === '"') {
                    atual += '"';
                    i += 1;
                    continue;
                }

                if (char === '"') {
                    dentroAspas = !dentroAspas;
                    continue;
                }

                if (char === delimitador && !dentroAspas) {
                    colunas.push(atual);
                    atual = "";
                    continue;
                }

                atual += char;
            }

            colunas.push(atual);
            return colunas;
        });
    },

    detectarDelimitador(texto) {
        const amostra = texto.split(/\r?\n/).slice(0, 5).join("\n");
        const opcoes = [";", ",", "\t"];

        return opcoes
            .map(delimitador => ({
                delimitador,
                ocorrencias: (amostra.match(new RegExp(delimitador === "\t" ? "\\t" : `\\${delimitador}`, "g")) || []).length
            }))
            .sort((a, b) => b.ocorrencias - a.ocorrencias)[0].delimitador;
    },

    mapImportRow(linha, cabecalho) {
        const valor = (aliases, indicePadrao) => {
            if (!cabecalho) {
                return linha[indicePadrao] || "";
            }

            const indice = this.findImportColumn(cabecalho, aliases);
            return indice >= 0 ? linha[indice] || "" : "";
        };

        const data = this.normalizarDataImportacao(valor(["data", "dia", "dataponto", "datadoapontamento"], 0));
        const entrada = this.normalizarHorario(valor(["entrada", "inicio", "horaentrada"], 1));
        const saidaAlmoco = this.normalizarHorario(valor(["saidaalmoco", "iniciointervalo", "saidaintervalo"], 2)) || "12:00";
        const retornoAlmoco = this.normalizarHorario(valor(["retornoalmoco", "voltaalmoco", "fimintervalo", "retornointervalo"], 3)) || "13:00";
        const saida = this.normalizarHorario(valor(["saida", "fim", "horasaida"], 4));
        const feriado = this.normalizarBoolean(valor(["feriado", "he100", "domingoeferiado"], 5));

        if (!data || !entrada || !saida) {
            return null;
        }

        return {
            data,
            entrada,
            saidaAlmoco,
            retornoAlmoco,
            saida,
            feriado,
            competencia: Competencia.getCompetencia(data).codigo
        };
    },

    findImportColumn(cabecalho, aliases) {
        for (const alias of aliases) {
            const indice = cabecalho.findIndex(celula => celula === alias);

            if (indice >= 0) {
                return indice;
            }
        }

        return cabecalho.findIndex(celula => aliases.some(alias => alias.length > 5 && celula.includes(alias)));
    },

    normalizarCabecalho(valor) {
        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
    },

    normalizarDataImportacao(valor) {
        const texto = String(valor || "").trim();

        if (!texto) {
            return "";
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
            return texto;
        }

        const dataSeparada = texto.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);

        if (dataSeparada) {
            const [, dia, mes, ano] = dataSeparada;
            const anoCompleto = ano.length === 2 ? `20${ano}` : ano;
            return `${anoCompleto}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
        }

        const dataExtenso = texto
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .match(/^(\d{1,2})\s+de\s+([a-z]{3,})\.?\s+de\s+(\d{4})$/);

        if (dataExtenso) {
            const meses = {
                jan: "01", janeiro: "01", fev: "02", fevereiro: "02", mar: "03", marco: "03",
                abr: "04", abril: "04", mai: "05", maio: "05", jun: "06", junho: "06",
                jul: "07", julho: "07", ago: "08", agosto: "08", set: "09", setembro: "09",
                out: "10", outubro: "10", nov: "11", novembro: "11", dez: "12", dezembro: "12"
            };
            const [, dia, mes, ano] = dataExtenso;
            const mesNumero = meses[mes];

            if (mesNumero) {
                return `${ano}-${mesNumero}-${dia.padStart(2, "0")}`;
            }
        }

        const serial = Number(texto.replace(",", "."));

        if (Number.isFinite(serial) && serial > 25000) {
            const data = new Date(Math.round((serial - 25569) * 86400 * 1000));
            return Competencia.formatarDataISO(data);
        }

        return "";
    },

    normalizarHorario(valor) {
        const texto = String(valor || "").trim().toLowerCase();

        if (!texto) {
            return "";
        }

        const comSeparador = texto
            .replace(/\s/g, "")
            .replace("h", ":")
            .replace(".", ":");
        const relogio = comSeparador.match(/^(\d{1,2})(?::(\d{1,2}))?$/);

        if (relogio) {
            const horas = Number(relogio[1]);
            const minutos = Number(relogio[2] || 0);

            if (horas >= 0 && horas <= 23 && minutos >= 0 && minutos <= 59) {
                return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
            }
        }

        const numero = Number(texto.replace(",", "."));

        if (Number.isFinite(numero)) {
            const minutos = numero > 0 && numero <= 1
                ? Math.round(numero * 24 * 60)
                : Math.round(numero * 60);
            const horas = Math.floor(minutos / 60) % 24;
            const resto = minutos % 60;

            return `${String(horas).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
        }

        return "";
    },

    parseDuracaoImportacao(valor) {
        const texto = String(valor || "").trim();

        if (!texto || texto === "-") {
            return 0;
        }

        const sinal = texto.startsWith("-") ? -1 : 1;
        const limpo = texto.replace(/^[+-]/, "");
        const match = limpo.match(/^(\d{1,2}):(\d{2})$/);

        if (!match) {
            return 0;
        }

        const [, horas, minutos] = match;
        return sinal * ((Number(horas) * 60 + Number(minutos)) / 60);
    },

    arredondarDuracaoImportacao(valor) {
        return Horas.arredondar(Math.max(0, valor || 0));
    },

    normalizarBoolean(valor) {
        return ["1", "s", "sim", "true", "x", "he100", "feriado"]
            .includes(String(valor || "").trim().toLowerCase());
    },

    moedaParaNumero(valor) {
        const texto = String(valor || "").trim();

        if (!texto) {
            return 0;
        }

        return Number(texto.replace(/\./g, "").replace(",", ".")) || 0;
    },

    renderImportSummary(registros) {
        if (!registros.length) {
            this.dom.importSummary.textContent = "Nenhum registro válido encontrado.";
            return;
        }

        const primeiro = registros[registros.length - 1];
        const ultimo = registros[0];
        this.dom.importSummary.innerHTML = `
            <strong>${registros.length} registro(s) encontrados</strong>
            <span>${Competencia.formatarData(primeiro.data)} até ${Competencia.formatarData(ultimo.data)}</span>
        `;
    },

    async importarRegistros() {
        if (!this.state.importRecords.length) {
            return;
        }

        const agora = new Date().toISOString();
        const existentes = new Map(this.state.todosApontamentos.map(registro => [registro.data, registro]));
        let criados = 0;
        let atualizados = 0;

        for (const registro of this.state.importRecords) {
            const existente = existentes.get(registro.data);
            const calculo = registro.calculo || Horas.calcularDia(
                registro.data,
                registro.entrada,
                registro.saidaAlmoco,
                registro.retornoAlmoco,
                registro.saida,
                { feriado: registro.feriado }
            );
            const payload = {
                ...registro,
                calculo,
                atualizadoEm: agora
            };

            if (existente) {
                payload.id = existente.id;
                payload.criadoEm = existente.criadoEm || agora;
                await DB.update(STORES.APONTAMENTOS, payload);
                atualizados += 1;
            } else {
                payload.criadoEm = agora;
                await DB.add(STORES.APONTAMENTOS, payload);
                criados += 1;
            }
        }

        const competenciaImportada = this.getCompetenciaPredominante(this.state.importRecords);

        if (competenciaImportada) {
            this.state.competencia = Competencia.competenciaPorCodigo(competenciaImportada);
            localStorage.setItem("csdcontrol.competencia", competenciaImportada);
        }

        await this.carregarApontamentos();
        this.closeImportModal();
        this.render();
        this.showToast(`${criados + atualizados} registro(s) importados.`);
    },

    async importarContracheque() {
        if (!this.state.importPayslip) {
            return;
        }

        const existentes = await DB.getAll(STORES.HISTORICO);
        const existente = existentes.find(item =>
            item.tipo === "contracheque" &&
            item.competencia === this.state.importPayslip.competencia
        );
        const payload = {
            ...this.state.importPayslip
        };

        if (existente) {
            payload.id = existente.id;
            await DB.update(STORES.HISTORICO, payload);
        } else {
            await DB.add(STORES.HISTORICO, payload);
        }

        await this.carregarHolerites();
        this.closePayslipModal();
        this.render();
        this.showToast("Contracheque salvo no histórico.");
    },

    getCompetenciaPredominante(registros) {
        const contagem = registros.reduce((acc, registro) => {
            const codigo = registro.competencia || Competencia.getCompetencia(registro.data).codigo;
            acc[codigo] = (acc[codigo] || 0) + 1;
            return acc;
        }, {});

        return Object.entries(contagem)
            .sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0]?.[0] || "";
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
            dashboard: "Painel financeiro",
            apontamentos: "Registro de ponto",
            folha: "Folha prevista",
            historico: "Meses anteriores",
            comparativo: "Comparativo",
            configuracoes: "Ajustes"
        };

        this.dom.navItems.forEach(item => {
            item.classList.toggle("is-active", item.dataset.view === view);
        });

        this.dom.views.forEach(panel => {
            panel.classList.toggle("is-active", panel.dataset.panel === view);
        });

        this.dom.pageTitle.textContent = titles[view] || "CSDControl";
    },

    obterResumo() {
        const totais = Horas.somarCompetencia(this.state.apontamentos, this.state.competencia);
        const folha = Folha.calcularFolha(totais, this.state.competencia);

        return { totais, folha };
    },

    obterHoleriteAtual() {
        return this.state.holerites.find(item => item.competencia === this.state.competencia?.codigo) || null;
    },

    render() {
        this.dom.competenciaAtual.textContent = Competencia.formatarCompetencia(this.state.competencia);
        this.renderCompetenciaSelect();
        this.renderDashboard();
        this.renderTabela();
        this.renderFolha();
        this.renderHistorico();
        this.renderComparativo();
        this.renderConfiguracoes();
        this.renderPreview();
    },

    renderCompetenciaSelect() {
        const competencias = this.getCompetenciasDisponiveis();

        this.dom.competenciaSelect.innerHTML = competencias.map(competencia => `
            <option value="${competencia.codigo}">
                ${Competencia.formatarCompetencia(competencia)}
            </option>
        `).join("");
        this.dom.competenciaSelect.value = this.state.competencia.codigo;
    },

    renderDashboard() {
        const { totais, folha } = this.obterResumo();
        const holerite = this.obterHoleriteAtual();
        const totalHoras = totais.horasTrabalhadas || 0;
        const totalExtras = Horas.totalExtras(totais);

        this.text("#liquidoPrevisto", Folha.moeda(folha.liquido));
        this.text("#brutoPrevisto", Folha.moeda(folha.bruto));
        this.text("#adiantamentoPrevisto", Folha.moeda(folha.adiantamento));
        this.text("#fgtsPrevisto", Folha.moeda(folha.fgts));
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
        this.text("#liquidoHint", `Mês ${Folha.moeda(folha.liquidoMes)} · Adiantamento ${Folha.moeda(folha.adiantamento)}`);
        this.text("#brutoHint", `Legais ${Folha.moeda(folha.descontosLegais)} · FGTS ${Folha.moeda(folha.fgts)}`);
        this.text("#faltasHint", `${totais.diasComFalta} dia(s)`);
        this.text(
            "#dashboardSubtitle",
            totais.diasRegistrados
                ? `${totais.diasRegistrados} dia(s) · ${Horas.formatarHoras(totalExtras)} HE`
                : "Sem apontamentos"
        );

        if (holerite) {
            this.text("#liquidoPrevisto", Folha.moeda(holerite.liquidoReceber));
            this.text("#brutoPrevisto", Folha.moeda(holerite.proventos));
            this.text("#adiantamentoPrevisto", Folha.moeda(holerite.adiantamento));
            this.text("#fgtsPrevisto", Folha.moeda(holerite.fgts));
            this.text("#liquidoHint", `Recebido no mes ${Folha.moeda(holerite.totalRecebidoMes || holerite.liquidoReceber)} · Adiantamento ${Folha.moeda(holerite.adiantamento)}`);
            this.text("#brutoHint", `Descontos ${Folha.moeda(holerite.descontos)} · FGTS ${Folha.moeda(holerite.fgts)}`);
            this.text("#dashboardSubtitle", `Contracheque importado · Fechamento ${Folha.moeda(holerite.liquidoReceber)}`);
        }

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
        const recentes = this.state.apontamentos.slice(0, 3);
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
        const holerite = this.obterHoleriteAtual();

        if (holerite) {
            const totalRecebidoMes = holerite.totalRecebidoMes || holerite.liquidoReceber;
            const descontosConhecidos = [
                holerite.adiantamento,
                holerite.inss,
                holerite.irrf,
                holerite.irrfAdiantamento
            ].reduce((acc, valor) => acc + (valor || 0), 0);
            const outrosDescontos = Folha.arredondar(Math.max(0, holerite.descontos - descontosConhecidos));
            const proventosImportados = [
                ["Total importado", holerite.proventos]
            ];
            const descontosImportados = [
                ["Adiantamento salarial", holerite.adiantamento],
                ["INSS", holerite.inss],
                ["IRRF fechamento", holerite.irrf],
                ["IRRF quinzena", holerite.irrfAdiantamento],
                ["Outros descontos", outrosDescontos]
            ].filter(([, valor]) => valor > 0);
            const resumoImportado = [
                ["Recebido total do mes", totalRecebidoMes],
                ["Adiantamento recebido", holerite.adiantamento],
                ["Pagamento do dia 01", holerite.liquidoReceber],
                ["FGTS do mes", holerite.fgts]
            ];

            this.text("#folhaLiquido", Folha.moeda(holerite.liquidoReceber));
            this.text("#folhaResumo", `Contracheque importado · Mes ${Folha.moeda(totalRecebidoMes)}`);
            this.text("#proventosTotal", Folha.moeda(holerite.proventos));
            this.text("#descontosTotal", Folha.moeda(holerite.descontos));
            this.text("#resumoFgts", `FGTS ${Folha.moeda(holerite.fgts)}`);
            this.renderBreakdown("#resumoFinanceiro", resumoImportado);
            this.renderBreakdown("#proventosList", proventosImportados);
            this.renderBreakdown("#descontosList", descontosImportados);
            return;
        }

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
            ["Reflexo periculosidade faltas", folha.descontoPericulosidadeAtrasos],
            ["Adiantamento salarial", folha.adiantamento],
            ["IRRF do adiantamento", folha.irrfAdiantamento],
            ["INSS", folha.inss],
            ["IRRF", folha.irrf]
        ].filter(([, valor]) => valor > 0);
        const resumoFinanceiro = [
            ["Recebimento total estimado", folha.liquidoMes],
            ["Adiantamento estimado", folha.adiantamento],
            ["Pagamento final estimado", folha.pagamentoFinal],
            ["FGTS depositado pela empresa", folha.fgts]
        ];

        this.text("#folhaLiquido", Folha.moeda(folha.pagamentoFinal));
        this.text("#folhaResumo", `${totais.diasRegistrados} registro(s) · Mês ${Folha.moeda(folha.liquidoMes)}`);
        this.text("#proventosTotal", Folha.moeda(folha.proventos));
        this.text("#descontosTotal", Folha.moeda(folha.descontosLegais));
        this.text("#resumoFgts", `FGTS ${Folha.moeda(folha.fgts)}`);
        this.renderBreakdown("#resumoFinanceiro", resumoFinanceiro);
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
        const projecoesAlvo = this.$("#historicoLista");
        const recebidosAlvo = this.dom.historicoRecebidosLista;

        this.text("#historicoProjecoesCount", `${codigos.length} competencia(s)`);
        this.text("#historicoRecebidosCount", `${this.state.holerites.length} arquivo(s)`);

        if (!codigos.length) {
            projecoesAlvo.innerHTML = '<div class="empty-state">Nenhuma projecao salva ainda.</div>';
        } else {
            projecoesAlvo.innerHTML = codigos.map(codigo => {
                const competencia = Competencia.competenciaPorCodigo(codigo);
                const totais = Horas.somarCompetencia(grupos[codigo], competencia);
                const folha = Folha.calcularFolha(totais, competencia);

                return `
                    <article class="history-row">
                        <div>
                            <strong>${Competencia.formatarCompetencia(competencia)}</strong>
                            <span>${totais.diasRegistrados} registro(s) | ${Horas.formatarHoras(totais.horasTrabalhadas)} trabalhadas</span>
                        </div>
                        <strong>${Folha.moeda(folha.liquidoMes)}</strong>
                    </article>
                `;
            }).join("");
        }

        if (!this.state.holerites.length) {
            recebidosAlvo.innerHTML = '<div class="empty-state">Importe seus contracheques para montar o historico recebido.</div>';
        } else {
            recebidosAlvo.innerHTML = this.state.holerites.map(holerite => {
                const competencia = Competencia.competenciaPorCodigo(holerite.competencia);

                return `
                    <article class="history-row">
                        <div>
                            <strong>${Competencia.formatarCompetencia(competencia)}</strong>
                            <span>Recebido no mes ${Folha.moeda(holerite.totalRecebidoMes || holerite.liquidoReceber)}</span>
                            <span>Fechamento ${Folha.moeda(holerite.liquidoReceber)} | FGTS ${Folha.moeda(holerite.fgts)}</span>
                        </div>
                        <strong>${Folha.moeda(holerite.liquidoReceber)}</strong>
                    </article>
                `;
            }).join("");
        }

        return;
        const alvo = this.$("#historicoLista");

        if (!codigos.length) {
            alvo.innerHTML = '<div class="empty-state">Sem histórico</div>';
            return;
        }

        alvo.innerHTML = codigos.map(codigo => {
            const competencia = Competencia.competenciaPorCodigo(codigo);
            const totais = Horas.somarCompetencia(grupos[codigo], competencia);
            const folha = Folha.calcularFolha(totais, competencia);

            return `
                <article class="history-row">
                    <div>
                        <strong>${codigo}</strong>
                        <span>${Competencia.formatarCompetencia(competencia)}</span>
                        <span>${totais.diasRegistrados} registro(s) | ${Horas.formatarHoras(totais.horasTrabalhadas)}</span>
                    </div>
                    <strong>${Folha.moeda(folha.liquidoMes)}</strong>
                </article>
            `;
        }).join("");
    },

    renderComparativo() {
        const { folha } = this.obterResumo();
        const competencia = this.state.competencia;
        const holerite = this.state.holerites.find(item => item.competencia === competencia.codigo);

        if (!holerite) {
            this.dom.comparativoGrid.innerHTML = `
                <div class="empty-state comparison-empty">
                    Importe o contracheque desta competencia para comparar previsto e recebido.
                </div>
            `;
            this.dom.comparativoLista.innerHTML = '<div class="empty-state">Sem dados recebidos para comparar.</div>';
            this.dom.comparativoPeriodo.textContent = Competencia.formatarCompetencia(competencia);
            return;
        }

        const totalRecebidoMes = holerite.totalRecebidoMes || holerite.liquidoReceber;
        const cards = [
            {
                titulo: "Fechamento do dia 01",
                previsto: folha.pagamentoFinal,
                recebido: holerite.liquidoReceber,
                destaque: this.formatarDelta(holerite.liquidoReceber - folha.pagamentoFinal)
            },
            {
                titulo: "Total do mes",
                previsto: folha.liquidoMes,
                recebido: totalRecebidoMes,
                destaque: this.formatarDelta(totalRecebidoMes - folha.liquidoMes)
            },
            {
                titulo: "Adiantamento",
                previsto: folha.adiantamento,
                recebido: holerite.adiantamento,
                destaque: this.formatarDelta(holerite.adiantamento - folha.adiantamento)
            },
            {
                titulo: "FGTS",
                previsto: folha.fgts,
                recebido: holerite.fgts,
                destaque: this.formatarDelta(holerite.fgts - folha.fgts)
            }
        ];

        this.dom.comparativoGrid.innerHTML = cards.map(item => `
            <article class="surface-panel comparison-card">
                <div class="comparison-card-head">
                    <span class="metric-label">${item.titulo}</span>
                    <strong class="${this.getDeltaClass(item.destaque)}">${item.destaque}</strong>
                </div>
                <div class="comparison-card-values">
                    <div>
                        <span>Previsto</span>
                        <strong>${Folha.moeda(item.previsto)}</strong>
                    </div>
                    <div>
                        <span>Recebido</span>
                        <strong>${Folha.moeda(item.recebido)}</strong>
                    </div>
                </div>
            </article>
        `).join("");

        const linhas = [
            ["Proventos", folha.proventos, holerite.proventos],
            ["FGTS", folha.fgts, holerite.fgts],
            ["Adiantamento", folha.adiantamento, holerite.adiantamento],
            ["INSS", folha.inss, holerite.inss],
            ["IRRF fechamento", folha.irrf, holerite.irrf],
            ["IRRF quinzena", folha.irrfAdiantamento, holerite.irrfAdiantamento],
            ["Pagamento dia 01", folha.pagamentoFinal, holerite.liquidoReceber],
            ["Total do mes", folha.liquidoMes, totalRecebidoMes]
        ];

        this.dom.comparativoLista.innerHTML = `
            <div class="comparison-sheet comparison-sheet-head">
                <span>Item</span>
                <span>Previsto</span>
                <span>Recebido</span>
                <span>Diferenca</span>
            </div>
        ` + linhas.map(([label, previsto, recebido]) => {
            const delta = recebido - previsto;

            return `
                <div class="comparison-sheet">
                    <strong>${label}</strong>
                    <span>${Folha.moeda(previsto)}</span>
                    <span>${Folha.moeda(recebido)}</span>
                    <strong class="${delta < 0 ? "delta-negative" : delta > 0 ? "delta-positive" : ""}">
                        ${delta === 0 ? "R$ 0,00" : this.formatarDelta(delta)}
                    </strong>
                </div>
            `;
        }).join("");

        this.dom.comparativoPeriodo.textContent = Competencia.formatarCompetencia(competencia);
    },

    renderConfiguracoes() {
        this.text("#payslipCount", `${this.state.holerites.length} arquivo(s) importados`);
    },

    formatarDelta(valor) {
        const prefixo = valor > 0 ? "+" : "-";
        return `${prefixo} ${Folha.moeda(Math.abs(valor))}`;
    },

    getDeltaClass(texto) {
        if (typeof texto !== "string") {
            return "";
        }

        if (texto.startsWith("+")) {
            return "delta-positive";
        }

        if (texto.startsWith("-")) {
            return "delta-negative";
        }

        return "";
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
        return apontamento.calculo || Horas.calcularDia(
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
