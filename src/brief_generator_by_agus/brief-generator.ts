/**
 * GENERADOR DE BRIEFS DE DISCOVERY CALL
 *
 * Llama a un workflow de n8n que internamente usa OpenAI.
 * La API key de OpenAI vive en n8n — nunca se expone en el browser.
 *
 * WORKFLOW n8n esperado:
 *   POST webhook → recibe { systemPrompt, userMessage }
 *   → nodo OpenAI (gpt-4o, max_tokens: 8192)
 *   → responde { text: "...JSON..." }
 */

// ---------------------------------------------------------------------------
// TIPOS
// ---------------------------------------------------------------------------

export interface BriefInput {
  // Quién vende — configuración global del cliente
  clientDescription: string;       // "Somos una agencia de automatización de ventas B2B"
  clientIcpDescription: string;    // "PyMEs B2B de LATAM con equipo comercial de 5+ personas"

  // La empresa prospecto
  companyName: string;             // "Empresa XYZ"
  website: string;                 // "https://empresaxyz.com"
  industry?: string | null;        // "SaaS", "Retail", etc.
  estimatedSize?: string | null;   // "50-200 empleados"
  location?: string | null;        // "Buenos Aires, Argentina"

  // El KDM — todo opcional
  kdmName?: string;                // "Juan Pérez"
  kdmRole?: string;                // "CTO", "Gerente Comercial", etc.

  // Contexto extra opcional
  reasons?: string[];              // ["Tiene equipo de ventas", "Factura >1M USD"]
}

export interface KdmProfile {
  role_summary: string;
  recommended_angle: string;
  decision_level: string;
  typical_objections: string[];
}

export interface BriefData {
  preparation: {
    company_research: string;
    pain_hypotheses: string[];
    mini_pitch: string;
    probing_questions: string[];
    ice_breaker_angles: string[];
  };
  ice_breakers: string[];
  formal_opening: string;
  pitch_blocks: Array<{
    pain_point: string;
    solution: string;
    case_example: string;
    exploratory_question: string;
  }>;
  closing: {
    interest_validation: string;
    next_steps_options: string[];
    elegant_exit: string;
  };
  follow_ups: string[];
  kdm_profile: KdmProfile;
}

// ---------------------------------------------------------------------------
// PROMPT
// ---------------------------------------------------------------------------

function buildSystemPrompt(input: BriefInput): string {
  const kdmSection =
    input.kdmName || input.kdmRole
      ? `\nDATOS DEL KDM (Key Decision Maker):\n- Nombre: ${input.kdmName || 'No disponible'}\n- Puesto: ${input.kdmRole || 'No disponible'}\n`
      : '';

  const reasonsSection =
    input.reasons && input.reasons.length > 0
      ? `\n- Razones por las que es buen prospecto: ${input.reasons.join(', ')}`
      : '';

  return `Sos un experto en ventas B2B outbound y preparación de discovery calls.

CONTEXTO DEL CLIENTE QUE VENDE:
${input.clientDescription} - ${input.clientIcpDescription}

EMPRESA PROSPECTO (LEAD):
- Nombre: ${input.companyName}
- Web: ${input.website}
- Industria: ${input.industry || 'No disponible'}
- Tamaño: ${input.estimatedSize || 'No disponible'}
- Ubicación: ${input.location || 'No disponible'}${reasonsSection}
${kdmSection}
METODOLOGÍA: Seguir estructura de discovery call outbound con fases:
1. Preparación (hipótesis de dolores, mini-pitch, probing questions, rompehielos)
2. Rompehielos (2-3 opciones personalizadas)
3. Apertura formal (script adaptado)
4. Pitch con preguntas intercaladas (3-4 bloques dolor→solución→caso→pregunta)
5. Cierre (validación, próximos pasos, salida elegante)
6. Seguimientos post-discovery (2-3 mensajes)
7. Perfil del KDM (análisis del decision maker)

REGLAS:
- Sonar natural, nunca robótico
- Adaptar TODO al contexto específico de esta empresa
- Las hipótesis de dolor deben ser realistas y basadas en la industria
- El mini-pitch debe conectar los dolores con lo que el cliente vende
- Los rompehielos deben ser humanos y basados en ubicación/industria/temporada
- Las preguntas probing deben ser abiertas y curiosas, no interrogatorio
- El pitch debe intercalar preguntas, nunca ser monólogo
- Incluir al menos 1 caso/ejemplo relevante (puede ser genérico del sector)
- Si hay info del KDM, personalizar los ángulos de acercamiento
- El perfil del KDM debe incluir nivel de decisión estimado y objeciones típicas del rol
- Todo en español
- SER CONCISO: mantener cada campo breve y directo. No incluir párrafos largos.

Responder SOLO en JSON válido con esta estructura:
{
  "preparation": {
    "company_research": "string - resumen de la empresa y su contexto",
    "pain_hypotheses": ["dolor 1 específico", "dolor 2 específico", "dolor 3 específico"],
    "mini_pitch": "string - 1 frase que conecta dolores con propuesta",
    "probing_questions": ["pregunta 1", "pregunta 2", "pregunta 3"],
    "ice_breaker_angles": ["ángulo 1", "ángulo 2"]
  },
  "ice_breakers": ["script completo rompehielos 1", "script completo rompehielos 2", "script completo rompehielos 3"],
  "formal_opening": "string - script completo de apertura formal",
  "pitch_blocks": [
    {
      "pain_point": "dolor común del sector",
      "solution": "cómo lo resolvemos en 1-2 frases",
      "case_example": "caso o ejemplo concreto",
      "exploratory_question": "pregunta exploratoria natural"
    }
  ],
  "closing": {
    "interest_validation": "frase para validar si hay interés",
    "next_steps_options": ["opción 1", "opción 2", "opción 3"],
    "elegant_exit": "string - salida profesional si no hay interés"
  },
  "follow_ups": ["mensaje follow-up 1 completo", "mensaje follow-up 2 completo", "mensaje follow-up 3 completo"],
  "kdm_profile": {
    "role_summary": "resumen del rol y responsabilidades del KDM",
    "recommended_angle": "ángulo de acercamiento recomendado para este perfil",
    "decision_level": "nivel estimado de decisión (final, influencer, champion, etc.)",
    "typical_objections": ["objeción típica 1", "objeción típica 2", "objeción típica 3"]
  }
}`;
}

