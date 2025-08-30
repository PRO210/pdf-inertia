// pdfUtils.js
import { PDFDocument } from 'pdf-lib';

export const adicionarBorda = async (pdfDoc, page, dataUrlBorda, marginMm = 5) => {
  if (!dataUrlBorda) return;

  const imgBytes = await fetch(dataUrlBorda).then(res => res.arrayBuffer());
  const smallImg = await pdfDoc.embedPng(imgBytes);

  const imgW = smallImg.width;
  const imgH = smallImg.height;

  const pageWidth = page.getSize().width;
  const pageHeight = page.getSize().height;

  const MARGIN = marginMm * 28.3465 / 10; // 5mm → pts

  const usableW = pageWidth - MARGIN * 2;
  const usableH = pageHeight - MARGIN * 2;

  const repeatX = Math.ceil(usableW / imgW);
  const repeatY = Math.ceil(usableH / imgH);

  for (let x = 0; x < repeatX; x++) {
    for (let y = 0; y < repeatY; y++) {
      page.drawImage(smallImg, {
        x: MARGIN + x * imgW,
        y: pageHeight - MARGIN - (y + 1) * imgH,
        width: imgW,
        height: imgH,
      });
    }
  }
};
