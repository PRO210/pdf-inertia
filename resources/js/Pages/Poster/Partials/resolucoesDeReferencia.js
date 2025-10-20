export const resolucoesDeReferencia = [
  // --- Referências de DPI ---
  {
    nome: "Qualidade de Tela - Padrão",
    descricao: "Referência comum para monitores (96 DPI).",
    dpi: 96,
  },
  {
    nome: "Qualidade de Impressão - Alta",
    descricao: "Referência para posters e impressões de alta fidelidade (300 DPI).",
    dpi: 300,
  },
  // --- Breakpoints de Resolução (Fator C x C, garantindo 72 DPI) ---

  // Base: 1 coluna (A4). DPI real: min(1280/8.27, 720/11.69) = 61 DPI. Aumentado para garantir 72 DPI.
  {
    nome: "A4 Mínimo (1x1)",
    colunas: 1,
    larguraPx: 1080,    // Min 600px L (72 DPI)
    alturaPx: 1920,    // Min 842px A (72 DPI)
  },

  // Base: 2 colunas (A3). DPI real: min(1280/16.54, 720/23.38) = 30 DPI. Aumentado para garantir 72 DPI.
  {
    nome: "A4 Mínimo (2x2)",
    colunas: 2,
    larguraPx: 2560,   // Base Full HD/2
    alturaPx: 1440,    // (Garante min 72 DPI na Altura)
  },

  // Base: 3x3. DPI real: 36 DPI. Aumentado para 4K Base para garantir 72 DPI.
  {
    nome: "Pôster 3x3 (4K Base)",
    colunas: 3,
    larguraPx: 4000,
    alturaPx: 4000,
  },

  // Base: 4x4. DPI real: 27 DPI. Aumentado para 4K Estendido.
  {
    nome: "Pôster 4x4 (4K Ext.)",
    colunas: 4,
    larguraPx: 4000,
    alturaPx: 4000,
  },

  // Base: 5x5. DPI real: 24 DPI. Aumentado para 6K Base.
  {
    nome: "Pôster 5x5 (6K Base)",
    colunas: 5,
    larguraPx: 5120,
    alturaPx:2880 ,
  },

  // Base: 6x6. DPI real: 21 DPI.
  {
    nome: "Pôster 6x6 (6K Ext.)",
    colunas: 6,
    larguraPx: 6144,
    alturaPx: 3456,
  },
  // Base: 6x6. DPI real: 21 DPI.
  {
    nome: "Pôster 6x6 (6K Ext.)",
    colunas: 7,
    larguraPx: 6000,
    alturaPx: 6000,
  },

  // Base: 8x8. DPI real: 18 DPI.
  {
    nome: "Pôster 8x8 (8K Base)",
    colunas: 8,
    larguraPx: 7680,
    alturaPx: 4320,
  },
  // Base: 8x8. DPI real: 18 DPI.
  {
    nome: "Pôster 8x8 (8K Base)",
    colunas: 9,
    larguraPx: 7680,
    alturaPx: 4320,
  },

  // Base: 10x10. DPI real: 14 DPI.
  {
    nome: "Pôster 10x10 (10K + 10% Base)",
    colunas: 10,
    larguraPx: 12393,
    alturaPx: 9312,
  },
];