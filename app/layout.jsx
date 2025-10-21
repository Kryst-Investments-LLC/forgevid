import "./globals.css";
export const metadata = {
    title: "ForgeVid",
    description: "AI Video Platform",
};
export default function RootLayout({ children, }) {
    return (<html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>);
}
