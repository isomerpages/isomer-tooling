const { PDFImage } = require("pdf-image");
const Tesseract = require("tesseract.js");

// Function to convert PDF to high-resolution images
export async function parsePdfAsImageAndExtractText(
	pdfPath: string
): Promise<string> {
	const pdfImage = new PDFImage(pdfPath, {
		convertOptions: {
			"-density": "300", // Set the DPI to 300 for better quality
			"-quality": "100",
		},
	});

	const pages = await pdfImage.numberOfPages();

	const texts: string[] = [];

	for (let i = 0; i < pages; i++) {
		const imagePath = await pdfImage.convertPage(i);

		const result = await Tesseract.recognize(imagePath, "eng", {
			// logger: (m: string) => console.log(m), // optional logger to see the OCR process
		});

		texts.push(result.data.text);
	}

	return texts.join(" ");
}
