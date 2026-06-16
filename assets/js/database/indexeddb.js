/**
 * CSDControl PWA
 * IndexedDB Manager
 */

const DB_CONFIG = {
    name: "SalarioProDB",
    version: 2
};

const STORES = {
    APONTAMENTOS: "apontamentos",
    CONFIGURACOES: "configuracoes",
    HISTORICO: "historico",
    AUDITORIA: "auditoria"
};

class IndexedDBManager {
    constructor() {
        this.db = null;
    }

    async init() {
        if (!window.indexedDB) {
            throw new Error("IndexedDB indisponível neste navegador.");
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

            request.onerror = () => reject(request.error);

            request.onblocked = () => {
                reject(new Error("Feche outras abas do CSDControl para atualizar o banco local."));
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = event => {
                const db = event.target.result;
                const transaction = event.target.transaction;

                const apontamentos = this.ensureStore(
                    db,
                    transaction,
                    STORES.APONTAMENTOS,
                    { keyPath: "id", autoIncrement: true }
                );

                this.ensureIndex(apontamentos, "data", "data");
                this.ensureIndex(apontamentos, "competencia", "competencia");
                this.ensureIndex(apontamentos, "criadoEm", "criadoEm");

                this.ensureStore(
                    db,
                    transaction,
                    STORES.CONFIGURACOES,
                    { keyPath: "id", autoIncrement: true }
                );

                this.ensureStore(
                    db,
                    transaction,
                    STORES.HISTORICO,
                    { keyPath: "id", autoIncrement: true }
                );

                this.ensureStore(
                    db,
                    transaction,
                    STORES.AUDITORIA,
                    { keyPath: "id", autoIncrement: true }
                );
            };
        });
    }

    ensureStore(db, transaction, storeName, options) {
        if (db.objectStoreNames.contains(storeName)) {
            return transaction.objectStore(storeName);
        }

        return db.createObjectStore(storeName, options);
    }

    ensureIndex(store, name, keyPath, options = { unique: false }) {
        if (!store.indexNames.contains(name)) {
            store.createIndex(name, keyPath, options);
        }
    }

    getStore(storeName, mode = "readonly") {
        if (!this.db) {
            throw new Error("Banco de dados ainda não inicializado.");
        }

        const transaction = this.db.transaction([storeName], mode);
        return transaction.objectStore(storeName);
    }

    async add(storeName, data) {
        return this.request(storeName, "readwrite", store => store.add(data));
    }

    async update(storeName, data) {
        return this.request(storeName, "readwrite", store => store.put(data));
    }

    async getById(storeName, id) {
        return this.request(storeName, "readonly", store => store.get(Number(id)));
    }

    async getByIndex(storeName, indexName, value) {
        return this.request(storeName, "readonly", store => {
            return store.index(indexName).get(value);
        });
    }

    async getAll(storeName) {
        return this.request(storeName, "readonly", store => store.getAll());
    }

    async getAllByIndex(storeName, indexName, value) {
        return this.request(storeName, "readonly", store => {
            return store.index(indexName).getAll(value);
        });
    }

    async delete(storeName, id) {
        return this.request(storeName, "readwrite", store => store.delete(Number(id)));
    }

    async remove(storeName, id) {
        return this.delete(storeName, id);
    }

    async clear(storeName) {
        return this.request(storeName, "readwrite", store => store.clear());
    }

    async request(storeName, mode, operation) {
        return new Promise((resolve, reject) => {
            let dbRequest;

            try {
                const store = this.getStore(storeName, mode);
                dbRequest = operation(store);
            } catch (error) {
                reject(error);
                return;
            }

            dbRequest.onsuccess = () => resolve(dbRequest.result);
            dbRequest.onerror = () => reject(dbRequest.error);
        });
    }
}

const DB = new IndexedDBManager();

window.DB = DB;
window.STORES = STORES;
