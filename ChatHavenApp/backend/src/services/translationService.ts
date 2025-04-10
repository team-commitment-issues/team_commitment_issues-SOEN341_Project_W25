import axios from 'axios';

const TRANSLATION_API_URL = 'http://127.0.0.1:3000/translate';

// Use a unique placeholder unlikely to be translated
const EMOJI_PLACEHOLDER = '__E__';
const emojiRegex = /([\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}])/gu;

class TranslationService {
    static async translateMessages(messages: string[], targetLanguage: string): Promise<string[]> {
        if (!messages || messages.length === 0) {
            return [];
        }

        const translatedMessages = await Promise.all(
            messages.map(async (message) => {
                try {
                    // Extract emojis and replace them with a unique placeholder
                    const emojis = message.match(emojiRegex) || [];
                    console.log(emojis);
                    const messageWithoutEmojis = message.replace(emojiRegex, EMOJI_PLACEHOLDER);

                    // Send the message without emojis to the translation API
                    const response = await axios.post(
                        TRANSLATION_API_URL,
                        {
                            q: messageWithoutEmojis,
                            source: 'auto',
                            target: targetLanguage,
                            format: 'text',
                        },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        }
                    );

                    const data = response.data;

                    if (!data || !data.translatedText) {
                        throw new Error('Invalid response from translation API');
                    }

                    // if (data.detectedLanguage.confidence < 70) return message; // If confidence is low, return the original message

                    let translatedText = data.translatedText;
                    emojis.forEach((emoji) => {
                        translatedText = translatedText.replace(EMOJI_PLACEHOLDER, emoji);
                    });

                    return translatedText;
                } catch (error: any) {
                    console.error(`Error translating message "${message}":`, error.response?.data || error.message);
                    // Return the original message if translation fails
                    return message;
                }
            })
        );

        return translatedMessages;
    }
}

export default TranslationService;
