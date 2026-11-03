import { badRequest } from "./errors.js";
import { cleanText } from "./security.js";

const MIN_TEXT = 20;

const missionValidation = {
  "lixo-marinho": {
    type: "list",
    title: "Registre tres residuos observados",
    fields: ["residuo1", "residuo2", "residuo3"],
  },
  "microplasticos-video": {
    type: "text",
    title: "Descreva uma atitude para reduzir descartaveis",
    field: "resposta",
    minLength: MIN_TEXT,
  },
  "quiz-ambiental": {
    type: "quiz",
    title: "Desafio da vida marinha",
    questions: [
      {
        id: "residuo-praia",
        pergunta: "Ao encontrar lixo na areia, qual atitude protege melhor a vida marinha?",
        options: [
          { id: "recolher-descartar", label: "Recolher com cuidado e descartar corretamente" },
          { id: "enterrar", label: "Enterrar para esconder o residuo" },
          { id: "ignorar", label: "Ignorar porque a mare leva embora" },
        ],
        answer: "recolher-descartar",
      },
      {
        id: "animal-silvestre",
        pergunta: "O que fazer ao ver um animal marinho na praia?",
        options: [
          { id: "observar-distancia", label: "Observar de longe e avisar um adulto ou orgao responsavel" },
          { id: "tocar", label: "Tocar para verificar se ele esta bem" },
          { id: "alimentar", label: "Oferecer alimento" },
        ],
        answer: "observar-distancia",
      },
      {
        id: "microplasticos",
        pergunta: "Qual habito reduz a geracao de microplasticos?",
        options: [
          { id: "reutilizaveis", label: "Preferir itens reutilizaveis e reduzir descartaveis" },
          { id: "mais-plastico", label: "Usar mais embalagens pequenas" },
          { id: "lavar-rua", label: "Empurrar residuos para o bueiro" },
        ],
        answer: "reutilizaveis",
      },
    ],
  },
  "dica-reciclagem": {
    type: "text",
    title: "Escreva a dica sustentavel que voce vai compartilhar",
    field: "resposta",
    minLength: MIN_TEXT,
  },
};

export function publicMissionValidation(missionInput) {
  const validation = resolveMissionValidation(missionInput);
  if (!validation) return null;

  if (validation.type !== "quiz") {
    return validation;
  }

  return {
    ...validation,
    questions: validation.questions.map(({ answer: _answer, ...question }) => question),
  };
}

export function validateMissionSubmission(missionInput, payload = {}) {
  const validation = resolveMissionValidation(missionInput);
  if (!validation) {
    throw badRequest("Missao sem regra de validacao.");
  }

  if (validation.type === "list") {
    const values = validation.fields.map((field) => cleanText(payload[field], 80));
    if (values.some((value) => value.length < 3)) {
      throw badRequest("Informe tres residuos observados para validar a missao.");
    }
    return { ...payload, residuos: values };
  }

  if (validation.type === "text") {
    const resposta = cleanText(payload[validation.field] || payload.resposta, 500);
    if (resposta.length < validation.minLength) {
      throw badRequest(`Escreva uma resposta com pelo menos ${validation.minLength} caracteres.`);
    }
    return { resposta };
  }

  if (validation.type === "quiz") {
    const respostas = payload.respostas || {};
    const wrong = validation.questions.find((question) => respostas[question.id] !== question.answer);
    if (wrong) {
      throw badRequest("Revise o quiz: uma ou mais respostas ainda nao estao corretas.");
    }
    return { respostas };
  }

  throw badRequest("Tipo de validacao desconhecido.");
}

export function validateLessonSubmission(payload = {}) {
  const resposta = cleanText(payload.resposta, 700);

  if (resposta.length < MIN_TEXT) {
    throw badRequest(`Escreva uma resposta com pelo menos ${MIN_TEXT} caracteres.`);
  }

  return { resposta };
}

function resolveMissionValidation(missionInput) {
  const missionId = typeof missionInput === "string" ? missionInput : missionInput?.id;
  const validationType = missionInput?.validationType || missionInput?.validation_type;
  const special = missionValidation[missionId];

  if (special) {
    return special;
  }

  if (validationType === "list") {
    return {
      type: "list",
      title: "Registre tres itens observados",
      fields: ["residuo1", "residuo2", "residuo3"],
    };
  }

  return {
    type: "text",
    title: "Registre sua evidencia da atividade",
    field: "resposta",
    minLength: MIN_TEXT,
  };
}
