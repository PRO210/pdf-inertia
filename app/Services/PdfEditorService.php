<?php

namespace App\Services;

use setasign\Fpdi\Tcpdf\Fpdi;

class PdfEditorService
{
  protected $pdf;

  public function __construct()
  {
    // Inicializa a instância usando a ponte oficial
    $this->pdf = new Fpdi();

    $this->pdf->SetCreator('Canvas PDF Editor');
    $this->pdf->SetAuthor('Seu SaaS');

    $this->pdf->setPrintHeader(false);
    $this->pdf->setPrintFooter(false);

    $this->pdf->SetMargins(0, 0, 0);
    $this->pdf->SetAutoPageBreak(false);
  }

  /**
   * Processa o PDF lendo diretamente do arquivo temporário em memória
   */
  public function processarPdf(
    string $pdfPath,
    array $pagesConfig,
    array $textosCabecalho,
    string $cabecalhoLayout = 'sobreposto',
    string $cabecalhoTipo = 'texto',
    ?string $cabecalhoImagem = null,
    string $bordaTipo = 'none',
    string $layoutPaginas = '1'
  ) {

    // -----------------------------------------------------------------
    // NOVA LINHA DE SEGURANÇA: Limpa e converte o PDF antes do FPDI abrir
    // -----------------------------------------------------------------
    $pdfPathCompativel = $this->converterParaPdfCompativel($pdfPath);

    // =========================================================================
    // SE HOUVER CORTES ATIVOS, AGRUPE ANTES DE APLICAR O FLUXO PRINCIPAL
    // =========================================================================
    $temCorte = collect($pagesConfig)->contains(fn($p) => isset($p['corte']));

    if ($temCorte) {
      // 1. O agrupador faz o trabalho dele e gera o PDF com os pedaços costurados verticalmente
      $pdfAgrupadoString = $this->processarCortesEAgrupar($pdfPathCompativel, $pagesConfig);

      @unlink($pdfPathCompativel);
      $pdfPathCompativel = tempnam(sys_get_temp_dir(), 'pdf_recortado_') . '.pdf';
      file_put_contents($pdfPathCompativel, $pdfAgrupadoString);

      // // Interrompe TUDO aqui e devolve o binário puro do corte para teste
      // return $pdfAgrupadoString;

      // 2. Reseta a instância principal para ler o PDF combinado resultante
      $this->pdf = new Fpdi();
      $this->pdf->setPrintHeader(false);
      $this->pdf->setPrintFooter(false);
      $this->pdf->SetMargins(0, 0, 0);
      $this->pdf->SetAutoPageBreak(false);

      $pageCount = $this->pdf->setSourceFile($pdfPathCompativel);

      // 3. CORREÇÃO CRITICAL: Cria um mapa linear 1 para 1 para as PÁGINAS RESULTANTES do agrupamento
      // Isso impede que o loop duplique ou tente esticar o conteúdo
      $configMap = collect();
      for ($i = 1; $i <= $pageCount; $i++) {
        $configMap->put($i, [
          'include' => true,
          'hasHeader' => $pagesConfig[0]['hasHeader'] ?? false,
          'fabricJson' => $pagesConfig[$i - 1]['fabricJson'] ?? null // Garante o alinhamento das edições
        ]);
      }
    } else {
      // Fluxo normal sem corte
      $pageCount = $this->pdf->setSourceFile($pdfPathCompativel);
      $configMap = collect($pagesConfig)->keyBy('page');
    }


    // Passa o caminho do arquivo convertido para o FPDI
    // $pageCount = $this->pdf->setSourceFile($pdfPathCompativel);
    // $configMap = collect($pagesConfig)->keyBy('page');


    // Definição de margem física da borda (Equivalente aos 0.5cm do seu antigo projeto)
    $margemBorda = ($bordaTipo !== 'none') ? 6 : 0;

    // 1. CÁLCULO DO ESPAÇO DO CABEÇALHO
    $espacoCabecalhoTotal = 0;

    if ($configMap->contains('hasHeader', true)) {
      if ($cabecalhoTipo === 'texto') {

        $qtdLinhas = max(count($textosCabecalho), 1);
        $espacoCabecalhoTotal = ($qtdLinhas * 6) + $margemBorda;
      } elseif ($cabecalhoTipo === 'imagem' || $cabecalhoTipo === 'ambos') {
        $espacoCabecalhoTotal = 35 + $margemBorda;
      } elseif ($cabecalhoTipo === 'banner') {
        $espacoCabecalhoTotal = 35 + $margemBorda;
      }
    }


    for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
      $config = $configMap->get($pageNo);

      if ($config && isset($config['include']) && !$config['include']) {
        continue;
      }

      $templateId = $this->pdf->importPage($pageNo);
      $size = $this->pdf->getTemplateSize($templateId);

      $this->pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);

