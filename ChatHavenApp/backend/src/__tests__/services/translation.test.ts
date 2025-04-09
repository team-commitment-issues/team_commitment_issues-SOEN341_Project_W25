import TranslationService from '../../services/translationService';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TranslationService', () => {
    it('should translate messages successfully', async () => {
        const messages = ['Hello', 'How are you?'];
        const targetLanguage = 'fr';
        const translatedText = ['Bonjour', 'Comment ça va?'];

        mockedAxios.post.mockResolvedValueOnce({
            data: {
                translatedText: translatedText
            }
        });

        const result = await TranslationService.translateMessages(messages, targetLanguage);

        expect(mockedAxios.post).toHaveBeenCalledWith(
            'http://localhost:3000/translate',
            {
                q: messages,
                source: 'auto',
                target: targetLanguage,
                format: 'text',
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        expect(result).toEqual(translatedText);
    });

    it('should throw an error if the translation API returns an error', async () => {
        const messages = ['Hello'];
        const targetLanguage = 'es';

        mockedAxios.post.mockResolvedValueOnce({
            data: {
                error: 'Invalid API key'
            }
        });

        await expect(TranslationService.translateMessages(messages, targetLanguage)).rejects.toThrow('Invalid API key');
    });
});