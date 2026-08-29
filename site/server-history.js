(function attachServerHistory(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else if (root) {
    root.VozenServerHistory = api;
  }
}(typeof globalThis === 'object' ? globalThis : this, function createServerHistory() {
  function normalizeTimestampMs(value) {
    if (value instanceof Date) {
      const time = value.getTime();
      return Number.isFinite(time) && time > 0 ? time : null;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      if (value <= 0) return null;
      return value < 1e12 ? value * 1000 : value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Date.parse(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    return null;
  }

  function timestampFromGuild(guild) {
    if (!guild || typeof guild !== 'object') return null;
    return normalizeTimestampMs(
      guild.joinedTimestamp ?? guild.joined_timestamp ?? guild.joinedAt ?? guild.joined_at,
    );
  }

  function utcDayKey(value) {
    const timestamp = normalizeTimestampMs(value);
    return timestamp === null ? null : new Date(timestamp).toISOString().slice(0, 10);
  }

  function buildServerJoinHistory(guilds, days) {
    const requestedDays = Array.isArray(days)
      ? days.filter((day) => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day))
      : [];
    const counts = new Map(requestedDays.map((day) => [day, 0]));

    for (const guild of Array.isArray(guilds) ? guilds : []) {
      const day = utcDayKey(timestampFromGuild(guild));
      if (day && counts.has(day)) counts.set(day, counts.get(day) + 1);
    }

    return requestedDays.map((day) => ({ day, count: counts.get(day) || 0 }));
  }

  function countServerJoinsToday(guilds, days) {
    const history = buildServerJoinHistory(guilds, days);
    return history.length ? history[history.length - 1].count : 0;
  }

  function buildGrowthInventorySummary(data, days) {
    const count = (value) => Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : 0;
    const current = count(data && data.currentGuilds);
    const joins = count(data && data.joins);
    const leaves = count(data && data.leaves);
    const baseline = count(data && data.baselineGuilds);
    const net = joins - leaves;
    const startedOn = data && data.measurementStartedOn;
    const validStart = typeof startedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startedOn)
      && Number.isFinite(Date.parse(startedOn + 'T00:00:00Z'))
      && new Date(startedOn + 'T00:00:00Z').toISOString().slice(0, 10) === startedOn;
    const range = count(days);
    const coverage = [range ? range + ' dias selecionados' : 'Período selecionado'];
    if (validStart) {
      coverage.push('Medição desde ' + startedOn.split('-').reverse().join('/'));
    } else {
      coverage.push('Início da medição indisponível');
    }
    if (baseline > 0) {
      coverage.push('Base inicial: ' + baseline + ' servidores, sem datas históricas de entrada');
    }

    return {
      current: String(current),
      detail: (net > 0 ? '+' : '') + net + ' líquido medido · ' + joins + ' entradas · ' + leaves + ' saídas',
      coverage: coverage.join(' · '),
    };
  }

  return {
    normalizeTimestampMs,
    timestampFromGuild,
    utcDayKey,
    buildServerJoinHistory,
    countServerJoinsToday,
    buildGrowthInventorySummary,
  };
}));
