import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import Providers from "@/components/Providers";

export const metadata = { title: "HireMe" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <SiteHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
