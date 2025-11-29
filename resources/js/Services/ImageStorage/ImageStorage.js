// ImageStorage.js

export default class ImageStorage {
  static DB_NAME = "MeuBancoImagens";
  static STORE = "imagens";
  static VERSION = 1;
  static LOG_PREFIX = "[ImageStorage]"; // Prefixos para facilitar a busca no console

  static openDB() {
    console.log(`${this.LOG_PREFIX} Tentando abrir/criar o banco de dados: ${this.DB_NAME} (Versão ${this.VERSION})`);
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.STORE)) {
          console.log(`${this.LOG_PREFIX} Executando upgrade: Criando Object Store "${this.STORE}"`);
          db.createObjectStore(this.STORE, { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        console.log(`${this.LOG_PREFIX} Banco de dados aberto com sucesso.`);
        resolve(request.result);
      };
      request.onerror = () => {
        console.error(`${this.LOG_PREFIX} Erro ao abrir o banco de dados:`, request.error);
        reject(request.error);
      };
    });
  }

  // ---------------------------------------------------------
  // SALVAR IMAGEM ORIGINAL (com downsize)
  // ---------------------------------------------------------
  static async saveOriginal(index, file, downsizeFunction, methodo) {
    console.log(`${this.LOG_PREFIX} Iniciando saveOriginal para índice ${index}, método ${methodo}`);
    if (!downsizeFunction) {
      console.error(`${this.LOG_PREFIX} downsizeFunction não foi passada.`);
      throw new Error("downsizeFunction não foi passada");
    }

    try {
      const base64Reduzida = await downsizeFunction(file);
      const id = `original_${index}_${methodo}`;
      const resultado = await this._store(id, base64Reduzida);
      console.log(`${this.LOG_PREFIX} saveOriginal concluído com sucesso para ID: ${id}`);
      return resultado;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erro em saveOriginal:`, error);
      throw error;
    }
  }

  // ---------------------------------------------------------
  // SALVAR IMAGEM PROCESSADA (vinda da IA / retorno)
  // ---------------------------------------------------------
  static async saveProcessed(index, base64, methodo) {
    console.log(`${this.LOG_PREFIX} Iniciando saveProcessed para índice ${index}, método ${methodo}`);
    try {
      const id = `processed_${index}_${methodo}`;
      const resultado = await this._store(id, base64);
      console.log(`${this.LOG_PREFIX} saveProcessed concluído com sucesso para ID: ${id}`);
      return resultado;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erro em saveProcessed:`, error);
      throw error;
    }
  }

  // ---------------------------------------------------------
  // MÉTODO INTERNO PARA SALVAR NO BANCO
  // ---------------------------------------------------------
  static async _store(id, base64) {
    console.log(`${this.LOG_PREFIX} _store: Tentando salvar ID: ${id}`);
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, "readwrite");
      const store = tx.objectStore(this.STORE);

      store.put({
        id,
        conteudo: base64,
        salvo_em: Date.now()
      });

      tx.oncomplete = () => {
        console.log(`${this.LOG_PREFIX} _store: Transação de PUT (ID: ${id}) concluída.`);
        resolve(true);
      };
      tx.onerror = () => {
        console.error(`${this.LOG_PREFIX} _store: Erro na transação de PUT (ID: ${id}):`, tx.error);
        reject(tx.error);
      };
    });
  }

  // ---------------------------------------------------------
  // CARREGAR IMAGEM ORIGINAL
  // ---------------------------------------------------------
  static async loadOriginal(index, methodo) {
    console.log(`${this.LOG_PREFIX} Iniciando loadOriginal para índice ${index}`);
    const id = `original_${index}_${methodo}`;
    const resultado = await this._load(id);
    console.log(`${this.LOG_PREFIX} loadOriginal concluído para ID: ${id}. Encontrado? ${!!resultado}`);
    return resultado;
  }

  // ---------------------------------------------------------
  // CARREGAR IMAGEM PROCESSADA
  // ---------------------------------------------------------
  static async loadProcessed(index) {
    console.log(`${this.LOG_PREFIX} Iniciando loadProcessed para índice ${index}`);
    const id = `processed_${index}`;
    const resultado = await this._load(id);
    console.log(`${this.LOG_PREFIX} loadProcessed concluído para ID: ${id}. Encontrado? ${!!resultado}`);
    return resultado;
  }

  // ---------------------------------------------------------
  // BUSCA GENÉRICA
  // ---------------------------------------------------------
  static async _load(id) {
    console.log(`${this.LOG_PREFIX} _load: Tentando carregar ID: ${id}`);
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, "readonly");
      const store = tx.objectStore(this.STORE);

      const req = store.get(id);

      req.onsuccess = () => {
        const conteudo = req.result?.conteudo || null;
        console.log(`${this.LOG_PREFIX} _load: Busca por ID ${id} concluída. Conteúdo encontrado: ${!!conteudo}`);
        resolve(conteudo);
      };
      req.onerror = () => {
        console.error(`${this.LOG_PREFIX} _load: Erro na busca por ID ${id}:`, req.error);
        reject(req.error);
      };
    });
  }

  // ---------------------------------------------------------
  // DELETAR UMA IMAGEM ESPECÍFICA
  // ---------------------------------------------------------
  static async delete(index) {
    console.log(`${this.LOG_PREFIX} Iniciando delete para índice ${index}`);
    const idOriginal = `original_${index}`;
    const idProcessed = `processed_${index}`;

    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, "readwrite");
      const store = tx.objectStore(this.STORE);

      console.log(`${this.LOG_PREFIX} Deletando IDs: ${idOriginal} e ${idProcessed}`);
      store.delete(idOriginal);
      store.delete(idProcessed);

      tx.oncomplete = () => {
        console.log(`${this.LOG_PREFIX} Delete concluído com sucesso para índice ${index}.`);
        resolve(true);
      };
      tx.onerror = () => {
        console.error(`${this.LOG_PREFIX} Erro ao deletar no índice ${index}:`, tx.error);
        reject(tx.error);
      };
    });
  }

  // ---------------------------------------------------------
  // LIMPAR TUDO
  // ---------------------------------------------------------
  static async clearAll() {
    console.log(`${this.LOG_PREFIX} Iniciando clearAll (limpeza completa do Object Store)`);
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, "readwrite");
      tx.objectStore(this.STORE).clear();

      tx.oncomplete = () => {
        console.log(`${this.LOG_PREFIX} clearAll concluído com sucesso.`);
        resolve(true);
      };
      tx.onerror = () => {
        console.error(`${this.LOG_PREFIX} Erro em clearAll:`, tx.error);
        reject(tx.error);
      };
    });
  }

  // ---------------------------------------------------------
  // LIMPAR ARQUIVOS ANTIGOS
  // ---------------------------------------------------------
  static async cleanOld(maxHoras = 24) {
    console.log(`${this.LOG_PREFIX} Iniciando cleanOld. Limite de tempo: ${maxHoras} horas.`);
    const limite = Date.now() - maxHoras * 3600 * 1000;

    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, "readwrite");
      const store = tx.objectStore(this.STORE);
      let count = 0;

      const cursor = store.openCursor();

      cursor.onsuccess = (e) => {
        const cur = e.target.result;
        if (cur) {
          if (cur.value.salvo_em < limite) {
            console.log(`${this.LOG_PREFIX} cleanOld: Deletando arquivo antigo com ID: ${cur.key}`);
            store.delete(cur.key);
            count++;
          }
          cur.continue();
        } else {
          console.log(`${this.LOG_PREFIX} cleanOld: Cursor finalizado. ${count} arquivos deletados.`);
        }
      };

      cursor.onerror = (e) => {
        console.error(`${this.LOG_PREFIX} cleanOld: Erro no cursor:`, e.target.error);
        reject(e.target.error);
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => {
        console.error(`${this.LOG_PREFIX} cleanOld: Erro na transação:`, tx.error);
        reject(tx.error);
      };
    });
  }
}