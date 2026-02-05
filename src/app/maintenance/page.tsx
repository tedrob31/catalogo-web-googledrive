export default function Maintenance() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-black text-center p-6">
            <div className="max-w-lg">
                <div className="text-6xl mb-6">🛠️</div>
                <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
                    Estamos actualizando nuestro catálogo
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                    Estamos realizando mejoras en el sistema para ofrecerte una mejor experiencia.
                    Por favor, vuelve en unos minutos.
                </p>
                <div className="w-16 h-1 bg-blue-600 mx-auto rounded-full animate-pulse"></div>
            </div>
        </div>
    );
}
