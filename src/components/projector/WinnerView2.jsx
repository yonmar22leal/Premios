// WinnerView2.jsx - REALTIME SIN RESETS
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../../services/supabase.js';

const WinnerView2 = ({ category }) => {
  const [nominees, setNominees] = useState([]);
  const [votes, setVotes] = useState({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);
  const isInitializedRef = useRef(false);

  // 1) CARGAR NOMINADOS (UNA SOLA VEZ)
  useEffect(() => {
    if (!category?.id) return;

    const loadNominees = async () => {
      setLoading(true);
      try {
        const { data: joins } = await supabase
          .from('nominee_categories')
          .select('nominee_id')
          .eq('category_id', category.id);

        if (joins?.length) {
          const nomineeIds = joins.map(j => j.nominee_id);
          const { data } = await supabase
            .from('nominees')
            .select('id, name, img_url')
            .in('id', nomineeIds);
          setNominees(data || []);
        } else {
          setNominees([]);
        }
      } catch (err) {
        console.error('Error nominees:', err);
      } finally {
        setLoading(false);
      }
    };

    loadNominees();
  }, [category?.id]);

  // 2) INICIALIZAR VOTOS + REALTIME (SIN POLLING)
  useEffect(() => {
    if (!category?.id || loading || isInitializedRef.current) return;

    const initializeVotes = async () => {
      console.log('📊 Inicializando votos...');
      
      const { data, error, count } = await supabase
        .from('votes')
        .select('nominee_id', { count: 'exact', head: true })
        .eq('category_id', category.id);

      if (error) {
        console.error('Error init votes:', error);
        return;
      }

      const counts = {};
      data?.forEach(v => {
        counts[v.nominee_id] = (counts[v.nominee_id] || 0) + 1;
      });

      console.log('🎯 Votos iniciales:', counts, 'Total:', count);
      
      setVotes(counts);
      setTotalVotes(count || 0);
      isInitializedRef.current = true;
    };

    initializeVotes();

    // 3) CANAL REALTIME (SIN POLLING)
    channelRef.current = supabase
      .channel(`votes_live_${category.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
          filter: `category_id=eq.${category.id}`
        },
        (payload) => {
          console.log('🔥 VOTO NUEVO LIVE:', payload.new);
          const nomineeId = Number(payload.new.nominee_id);
          
          setVotes(prevVotes => {
            const newVotes = {
              ...prevVotes,
              [nomineeId]: (prevVotes[nomineeId] || 0) + 1
            };
            console.log('📈 Nuevo estado votos:', newVotes);
            return newVotes;
          });
          
          setTotalVotes(prevTotal => {
            const newTotal = prevTotal + 1;
            console.log('📊 Total actualizado:', newTotal);
            return newTotal;
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Canal realtime:', status);
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [category?.id, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-4xl font-bold animate-pulse">Cargando nominados...</p>
      </div>
    );
  }

  if (!nominees.length) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-4xl">Sin nominados</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen via-slate-900 to-black text-white flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.25),transparent),radial-gradient(circle_at_bottom,rgba(56,189,248,0.25),transparent)] opacity-80" />
      
      <div className="relative z-10 text-center px-4 max-w-7xl w-full">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-yellow-400 drop-shadow-2xl mb-12 tracking-tight">
          {category.name}
        </h1>
        
        <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent bg-black/70 px-12 py-6 rounded-3xl mb-20 shadow-2xl border-4 border-emerald-400/50">
          {totalVotes.toLocaleString()} {totalVotes === 1 ? 'voto' : 'votos'} EN VIVO
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 w-full">
          {nominees.map((nominee) => {
            const nomineeVotes = votes[nominee.id] || 0;
            const percentage = totalVotes > 0 ? Math.round((nomineeVotes / totalVotes) * 100) : 0;
            const maxVotes = Math.max(...Object.values(votes), 0);
            const isLeader = nomineeVotes === maxVotes && nomineeVotes > 0;

            return (
              <div key={nominee.id} className="flex flex-col items-center group">
                {/* FOTO CON LÍDER */}
                <div className={`relative w-44 h-44 md:w-52 md:h-52 lg:w-60 lg:h-60 rounded-full overflow-hidden border-8 shadow-2xl transition-all duration-1000 mb-10 ${
                  isLeader 
                    ? 'border-yellow-400 shadow-yellow-500/70 scale-110 ring-4 ring-yellow-400/50' 
                    : 'border-slate-800/60 hover:border-yellow-400/60 hover:scale-105 hover:shadow-yellow-500/30'
                }`}>
                  <img 
                    src={nominee.img_url} 
                    alt={nominee.name} 
                    className="w-full h-full object-cover" 
                  />
                  {isLeader && (
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-4xl shadow-2xl animate-pulse border-4 border-white/80">
                      🏆
                    </div>
                  )}
                </div>

                {/* NOMBRE */}
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-8 px-6 text-center leading-tight drop-shadow-xl">
                  {nominee.name}
                </h2>

                {/* BARRA VERTICAL SUAVE */}
                <div className="w-32 md:w-40 lg:w-48 h-96 md:h-[500px] bg-gradient-to-t from-slate-900/80 to-slate-800/50 rounded-3xl p-6 flex flex-col-reverse relative shadow-2xl group-hover:shadow-yellow-500/40 border border-slate-700/50">
                  <div
                    className="w-full bg-gradient-to-t from-emerald-500 via-lime-400 to-yellow-500 rounded-2xl shadow-[0_20px_60px_rgba(34,197,94,0.8)] transition-all duration-2000 ease-out origin-bottom"
                    style={{
                      height: `${Math.min(percentage * 3.5, 98)}%`,
                      opacity: nomineeVotes > 0 ? 1 : 0.3
                    }}
                  />
                  
                  {/* NÚMEROS */}
                  <div className="absolute inset-0 flex flex-col justify-between py-6 px-3 pointer-events-none">
                    <span className={`text-right font-black text-3xl md:text-4xl drop-shadow-2xl ${
                      isLeader ? 'text-yellow-400 animate-pulse' : 'text-white'
                    }`}>
                      {nomineeVotes}
                    </span>
                    <span className="text-right text-xl md:text-2xl text-slate-300 font-mono tracking-wider">
                      {percentage}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WinnerView2;
