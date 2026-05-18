"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/features", label: "Features" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      <header className="header-navbar">
        <Link href="/" className="logo-link" onClick={closeMenu}>
          <svg
            viewBox="0 0 200 50"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ height: "2.2em", width: "auto" }}
          >
            <text
              x="10"
              y="35"
              fontSize="26"
              fontWeight="bold"
              fill="currentColor"
            >
              InterviewAI
            </text>
          </svg>
        </Link>

        {/* Desktop Nav */}
        <nav className="desktop-nav">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={isActive ? "active" : ""}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile Actions */}
        <div className="mobile-actions-wrapper">
          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={toggleMenu}
            className={`hamburger-btn ${isMenuOpen ? "open" : ""}`}
            aria-label="Toggle Navigation Menu"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        </div>
      </header>

      {/* Mobile Glassmorphic Navigation Drawer */}
      <div className={`mobile-nav-drawer ${isMenuOpen ? "open" : ""}`}>
        <nav className="mobile-drawer-links">
          {navLinks.map((link, idx) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={isActive ? "active" : ""}
                style={{ animationDelay: `${idx * 0.08}s` }}
                onClick={closeMenu}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
