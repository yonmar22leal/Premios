// ProjectorView.jsx - estable, sin parpadeos
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase.js';
import TitleScreen from '../components/projector/TitleScreen.jsx';
import CategoriesView from '../components/projector/CategoriesView.jsx';
import NomineesView from '../components/projector/NomineesView.jsx';
import WinnerView from '../components/projector/WinnerView.jsx';

const ProjectorView = () => {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nominees, setNominees] = useState(null); // null = aún no cargados, [] = cargados vacío

  const cacheRef = useRef({});
  const lastCategoryRef = useRef(null);

  // asegurarnos de tener cache para categories
  if (!cacheRef.current.categories) cacheRef.current.categories = {};

  // fetch inicial
  useEffect(() => {
    fetchState(true);
  }, []);

  // broadcast + polling (sin tocar loading)
  useEffect(() => {
    const channel = supabase
      .channel('presentation_control')
      .on('broadcast', { event: 'refresh' }, () => {
        fetchState(false);
      })
      .subscribe();

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

      // si no cambió nada, no hacemos nada
      if (JSON.stringify(stateData) === JSON.stringify(state)) {
        if (isInitial) setLoading(false);
        return;
      }

      setState(stateData);

      // si cambia de vista o categoría, decidimos qué hacer con nominados
      const { current_view, current_category_id } = stateData;

      // cargar nombre de categoría en cache si no lo tenemos
      if (current_category_id && !cacheRef.current.categories[current_category_id]) {
        loadCategoryName(current_category_id).catch((e) => console.warn('loadCategoryName error', e));
      }

      if ((current_view === 'nominees' || current_view === 'voting') && current_category_id) {
        // cargamos siempre (loadNominees hace uso de cache para evitar múltiples fetches)
        lastCategoryRef.current = current_category_id;
        await loadNominees(current_category_id);
      } else {
        // si ya no estamos en voting, dejamos nominees como están o los ponemos null
        setNominees(null);
      }

      if (isInitial) setLoading(false);
    } catch (err) {
      console.error('Error en fetchState', err);
      if (isInitial) setLoading(false);
    }
  };

  const loadNominees = async (categoryId) => {
    // cache
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
        .select('id, name, img_url')
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
    // revisar cache
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

  if (current_view === 'title') return <TitleScreen />;
  if (current_view === 'category') {
    // If a specific category is selected, show a big title screen for it.
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
        <div className="min-h-screen via-slate-900 to-black text-white flex flex-col items-center justify-center">
          <h1 className="text-5xl md:text-7xl font-extrabold text-yellow-300 mb-4">{cat.name}</h1>
          <p className="text-xl text-slate-300">Preparando los nominados...</p>
        </div>
      );
    }

    return <CategoriesView />;
  }

  if (current_view === 'nominees' || current_view === 'voting') {
    const cat = cacheRef.current.categories[current_category_id] || { id: current_category_id, name: `Categoría ${current_category_id}` };
    return (
      <NomineesView
        category={cat}
        nominees={nominees} // null = loading, [] o array = listo
      />
    );
  }

  if (current_view === 'results' || current_view === 'winner') {
    const cat = cacheRef.current.categories[current_category_id] || { id: current_category_id, name: `Categoría ${current_category_id}` };
    return (
      <WinnerView
        category={cat}
      />
    );
  }

  return <TitleScreen />;
};

export default ProjectorView;
