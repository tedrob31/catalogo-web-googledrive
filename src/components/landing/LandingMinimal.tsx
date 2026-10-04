export default function LandingMinimal() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between p-6 text-center relative overflow-hidden selection:bg-amber-500 selection:text-black">
      {/* Luz ambiental sutil de fondo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-amber-500/10 via-rose-500/10 to-transparent blur-[140px] pointer-events-none rounded-full" />

      {/* Espaciador superior para centrado perfecto */}
      <div className="h-6" />

      {/* Contenido principal centrado */}
      <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center space-y-6 my-auto">
        {/* Ícono C4 arriba al medio */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-rose-500 to-orange-500 p-[1.5px] shadow-2xl shadow-rose-500/20">
          <div className="w-full h-full bg-black rounded-[22px] flex items-center justify-center">
            <span className="text-2xl sm:text-3xl font-black bg-gradient-to-tr from-amber-400 to-rose-400 bg-clip-text text-transparent">
              C4
            </span>
          </div>
        </div>

        {/* Lema principal y texto */}
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            El mejor catálogo
          </h1>
          <p className="text-base sm:text-lg text-slate-300 font-medium max-w-md mx-auto leading-relaxed">
            ¿Guardas tus fotos en Google Drive? Listo, ya puedes tener tu catálogo en línea 🔝
          </p>
        </div>

        {/* Pronto más información */}
        <div className="pt-2">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs sm:text-sm text-slate-400 font-medium tracking-wide">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Pronto más información...
          </span>
        </div>
      </div>

      {/* Footer minimalista */}
      <footer className="relative z-10 py-4 text-center">
        <p className="text-xs text-slate-600 font-medium tracking-wider">
          Desarrollado por <span className="text-slate-400 font-semibold tracking-normal">r4tlabs</span>
        </p>
      </footer>
    </div>
  );
}
