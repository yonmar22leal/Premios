import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../services/supabase.js';
import drumrollSfx from '../../assets/audio/drumroll.mp3';
import winnerSfx from '../../assets/audio/winner.mp3';

const WinnerView = ({ category, onBackToNominees }) => {
  const [winners, setWinners] = useState([]);   // [{ id, name, img_url, votes }]
  const [loading, setLoading] = useState(true);
  const [isTie, setIsTie] = useState(false);
  const [stage, setStage] = useState('counting'); // 'counting' | 'revealed'
  const [totalVotes, setTotalVotes] = useState(0);

  // para no recalcular siempre la misma categoría
  const lastCategoryIdRef = useRef(null);

  // 1) Traer votos y calcular ganadores SOLO cuando cambia de categoría
  useEffect(() => {
    if (!category) return;

    // si ya calculamos esta categoría y no estamos en loading, no recalcules
    if (lastCategoryIdRef.current === category.id && !loading) return;

    const fetchWinner = async () => {
      setLoading(true);

      const { data: votes, error: votesError } = await supabase
        .from('votes')
      .select('nominee_id')
      .eq('category_id', category.id);

      if (votesError) {
        console.error('Error votes:', votesError);
        setWinners([]);
        setTotalVotes(0);
        setIsTie(false);
        setLoading(false);
        return;
      }

      if (!votes || votes.length === 0) {
        setWinners([]);
        setTotalVotes(0);
        setIsTie(false);
        setLoading(false);
        return;
      }

      const counts = {};
      votes.forEach((v) => {
        counts[v.nominee_id] = (counts[v.nominee_id] || 0) + 1;
      });

      const total = votes.length;
      setTotalVotes(total);

      const maxVotes = Math.max(...Object.values(counts));
      const winnerIds = Object.entries(counts)
        .filter(([, count]) => count === maxVotes)
        .map(([id]) => Number(id));

      setIsTie(winnerIds.length > 1);

      const { data: nomineesData, error: nomineesError } = await supabase
        .from('nominees')
        .select('id, name, img_url')
        .in('id', winnerIds);

      if (nomineesError) {
        console.error('Error nominees:', nomineesError);
        setWinners([]);
        setLoading(false);
        return;
      }

      const withCounts = (nomineesData || []).map((n) => ({
        ...n,
        votes: counts[n.id] || 0,
      }));

      setWinners(withCounts);
      lastCategoryIdRef.current = category.id; // marcamos la categoría como calculada
      setLoading(false);
    };

    fetchWinner();
  }, [category]); // se ejecuta cuando cambia la referencia de category

  // 2) Sonidos + cambio de etapa, solo cuando ya hay winners nuevos
  useEffect(() => {
    if (loading) return;
    if (!winners || winners.length === 0) return;

    // etapa inicial: contando votos con redoble
    setStage('counting');

    const drum = new Audio(drumrollSfx);
    drum.play().catch(() => {});

    const t = setTimeout(() => {
      const win = new Audio(winnerSfx);
      win.play().catch(() => {});
      setStage('revealed');
    }, 5000); // 5s de redoble

    return () => clearTimeout(t);
  }, [loading, winners]);

  if (!category) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-2xl">No hay categoría seleccionada.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-2xl">Calculando votos...</p>
      </div>
    );
  }

  if (!winners || winners.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-2xl">Aún no hay votos para esta categoría.</p>
      </div>
    );
  }

  const titleText =
    stage === 'counting'
      ? 'Contando los votos...'
      : isTie
      ? '¡Es un empate!'
      : 'Y el ganador es...';

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Luces/fondo opcional */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.35),transparent),radial-gradient(circle_at_bottom,rgba(56,189,248,0.35),transparent)] opacity-80" />
      
      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-4xl">
        <p className="text-sm md:text-base uppercase tracking-[0.4em] text-slate-200/80 mb-3">
          {stage === 'revealed'
            ? isTie
              ? '¡Es un empate!'
              : 'Y el ganador es...'
            : ''} {/* vacío mientras cuenta */}
        </p>

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-yellow-300 drop-shadow mb-6">
          {category.name}
        </h1>

        {/* Ganadores SOLO cuando ya se reveló */}
        {stage === 'revealed' && (
          <div className="flex flex-wrap justify-center gap-8 mt-4">
            {winners.map((winner) => {
              const percentage =
                totalVotes > 0
                  ? Math.round((winner.votes / totalVotes) * 100)
                  : 0;

              return (
                <div
                  key={winner.id}
                  className="flex flex-col items-center transition-all duration-700"
                >
                  <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-[6px] border-yellow-300 shadow-[0_0_40px_rgba(250,204,21,0.9)] mb-4">
                    <img
                      src={winner.img_url}
                      alt={winner.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <h2 className="text-xl md:text-2xl font-extrabold text-white">
                    {winner.name}
                  </h2>

                  {/* Mini gráfica de votos */}
                  <div className="mt-3 w-44">
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>{winner.votes} votos</span>
                      <span>{percentage}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-400 via-amber-300 to-emerald-400"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={onBackToNominees}
          className="mt-10 px-6 py-3 rounded-2xl bg-white/10 border border-white/30 text-sm md:text-base hover:bg-white/20 transition"
        >
          Volver a nominados
        </button>
      </div>

      {/* Overlay central durante el redoble */}
      {stage === 'counting' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-4xl md:text-5xl font-extrabold text-yellow-200/80 drop-shadow animate-pulse">
            Contando los votos...
          </span>
        </div>
      )}
    </div>
  );
};

export default WinnerView;
