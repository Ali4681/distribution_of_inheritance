import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import { AppProvider } from "@/components/providers/AppProvider";
import { DialogProvider } from "@/components/providers/DialogProvider";
import StyledJsxRegistry from "./registry";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inheritance Distribution | نظام توزيع الميراث",
  description:
    "Family tree based inheritance distribution system. نظام توزيع ميراث مبني على شجرة العائلة.",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: "#0f766e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body suppressHydrationWarning>
        <StyledJsxRegistry>
          <AppProvider>
            <DialogProvider>
              {children}
              <Toaster
                position="top-center"
                toastOptions={{
                  duration: 3500,
                  style: {
                    background: "var(--surface)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow)",
                  },
                }}
              />
            </DialogProvider>
          </AppProvider>
        </StyledJsxRegistry>
      </body>
    </html>
  );
}
