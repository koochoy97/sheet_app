export const STATUS_OPTIONS = [
  'Completada',
  'No show',
  'Pactada',
  'Reprogramada',
  'KDM Interesado',
]

export const COLUMNS = [
  { key: 'company', label: 'Company' },
  { key: 'fecha', label: 'Fecha de celebración' },
  { key: 'status', label: 'Status' },
  { key: 'created_by_email', label: 'SDR', readOnly: true },
  { key: 'kdm', label: 'KDM' },
  { key: 'tituloKdm', label: 'Título del KDM' },
  { key: 'kdm_mail', label: 'Mail KDM' },
  { key: 'telefono_cliente', label: 'Teléfono cliente' },
  { key: 'industria', label: 'Industria' },
  { key: 'empleados', label: '# Empleados' },
  { key: 'score', label: 'Score de Reu (Según Cliente)' },
  { key: 'client_accepted', label: 'Aceptación de Reu por Cliente' },
  { key: 'lineaNegocio', label: 'Línea de negocio' },
  { key: 'icp_id', label: 'ICP' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'company_linkedin', label: 'LinkedIn empresa' },
  { key: 'person_linkedin', label: 'LinkedIn persona' },
  { key: 'web_url', label: 'Web' },
  { key: 'comments', label: 'Comentarios' },
  { key: 'AE_mails', label: 'AE mails' },
]

// Score de calidad 0–5 (según cliente). Dropdown para evitar valores fuera de rango.
export const SCORE_OPTIONS = [0, 1, 2, 3, 4, 5]

// Aceptación de la reunión por el cliente (marca de Client Success). Binario.
export const ACCEPTANCE_OPTIONS = [
  { value: 'true', label: 'Sí' },
  { value: 'false', label: 'No' },
]

export const ALL_CLIENTS = '__ALL__'
