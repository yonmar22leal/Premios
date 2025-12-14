// ControlPanel.jsx - VERSIÓN CORREGIDA Y COMPLETA
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase.js';
import drumrollSfx from '/audio/drumroll.mp3';
import winnerSfx from '/audio/winner.mp3';

const ControlPanel = () => {
  const [state, setState] = useState(null);
  const [categories, setCategories] = useState([]);
  const [nomineesList, setNomineesList] = useState([]);
  const [loadingState, setLoadingState] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Carga inicial de datos
  useEffect(() => {
    const load = async () => {
      setLoadingState(true);
      setErrorMsg('');

      // Estado de presentación
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

      // Categorías
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
  }, []);

  // Suscripción realtime al estado
  useEffect(() => {
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

    const controlChan = supabase
      .channel('presentation_control')
      .on('broadcast', { event: 'refresh' }, (payload) => {
        console.log('REFRESH recibido', payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(controlChan);
    };
  }, []);

  // Cargar nominados cuando cambie la categoría
  useEffect(() => {
    const loadNoms = async () => {
      if (!state || !state.current_category_id) {
        setNomineesList([]);
        return;
      }

      try {
        const { data: joins, error: joinsError } = await supabase
          .from('nominee_categories')
          .select('nominee_id')
          .eq('category_id', state.current_category_id);

        if (joinsError) {
          console.error('Error nominee_categories', joinsError);
          setNomineesList([]);
          return;
        }

        const ids = joins.map((j) => j.nominee_id);
        if (!ids || ids.length === 0) {
          setNomineesList([]);
          return;
        }

        const { data: noms, error: nomsError } = await supabase
          .from('nominees')
          .select('id, name, img_url, video_url')
          .in('id', ids);

        if (nomsError) {
          console.error('Error loading nominees for control panel', nomsError);
          setNomineesList([]);
          return;
        }

        setNomineesList(noms || []);
      } catch (e) {
        console.error('Error loading nominees', e);
        setNomineesList([]);
      }
    };

    loadNoms();
  }, [state]);

  // Función para actualizar estado
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

      // Enviar broadcast refresh
      try {
        const existing = supabase.getChannels().find(c => c.topic === 'presentation_control');
        if (existing) {
          if (typeof existing.httpSend === 'function') {
            await existing.httpSend('refresh', { ts: new Date().toISOString() });
          } else {
            existing.send({ type: 'broadcast', event: 'refresh', payload: { ts: new Date().toISOString() } });
          }
        }
      } catch (bErr) {
        console.warn('[ControlPanel] No se pudo enviar broadcast de control', bErr);
      }
    }

    setLoadingAction(false);
  };

  // ✅ FUNCIÓN CORREGIDA PARA PRESENTAR VIDEO
  const presentNominee = async (nominee) => {
    if (!nominee?.video_url) {
      console.warn('No hay video para este nominada');
      return;
    }

    try {
      console.log('[ControlPanel] Enviando present_nominee:', nominee);
      
      const chan = supabase.channel('presentation_control');
      await chan.subscribe();

      // ✅ FORMATO CONSISTENTE: siempre payload = { nominee: {...} }
      const payload = { nominee };

      if (typeof chan.httpSend === 'function') {
        // httpSend(event, payload)
        await chan.httpSend('present_nominee', payload);
      } else {
        // send({ type, event, payload })
        await chan.send({ 
          type: 'broadcast', 
          event: 'present_nominee', 
          payload 
        });
      }

      await supabase.removeChannel(chan);
      console.log('[ControlPanel] Broadcast present_nominee enviado correctamente');
    } catch (e) {
      console.error('Error enviando present_nominee:', e);
    }
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

        {/* Controles */}
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
              <div className="flex gap-3 mb-3">
                <button
                  onClick={() => updateState({ current_view: 'category', current_category_id: null })}
                  className={`px-4 py-2 rounded-lg text-sm bg-white/5 border hover:bg-white/10`}
                >
                  Ver todas las categorías
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {categories.map((cat) => (
                  <button 
                    key={cat.id}
                    onClick={() => updateState({ current_view: 'category', current_category_id: cat.id })}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                      String(current_category_id) === String(cat.id) && (current_view === 'voting' || current_view === 'nominees')
                        ? 'bg-emerald-500 text-black border-emerald-400 shadow-lg shadow-emerald-500/25 scale-105'
                        : 'bg-white/5 border-white/20 text-white/90 hover:bg-white/10 hover:border-white/40 hover:scale-105'
                    }`}
                  >
                    {cat.name || cat.nombre || cat.title || cat.display_name || `Cat ${cat.id}`}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Nominados */}
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

            {/* Lista de nominados con botón de presentación CORREGIDO */}
            {current_category_id && (
              <div className="mt-4 bg-slate-900/70 border border-slate-700 rounded-2xl p-4">
                <h3 className="text-md font-semibold mb-3 text-yellow-200">🎬 Presentaciones de nominados</h3>
                {nomineesList.length === 0 ? (
                  <p className="text-sm text-slate-300">No hay nominados con presentaciones en esta categoría.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {nomineesList.map((n) => (
                      <div key={n.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                        <div className="w-12 h-12 rounded-md overflow-hidden bg-black/40 border border-white/10">
                          {n.img_url ? (
                            <img src={n.img_url} alt={n.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">No image</div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{n.name}</div>
                          <div className="text-xs text-slate-400">
                            {n.video_url ? '✅ Con presentación' : '❌ Sin presentación'}
                          </div>
                        </div>
                        <button
                          onClick={() => presentNominee(n)} // ✅ FUNCIÓN CORREGIDA
                          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                            n.video_url 
                              ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-md hover:scale-105' 
                              : 'bg-white/5 text-white/60 cursor-not-allowed'
                          }`}
                          disabled={!n.video_url}
                        >
                          ▶ Presentar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. Ganador */}
            {current_category_id && (
              <div className="flex items-center gap-4">
                <button 
                  onClick={async () => {
                    // 1) Cambiar a results
                    await updateState({ current_view: 'results', current_category_id });
                    
                    // 2) Reproducir sonidos (después de interacción del usuario)
                    const drum = new Audio(drumrollSfx);
                    drum.play().catch(console.error);

                    setTimeout(() => {
                      const win = new Audio(winnerSfx);
                      win.play().catch(console.error);
                    }, 5000);
                  }}
                  className={`px-6 py-3 rounded-xl text-lg font-semibold border-2 flex-1 transition-all ${
                    current_view === 'results'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-400 shadow-lg shadow-purple-500/25'
                      : 'bg-white/5 border-transparent text-white/90 hover:bg-white/10'
                  }`}
                >
                  🎉 Revelar Ganador
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
