import * as Speech from "expo-speech";

export const speak = (text: string, ttsCode = "en-IN") => {
  Speech.stop();
  Speech.speak(text, {
    language: ttsCode,
    pitch: 1.0,
    rate: 0.95,
  });
};

export const stopSpeak = () => Speech.stop();
