// ControlPanel.jsx - SIMPLIFICADO
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase.js';
import drumrollSfx from '../assets/audio/drumroll.mp3';
import winnerSfx from '../assets/audio/winner.mp3';




const ControlPanel = () => {
  const [state, setState] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loadingState, setLoadingState] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoadingState(true);
      setErrorMsg('');

      const { data: st, error: stError } = await supabase
        .from('presentation_state')
        .select('*')
        .eq('id', 1)
        .single();

      if (stError) {
        console.error(stError);
        setErrorMsg('No se pudo cargar el estado de presentación.');
      } else {
        setState(st);
      }

      const { data: cats, error: catsError } = await supabase
        .from('categories')
        .select('*')
        .order('id', { ascending: true });

      if (catsError) {
        console.error(catsError);
      } else {
        setCategories(cats || []);
      }

      setLoadingState(false);
    };

    load();

    const handleShowWinner = async () => {
  // 1) Actualizas el estado en Supabase a 'results'
  await supabase
    .from('presentation_state')
    .update({ current_view: 'results' })
    .eq('id', 1);

  // 2) Secuencia de sonidos (aquí sí hay click del usuario)
  const drum = new Audio(drumrollSfx);
  drum.play().catch(console.error);

  setTimeout(() => {
    const win = new Audio(winnerSfx);
    win.play().catch(console.error);
  }, 5000);
};

    const channel = supabase
      .channel('presentation_state_changes_control')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'presentation_state', filter: 'id=eq.1' },
        (payload) => {
          console.log('[ControlPanel] realtime update', payload.new);
          setState(payload.new);
        }
      )
      .subscribe();

    const controlChan = supabase.channel('presentation_control');
    controlChan.subscribe().then(() => {
      console.log('[ControlPanel] control channel subscribed');
    }).catch((e) => console.warn('[ControlPanel] control channel subscribe error', e));

    channel._controlChan = controlChan;

    return () => {
      try { supabase.removeChannel(channel); } catch (e) {}
      try { supabase.removeChannel(controlChan); } catch (e) {}
    };
  }, []);

  const updateState = async (patch) => {
    if (!state) return;
    setLoadingAction(true);
    setErrorMsg('');

    const { data, error } = await supabase
      .from('presentation_state')
      .update(patch)
      .eq('id', 1)
      .select('*')
      .single();

    if (error) {
      console.error(error);
      setErrorMsg('Error al actualizar el estado.');
    } else {
      setState(data);

      // Enviar broadcast
      try {
        const existing = supabase.getChannels().find(c => c.topic === 'presentation_control');
        if (existing) {
          existing.send({ type: 'broadcast', event: 'refresh', payload: { ts: new Date().toISOString() } });
        } else {
          const chan = supabase.channel('presentation_control');
          await chan.subscribe();
          await chan.send({ type: 'broadcast', event: 'refresh', payload: { ts: new Date().toISOString() } });
          await supabase.removeChannel(chan);
        }
      } catch (bErr) {
        console.warn('[ControlPanel] No se pudo enviar broadcast de control', bErr);
      }
    }

    setLoadingAction(false);
  };

  if (loadingState || !state) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-xl">Cargando panel de control...</p>
      </div>
    );
  }

  const { current_view, current_category_id } = state;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-yellow-300">Panel de control – Premios IEC</h1>
          <p className="text-slate-300 text-sm mt-1">Controla lo que se ve en la pantalla de proyección.</p>
          {errorMsg && <p className="text-xs text-red-400 mt-1">{errorMsg}</p>}
        </div>
        {loadingAction && <span className="text-xs text-sky-300">Aplicando cambios...</span>}
      </header>

      <main className="flex-1 px-6 py-6 flex flex-col gap-6">
        {/* Estado actual */}
        <section className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
          <h2 className="text-lg font-semibold mb-2 text-yellow-200">Estado actual</h2>
          <p className="text-sm text-slate-200">Vista: <span className="font-mono">{current_view}</span></p>
          <p className="text-sm text-slate-200">Categoría: <span className="font-mono">{current_category_id ?? 'ninguna'}</span></p>
        </section>

        {/* Controles SIMPLIFICADOS */}
        <section className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-6 text-yellow-200">Controles del proyector</h2>
          
          <div className="flex flex-col gap-6">
            {/* 1. Título */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => updateState({ current_view: 'title', current_category_id: null })}
                className={`px-6 py-3 rounded-xl text-lg font-semibold border-2 flex-1 transition-all ${
                  current_view === 'title' 
                    ? 'bg-yellow-400 text-black border-yellow-300 shadow-lg shadow-yellow-500/25' 
                    : 'bg-white/5 border-transparent text-white/90 hover:bg-white/10'
                }`}
              >
                📺 Título
              </button>
            </div>

            {/* 2. Categorías */}
            <div>
              <h3 className="text-md font-semibold mb-4 text-yellow-200">📂 Categorías disponibles:</h3>
              <div className="flex flex-wrap gap-3">
                {categories.map((cat) => (
                  <button 
                    key={cat.id}
                    onClick={() => updateState({ current_view: 'categories', current_category_id: cat.id })}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                      String(current_category_id) === String(cat.id) && current_view === 'categories'
                        ? 'bg-emerald-500 text-black border-emerald-400 shadow-lg shadow-emerald-500/25 scale-105'
                        : 'bg-white/5 border-white/20 text-white/90 hover:bg-white/10 hover:border-white/40 hover:scale-105'
                    }`}
                  >
                    {cat.name || cat.title || cat.display_name || `Cat ${cat.id}`}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Nominados (solo si hay categoría seleccionada) */}
            {current_category_id && (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => updateState({ current_view: 'nominees', current_category_id })}
                  className={`px-6 py-3 rounded-xl text-lg font-semibold border-2 flex-1 transition-all ${
                    current_view === 'nominees'
                      ? 'bg-blue-500 text-black border-blue-400 shadow-lg shadow-blue-500/25'
                      : 'bg-white/5 border-transparent text-white/90 hover:bg-white/10'
                  }`}
                >
                  🏆 Nominados
                </button>
              </div>
            )}

            {/* 4. Ganador (solo si hay categoría seleccionada) */}
            {current_category_id && (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => updateState({ current_view: 'winner', current_category_id })}
                  className={`px-6 py-3 rounded-xl text-lg font-semibold border-2 flex-1 transition-all ${
                    current_view === 'winner'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-400 shadow-lg shadow-purple-500/25'
                      : 'bg-white/5 border-transparent text-white/90 hover:bg-white/10'
                  }`}
                >
                  🎉 Ganador
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ControlPanel;
