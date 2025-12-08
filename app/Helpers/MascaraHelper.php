<?php

namespace App\Helpers;

use Imagick;
use ImagickPixel;

class MascaraHelper
{
    public static function aplicarMascara($imagePath, $maskPath)
    {
        // Carrega imagem original
        $image = new Imagick($imagePath);
        $image->setImageFormat("png");
        $image->setImageMatte(true);

        // Carrega máscara (preto = cortar, branco = manter)
        $mask = new Imagick($maskPath);
        $mask->setImageFormat("png");

        // Redimensiona máscara para o tamanho da imagem original
        $mask->resizeImage(
            $image->getImageWidth(),
            $image->getImageHeight(),
            Imagick::FILTER_LANCZOS,
            1
        );

        $mask->setImageType(Imagick::IMGTYPE_GRAYSCALE);

        // Converte máscara em canal alpha baseado na luminosidade
        // (preto=0 → transparente / branco=255 → opaco)
        $mask->setImageAlphaChannel(Imagick::ALPHACHANNEL_SET);

        // Aplica máscara na imagem
        $image->compositeImage($mask, Imagick::COMPOSITE_COPYOPACITY, 0, 0);


        // Salva resultado
        $outputPath = storage_path('app/temp_pdf/masked_' . uniqid() . '.png');
        $image->writeImage($outputPath);

        $image->clear();
        $mask->clear();

        return $outputPath;
    }
}
