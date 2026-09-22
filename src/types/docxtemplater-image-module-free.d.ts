declare module "docxtemplater-image-module-free" {
  type OpcionesImageModule = {
    centered?: boolean;
    fileType?: "docx" | "pptx";
    getImage: (tagValue: string, tagName: string) => Buffer | ArrayBuffer;
    getSize: (
      img: Buffer | ArrayBuffer,
      tagValue: string,
      tagName: string
    ) => [number, number];
  };

  export default class ImageModule {
    constructor(opciones: OpcionesImageModule);
  }
}
