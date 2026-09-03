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

  function strictUtcDay(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const timestamp = Date.parse(value + 'T00:00:00Z');
    if (!Number.isFinite(timestamp)) return null;
    return new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : null;
  }

  function buildGrowthInventorySummary(data, days) {
    const count = (value) => Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : 0;
    const current = count(data && data.currentGuilds);
    const joins = count(data && data.joins);
    const leaves = count(data && data.leaves);
    const baseline = count(data && data.baselineGuilds);
    const net = joins - leaves;
    const startedOn = data && data.measurementStartedOn;
    const validStart = strictUtcDay(startedOn) !== null;
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

  function buildGrowthPeriodNote(data, days, today) {
    const startedOn = data && data.measurementStartedOn;
    const startTimestamp = strictUtcDay(startedOn);
    const todayKey = today || new Date().toISOString().slice(0, 10);
    const todayTimestamp = strictUtcDay(todayKey);
    const selectedDays = Number.isFinite(Number(days)) ? Math.max(0, Math.trunc(Number(days))) : 0;
    const scope = ' Os valores grandes mostram o estado atual; o período filtra entradas, saídas, configurações novas, primeiro valor e origens.';

    if (startTimestamp === null || todayTimestamp === null || todayTimestamp < startTimestamp) {
      return {
        historyDays: null,
        includesFullHistory: false,
        message: 'O início da medição está indisponível.' + scope,
      };
    }

    const historyDays = Math.floor((todayTimestamp - startTimestamp) / 86400000) + 1;
    if (historyDays <= 7) {
      return {
        historyDays,
        includesFullHistory: true,
        message: 'Histórico medido: ' + historyDays + (historyDays === 1 ? ' dia. ' : ' dias. ')
          + 'Neste momento, 7, 30 e 90 dias abrangem os mesmos dados.' + scope,
      };
    }
    if (selectedDays >= historyDays) {
      return {
        historyDays,
        includesFullHistory: true,
        message: 'Histórico medido: ' + historyDays + ' dias. Os ' + selectedDays
          + ' dias selecionados abrangem todo o histórico medido.' + scope,
      };
    }
    return {
      historyDays,
      includesFullHistory: false,
      message: 'Histórico medido: ' + historyDays + ' dias. A janela de ' + selectedDays
        + ' dias contém apenas parte desse histórico.' + scope,
    };
  }

  function buildProductConversionFunnel(growth, analytics, product) {
    const count = (value) => Number.isFinite(Number(value))
      ? Math.max(0, Math.trunc(Number(value)))
      : 0;
    const key = product === 'helper' ? 'helper' : 'tts';
    const productVisits = analytics && analytics.productVisits;
    const hasVisits = productVisits
      && Object.prototype.hasOwnProperty.call(productVisits, key)
      && Number.isFinite(Number(productVisits[key]));
    const visits = hasVisits ? count(productVisits[key]) : null;
    const installs = count(growth && growth.joins);
    const setup = count(growth && growth.setupCompleted);
    const firstValue = count(growth && growth.firstValue);
    return {
      denominator: visits !== null && visits > 0 ? visits : installs,
      rows: [
        { label: 'Visitas às páginas do produto', value: visits },
        { label: 'Instalações concluídas', value: installs },
        { label: 'Setup concluído', value: setup },
        { label: 'Primeiro valor', value: firstValue },
      ],
    };
  }

  function buildGrowthDailySeries(daily) {
    const count = (value) => Number.isFinite(Number(value))
      ? Math.max(0, Math.trunc(Number(value)))
      : 0;
    const grouped = new Map();
    for (const point of Array.isArray(daily) ? daily : []) {
      if (!point || strictUtcDay(point.day) === null) continue;
      const row = grouped.get(point.day) || {
        day: point.day,
        joins: 0,
        leaves: 0,
        setupCompleted: 0,
        firstValue: 0,
        active: 0,
        votes: 0,
      };
      row.joins += count(point.joins);
      row.leaves += count(point.leaves);
      row.setupCompleted += count(point.setupCompleted);
      row.firstValue += count(point.firstValue);
      row.active += count(point.active);
      row.votes += count(point.votes);
      grouped.set(point.day, row);
    }
    return [...grouped.values()].sort((left, right) => left.day.localeCompare(right.day));
  }

  return {
    normalizeTimestampMs,
    timestampFromGuild,
    utcDayKey,
    buildServerJoinHistory,
    countServerJoinsToday,
    buildGrowthInventorySummary,
    buildGrowthPeriodNote,
    buildProductConversionFunnel,
    buildGrowthDailySeries,
  };
}));