      $temCabecalhoNestaPagina = ($config && isset($config['hasHeader']) && $config['hasHeader']);

      // 2. DESENHO DO PDF ORIGINAL (Com respeito a Borda e ao Cabeçalho)
      if ($temCabecalhoNestaPagina && $cabecalhoLayout === 'encolhido') {

        $novaAlturaTemplate = $size['height'] - $espacoCabecalhoTotal - $margemBorda;
        $novaLarguraTemplate = $size['width'] - ($margemBorda * 2);

        $posicaoX = $margemBorda;
        $posicaoY = $espacoCabecalhoTotal;

        $this->pdf->useTemplate(
          $templateId,
          $posicaoX,
          $posicaoY,
          $novaLarguraTemplate,
          $novaAlturaTemplate
        );
      } else {
        // Se for sobreposto, mas tiver borda, encolhe apenas o suficiente para não cobrir a borda
        if ($bordaTipo !== 'none') {
          $novaLargura = $size['width'] - ($margemBorda * 2);
          $novaAltura = $size['height'] - ($margemBorda * 2);
          $this->pdf->useTemplate($templateId, $margemBorda, $margemBorda, $novaLargura, $novaAltura);
        } else {
          $this->pdf->useTemplate($templateId);
        }
      }

      // 3. DESENHA AS BORDAS PEDAGÓGICAS (Fica na camada de cima)
      if ($bordaTipo !== 'none') {
        $this->aplicarBordasRepetidas($bordaTipo, $size);
      }

      // 4. DESENHA O CABEÇALHO (Empurrado um pouco para dentro por causa da borda)
      if ($temCabecalhoNestaPagina) {
        // Ajustamos a margem interna do cabeçalho baseado na presença da borda
        $paddingX = $margemBorda + 5;
        $this->aplicarCabecalho(
          $cabecalhoTipo,
          $size,
          $textosCabecalho,
          $espacoCabecalhoTotal,
          $cabecalhoImagem,
          $paddingX,
          $bordaTipo,
        );
      }

      if ($config && isset($config['marcacoes']) && is_array($config['marcacoes'])) {
        $this->aplicarMarcacoes($config['marcacoes']);
      }

