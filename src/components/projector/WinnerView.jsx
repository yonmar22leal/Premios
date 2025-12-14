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

  return (
    <div className="min-h-screen via-slate-900 bg-[url('/images/2.png')] bg-cover to-black text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Luces/fondo opcional */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.35),transparent),radial-gradient(circle_at_bottom,rgba(56,189,248,0.35),transparent)] opacity-80" />
      
      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-4xl">

        {stage === 'revealed' && (
          <div className="flex flex-col items-center justify-center mt-8 text-center animate-fadeIn mb-16">
            
            {/* ÚNICO MENSAJE: depende de si hay empate */}
            <div className="mb-10">
              {isTie ? (
                <p className="text-4xl md:text-6xl font-extrabold text-yellow-300 drop-shadow-[0_0_20px_rgba(56,189,248,0.9)] mb-10">
                  ¡ES UN EMPATE!
                </p>
              ) : (
                <p className="text-4xl md:text-6xl font-extrabold text-yellow-300 drop-shadow-[0_0_25px_rgba(250,204,21,0.9)] animate-bounce">
                  🎉 ¡Y EL GANADOR ES! 🎉
                </p>
              )}
            </div>

            {/* Ganadores */}
            <div className="flex flex-wrap justify-center gap-12">
              {winners.map((winner) => {
                const percentage =
                  totalVotes > 0
                    ? Math.round((winner.votes / totalVotes) * 100)
                    : 0;

                return (
                  <div
                    key={winner.id}
                    className="flex flex-col items-center text-center transform transition-all duration-700 scale-110 md:scale-125"
                  >
                    <div className="relative w-52 h-52 md:w-72 md:h-72 rounded-full overflow-hidden border-[10px] border-yellow-400 shadow-[0_0_60px_rgba(250,204,21,1)] mb-6">
                      <img
                        src={winner.img_url}
                        alt={winner.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <h2 className="text-3xl md:text-5xl font-extrabold text-white drop-shadow-lg font-sans">
                      {winner.name}
                    </h2>
                    <div className="mt-3 text-xl md:text-2xl text-yellow-100 font-semibold font-sans">
                      {winner.votes} votos — {percentage}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}



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
