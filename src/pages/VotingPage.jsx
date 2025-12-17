import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase.js';
import {
  hasVotedCategory,
  markCategoryVoted,
} from '../utils/votingCache.js';

const VotingPage = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [nominees, setNominees] = useState([]);
  const [selectedNomineeId, setSelectedNomineeId] = useState(null);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingNominees, setLoadingNominees] = useState(false);
  const [sendingVote, setSendingVote] = useState(false);
  const [message, setMessage] = useState('');
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [presentationState, setPresentationState] = useState(null);

  // Cargar categorías
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        setCategories(data);
        // NO seteamos categoría aquí, la trae presentation_state
      } else {
        setCategories([]);
      }

      setLoadingCategories(false);
    };

    fetchCategories();
  }, []);

  // Suscripción realtime al estado de presentación
  useEffect(() => {
    const channel = supabase
      .channel('presentation_state_changes_voting')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'presentation_state',
          filter: 'id=eq.1',
        },
        (payload) => {
          console.log('[VotingPage] UPDATE realtime:', payload.new);
          const st = payload.new;
          setPresentationState(st);
          if (st.current_category_id) {
            setSelectedCategoryId(st.current_category_id);
          } else {
            setSelectedCategoryId(null);
          }
        }
      )
      .subscribe((status) => {
        console.log('[VotingPage] channel status:', status);
      });

    // estado inicial
    (async () => {
      const { data, error } = await supabase
        .from('presentation_state')
        .select('*')
        .eq('id', 1)
        .single();

      if (!error && data) {
        setPresentationState(data);
        if (data.current_category_id) {
          setSelectedCategoryId(data.current_category_id);
        }
      }
    })();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // cuando cambia de categoría, cargar nominados y chequear si ya votó
  useEffect(() => {
    if (!selectedCategoryId) {
      setNominees([]);
      setAlreadyVoted(false);
      return;
    }

    setAlreadyVoted(hasVotedCategory(selectedCategoryId));
    setSelectedNomineeId(null);
    setMessage('');

    const fetchNominees = async () => {
      setLoadingNominees(true);

      const { data: joins, error: joinsError } = await supabase
        .from('nominee_categories')
        .select('nominee_id')
        .eq('category_id', selectedCategoryId);

      if (joinsError) {
        setNominees([]);
        setLoadingNominees(false);
        return;
      }

      const ids = joins.map((j) => j.nominee_id);
      if (ids.length === 0) {
        setNominees([]);
        setLoadingNominees(false);
        return;
      }

      const { data: nomineesData, error: nomineesError } = await supabase
        .from('nominees')
        .select('*')
        .in('id', ids);

      if (nomineesError) {
        setNominees([]);
        setLoadingNominees(false);
        return;
      }

      setNominees(nomineesData || []);
      setLoadingNominees(false);
    };

    fetchNominees();
  }, [selectedCategoryId]);

  const handleVote = async (nomineeId) => {
    if (!selectedCategoryId) return;

    if (hasVotedCategory(selectedCategoryId)) {
      setAlreadyVoted(true);
      setMessage('Ya registraste tu voto en esta categoría.');
      return;
    }

    setSendingVote(true);
    setMessage('');
    setSelectedNomineeId(nomineeId);

    const { error } = await supabase.from('votes').insert({
      category_id: selectedCategoryId,
      nominee_id: nomineeId,
      // user_id si luego usas auth
    });

    if (error) {
      console.error(error);
      setMessage('Hubo un error al registrar tu voto. Inténtalo de nuevo.');
      setSendingVote(false);
      return;
    }

    markCategoryVoted(selectedCategoryId);
    setAlreadyVoted(true);
    setMessage('¡Voto registrado! Gracias por participar.');
    setSendingVote(false);
  };

  const currentCategory = categories.find(
    (cat) => String(cat.id) === String(selectedCategoryId)
  );

  const isCategoryActive =
    presentationState?.current_view === 'voting' ||
    presentationState?.current_view === 'nominees';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="px-6 py-4 border-b border-white/10">
        <h1 className="text-2xl font-bold text-yellow-300">
          Votación Premios IEC 2025
        </h1>
        <p className="text-slate-300 text-sm mt-1">
          Selecciona una categoría y vota por tu nominado favorito.
        </p>
        {alreadyVoted && (
          <p className="text-xs text-emerald-400 mt-1">
            Ya registraste tu voto en esta categoría.
          </p>
        )}
      </header>

      <main className="flex-1 px-6 py-6 flex flex-col gap-6">
        {/* Selector de categoría (solo lectura, sincronizado con panel) */}
        <div>
          <label className="block text-sm text-slate-300 mb-1">
            Categoría {isCategoryActive ? '🎯' : '⏳'}
          </label>

          {loadingCategories ? (
            <p className="text-slate-300">Cargando categorías...</p>
          ) : !categories.length ? (
            <p className="text-slate-300">No hay categorías disponibles.</p>
          ) : !selectedCategoryId ? (
            <div className="bg-slate-900/50 border-2 border-dashed border-slate-600 rounded-xl px-4 py-6 text-center text-slate-400">
              ⏳ Esperando selección de categoría desde el panel de control...
            </div>
          ) : !isCategoryActive ? (
            <div className="bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-white w-full max-w-md text-center">
              <span className="font-semibold text-yellow-300 block">
                {currentCategory?.name || 'Categoría seleccionada'}
              </span>
              <span className="text-xs text-slate-400">
                Esperando modo de votación...
              </span>
            </div>
          ) : (
            <>
              <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-xl px-3 py-2 text-white w-full max-w-md mb-2">
                <span className="font-semibold text-emerald-400 block">
                  🎯 {currentCategory?.name || 'Categoría activa'}
                </span>
                <span className="text-xs text-emerald-300">
                  ¡Votación habilitada!
                </span>
              </div>

              {/* select bloqueado solo para mostrar la lista */}
              <select
                value={selectedCategoryId ?? ''}
                disabled
                className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-slate-400 w-full max-w-md cursor-not-allowed opacity-60"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* Lista de nominados, solo cuando la categoría está activa para votar */}
        {selectedCategoryId && isCategoryActive ? (
          loadingNominees ? (
            <p className="text-slate-300">Cargando nominados...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {nominees.map((nominee) => (
                <button
                  key={nominee.id}
                  onClick={() => handleVote(nominee.id)}
                  disabled={sendingVote || alreadyVoted}
                  className={`group rounded-2xl bg-white/5 border ${
                    selectedNomineeId === nominee.id
                      ? 'border-emerald-400 bg-emerald-500/10'
                      : 'border-white/10'
                  } p-4 flex flex-col items-center text-center hover:bg-white/10 hover:border-yellow-400/60 transition ${
                    alreadyVoted ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-yellow-300 mb-3">
                    <img
                      src={nominee.img_url}
                      alt={nominee.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="font-semibold text-yellow-100">
                    {nominee.name}
                  </span>
                </button>
              ))}

              {!loadingNominees && nominees.length === 0 && (
                <p className="col-span-full text-slate-300">
                  No hay nominados para esta categoría.
                </p>
              )}
            </div>
          )
        ) : selectedCategoryId && !isCategoryActive ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-slate-800 flex items-center justify-center">
              <span className="text-3xl">⏳</span>
            </div>
            <p className="text-slate-400 text-lg">Esperando modo de votación...</p>
            <p className="text-sm text-slate-500 mt-1">
              La categoría está seleccionada pero aún no está habilitada para votar.
            </p>
          </div>
        ) : null}

        {/* Mensajes */}
        {sendingVote && (
          <div className="mt-2 text-sky-300 text-sm">Enviando tu voto...</div>
        )}
        {message && (
          <div className="mt-2 text-emerald-400 font-semibold">{message}</div>
        )}
      </main>
    </div>
  );
};

export default VotingPage;
