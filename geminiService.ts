
import { GoogleGenAI, Type, Modality, LiveServerMessage, FunctionDeclaration } from "@google/genai";

// Standard Tactical Intelligence Node Initialization
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Provide tactical safety advice for South African contexts.
 */
export const getSafetyAdvice = async (topic: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide tactical safety advice regarding: ${topic}. Specific context: South Africa (High alert).`,
    });
    return response.text || "Intelligence stream interrupted.";
  } catch (error) {
    console.error("AI_UPLINK_FAILURE", error);
    return "Tactical data unavailable. Proceed with caution.";
  }
};

/**
 * Search emergency resources with real-time Google Search grounding.
 */
export const searchEmergencyResources = async (query: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are the AeroBantu Intelligence Engine. Provide grounded, factual emergency info for South Africa."
      },
    });

    const text = response.text || "No intelligence found for this query.";
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter(chunk => chunk.web)
      .map(chunk => ({
        title: chunk.web?.title || "External Intelligence Node",
        uri: chunk.web?.uri || "#"
      })) || [];

    return { text, sources };
  } catch (error) {
    console.error("SEARCH_UPLINK_FAILURE", error);
    return { text: "Error syncing with search grid.", sources: [] };
  }
};

/**
 * Locate safe havens using Google Maps grounding.
 */
export const findNearbySafePlaces = async (lat: number, lng: number) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Locate nearest SAPS police stations, secure hospitals, and emergency rescue points.",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      },
    });

    const text = response.text || "Scanning completed. Secure nodes identified.";
    const places = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter(chunk => chunk.maps)
      .map(chunk => ({
        title: chunk.maps?.title || "Tactical Safe Zone",
        uri: chunk.maps?.uri || "#"
      })) || [];

    return { text, places };
  } catch (error) {
    console.error("MAPS_UPLINK_FAILURE", error);
    return { text: "Signal loss during sector scan.", places: [] };
  }
};

export const generateVerificationEmail = async (username: string, code: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Verification Protocol: New Node Activation
    Node Alias: ${username}
    Access Token: ${code}
    Tone: Tactical, high-security, professional.`,
  });
  return response.text || `Your AeroBantu verification code is: ${code}`;
};

export const generateMfaOtp = async (username: string, code: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `MFA Uplink Required
    Node Alias: ${username}
    MFA Token: ${code}
    Instructions: Enter token within 300s to bridge the security gap.`,
  });
  return response.text || `Your MFA code is: ${code}`;
};

export const generatePasswordResetOtp = async (username: string, code: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Security Override: Password Reset Initiated
    Target: ${username}
    Reset Token: ${code}
    Context: Manual override requested due to unauthorized access attempt.`,
  });
  return response.text || `Your reset token is: ${code}`;
};

export const generateWelcomeEmail = async (username: string, tacticalId: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Welcome to AeroBantu.
    Node Alias: ${username}
    Tactical ID: ${tacticalId}
    Status: Grid Link Active.`,
  });
  return response.text || `Welcome to AeroBantu, ${username}. Your Tactical ID is ${tacticalId}.`;
};

export const generateEmergencyMessage = async (name: string, location: { lat: number, lng: number, batteryLevel?: number, networkType?: string }, reason?: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `DISTRESS SIGNAL DETECTED:
    Target: ${name}
    Coordinates: ${location.lat}, ${location.lng}
    Battery: ${location.batteryLevel ? Math.round(location.batteryLevel * 100) : 'UNK'}%
    Trigger: ${reason || 'Manual SOS'}
    Context: South Africa (Immediate assistance required).`,
  });
  return response.text || `AeroBantu SOS: Distress signal from ${name} at ${location.lat}, ${location.lng}. Urgent assistance requested.`;
};

export const SOS_FUNCTION_DECLARATION: FunctionDeclaration = {
  name: 'triggerSOS',
  parameters: {
    type: Type.OBJECT,
    description: 'Immediately deploy the emergency SOS protocol.',
    properties: {
      reason: {
        type: Type.STRING,
        description: 'Context for the SOS deployment (e.g., medical, threat, vehicle failure).',
      },
    },
    required: ['reason'],
  },
};

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
