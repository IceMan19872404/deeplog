// Groups rows that belong to several dives into a Map keyed by String(dive_id),
// keeping their query order. Used by the batch loaders that attach buddies and
// photos to a page of dives in one query each (no N+1).
function groupByDive(rows, mapRow = (row) => row) {
  const grouped = new Map();
  rows.forEach((row) => {
    const key = String(row.dive_id);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(mapRow(row));
  });
  return grouped;
}

module.exports = { groupByDive };
