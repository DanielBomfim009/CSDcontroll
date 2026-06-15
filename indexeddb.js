/**

* SalárioPro PWA
* IndexedDB Manager
* Versão 1.0
  */

const DB_CONFIG = {
name: "SalarioProDB",
version: 1
};

const STORES = {
APONTAMENTOS: "apontamentos",
CONFIGURACOES: "configuracoes",
HISTORICO: "historico",
AUDITORIA: "auditoria"
};

class IndexedDBManager {

```
constructor() {
    this.db = null;
}

async init() {

    return new Promise((resolve, reject) => {

        const request = indexedDB.open(
            DB_CONFIG.name,
            DB_CONFIG.version
        );

        request.onerror = () => {
            reject(request.error);
        };

        request.onsuccess = () => {
            this.db = request.result;
            resolve(this.db);
        };

        request.onupgradeneeded = (event) => {

            const db = event.target.result;

            if (
                !db.objectStoreNames.contains(
                    STORES.APONTAMENTOS
                )
            ) {

                const apontamentos =
                    db.createObjectStore(
                        STORES.APONTAMENTOS,
                        {
                            keyPath: "id",
                            autoIncrement: true
                        }
                    );

                apontamentos.createIndex(
                    "data",
                    "data",
                    { unique: false }
                );

                apontamentos.createIndex(
                    "competencia",
                    "competencia",
                    { unique: false }
                );
            }

            if (
                !db.objectStoreNames.contains(
                    STORES.CONFIGURACOES
                )
            ) {

                db.createObjectStore(
                    STORES.CONFIGURACOES,
                    {
                        keyPath: "id",
                        autoIncrement: true
                    }
                );
            }

            if (
                !db.objectStoreNames.contains(
                    STORES.HISTORICO
                )
            ) {

                db.createObjectStore(
                    STORES.HISTORICO,
                    {
                        keyPath: "id",
                        autoIncrement: true
                    }
                );
            }

            if (
                !db.objectStoreNames.contains(
                    STORES.AUDITORIA
                )
            ) {

                db.createObjectStore(
                    STORES.AUDITORIA,
                    {
                        keyPath: "id",
                        autoIncrement: true
                    }
                );
            }
        };
    });
}

async add(storeName, data) {

    return new Promise((resolve, reject) => {

        const transaction =
            this.db.transaction(
                [storeName],
                "readwrite"
            );

        const store =
            transaction.objectStore(
                storeName
            );

        const request =
            store.add(data);

        request.onsuccess = () =>
            resolve(request.result);

        request.onerror = () =>
            reject(request.error);
    });
}

async update(storeName, data) {

    return new Promise((resolve, reject) => {

        const transaction =
            this.db.transaction(
                [storeName],
                "readwrite"
            );

        const store =
            transaction.objectStore(
                storeName
            );

        const request =
            store.put(data);

        request.onsuccess = () =>
            resolve(request.result);

        request.onerror = () =>
            reject(request.error);
    });
}

async getById(storeName, id) {

    return new Promise((resolve, reject) => {

        const transaction =
            this.db.transaction(
                [storeName],
                "readonly"
            );

        const store =
            transaction.objectStore(
                storeName
            );

        const request =
            store.get(id);

        request.onsuccess = () =>
            resolve(request.result);

        request.onerror = () =>
            reject(request.error);
    });
}

async getAll(storeName) {

    return new Promise((resolve, reject) => {

        const transaction =
            this.db.transaction(
                [storeName],
                "readonly"
            );

        const store =
            transaction.objectStore(
                storeName
            );

        const request =
            store.getAll();

        request.onsuccess = () =>
            resolve(request.result);

        request.onerror = () =>
            reject(request.error);
    });
}

async delete(storeName, id) {

    return new Promise((resolve, reject) => {

        const transaction =
            this.db.transaction(
                [storeName],
                "readwrite"
            );

        const store =
            transaction.objectStore(
                storeName
            );

        const request =
            store.delete(id);

        request.onsuccess = () =>
            resolve(true);

        request.onerror = () =>
            reject(request.error);
    });
}

async clear(storeName) {

    return new Promise((resolve, reject) => {

        const transaction =
            this.db.transaction(
                [storeName],
                "readwrite"
            );

        const store =
            transaction.objectStore(
                storeName
            );

        const request =
            store.clear();

        request.onsuccess = () =>
            resolve(true);

        request.onerror = () =>
            reject(request.error);
    });
}
```

}

const DB = new IndexedDBManager();

window.DB = DB;
window.STORES = STORES;
