// Extend PDFKit TextOptions with the direction property supported since v0.13
declare namespace PDFKit {
  namespace Mixins {
    interface TextOptions {
      direction?: 'ltr' | 'rtl';
    }
  }
}
