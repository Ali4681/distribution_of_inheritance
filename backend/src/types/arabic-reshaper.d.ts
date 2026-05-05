declare module 'arabic-reshaper' {
  const arabicReshaper: {
    convertArabic(text: string): string;
  };

  export default arabicReshaper;
  export function convertArabic(text: string): string;
}
