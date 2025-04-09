import axios from 'axios';

const TRANSLATION_API_URL = 'http://127.0.0.1:3000/translate';

class TranslationService {
    static async translateMessages(messages: string[], targetLanguage: string): Promise<string[]> {
        if (!messages || messages.length === 0) {
            return [];
        }

        const translatedMessages = await Promise.all(
            messages.map(async (message) => {
                try {
                    const response = await axios.post(
                        TRANSLATION_API_URL,
                        {
                            q: message,
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

                    return data.translatedText;
                } catch (error: any) {
                    console.error(`Error translating message "${message}":`, error.response?.data || error.message);
                    return message;
                }
            })
        );

        return translatedMessages;
    }
}

export default TranslationService;
