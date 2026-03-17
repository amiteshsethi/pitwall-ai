export default function Footer() {
  return (
    <footer className="border-t border-zinc-800 mt-16 py-8">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-red-500 font-black tracking-widest">
            PITWALL
          </span>
          <span className="text-white font-light tracking-widest">AI</span>
          <span className="text-zinc-600 text-xs ml-2">2026 Season</span>
        </div>

        <div className="text-center">
          <p className="text-zinc-500 text-xs">
            Built with real 2026 F1 data · Predictions update after every
            session
          </p>
          <p className="text-zinc-600 text-xs mt-1">
            © {new Date().getFullYear()} Duttatrey Amitesh Sethi · All rights reserved
          </p>
          <p className="text-zinc-700 text-xs mt-1">
            PitWall AI is not affiliated with Formula 1, FIA, or any F1 team
          </p>
        </div>

        <div className="flex items-center gap-4">
          <p className="text-zinc-500 text-xs">Built by</p>
          <a
            href="https://www.linkedin.com/in/duttatrey-amitesh-sethi-151aa61a0/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 border border-zinc-700 hover:border-red-500 text-zinc-400 hover:text-red-500 text-xs font-semibold px-3 py-2 rounded-xl transition-all duration-300"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            Duttatrey Amitesh Sethi
          </a>
        </div>
      </div>
    </footer>
  );
}
