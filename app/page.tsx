'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

// ─── Glowing Hero Hub ──────────────────────────────────────────────────────────
function HubHero() {
  return (
    <section className="relative w-full min-h-[90vh] flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Background gradients & animations */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950/90 to-slate-950 z-0"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-fuchsia-600/20 blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-600/20 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-5xl mx-auto mt-16">
        <div className="mb-6 relative group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-2xl blur-lg opacity-40 group-hover:opacity-70 transition-opacity duration-500"></div>
          <Image 
            src="/images/logo.png" 
            alt="Hatake Social" 
            width={120} 
            height={120} 
            className="relative rounded-2xl border border-white/10 shadow-2xl transform group-hover:scale-105 transition-transform duration-500 bg-slate-900"
          />
        </div>
        
        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500 mb-6 drop-shadow-2xl">
          Hatake <span className="text-cyan-400">Social</span>
        </h1>
        
        <p className="text-xl md:text-3xl text-slate-300 font-light max-w-3xl mb-12 leading-relaxed">
          The ultimate ecosystem for Trading Card Games. <br/>
          <span className="font-semibold text-fuchsia-400">Collect. Trade. Battle. Socialize.</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
          <Link href={`/play`} className="group relative px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-lg transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_40px_rgba(34,211,238,0.6)] hover:-translate-y-1 overflow-hidden">
            <span className="relative z-10 flex items-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              Enter the Arena
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-300 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </Link>
          
          <Link href={`/marketplace`} className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold rounded-xl text-lg backdrop-blur-md transition-all hover:-translate-y-1 shadow-lg hover:shadow-white/10">
            Marketplace
          </Link>
          
          <Link href={`/feed`} className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold rounded-xl text-lg backdrop-blur-md transition-all hover:-translate-y-1 shadow-lg hover:shadow-white/10">
            Social Hub
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Dynamic Engine Preview ────────────────────────────────────────────────
function EngineShowcase() {
  const engines = [
    { name: 'Magic: The Gathering', code: 'MTG', color: 'from-blue-600 to-indigo-900', icon: 'M' },
    { name: 'Pokémon TCG', code: 'PKMN', color: 'from-yellow-400 to-red-500', icon: 'P' },
    { name: 'One Piece TCG', code: 'OP', color: 'from-orange-500 to-red-700', icon: 'O' }
  ];

  return (
    <section className="py-24 bg-slate-950 relative border-t border-white/5">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">Three Games. One Arena.</h2>
          <p className="text-slate-400 text-xl max-w-2xl mx-auto">Import your physical collection into your digital binder and play across multiple game engines flawlessly.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {engines.map(engine => (
            <div key={engine.code} className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all cursor-pointer group backdrop-blur-sm relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${engine.color} opacity-70 group-hover:opacity-100 transition-opacity`}></div>
              
              <div className="h-32 flex items-center justify-center mb-6">
                 <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${engine.color} flex items-center justify-center text-4xl font-black text-white shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                    {engine.icon}
                 </div>
              </div>
              
              <h3 className="text-2xl font-bold text-white text-center mb-2">{engine.name}</h3>
              <p className="text-slate-400 text-center">Full rules engine integration, matchmaking, and ranked ladders.</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Main Page Component ────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 font-sans selection:bg-cyan-500/30">
      <HubHero />
      <EngineShowcase />

      {/* Footer */}
      <footer className="bg-black py-16 border-t border-white/10 text-slate-400 relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center text-slate-950 font-bold">HS</div>
              <h3 className="text-white text-2xl font-bold tracking-tight">Hatake <span className="text-cyan-400">Social</span></h3>
            </div>
            <p className="text-sm leading-relaxed mb-6">
              The premier social platform and digital arena for trading card enthusiasts worldwide.
            </p>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-6">Ecosystem</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/marketplace" className="hover:text-cyan-400 transition-colors">Global Marketplace</Link></li>
              <li><Link href="/feed" className="hover:text-cyan-400 transition-colors">Social Feed</Link></li>
              <li><Link href="/collection" className="hover:text-cyan-400 transition-colors">Digital Binder</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Play</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/play" className="hover:text-cyan-400 transition-colors">Matchmaking Lobby</Link></li>
              <li><Link href="/decks" className="hover:text-cyan-400 transition-colors">Deck Builder</Link></li>
              <li><Link href="/reputation" className="hover:text-cyan-400 transition-colors">Leaderboards</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <p>&copy; 2026 Hatake Social. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
