// src/components/projector/CategoriesView.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase.js';

const CategoriesView = ({ onBack, onSelectCategory }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error cargando categorías:', error);
      } else {
        setCategories(data || []);
      }
      setLoading(false);
    };

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-xl">Cargando categorías...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[url('/images/2.png')] bg-cover bg-center via-slate-900 to-slate-800 text-white flex flex-col">
      {/* HEADER CENTRADO Y MÁS GRANDE */}
      <header className="px-8 pt-6 pb-6 flex flex-col items-center text-center">
        <p className="text-2xl md:text-4xl lg:text-5xl font-extrabold tracking-[0.3em] text-yellow-100 drop-shadow-2xl mb-2 font-sans">
          CATEGORIA DE LA NOCHE
        </p>
        <p className="text-lg md:text-xl text-slate-200/90 font-light tracking-wide font-sans">
          PREMIACION IEC 2025
        </p>
      </header>

      {/* BOTÓN VOLVER (solo si existe) */}
      {onBack && (
        <div className="px-8 pb-4 flex justify-center">
          <button
            onClick={onBack}
            className="px-6 py-3 rounded-xl bg-white/10 border border-white/30 text-base md:text-lg hover:bg-white/20 transition-all duration-200 shadow-lg"
          >
            ← Volver al inicio
          </button>
        </div>
      )}

      <main className="flex-1 px-6 md:px-12 pb-10 flex items-center justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 w-full max-w-7xl">
          {categories.map((cat, index) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory?.(cat)}
              className="group relative overflow-hidden rounded-3xl bg-white/8 border-2 border-white/20 
                         hover:bg-white/15 hover:border-yellow-400/70 transition-all duration-300
                         shadow-[0_10px_40px_rgba(0,0,0,0.7)] text-left p-8 md:p-10 flex flex-col justify-between h-64 md:h-72"
            >
              {/* NÚMERO EN LA ESQUINA - MÁS GRANDE */}
              <span className="text-5xl md:text-6xl lg:text-7xl font-black text-slate-800/30 group-hover:text-yellow-100 absolute -top-6 -right-4 scale-110">
                {(index + 1).toString().padStart(2, '0')}
              </span>

              <div className="relative z-10 flex flex-col justify-between h-full">
                {/* TÍTULO DE CATEGORÍA - MUCHO MÁS GRANDE */}
                <h2 className="[-webkit-text-stroke:2px_rgba(0,0,0,0.8)] text-3xl md:text-4xl lg:text-5xl font-black text-yellow-100/95 drop-shadow-2xl mb-4 leading-tight font-sans">
                  {cat.name}
                </h2>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default CategoriesView;
