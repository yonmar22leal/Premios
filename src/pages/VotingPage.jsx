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

  // cargar categorías
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        setCategories(data);
        const firstId = data[0].id;
        setSelectedCategoryId(firstId);
        setAlreadyVoted(hasVotedCategory(firstId));
      } else {
        setCategories([]);
      }

      setLoadingCategories(false);
    };

    fetchCategories();
  }, []);

  // cuando cambia de categoría, cargar nominados y chequear si ya votó
  useEffect(() => {
    if (!selectedCategoryId) return;

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

    // revisar cache local
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
      // user_id: si luego usas auth, pones el id de usuario aquí
    });

    if (error) {
      console.error(error);
      setMessage('Hubo un error al registrar tu voto. Inténtalo de nuevo.');
      setSendingVote(false);
      return;
    }

    // marcar en cache que ya votó en esta categoría
    markCategoryVoted(selectedCategoryId);
    setAlreadyVoted(true);
    setMessage('¡Voto registrado! Gracias por participar.');
    setSendingVote(false);
  };

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
        {/* Selector de categoría */}
        <div>
          <label className="block text-sm text-slate-300 mb-1">
            Categoría
          </label>

          {/* CAMBIO: solo mostramos "Cargando..." si aún no hay categoría seleccionada */}
          {loadingCategories && !selectedCategoryId ? (
            <p className="text-slate-300">Cargando categorías...</p>
          ) : (
            <select
              value={selectedCategoryId ?? ''}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSelectedCategoryId(id);
              }}
              className="bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-white w-full max-w-md"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Lista de nominados */}
        {loadingNominees ? (
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
        )}

        {/* Mensajes */}
        {sendingVote && (
          <div className="mt-2 text-sky-300 text-sm">
            Enviando tu voto...
          </div>
        )}
        {message && (
          <div className="mt-2 text-emerald-400 font-semibold">
            {message}
          </div>
        )}
      </main>
    </div>
  );
};

export default VotingPage;