      // NOVO: Processa as edições livres do Fabric.js (Texto / Remoções) nesta página
      if ($config && !empty($config['fabricJson'])) {
        $this->aplicarEdicoesFabric($config['fabricJson']);
      }
    }


    // No final do método, antes de dar o Output, limpe o arquivo temporário gerado para não entupir o servidor:
    if ($pdfPathCompativel !== $pdfPath && file_exists($pdfPathCompativel)) {
      @unlink($pdfPathCompativel);
    }

    // Pega o PDF processado em formato de string/Stream antes de dar o retorno final
    $pdfPadraoString = $this->pdf->Output('', 'S');

    // MUDANÇA AQUI: Se o usuário selecionou 2 por folha, passa o resultado pelo agrupador antes de retornar
    if ($layoutPaginas === '2') {
      return $this->agruparEmDuasPorFolha($pdfPadraoString);
    }

    return $pdfPadraoString;
  }



  /**
   * Processa cortes e agrupa pedaços de páginas em um novo PDF
   */ 
  protected function processarCortesEAgrupar(string $pdfPath, array $pagesConfig): string
  {
    $pdfTmp = new \setasign\Fpdi\Tcpdf\Fpdi();

    $pdfTmp->setPrintHeader(false);
    $pdfTmp->setPrintFooter(false);
    $pdfTmp->SetMargins(0, 0, 0);
    $pdfTmp->SetAutoPageBreak(false);

    $pageCount = $pdfTmp->setSourceFile($pdfPath);
    $configMap = collect($pagesConfig)->keyBy('page');
    $pedacos = [];

    for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
      $config = $configMap->get($pageNo);

      if ($config && isset($config['include']) && !$config['include']) {
        continue;
      }

      $templateId = $pdfTmp->importPage($pageNo);
      $size = $pdfTmp->getTemplateSize($templateId);

      $larguraOriginal = $size['width'];
      $alturaOriginal  = $size['height'];

      $cX = 0;
      $cY = 0;
      $cW = $larguraOriginal;
      $cH = $alturaOriginal;

      $corte = $config['corte'] ?? $pagesConfig[0]['corte'] ?? null;

      if ($corte) {
        $cX = ($corte['xPercent'] / 100) * $larguraOriginal;
        $cY = ($corte['yPercent'] / 100) * $alturaOriginal;
        $cW = ($corte['widthPercent'] / 100) * $larguraOriginal;
        $cH = ($corte['heightPercent'] / 100) * $alturaOriginal;
      }

      $pedacos[] = [
        'page' => $pageNo,
        'templateId' => $templateId,
        'orientation' => $size['orientation'],
        'origX' => $cX,
        'origY' => $cY,
        'origW' => $cW,
        'origH' => $cH,
        'larguraFolha' => $larguraOriginal,
        'alturaFolha' => $alturaOriginal,
      ];
    }

    $grupos = array_chunk($pedacos, 2);

    foreach ($grupos as $grupo) {
      $p1 = $grupo[0];

      // Cria a página baseada no tamanho padrão do documento original
      $pdfTmp->AddPage('P', [$p1['larguraFolha'], $p1['alturaFolha']]);
      $pdfTmp->SetAutoPageBreak(false, 0);

      // Centraliza horizontalmente o primeiro pedaço caso ele seja menor que a página
      $x1 = max(0, ($p1['larguraFolha'] - $p1['origW']) / 2);

      // ==========================================================
      // RENDERIZAÇÃO DO PRIMEIRO PEDAÇO
      // ==========================================================
      $pdfTmp->StartTransform();

      // Restringe a área visível ao tamanho exato do corte
      $pdfTmp->Rect($x1, 0, $p1['origW'], $p1['origH'], 'CNZ');

      // Posiciona o template transladando as coordenadas de corte originais
      $pdfTmp->useTemplate(
        $p1['templateId'],
        $x1 - $p1['origX'],
        0 - $p1['origY'],
        $p1['larguraFolha'],
        $p1['alturaFolha']
      );

      $pdfTmp->StopTransform();

      // ==========================================================
      // RENDERIZAÇÃO DO SEGUNDO PEDAÇO (Se houver no par)
      // ==========================================================
      if (isset($grupo[1])) {
        $p2 = $grupo[1];

        // Centraliza horizontalmente o segundo pedaço
        $x2 = max(0, ($p2['larguraFolha'] - $p2['origW']) / 2);
        
        // O início vertical dele é rigorosamente o término do primeiro pedaço
        $y2 = $p1['origH'];

        $pdfTmp->StartTransform();

        // Restringe a área de visão do segundo pedaço
        $pdfTmp->Rect($x2, $y2, $p2['origW'], $p2['origH'], 'CNZ');

        // Renderiza deslocando o ponto inicial para Y2 e compensando a origem do corte original
        $pdfTmp->useTemplate(
          $p2['templateId'],
          $x2 - $p2['origX'],
          $y2 - $p2['origY'],
          $p2['larguraFolha'],
          $p2['alturaFolha']
        );

        $pdfTmp->StopTransform();
      }
    }

    return $pdfTmp->Output('', 'S');
  }
  

  /**
   * Lógica corrigida: Lê o tamanho real dos carimbos das bordas,
   * calcula a proporção exata e distribui sem distorcer.
   */
  protected function aplicarBordasRepetidas(string $bordaTipo, array $pageSize)
  {
    $pathX = public_path("imagens/bordas/{$bordaTipo}.png");
    $pathY = public_path("imagens/bordas/{$bordaTipo}Y.png");

    if (!file_exists($pathX) || !file_exists($pathY)) {
      return;
    }

    $margem = 5;          // 5mm em cada lado
    $espessura = 5;       // borda sempre terá 5mm

    $larguraPagina = $pageSize['width'];
    $alturaPagina = $pageSize['height'];

    /*
    |--------------------------------------------------------------------------
    | ÁREA INTERNA (já descontando os 5mm de cada lado)
    |--------------------------------------------------------------------------
    */
    $larguraUtil = $larguraPagina - ($margem * 2);
    $alturaUtil = $alturaPagina - ($margem * 2);


    /*
    |--------------------------------------------------------------------------
    | LATERAIS
    |--------------------------------------------------------------------------
    */
    [$imgWY, $imgHY] = getimagesize($pathY);

    $alturaBlocoY =
      ($imgHY / $imgWY) * $espessura;

    $quantidadeY =
      max(1, ceil($alturaUtil / $alturaBlocoY));

    $alturaFinalY =
      $alturaUtil / $quantidadeY;

    for ($i = 0; $i < $quantidadeY; $i++) {

      $y =
        $margem +
        ($i * $alturaFinalY);

      $this->pdf->Image(
        $pathY,
        $margem,
        $y,
        $espessura,
        $alturaFinalY
      );

      $this->pdf->Image(
        $pathY,
        $larguraPagina - $margem - $espessura,
        $y,
        $espessura,
        $alturaFinalY
      );
    }



    /*
    |--------------------------------------------------------------------------
    | TOPO E RODAPÉ
    |--------------------------------------------------------------------------
    */

    [$imgWX, $imgHX] = getimagesize($pathX);

    $larguraBlocoX =
      ($imgWX / $imgHX) * $espessura;

    $larguraDisponivel =
      $larguraUtil -
      ($espessura * 2);

    $quantidadeX =
      max(1, ceil($larguraDisponivel / $larguraBlocoX));

    $larguraFinalX =
      $larguraDisponivel / $quantidadeX;

    for ($i = 0; $i < $quantidadeX; $i++) {

      $x =
        $margem +
        $espessura +
        ($i * $larguraFinalX);

      $this->pdf->Image(
        $pathX,
        $x,
        $margem,
        $larguraFinalX,
        $espessura
      );

      $this->pdf->Image(
        $pathX,
        $x,
        $alturaPagina - $margem - $espessura,
        $larguraFinalX,
        $espessura
      );
    }
  }

  protected function aplicarCabecalho(
    string $type,
    array $pageSize,
    array $textosCabecalho,
    float $alturaCalculada,
    ?string $base64Imagem,
    float $paddingX = 5,
    string $bordaTipo = 'none'
  ) {
    $this->pdf->SetTextColor(0, 0, 0);
    $this->pdf->SetFont('helvetica', 'B', 12);

    // Processa a imagem Base64 se ela existir
    $imgData = null;
    if (!empty($base64Imagem)) {
      // Remove o cabeçalho do data URL se o front-end tiver enviado completo (ex: data:image/png;base64,...)
      if (preg_match('/^data:image\/(\w+);base64,/', $base64Imagem, $typeMatches)) {
        $dadosPurosBase64 = substr($base64Imagem, strpos($base64Imagem, ',') + 1);
        $imgData = base64_decode($dadosPurosBase64);
      } else {
        $imgData = base64_decode($base64Imagem);
      }
    }

    // --- VARIAÇÃO 1: SOMENTE TEXTO ---
    if ($type === 'texto') {
      $startX = $paddingX;
      $startY = $paddingX;
      $espacamentoLinha = 6;

      foreach ($textosCabecalho as $index => $linhaTexto) {
        $currentY = $startY + ($index * $espacamentoLinha);
        $this->pdf->Text($startX, $currentY, $linhaTexto);
      }
    }

    // --- VARIAÇÃO 2: TEXTO + IMAGEM (Estilo Logo na Esquerda) ---
    if ($type === 'ambos' && $imgData) {
      // Desenha a logo na esquerda (X=10, Y=10, Largura máxima=25mm, Altura proporcional)
      // O caractere '@' diz ao TCPDF que estamos passando os bytes da imagem diretamente na string
      $this->pdf->Image('@' . $imgData, 10, 10, 25, 0, '', '', '', false, 300, '', false, false, 0, false, false, false);

      // Empurra o texto para começar após a logo (X = 40mm)
      $startX = 35;
      $startY = 12;
      $espacamentoLinha = 5.5;

      foreach ($textosCabecalho as $index => $linhaTexto) {
        $currentY = $startY + ($index * $espacamentoLinha);
        $this->pdf->Text($startX, $currentY, $linhaTexto);
      }
    }

    // --- VARIAÇÃO 3: SOMENTE IMAGEM (Altura fixa de 35mm, Largura Automática) ---
    if ($type === 'imagem' && $imgData) {

      $alturaFixa = 35;

      $x = $paddingX;
      $y = $paddingX;

      if ($bordaTipo !== 'none') {
        $x += 5;
        $y += 5;
      }

      $this->pdf->Image(
        '@' . $imgData,
        $x,
        $y,
        0,
        $alturaFixa,
        '',
        '',
        '',
        false,
        300,
        '',
        false,
        false,
        0,
        false,
        false,
        false
      );
    }

    // --- VARIAÇÃO 4: BANNER (ALTURA FIXA 3cm + RESPEITA BORDA) ---
    if ($type === 'banner' && $imgData) {

      // $espessuraBorda = ($bordaTipo !== 'none') ? 0 : 0;

      // posição inicial (respeitando padding e borda)
      $startX = $paddingX;
      $startY = $paddingX;

      // altura fixa = 3cm
      $alturaFixa = 35;

      // largura disponível descontando bordas e margens
      $larguraDisponivel = $pageSize['width'] - ($startX * 2);

      $infoImagem = getimagesizefromstring($imgData);

      if ($infoImagem) {

        $wOriginal = $infoImagem[0];
        $hOriginal = $infoImagem[1];

        // mantém proporção pela altura fixa
        $larguraFinal = ($wOriginal / $hOriginal) * $alturaFixa;

        $alturaFinal = $alturaFixa;

        // impede ultrapassar largura útil
        if ($larguraFinal > $larguraDisponivel) {

          $proporcao =  $larguraDisponivel / $wOriginal;

          $larguraFinal = $larguraDisponivel;
          $alturaFinal =  $hOriginal * $proporcao;
        }

        // centraliza somente horizontalmente
        $startX = ($pageSize['width'] - $larguraFinal) / 2;

        $this->pdf->Image(
          '@' . $imgData,
          $startX,
          $startY,
          $larguraFinal,
          $alturaFinal,
          '',
          '',
          '',
          false,
          300,
          '',
          false,
          false,
          0,
          false,
          false,
          false
        );
      } else {

        $this->pdf->Image(
          '@' . $imgData,
          $startX,
          $startY,
          $larguraDisponivel,
          $alturaFixa,
          '',
          '',
          '',
          false,
          300,
          '',
          false,
          false,
          0,
          false,
          false,
          false
        );
      }
    }
    // --- AJUDA VISUAL ---
    // $this->pdf->SetDrawColor(180, 180, 180);
    // $this->pdf->SetLineWidth(0.2);
    // $this->pdf->Line(0, $alturaCalculada, $pageSize['width'], $alturaCalculada);
  }

  protected function aplicarMarcacoes(array $marcacoes)
  {
    foreach ($marcacoes as $marcacao) {
      if ($marcacao['tipo'] === 'texto') {
        $this->pdf->SetFont('helvetica', '', $marcacao['fontSize'] ?? 12);
        $this->pdf->Text($marcacao['x'], $marcacao['y'], $marcacao['conteudo']);
      }
    }
  }


  /**
   * Converte o PDF original para a versão 1.4 compatível com o FPDI livre
   */
  private function converterParaPdfCompativel(string $pdfPath): string
  {
    // Cria um caminho para o arquivo temporário convertido
    $outputPath = tempnam(sys_get_temp_dir(), 'pdf_compativel_') . '.pdf';

    // Comando do Ghostscript que força a compatibilidade com PDF 1.4
    // Ele reescreve o arquivo removendo as compressões modernas que travam o FPDI
    $comando = sprintf(
      'gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dNOPAUSE -dQUIET -dBATCH -sOutputFile=%s %s 2>&1',
      escapeshellarg($outputPath),
      escapeshellarg($pdfPath)
    );

    // Executa o comando no sistema operacional
    exec($comando, $output, $returnVar);

    // Se o comando funcionou (retorno 0) e o arquivo foi criado, usamos ele
    if ($returnVar === 0 && file_exists($outputPath) && filesize($outputPath) > 0) {
      return $outputPath;
    }

    // Se falhar, retorna o caminho original como fallback de segurança
    return $pdfPath;
  }

  /**
   * Interpreta o JSON do Fabric e desenha os textos nas coordenadas corretas
   */
  // protected function aplicarEdicoesFabric(string $fabricJson)
  // {
  //   // Se por algum motivo o front mandou como string double-encoded, limpamos aqui
  //   $dados = is_string($fabricJson) ? json_decode($fabricJson, true) : $fabricJson;

  //   // Se ainda assim for string (devido ao escape do FormData), decodifica de novo
  //   if (is_string($dados)) {
  //     $dados = json_decode($dados, true);
  //   }

  //   if (!$dados || empty($dados['objects'])) {
  //     return;
  //   }

  //   // FATOR DE CONVERSÃO CORRETO: 
  //   // Se o seu canvas no front-end foi desenhado espelhando o tamanho em pontos do PDF (72 DPI),
  //   // 1 mm = 2.83464567 pontos (pixels do PDF). 
  //   // Se o seu canvas usa a densidade padrão de tela (96 DPI), mude para 3.7795.
  //   // Ajuste multiplicando pela escala base que você usou no front (ex: 1.2)
  //   $pixelParaMm = 2.83464567 * 1.2;

  //   foreach ($dados['objects'] as $objeto) {
  //     // Verifica variações de escrita do tipo (Textbox, text, i-text)
  //     $type = strtolower($objeto['type'] ?? '');
  //     if ($type === 'textbox' || $type === 'text' || $type === 'i-text') {

  //       $texto = $objeto['text'] ?? '';
  //       if (trim($texto) === '') {
  //         continue;
  //       }

  //       // Pegamos as coordenadas brutas do objeto
  //       $left = $objeto['left'] ?? 0;
  //       $top = $objeto['top'] ?? 0;

  //       $scaleX = $objeto['scaleX'] ?? 1;
  //       $scaleY = $objeto['scaleY'] ?? 1;

  //       $larguraObjetoPx = ($objeto['width'] ?? 0) * $scaleX;
  //       $alturaObjetoPx = ($objeto['height'] ?? 0) * $scaleY;

  //       // CORREÇÃO DE ORIGEM (Fabric centro vs TCPDF topo-esquerdo)
  //       // Se o Fabric indica que a coordenada é o centro, precisamos subtrair metade da largura/altura para achar o topo-esquerdo
  //       if (($objeto['originX'] ?? 'left') === 'center') {
  //         $left = $left - ($larguraObjetoPx / 2);
  //       }
  //       if (($objeto['originY'] ?? 'top') === 'center') {
  //         $top = $top - ($alturaObjetoPx / 2);
  //       }

  //       // Converte os pixels corrigidos para Milímetros
  //       $xMm = $left / $pixelParaMm;
  //       $yMm = $top / $pixelParaMm;
  //       $larguraMm = $larguraObjetoPx / $pixelParaMm;

  //       // No TCPDF o tamanho da fonte é em Pontos (pt). 
  //       // Se no front está em pixels de tela, dividimos pela escala para equiparar.
  //       $fontSizePt = ($objeto['fontSize'] ?? 20) / 1.2;

  //       // Converte e aplica a cor do texto
  //       $corHex = $objeto['fill'] ?? '#000000';
  //       [$r, $g, $b] = $this->converterHexParaRgb($corHex);
  //       $this->pdf->SetTextColor($r, $g, $b);

  //       // Aplica a fonte
  //       $this->pdf->SetFont('helvetica', '', $fontSizePt);

  //       // Posiciona e renderiza
  //       $this->pdf->setXY($xMm, $yMm);

  //       // MultiCell lida perfeitamente com quebras de linha '\n' enviadas pelo Fabric
  //       $this->pdf->MultiCell(
  //         $larguraMm,
  //         0,
  //         $texto,
  //         0,
  //         'L',
  //         false
  //       );
  //     }
  //   }
  // }

  /**
   * Interpreta o JSON do Fabric v6+ e desenha textos e imagens nas coordenadas corretas
   */
  protected function aplicarEdicoesFabric(string $fabricJson)
  {
    // Se por algum motivo o front mandou como string double-encoded, limpamos aqui
    $dados = is_string($fabricJson) ? json_decode($fabricJson, true) : $fabricJson;

    // Se ainda assim for string (devido ao escape do FormData), decodifica de novo
    if (is_string($dados)) {
      $dados = json_decode($dados, true);
    }

    if (!$dados || empty($dados['objects'])) {
      return;
    }

    // FATOR DE CONVERSÃO CORRETO PRESERVADO:
    $pixelParaMm = 2.83464567 * 1.2;

    foreach ($dados['objects'] as $objeto) {
      $type = strtolower($objeto['type'] ?? '');

      // --- BLOCO 1: PROCESSAMENTO DE TEXTO (INALTERADO) ---
      if ($type === 'textbox' || $type === 'text' || $type === 'i-text') {

        $texto = $objeto['text'] ?? '';
        if (trim($texto) === '') {
          continue;
        }

        $left = $objeto['left'] ?? 0;
        $top = $objeto['top'] ?? 0;

        $scaleX = $objeto['scaleX'] ?? 1;
        $scaleY = $objeto['scaleY'] ?? 1;

        $larguraObjetoPx = ($objeto['width'] ?? 0) * $scaleX;
        $alturaObjetoPx = ($objeto['height'] ?? 0) * $scaleY;

        if (($objeto['originX'] ?? 'left') === 'center') {
          $left = $left - ($larguraObjetoPx / 2);
        }
        if (($objeto['originY'] ?? 'top') === 'center') {
          $top = $top - ($alturaObjetoPx / 2);
        }

        $xMm = $left / $pixelParaMm;
        $yMm = $top / $pixelParaMm;
        $larguraMm = $larguraObjetoPx / $pixelParaMm;

        $fontSizePt = ($objeto['fontSize'] ?? 20) / 1.2;

        $corHex = $objeto['fill'] ?? '#000000';
        [$r, $g, $b] = $this->converterHexParaRgb($corHex);
        $this->pdf->SetTextColor($r, $g, $b);

        $this->pdf->SetFont('helvetica', '', $fontSizePt);
        $this->pdf->setXY($xMm, $yMm);

        $this->pdf->MultiCell(
          $larguraMm,
          0,
          $texto,
          0,
          'L',
          false
        );
      }

      // --- BLOCO 2: PROCESSAMENTO DE IMAGEM (NOVO ADICIONADO COM CUIDADO) ---
      if ($type === 'image') {
        $src = $objeto['src'] ?? '';
        if (empty($src)) {
          continue;
        }

        $left = $objeto['left'] ?? 0;
        $top = $objeto['top'] ?? 0;

        $scaleX = $objeto['scaleX'] ?? 1;
        $scaleY = $objeto['scaleY'] ?? 1;

        // Calcula a largura e altura reais baseadas no redimensionamento que o usuário fez em tela
        $larguraObjetoPx = ($objeto['width'] ?? 0) * $scaleX;
        $alturaObjetoPx = ($objeto['height'] ?? 0) * $scaleY;

        // Mantém a mesma regra de correção de origem do seu texto
        if (($objeto['originX'] ?? 'left') === 'center') {
          $left = $left - ($larguraObjetoPx / 2);
        }
        if (($objeto['originY'] ?? 'top') === 'center') {
          $top = $top - ($alturaObjetoPx / 2);
        }

        // Converte os pixels da imagem para Milímetros usando seu fator exato
        $xMm = $left / $pixelParaMm;
        $yMm = $top / $pixelParaMm;
        $larguraMm = $larguraObjetoPx / $pixelParaMm;
        $alturaMm = $alturaObjetoPx / $pixelParaMm;

        // Processa o upload dependendo de como o front entregou o conteúdo (Base64 ou Caminho)
        if (str_contains($src, 'base64,')) {
          $dadosBase64 = explode('base64,', $src)[1];
          $imagemBinaria = base64_decode($dadosBase64);

          // '@' diz ao TCPDF para ler a string de bytes diretamente na memória
          $this->pdf->Image(
            '@' . $imagemBinaria,
            $xMm,
            $yMm,
            $larguraMm,
            $alturaMm,
            ''
          );
        } else {
          // Fallback para caso seja uma URL local relativa ou externa
          $caminhoArquivo = str_starts_with($src, 'http') ? $src : public_path($src);

          if (str_starts_with($src, 'http') || file_exists($caminhoArquivo)) {
            $this->pdf->Image(
              $caminhoArquivo,
              $xMm,
              $yMm,
              $larguraMm,
              $alturaMm
            );
          }
        }
      }

      // ----  BLOCO 3: PROCESSAMENTO DE DESENHOS/BORRACHA (COORDENADAS CORRIGIDAS) ----
      if ($type === 'path') {
        $corHex = $objeto['stroke'] ?? '#ffffff';
        $espessuraPx = $objeto['strokeWidth'] ?? 20;

        // Converte a cor usando o método da sua classe
        [$r, $g, $b] = $this->converterHexParaRgb($corHex);
        $this->pdf->SetDrawColor($r, $g, $b);

        // Converte a espessura do traço (px -> mm)
        $espessuraMm = $espessuraPx / $pixelParaMm;
        $this->pdf->SetLineWidth($espessuraMm);

        // CORREÇÃO 1: Adiciona um ganho de 5% na espessura para cobrir erros de arredondamento decimal
        $espessuraMm = ($espessuraPx * 1.05) / $pixelParaMm;
        $this->pdf->SetLineWidth($espessuraMm);

        // CORREÇÃO 2: Força o TCPDF a arredondar as pontas e junções das linhas (muda de quadrado para redondo)
        $this->pdf->SetLineStyle([
          'cap' => 'round', // Pontas arredondadas
          'join' => 'round' // Junções de curvas arredondadas
        ]);

        $pathComandos = $objeto['path'] ?? [];

        if (is_array($pathComandos) && !empty($pathComandos)) {
          $ultimoX = 0;
          $ultimoY = 0;

          foreach ($pathComandos as $comando) {
            // Garante que o comando é um array válido
            if (!is_array($comando)) {
              continue;
            }

            $acao = $comando[0] ?? '';

            if ($acao === 'M') {
              // Converte direto a coordenada absoluta do Fabric para Milímetros
              $ultimoX = $comando[1] / $pixelParaMm;
              $ultimoY = $comando[2] / $pixelParaMm;
            } elseif ($acao === 'L') {
              // Linha reta direta
              $xMm = $comando[1] / $pixelParaMm;
              $yMm = $comando[2] / $pixelParaMm;

              $this->pdf->Line($ultimoX, $ultimoY, $xMm, $yMm);

              $ultimoX = $xMm;
              $ultimoY = $yMm;
            } elseif ($acao === 'Q') {
              // Curva convertida diretamente usando os pontos de destino absolutos ($comando[3] e [4])
              $toXMm = $comando[3] / $pixelParaMm;
              $toYMm = $comando[4] / $pixelParaMm;

              $this->pdf->Line($ultimoX, $ultimoY, $toXMm, $toYMm);

              $ultimoX = $toXMm;
              $ultimoY = $toYMm;
            }
          }
        }
      }
    }
  }


  /**
   * Função utilitária para transformar '#FFFFFF' ou '#000000' em array [R, G, B]
   */
  private function converterHexParaRgb(string $hex): array
  {
    $hex = ltrim($hex, '#');
    if (strlen($hex) === 3) {
      $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
    }

    if (strlen($hex) !== 6) {
      return [0, 0, 0]; // Retorna preto se falhar
    }

    return [
      hexdec(substr($hex, 0, 2)),
      hexdec(substr($hex, 2, 2)),
      hexdec(substr($hex, 4, 2))
    ];
  }

  /**
   * Pega um PDF já processado e o transforma em um layout de 2 páginas por folha.
   * * @param string $pdfString Conteúdo binário do PDF gerado pelo fluxo padrão
   * @return string Conteúdo binário do PDF final agrupado
   */
  protected function agruparEmDuasPorFolha(string $pdfString): string
  {
    // Criamos uma nova instância do FPDI para o arquivo final de saída
    $pdfFinal = new \setasign\Fpdi\Tcpdf\Fpdi();
    $pdfFinal->setPrintHeader(false);
    $pdfFinal->setPrintFooter(false);
    $pdfFinal->SetMargins(0, 0, 0);
    $pdfFinal->SetAutoPageBreak(false);

    // Salva o PDF temporariamente para que o FPDI possa lê-lo como origem
    $tmpOriginal = tempnam(sys_get_temp_dir(), 'pdf_bloco_') . '.pdf';
    file_put_contents($tmpOriginal, $pdfString);

    // Força compatibilidade de versão (1.4) caso necessário
    $tmpCompativel = $this->converterParaPdfCompativel($tmpOriginal);

    $pageCount = $pdfFinal->setSourceFile($tmpCompativel);

    // Cria um array com os números de todas as páginas existentes
    $paginas = range(1, $pageCount);
    $paresDePaginas = array_chunk($paginas, 2);

    foreach ($paresDePaginas as $par) {
      // Adiciona uma página em modo Paisagem (Landscape) A4
      $pdfFinal->AddPage('L', 'A4');

      $larguraA4 = $pdfFinal->getPageWidth();
      $alturaA4 = $pdfFinal->getPageHeight();
      $metadeLargura = $larguraA4 / 2;

      // --- PÁGINA DA ESQUERDA ---
      $vazia = false;
      $templateE = $pdfFinal->importPage($par[0]);
      $sizeE = $pdfFinal->getTemplateSize($templateE);

      // Calcula a proporção para caber perfeitamente na metade esquerda (com margem de 8mm)
      $propE = min(($metadeLargura - 0) / $sizeE['width'], ($alturaA4 - 0) / $sizeE['height']);
      $wE = $sizeE['width'] * $propE;
      $hE = $sizeE['height'] * $propE;

      // Centraliza o PDF original dentro da metade esquerda da folha
      $xE = ($metadeLargura - $wE) / 2;
      $yE = ($alturaA4 - $hE) / 2;

      $pdfFinal->useTemplate($templateE, $xE, $yE, $wE, $hE);

      // --- PÁGINA DA DIREITA (Se houver) ---
      if (isset($par[1])) {
        $templateD = $pdfFinal->importPage($par[1]);
        $sizeD = $pdfFinal->getTemplateSize($templateD);

        $propD = min(($metadeLargura - 0) / $sizeD['width'], ($alturaA4 - 0) / $sizeD['height']);
        $wD = $sizeD['width'] * $propD;
        $hD = $sizeD['height'] * $propD;

        // Centraliza dentro da metade direita (deslocando o X pelo tamanho da metade)
        $xD = $metadeLargura + (($metadeLargura - $wD) / 2);
        $yD = ($alturaA4 - $hD) / 2;

        $pdfFinal->useTemplate($templateD, $xD, $yD, $wD, $hD);
      }
    }

    // Limpa os arquivos temporários do servidor
    @unlink($tmpOriginal);
    if ($tmpCompativel !== $tmpOriginal) {
      @unlink($tmpCompativel);
    }

    // Retorna o PDF finalizado em string/stream
    return $pdfFinal->Output('', 'S');
  }
}
