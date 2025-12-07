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
    <div className="min-h-screen via-slate-900 to-slate-800 text-white flex flex-col">
      <header className="px-8 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-[0.2em] text-yellow-300 drop-shadow">
            PREMIOS IEC 2025
          </h1>
          <p className="text-slate-200/80 mt-1">
            Categorías de la noche de premiación
          </p>
        </div>

        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-white/10 border border-white/30 text-sm md:text-base hover:bg-white/20 transition"
          >
            Volver al inicio
          </button>
        )}
      </header>

      <main className="flex-1 px-6 md:px-12 pb-10 flex items-center justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full max-w-6xl">
          {categories.map((cat, index) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory?.(cat)}
              className="group relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 
                         hover:bg-white/10 hover:border-yellow-400/60 transition-all duration-200
                         shadow-[0_0_30px_rgba(0,0,0,0.6)] text-left p-6 md:p-7 flex flex-col justify-between"
            >
              <span className="text-6xl md:text-7xl font-black text-slate-800/40 group-hover:text-yellow-500/20 absolute -top-4 -right-2">
                {(index + 1).toString().padStart(2, '0')}
              </span>

              <div className="relative z-10">
                <h2 className="text-xl md:text-2xl font-bold text-yellow-300 drop-shadow mb-2">
                  {cat.name}
                </h2>
                <p className="text-sm md:text-base text-slate-100/85">
                  {cat.description}
                </p>
              </div>

              <div className="relative z-10 mt-4 flex items-center gap-2 text-sm text-slate-200/90">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Listo para presentar</span>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default CategoriesView;
