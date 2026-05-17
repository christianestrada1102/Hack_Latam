export const translations = {
  es: {
    // Nav
    'nav.dashboard': 'Dashboard',
    'nav.scanner':   'Escáner',
    'nav.intel':     'Feed de Inteligencia',
    'nav.alerts':    'Alertas',
    'nav.tagline':   'inteligencia de amenazas',

    // Page titles (keyed by normalized route — /app prefix stripped)
    'page./':             'Dashboard',
    'page./scanner':      'Escáner de Amenazas',
    'page./intelligence': 'Feed de Inteligencia',
    'page./alerts':       'Alertas',

    // Dashboard
    'dash.threats24h':      'Amenazas Detectadas (24H)',
    'dash.campaigns':       'Campañas Activas',
    'dash.regional':        'Alertas Regionales',
    'dash.avgRisk':         'Riesgo Promedio',
    'dash.vsYesterday':     'vs ayer',
    'dash.liveFeed':        'Feed en Vivo',
    'dash.live':            'vivo',
    'dash.threatMap':       'Mapa de Amenazas — LATAM',
    'dash.incidentsMapped': 'incidentes mapeados',
    'dash.trending':        'Campañas en Tendencia',
    'dash.incidents':       'incidentes',

    // Scanner
    'scanner.title':            'Escáner de Amenazas',
    'scanner.subtitle':         'Analiza URLs, capturas, correos y audio en busca de indicadores de phishing',
    'scanner.tab.image':        'Imagen',
    'scanner.tab.url':          'URL',
    'scanner.tab.text':         'Texto',
    'scanner.tab.audio':        'Audio',
    'scanner.drop.image':       'Suelta la captura o imagen aquí',
    'scanner.drop.audio':       'Suelta el archivo de audio aquí',
    'scanner.drop.browse':      'o haz clic para explorar',
    'scanner.placeholder.url':  'https://enlace-sospechoso.mx/...',
    'scanner.placeholder.text': 'Pega aquí el mensaje sospechoso, correo o SMS...',
    'scanner.analyze':          'Analizar',
    'scanner.demo':             'Probar demo →',
    'scanner.log':              'Registro de Análisis',
    'scanner.newScan':          '← Nueva consulta',
    'scanner.analyzing':        'Analizando amenaza...',
    'scanner.empty1':           'Envía contenido para generar',
    'scanner.empty2':           'una evaluación de amenaza',

    // Analysis log lines
    'log.init':     '» Iniciando pipeline de análisis...',
    'log.features': '» Extrayendo características del contenido...',
    'log.ocr':      '» Ejecutando escaneo OCR con Mistral...',
    'log.classify': '» Clasificando vectores [urgencia / autoridad / coerción]...',
    'log.embed':    '» Calculando embedding semántico (1536 dimensiones)...',
    'log.pgvector': '» Consultando índice de similitud pgvector...',
    'log.similar':  '  ✓ Incidentes similares encontrados en la región.',
    'log.score':    '» Calculando puntuación de riesgo final...',
    'log.done':     '  ✓ Análisis completado.',

    // ThreatReport
    'report.classification': 'Clasificación',
    'report.risk':           'riesgo',
    'report.similar':        'similares',
    'report.vectors':        'Vectores Psicológicos',
    'report.entities':       'Entidades Extraídas',
    'report.actions':        'Acciones Recomendadas',
    'report.authority':      'Suplantación de Autoridad',
    'report.urgency':        'Urgencia',
    'report.coercion':       'Coerción',
    'report.phone':          'teléfono',
    'report.domain':         'dominio',
    'report.tags':           'etiquetas',
    'report.casesIn':        'casos similares detectados en',

    // Panic block
    'panic.title': 'Pausa.',
    'panic.body':  'No transfieras dinero. No compartas contraseñas.',
    'panic.call':  'Llama directamente a tu banco.',

    // Intelligence Feed
    'intel.allRegions': 'Todas las regiones',
    'intel.allTypes':   'Todos los tipos',
    'intel.allRisk':    'Todo riesgo',
    'intel.critical':   'Crítico',
    'intel.high':       'Alto',
    'intel.medium':     'Medio',
    'intel.low':        'Bajo',
    'intel.col.id':     'ID',
    'intel.col.time':   'Hora',
    'intel.col.type':   'Tipo',
    'intel.col.desc':   'Descripción',
    'intel.col.loc':    'Ubicación',
    'intel.col.risk':   'Riesgo',
    'intel.noMatch':    'No se encontraron incidentes con estos filtros',
    'intel.count':      'incidentes',
    'intel.clusters':   'Grupos Activos',
    'intel.spikes':     'Detección de Picos',
    'intel.last':       'últimas',

    // Alerts
    'alerts.title':         'Alertas',
    'alerts.subtitle':      'Detecciones de alta confianza que requieren atención inmediata',
    'alerts.active':        'activas',
    'alerts.view':          'Ver detalles',
    'alerts.filterAll':     'Todas',
    'alerts.filterCritical':'Solo Críticas',
    'alerts.filterHigh':    'Solo Altas',
    'alerts.empty':         'No hay alertas activas',
    'alerts.critical':      'CRÍTICA',
    'alerts.entities':      'Entidades',
    'alerts.campaign':      'Campaña',

    // Dashboard
    'dash.noData':    'Sin datos',
    'dash.noThreats': 'No hay amenazas registradas aún.',

    // Intel additions
    'intel.search':           'Buscar amenazas...',
    'intel.export':           'Exportar CSV',
    'intel.page':             'Página',
    'intel.of':               'de',
    'intel.detail.entities':  'Entidades',
    'intel.detail.emotional': 'Vectores Emocionales',
    'intel.detail.campaign':  'Campaña',
    'intel.detail.actions':   'Acciones Recomendadas',
    'intel.detail.noSelect':  'Selecciona un incidente para ver detalles',

    // Scanner additions
    'scanner.savedToDB':     'Guardado en base de datos',
    'scanner.regionUnknown': 'Región no detectada',
  },

  en: {
    // Nav
    'nav.dashboard': 'Dashboard',
    'nav.scanner':   'Scanner',
    'nav.intel':     'Intel Feed',
    'nav.alerts':    'Alerts',
    'nav.tagline':   'threat intelligence',

    // Page titles (keyed by normalized route — /app prefix stripped)
    'page./':             'Dashboard',
    'page./scanner':      'Threat Scanner',
    'page./intelligence': 'Intelligence Feed',
    'page./alerts':       'Alerts',

    // Dashboard
    'dash.threats24h':      'Threats Detected (24H)',
    'dash.campaigns':       'Active Campaigns',
    'dash.regional':        'Regional Alerts',
    'dash.avgRisk':         'Avg Risk Score',
    'dash.vsYesterday':     'vs yesterday',
    'dash.liveFeed':        'Live Feed',
    'dash.live':            'live',
    'dash.threatMap':       'Threat Map — LATAM',
    'dash.incidentsMapped': 'incidents mapped',
    'dash.trending':        'Trending Campaigns',
    'dash.incidents':       'incidents',

    // Scanner
    'scanner.title':            'Threat Scanner',
    'scanner.subtitle':         'Analyze URLs, screenshots, emails, and audio for phishing indicators',
    'scanner.tab.image':        'Image',
    'scanner.tab.url':          'URL',
    'scanner.tab.text':         'Text',
    'scanner.tab.audio':        'Audio',
    'scanner.drop.image':       'Drop screenshot or image here',
    'scanner.drop.audio':       'Drop audio file here',
    'scanner.drop.browse':      'or click to browse',
    'scanner.placeholder.url':  'https://suspicious-link.mx/...',
    'scanner.placeholder.text': 'Paste suspicious message, email body, or SMS...',
    'scanner.analyze':          'Analyze',
    'scanner.demo':             'Try demo →',
    'scanner.log':              'Analysis Log',
    'scanner.newScan':          '← New scan',
    'scanner.analyzing':        'Analyzing threat...',
    'scanner.empty1':           'Submit content to generate',
    'scanner.empty2':           'a threat assessment',

    // Analysis log lines
    'log.init':     '» Initializing analysis pipeline...',
    'log.features': '» Extracting content features...',
    'log.ocr':      '» Running Mistral OCR scan...',
    'log.classify': '» Classifying threat vectors [urgency / authority / coercion]...',
    'log.embed':    '» Computing semantic embedding (1536-dim)...',
    'log.pgvector': '» Querying pgvector similarity index...',
    'log.similar':  '  ✓ Similar incidents found in region.',
    'log.score':    '» Computing final risk score...',
    'log.done':     '  ✓ Analysis complete.',

    // ThreatReport
    'report.classification': 'Classification',
    'report.risk':           'risk',
    'report.similar':        'similar',
    'report.vectors':        'Psychological Vectors',
    'report.entities':       'Entities Extracted',
    'report.actions':        'Recommended Actions',
    'report.authority':      'Authority Impersonation',
    'report.urgency':        'Urgency',
    'report.coercion':       'Coercion',
    'report.phone':          'phone',
    'report.domain':         'domain',
    'report.tags':           'tags',
    'report.casesIn':        'similar cases detected in',

    // Panic block
    'panic.title': 'Stop.',
    'panic.body':  "Don't transfer money. Don't share passwords.",
    'panic.call':  'Call your bank directly.',

    // Intelligence Feed
    'intel.allRegions': 'All regions',
    'intel.allTypes':   'All types',
    'intel.allRisk':    'All risk',
    'intel.critical':   'Critical',
    'intel.high':       'High',
    'intel.medium':     'Medium',
    'intel.low':        'Low',
    'intel.col.id':     'ID',
    'intel.col.time':   'Time',
    'intel.col.type':   'Type',
    'intel.col.desc':   'Description',
    'intel.col.loc':    'Location',
    'intel.col.risk':   'Risk',
    'intel.count':      'incidents',
    'intel.clusters':   'Active Clusters',
    'intel.spikes':     'Spike Detection',
    'intel.last':       'last',

    // Alerts
    'alerts.title':         'Alerts',
    'alerts.subtitle':      'High-confidence detections requiring immediate attention',
    'alerts.active':        'active',
    'alerts.view':          'View details',
    'alerts.filterAll':     'All',
    'alerts.filterCritical':'Critical Only',
    'alerts.filterHigh':    'High Only',
    'alerts.empty':         'No active alerts',
    'alerts.critical':      'CRITICAL',
    'alerts.entities':      'Entities',
    'alerts.campaign':      'Campaign',

    // Dashboard
    'dash.noData':    'No data',
    'dash.noThreats': 'No threats registered yet.',

    // Intel additions
    'intel.search':           'Search threats...',
    'intel.export':           'Export CSV',
    'intel.page':             'Page',
    'intel.of':               'of',
    'intel.detail.entities':  'Entities',
    'intel.detail.emotional': 'Emotional Vectors',
    'intel.detail.campaign':  'Campaign',
    'intel.detail.actions':   'Recommended Actions',
    'intel.detail.noSelect':  'Select an incident to view details',
    'intel.noMatch':          'No incidents found with these filters',

    // Scanner additions
    'scanner.savedToDB':     'Saved to database',
    'scanner.regionUnknown': 'Region not detected',
  },
}

export function t(lang, key) {
  return translations[lang]?.[key] ?? translations.es[key] ?? key
}
