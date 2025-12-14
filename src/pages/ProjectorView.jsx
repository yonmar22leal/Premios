// ProjectorView.jsx - VERSIÓN CORREGIDA Y COMPLETA
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase.js';
import TitleScreen from '../components/projector/TitleScreen.jsx';
import CategoriesView from '../components/projector/CategoriesView.jsx';
import NomineesView from '../components/projector/NomineesView.jsx';
import WinnerView from '../components/projector/WinnerView.jsx';
import PresentationView from '../components/projector/PresentationView.jsx';

const ProjectorView = () => {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nominees, setNominees] = useState(null); // null = aún no cargados, [] = cargados vacío
  const [remotePresentation, setRemotePresentation] = useState(null);

  const cacheRef = useRef({});
  const lastCategoryRef = useRef(null);

  // Cache inicial para categories
  if (!cacheRef.current.categories) cacheRef.current.categories = {};

  // Fetch inicial
  useEffect(() => {
    fetchState(true);
  }, []);

  // Broadcast + polling
  useEffect(() => {
    const channel = supabase.channel('presentation_control');

    // Refresh events
    channel.on('broadcast', { event: 'refresh' }, () => {
      console.log('[ProjectorView] refresh recibido');
      fetchState(false);
    });

    // ✅ PRESENT_NOMINEE CORREGIDO - Parsing simple y directo
    channel.on('broadcast', { event: 'present_nominee' }, (payload) => {
      console.log('[ProjectorView] present_nominee recibido:', payload);
      
      try {
        let nominee = null;
        
        // Caso 1: httpSend('present_nominee', { nominee: {...} })
        if (payload.nominee) {
          nominee = payload.nominee;
        }
        // Caso 2: send({ type: 'broadcast', event: 'present_nominee', payload: { nominee: {...} } })
        else if (payload.payload?.nominee) {
          nominee = payload.payload.nominee;
        }
        
        console.log('[ProjectorView] nominee extraído:', nominee);
        
        if (nominee && nominee.video_url) {
          console.log('[ProjectorView] Mostrando presentación:', nominee.video_url);
          setRemotePresentation(nominee);
        } else {
          console.warn('[ProjectorView] No hay video_url válido:', nominee?.video_url);
        }
      } catch (e) {
        console.error('[ProjectorView] Error parsing nominee:', e, payload);
      }
    });

    channel.subscribe();

    const interval = setInterval(() => {
      fetchState(false);
    }, 500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const fetchState = async (isInitial) => {
    try {
      if (isInitial) setLoading(true);

      const { data: stateData, error } = await supabase
        .from('presentation_state')
        .select('*')
        .eq('id', 1)
        .single();

      if (error || !stateData) {
        console.error('Error al obtener presentation_state', error);
        if (isInitial) setLoading(false);
        return;
      }

      // Evitar re-renders innecesarios
      if (JSON.stringify(stateData) === JSON.stringify(state)) {
        if (isInitial) setLoading(false);
        return;
      }

      setState(stateData);

      const { current_view, current_category_id } = stateData;

      // Cachear nombre de categoría
      if (current_category_id && !cacheRef.current.categories[current_category_id]) {
        loadCategoryName(current_category_id).catch((e) => console.warn('loadCategoryName error', e));
      }

      if ((current_view === 'nominees' || current_view === 'voting') && current_category_id) {
        lastCategoryRef.current = current_category_id;
        await loadNominees(current_category_id);
      } else {
        setNominees(null);
      }

      if (isInitial) setLoading(false);
    } catch (err) {
      console.error('Error en fetchState', err);
      if (isInitial) setLoading(false);
    }
  };

  const loadNominees = async (categoryId) => {
    if (cacheRef.current[categoryId]) {
      setNominees(cacheRef.current[categoryId]);
      return;
    }

    try {
      const { data: joins, error: joinsError } = await supabase
        .from('nominee_categories')
        .select('nominee_id')
        .eq('category_id', categoryId);

      if (joinsError) {
        console.error('Error nominee_categories', joinsError);
        setNominees([]);
        cacheRef.current[categoryId] = [];
        return;
      }

      if (!joins || joins.length === 0) {
        setNominees([]);
        cacheRef.current[categoryId] = [];
        return;
      }

      const nomineeIds = joins.map((j) => j.nominee_id);

      const { data: nomineesData, error: nomineesError } = await supabase
        .from('nominees')
        .select('id, name, img_url, video_url')
        .in('id', nomineeIds);

      if (nomineesError) {
        console.error('Error nominees', nomineesError);
        setNominees([]);
        cacheRef.current[categoryId] = [];
        return;
      }

      const result = nomineesData || [];
      setNominees(result);
      cacheRef.current[categoryId] = result;
    } catch (err) {
      console.error('Error loadNominees', err);
      setNominees([]);
      cacheRef.current[categoryId] = [];
    }
  };

  const loadCategoryName = async (categoryId) => {
    if (cacheRef.current.categories[categoryId]) return cacheRef.current.categories[categoryId];

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('id', categoryId)
        .single();

      if (error || !data) {
        console.warn('No se encontró categoría', error);
        cacheRef.current.categories[categoryId] = { id: categoryId, name: `Categoría ${categoryId}` };
        return cacheRef.current.categories[categoryId];
      }

      cacheRef.current.categories[categoryId] = data;
      return data;
    } catch (err) {
      console.error('Error loadCategoryName', err);
      cacheRef.current.categories[categoryId] = { id: categoryId, name: `Categoría ${categoryId}` };
      return cacheRef.current.categories[categoryId];
    }
  };

  if (loading || !state) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-2xl">Preparando presentación...</p>
      </div>
    );
  }

  const { current_view, current_category_id } = state;

  // ✅ PRIORIDAD 1: Remote presentation (interrumpe todo)
  if (remotePresentation) {
    console.log('[ProjectorView] Renderizando PresentationView');
    return (
      <PresentationView
        nominee={remotePresentation}
        onEnd={() => {
          console.log('[ProjectorView] Presentation terminada');
          setRemotePresentation(null);
        }}
      />
    );
  }

  // Vista título
  if (current_view === 'title') return <TitleScreen />;

  // Vista categorías
  if (current_view === 'category') {
    if (current_category_id) {
      const cat = cacheRef.current.categories[current_category_id];
      if (!cat) {
        return (
          <div className="min-h-screen bg-black text-white flex items-center justify-center">
            <p className="text-2xl">Cargando categoría...</p>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-[url('/images/3.png')] bg-cover bg-center via-slate-900 to-black text-white flex flex-col items-center justify-center">
          <h1 className="text-10xl md:text-9xl font-extrabold text-[#eccf58] mb-4 drop-shadow-2xl font-sans [-webkit-text-stroke:2px_rgba(0,0,0,0.8)] text-center mt-20">
            {cat.name}
          </h1>
          <p className="text-4xl text-slate-300"></p>
        </div>
      );
    }
    return <CategoriesView />;
  }

  // Vista nominados/votación
  if (current_view === 'nominees' || current_view === 'voting') {
    const cat = cacheRef.current.categories[current_category_id] || { 
      id: current_category_id, 
      name: `Categoría ${current_category_id}` 
    };
    return (
      <NomineesView
        category={cat}
        nominees={nominees}
      />
    );
  }

  // Vista ganador
  if (current_view === 'results' || current_view === 'winner') {
    const cat = cacheRef.current.categories[current_category_id] || { 
      id: current_category_id, 
      name: `Categoría ${current_category_id}` 
    };
    return <WinnerView category={cat} />;
  }

  // Fallback
  return <TitleScreen />;
};

export default ProjectorView;
