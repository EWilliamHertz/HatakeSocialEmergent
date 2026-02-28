"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Library, ShoppingBag, MessageCircle } from "lucide-react";

const NAV_ITEMS = [
  { href: "/feed",        label: "Feed",       icon: Home },
  { href: "/search",      label: "Search",     icon: Search },
  { href: "/collection",  label: "Cards",      icon: Library },
  { href: "/marketplace", label: "Market",     icon: ShoppingBag },
  { href: "/messages",    label: "Messages",   icon: MessageCircle },
];

export default function MobileNav() {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith("/auth") || pathname === "/";
  if (isAuthPage) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all duration-150 ${
                active
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
