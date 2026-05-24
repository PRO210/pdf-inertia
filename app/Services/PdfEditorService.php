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
    string $bordaTipo = 'none'
  ) {

    // -----------------------------------------------------------------
    // NOVA LINHA DE SEGURANÇA: Limpa e converte o PDF antes do FPDI abrir
    // -----------------------------------------------------------------
    $pdfPathCompativel = $this->converterParaPdfCompativel($pdfPath);

    // Passa o caminho do arquivo convertido para o FPDI
    $pageCount = $this->pdf->setSourceFile($pdfPathCompativel);
    $configMap = collect($pagesConfig)->keyBy('page');


    // 1. CÁLCULO DO ESPAÇO DO CABEÇALHO
    $espacoCabecalhoTotal = 0;
    if ($configMap->contains('hasHeader', true)) {
      if ($cabecalhoTipo === 'texto') {
        $qtdLinhas = max(count($textosCabecalho), 1);
        $espacoCabecalhoTotal = ($qtdLinhas * 6) + 15;
      } elseif ($cabecalhoTipo === 'imagem' || $cabecalhoTipo === 'ambos') {
        $espacoCabecalhoTotal = 38;
      } elseif ($cabecalhoTipo === 'banner') {
        $espacoCabecalhoTotal = 52;
      }
    }

    // Definição de margem física da borda (Equivalente aos 0.5cm do seu antigo projeto)
    $margemBorda = ($bordaTipo !== 'none') ? 6 : 0;

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
        // Remove o cabeçalho no topo e a margem da borda embaixo
        $novaAlturaTemplate = $size['height'] - $espacoCabecalhoTotal - $margemBorda;
        // Remove as margens das bordas esquerda e direita
        $novaLarguraTemplate = $size['width'] - ($margemBorda * 2);

        // Proporções para não distorcer o PDF original
        $proporcaoH = $novaAlturaTemplate / $size['height'];
        $proporcaoW = $novaLarguraTemplate / $size['width'];
        $proporcao = min($proporcaoH, $proporcaoW);

        $larguraFinalPDF = $size['width'] * $proporcao;
        $alturaFinalPDF = $size['height'] * $proporcao;

        // Centraliza horizontalmente e posiciona logo abaixo do cabeçalho
        $posicaoX = ($size['width'] - $larguraFinalPDF) / 2;
        $posicaoY = $espacoCabecalhoTotal;

        $this->pdf->useTemplate($templateId, $posicaoX, $posicaoY, $larguraFinalPDF, $alturaFinalPDF);
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
    }

    // No final do método, antes de dar o Output, limpe o arquivo temporário gerado para não entupir o servidor:
    if ($pdfPathCompativel !== $pdfPath && file_exists($pdfPathCompativel)) {
      @unlink($pdfPathCompativel);
    }

    return $this->pdf->Output('', 'S');
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

      $alturaFixa = 30;

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
      $alturaFixa = 30;

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
}
