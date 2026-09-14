import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white font-black text-2xl mb-6 shadow-lg shadow-rose-500/20">
        404
      </div>
      <h1 className="text-2xl md:text-3xl font-black text-white mb-2 tracking-tight">
        Página No Encontrada
      </h1>
      <p className="text-xs md:text-sm text-slate-400 max-w-md mb-8 leading-relaxed">
        La dirección solicitada no existe o ha sido movida. Si buscas una tienda, verifica que el subdominio esté escrito correctamente.
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-xs font-bold transition shadow-md"
      >
        Volver a c4talogo.com
      </Link>
    </div>
  );
}
