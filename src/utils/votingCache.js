const VOTED_KEY = 'iec_voted1';

export const getVotedCategories = () => {
  try {
    const raw = localStorage.getItem(VOTED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const hasVotedCategory = (categoryId) => {
  const list = getVotedCategories();
  return list.includes(categoryId);
};

export const markCategoryVoted = (categoryId) => {
  const list = getVotedCategories();
  if (!list.includes(categoryId)) {
    list.push(categoryId);
    localStorage.setItem(VOTED_KEY, JSON.stringify(list));
  }
};
