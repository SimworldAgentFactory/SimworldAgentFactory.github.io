/* CSV-driven evaluation loader + lightweight formatters for home results */

(function () {
  function parseCSV(text) {
    const rows = [];
    let current = '';
    let row = [];
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current);
        current = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && next === '\n') {
          index += 1;
        }
        row.push(current);
        if (row.some((cell) => cell.trim() !== '')) {
          rows.push(row);
        }
        row = [];
        current = '';
      } else {
        current += char;
      }
    }

    if (current.length > 0 || row.length > 0) {
      row.push(current);
      if (row.some((cell) => cell.trim() !== '')) {
        rows.push(row);
      }
    }

    if (rows.length === 0) {
      return [];
    }

    const headers = rows[0].map((header) => header.trim().toLowerCase());
    return rows.slice(1).map((cells) => {
      const record = {};
      headers.forEach((header, idx) => {
        record[header] = (cells[idx] || '').trim();
      });
      return record;
    });
  }

  function toRgb(color) {
    return {
      r: Number(color.r),
      g: Number(color.g),
      b: Number(color.b),
    };
  }

  function colorFormatter(value, formatterParams) {
    if (value === '-' || value === '' || value === null || value === undefined) {
      return '-';
    }

    const defaults = {
      min: 0.0,
      max: 100.0,
      startColor: { r: 255, g: 255, b: 255 },
      endColor: { r: 224, g: 236, b: 255 },
    };

    const min = (formatterParams && formatterParams.min) || defaults.min;
    const max = (formatterParams && formatterParams.max) || defaults.max;
    const startColor = toRgb((formatterParams && formatterParams.startColor) || defaults.startColor);
    const endColor = toRgb((formatterParams && formatterParams.endColor) || defaults.endColor);
    const numeric = Number(value);
    const ratio = Math.max(0, Math.min(1, (numeric - min) / (max - min || 1)));

    const red = Math.floor(startColor.r + (endColor.r - startColor.r) * ratio);
    const green = Math.floor(startColor.g + (endColor.g - startColor.g) * ratio);
    const blue = Math.floor(startColor.b + (endColor.b - startColor.b) * ratio);
    const shown = Number.isFinite(numeric) ? numeric.toFixed(1) : value;

    return "<span style='display:block;width:100%;height:100%;background-color: rgb(" +
      red + ", " + green + ", " + blue + ");'>" + shown + "</span>";
  }

  function chartFormatter(values, formatterParams) {
    const sequence = Array.isArray(values) ? values : [values];
    const invert = formatterParams && formatterParams.invert;
    const formatted = sequence.map((value) => (invert ? Number(value) * -1 : Number(value)));
    const min = (formatterParams && formatterParams.min) || 0;
    const max = (formatterParams && formatterParams.max) || 100;

    return formatted.map((value) => {
      const pct = Math.max(0, Math.min(100, ((value - min) / (max - min || 1)) * 100));
      return "<span style='display:inline-block;height:8px;width:" + pct.toFixed(1) +
        "%;background:#7aa2d6;margin:0 2px 0 0;border-radius:999px;'></span>";
    }).join('');
  }

  function toHomeEval(rows) {
    const validRows = rows.filter((row) => row.environment && row.agent);
    if (validRows.length === 0) {
      return null;
    }

    const allowedEnvs = new Map([
      ['Minigrid', { id: 'Minigrid', label: 'MiniGrid' }],
      ['ALFWorld', { id: 'ALFWorld', label: 'ALFWorld' }],
      ['DeliveryBench', { id: 'DeliveryBench', label: 'DeliveryBench' }],
      ['THOR', { id: 'RoboThor' }],
      ['RoboThor', { id: 'RoboThor', label: 'RoboThor' }],
    ]);
    const envIndex = new Map();
    const methodsByEnv = {};

    validRows.forEach((row) => {
      const envMeta = allowedEnvs.get(row.environment);
      if (!envMeta) {
        return;
      }

      const environment = envMeta.id;
      if (!envIndex.has(environment)) {
        envIndex.set(environment, {
          id: environment,
          label: envMeta.label || environment,
          offset: 0,
        });
      }
      if (!methodsByEnv[environment]) {
        methodsByEnv[environment] = [];
      }

      methodsByEnv[environment].push({
        name: row.agent,
        score: Number(row.score || 0),
        reasoning: row.reasoning || 'N/A',
        memory: row.memory || 'N/A',
        reflection: row.reflection || 'N/A',
      });
    });

    if (envIndex.size === 0) {
      return null;
    }

    return {
      envs: Array.from(envIndex.values()),
      methodsByEnv,
      variation: [],
      methods: [],
    };
  }

  async function loadHomeEvalData(csvPath) {
    const response = await fetch(csvPath, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Failed to load CSV: ' + csvPath);
    }
    const text = await response.text();
    const rows = parseCSV(text);
    return toHomeEval(rows);
  }

  window.HomeEvalCsv = {
    chartFormatter,
    colorFormatter,
    loadHomeEvalData,
  };
})();
