
const TitleScreen = ({ onStart }) => {
  return (
    <div className="min-h-screen via-blue-900 to-indigo-900 overflow-hidden relative flex items-center justify-center">
      {/* Fondo de luces espectáculo */}
      <div className="absolute inset-0 animate-pulse-slow pointer-events-none" />

      {/* Contenido principal */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-yellow-300 drop-shadow-[0_0_25px_rgba(250,204,21,0.8)] tracking-widest">
          PREMIOS
        </h1>

        <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-sky-200 drop-shadow-[0_0_18px_rgba(56,189,248,0.9)]">
          IEC 2025
        </h2>

        <p className="mt-6 text-lg sm:text-xl text-slate-100/80 max-w-xl">
          Noche de reconocimientos, celebración y talentos destacados.
        </p>

      </div>
    </div>
  );
};

export default TitleScreen;
