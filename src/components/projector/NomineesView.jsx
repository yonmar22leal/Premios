import React from 'react';

const NomineesView = ({ category, nominees, onBack, onShowWinner }) => {
  // 1) Sin categoría → mensaje fijo
  if (!category) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <p className="text-2xl">Selecciona una categoría primero.</p>
      </div>
    );
  }

  // 2) Estado "cargando" controlado desde ProjectorView:
  // usa null como "todavía no he cargado nominados"
  if (nominees === null || nominees === undefined) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center">
        <p className="text-xl mb-2">Cargando nominados...</p>
      </div>
    );
  }

  // 3) Sin nominados para esa categoría
  if (nominees.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center ">
        <p className="text-xl mb-2">No hay nominados asignados a esta categoría.</p>
      </div>
    );
  }

  // 4) Nominados listos
  return (
    <div className="min-h-screen from-slate-950 via-slate-900 to-slate-800 text-white flex flex-col bg-[url('/images/2.png')] bg-cover">
      {/* HEADER CENTRADO Y MÁS ABAJO */}
      <header className=" px-6 md:px-8 pt-24 pb-8 flex flex-col items-center text-center">
        <p className="text-sm tracking-[0.35em]  uppercase text-4xl md:text-4xl font-medium font-sans">
          Premio
        </p>

        <h1 className="text-4xl md:text-8xl font-extrabold text-[#eccf58] drop-shadow mt-4 font-sans">
          {category.name}
        </h1>

        <p className="text-slate-200/80 mt-2 text-4xl md:text-4xl font-medium max-w-3xl font-sans">
          Nominados oficiales para esta categoría.
        </p>

      </header>

      {/* LISTA DE NOMINADOS */}
      <main className="flex-1 px-6 md:px-12 pb-10 flex items-center justify-center mt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
          {nominees.map((nominee) => (
            <div
              key={nominee.id}
              className="group relative rounded-3xl overflow-hidden bg-white/5 border border-white/10
                         hover:bg-white/10 hover:border-yellow-400/60 transition-all duration-200
                         shadow-[0_0_30px_rgba(0,0,0,0.6)] flex flex-col items-center p-6"
            >
              <div className="font-size 800 w-32 h-32 md:w-80 md:h-80 rounded-full overflow-hidden border-4 border-yellow-400/70 shadow-lg mb-4">
                <img
                  src={nominee.img_url}
                  alt={nominee.name}
                  className="w-full h-full object-cover "
                />
              </div>

              <h2 className="[-webkit-text-stroke:2px_rgba(0,0,0,0.8)] text-4xl md:text-4xl font-bold text-center font-sans drop-shadow-lg shadow-black ">
                {nominee.name}
              </h2>
            </div>
          ))}
        </div>
      </main>
      asdasd
    </div>
  );
};

export default NomineesView;
