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

  // 4) Función para determinar clases del grid según cantidad de nominados
  const getGridClasses = (count) => {
    if (count === 13) {
      // Especial: 7+6 en dos filas, tarjetas más pequeñas
      return 'grid grid-cols-7 md:grid-cols-7 gap-6 md:gap-x-43 mb-4 justify-items-center';
    }
    
    if (count === 3) return 'grid grid-cols-3 gap-6 md:gap-8 justify-items-center';
    if (count === 4) return 'grid grid-cols-4 gap-6 md:gap-8 justify-items-center';
    if (count === 5) return 'grid grid-cols-5 gap-6 md:gap-8 justify-items-center';
    if (count === 6) return 'grid grid-cols-6 md:grid-cols-6 gap-6 md:gap-8 justify-items-center';
    
    // Para otros números: grid cuadrado
    const cols = Math.ceil(Math.sqrt(count));
    const colClass = `grid-cols-${cols}`;
    return `grid ${colClass} gap-6 md:gap-8 justify-items-center`;
  };

  // 5) Clases para las tarjetas según cantidad
  const getCardClasses = (count) => {
    if (count === 13) {
      // 13 → pequeño
      return `w-54 h-54 md:w-52 md:h-52 rounded-full overflow-hidden border-3 border-yellow-400/70 shadow-lg mb-2`;
    }
    if (count === 4 || count === 5) {
      // 4 y 5 → un toque más pequeñas que antes
      return `w-28 h-28 md:w-65 md:h-85 rounded-full overflow-hidden border-4 border-yellow-400/70 shadow-lg mb-3`;
    }
    if (count === 6) { 
      // 6 un toque más pequeñas que antes
      return `w-30 h-30 md:w-40 md:h-50 rounded-full overflow-hidden border-4 border-yellow-400/70 shadow-lg mb-3`;
    }
    // resto igual que antes
    return `w-32 h-32 md:w-80 md:h-80 rounded-full overflow-hidden border-4 border-yellow-400/70 shadow-lg mb-4`;
  };


  // 6) Tamaño de texto según cantidad
  const getTextSize = (count) => {
    if (count === 13) {
      return 'text-xl md:text-2xl'; // Texto más pequeño para 13
    }
    return 'text-4xl md:text-4xl'; // Texto normal
  };

  // 7) Nominados listos
  return (
    <div className="min-h-screen from-slate-950 via-slate-900 to-slate-800 text-white flex flex-col bg-[url('/images/2.png')] bg-cover">
      {/* HEADER CENTRADO Y MÁS ABAJO */}
      <header className=" px-6 md:px-8 pt-24 pb-8 flex flex-col items-center text-center">
        <p className="text-sm tracking-[0.35em] uppercase text-4xl md:text-4xl font-medium font-sans">
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
        <div className={`w-full max-w-8xl ${getGridClasses(nominees.length)}`}>
          {nominees.map((nominee) => (
            <div
              key={nominee.id}
              className="group relative rounded-3xl overflow-hidden bg-white/5 border border-white/10
                       hover:bg-white/10 hover:border-yellow-400/60 transition-all duration-200
                       shadow-[0_0_30px_rgba(0,0,0,0.6)] flex flex-col items-center p-3 md:p-6 justify-center"
            >
              
              <div className={getCardClasses(nominees.length)}>
                <img
                  src={nominee.img_url}
                  alt={nominee.name}
                  className="w-full h-full"
                />
              </div>

              <h2 className={`[-webkit-text-stroke:2px_rgba(0,0,0,0.8)] font-bold text-center font-sans drop-shadow-lg shadow-black ${getTextSize(nominees.length)} mt-1 md:mt-2`}>
                {nominee.name}
              </h2>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default NomineesView;
