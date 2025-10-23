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
    dpi: 150,
  },
  // --- Breakpoints de Resolução (Fator C x C, garantindo 72 DPI) ---

  // Base: 1 coluna (A4). DPI real: min(1280/8.27, 720/11.69) = 61 DPI. Aumentado para garantir 72 DPI.
  {
    nome: "A4 Mínimo (Full HD Base Dpi: 150)",
    colunas: 1,
    larguraPx: 1080,    // Min 600px L (72 DPI)
    alturaPx: 1920,    // Min 842px A (72 DPI)
  },

  // Base: 2 colunas (A3). DPI real: min(1280/16.54, 720/23.38) = 30 DPI. Aumentado para garantir 72 DPI.
  {
    nome: "A4 Mínimo (2k Base Dpi: 103)",
    colunas: 2,
    larguraPx: 2560,   // Base Full HD/2
    alturaPx: 1440,    // (Garante min 72 DPI na Altura)
  },

  // Base: 3x3. DPI real: 36 DPI. Aumentado para 4K Base para garantir 72 DPI.
  {
    nome: "Pôster 3x3 (4K Base Dpi: 103)",
    colunas: 3,
    larguraPx: 3840,
    alturaPx: 2160,
  },

  // Base: 4x4. DPI real: 27 DPI. Aumentado para 4K Estendido.
  {
    nome: "Pôster 4x4 (4K Ext. Dpi: 85)",
    colunas: 4,
    larguraPx: 4224 /*3840*/,
    alturaPx:  2376 /*2160*/,
  },

  // Base: 5x5. DPI real: 24 DPI. Aumentado para 6K Base.
  {
    nome: "Pôster 5x5 (6K Base Dpi: 83)",
    colunas: 5,
    larguraPx: 5120,
    alturaPx:2880 ,
  },

  // Base: 6x6. DPI real: 21 DPI.
  {
    nome: "Pôster 6x6 (6K Ext. Dpi: 83 )",
    colunas: 6,
    larguraPx: 6144,
    alturaPx: 3456,
  },
  // Base: 6x6. DPI real: 21 DPI.
  {
    nome: "Pôster 6x6 (6K Ext. Dpi: 78)",
    colunas: 7,
    larguraPx: 6758 /*6144*/,
    alturaPx:  3801 /*3456*/,
  },

  // Base: 8x8. DPI real: 77 DPI.
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
    nome: "Pôster 10x10",
    colunas: 10,
    larguraPx: 8448 /*  10328*/,
    alturaPx: 4752 /* 7760 */,
  },
];