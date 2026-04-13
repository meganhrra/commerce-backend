function paginate(page, limit) {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit) || 12));
  const offset = (p - 1) * l;
  return { page: p, limit: l, offset };
}

function paginationMeta(page, limit, total) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

module.exports = { paginate, paginationMeta };
