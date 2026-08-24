function pagination(query) {
  const limit = Math.min(Math.max(Number.parseInt(query.limit || '0', 10) || 0, 0), 100);
  const offset = Math.max(Number.parseInt(query.offset || '0', 10) || 0, 0);
  return { limit, offset };
}

function page(items, query) {
  const { limit, offset } = pagination(query);
  if (!limit) return items;
  const data = items.slice(offset, offset + limit);
  return { data, nextOffset: offset + data.length < items.length ? offset + data.length : null };
}

module.exports = { pagination, page };
