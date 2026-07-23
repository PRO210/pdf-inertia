import axios from "axios";

export async function obterFontesPdf(pdf) {

    let arquivo;

    if (pdf instanceof File) {
        arquivo = pdf;
    } else {
        const response = await fetch(pdf);
        const blob = await response.blob();
        arquivo = new File([blob], "documento.pdf", {
            type: "application/pdf",
        });
    }

    const formData = new FormData();
    formData.append("pdf", arquivo);

    const { data } = await axios.post(
        route("pdf.analisar"),
        formData
    );

    return data;
}