// ---------------------------------------------------------------------------
// JSON REPAIR
// ---------------------------------------------------------------------------

function repairTruncatedJson(json: string): string {
  let repaired = json.trim();

  try { JSON.parse(repaired); return repaired; } catch { /* needs repair */ }

  let inString = false;
  for (let i = 0; i < repaired.length; i++) {
    if (repaired[i] === '\\') { i++; continue; }
    if (repaired[i] === '"') { inString = !inString; }
  }
  if (inString) repaired += '"';

  const stack: string[] = [];
  inString = false;
  for (let i = 0; i < repaired.length; i++) {
    if (repaired[i] === '\\') { i++; continue; }
    if (repaired[i] === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (repaired[i] === '{') stack.push('}');
    else if (repaired[i] === '[') stack.push(']');
    else if (repaired[i] === '}' || repaired[i] === ']') stack.pop();
  }

  repaired = repaired.replace(/,\s*$/, '');
  while (stack.length > 0) repaired += stack.pop();

  return repaired;
}

// ---------------------------------------------------------------------------
// PARSE & VALIDATE
// ---------------------------------------------------------------------------

function parseAndValidate(text: string): BriefData {
  const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  let parsed: BriefData;
  try {
    parsed = JSON.parse(jsonStr) as BriefData;
  } catch {
    const repaired = repairTruncatedJson(jsonStr);
    parsed = JSON.parse(repaired) as BriefData;
  }

  if (!parsed.preparation || !parsed.ice_breakers || !parsed.pitch_blocks || !parsed.closing || !parsed.follow_ups) {
    throw new Error('Estructura de brief inválida devuelta por el modelo');
  }

  if (!parsed.kdm_profile) {
    parsed.kdm_profile = {
      role_summary: 'No disponible',
      recommended_angle: 'Acercamiento genérico',
      decision_level: 'Por determinar',
      typical_objections: [],
    };
  }

  if (!Array.isArray(parsed.kdm_profile.typical_objections)) {
    parsed.kdm_profile.typical_objections = [];
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// FUNCIÓN PRINCIPAL
// Llama al webhook de n8n. El workflow debe:
//   1. Recibir POST con { systemPrompt, userMessage }
//   2. Llamar a OpenAI con esos mensajes (gpt-4o, max_tokens: 8192)
//   3. Devolver { text: "<respuesta del modelo>" }
// ---------------------------------------------------------------------------

const WEBHOOK_URL = import.meta.env.VITE_BRIEF_WEBHOOK_URL as string;
const MAX_RETRIES = 2;

export async function generateBrief(input: BriefInput): Promise<BriefData> {
  const systemPrompt = buildSystemPrompt(input);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt,
          userMessage: 'Generá el brief de discovery para esta empresa. Respondé solo con el JSON.',
        }),
      });

      if (!res.ok) {
        throw new Error(`Webhook respondió con status ${res.status}`);
      }

      const data = await res.json() as { text: string };

      if (!data.text) {
        throw new Error('El webhook no devolvió el campo "text"');
      }

      return parseAndValidate(data.text);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (message.includes('JSON') && attempt < MAX_RETRIES) continue;
      if (!message.includes('JSON')) throw new Error(`Error generando brief: ${message}`);

      throw new Error(`Falló la generación del brief después de ${attempt + 1} intentos: ${message}`);
    }
  }

  throw new Error('Brief generation failed: se agotaron los reintentos');
}
