import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "InterviewAI - Precision Interview Engineering",
  description: "Instantly architect deep, role-specific candidate assessments and grading rubrics powered by advanced AI.",
};

// Root layout wraps every page in the app. It provides the HTML structure, global header, and footer.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Navbar />

        {children}

        <footer>
          <div className="container footer-content">
            <div className="footer-logo">
              <span>InterviewAI</span>
            </div>
            <div className="footer-links">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
            </div>
            <div className="footer-copyright">
              © {new Date().getFullYear()} InterviewAI
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
