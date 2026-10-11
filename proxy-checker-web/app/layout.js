export const metadata = {
  title: "Proxy Checker",
  description: "Web-based proxy tester and classifier",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: "#0b0f19",
          color: "#f8fafc",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}