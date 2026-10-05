/**
 * Nepali page text, keyed by the exact English passed to `tr()`. One file per
 * area in ./ne-text; a string missing here shows in English. Keep `{name}`
 * placeholders exactly as in the English.
 *
 * Words used throughout, so one thing has one name:
 *   student विद्यार्थी · staff कर्मचारी · teacher शिक्षक · parent अभिभावक · guardian संरक्षक
 *   admission भर्ना · attendance हाजिरी · exam परीक्षा · marks अङ्क · result नतिजा · grade ग्रेड
 *   fee शुल्क · invoice बिल · payment भुक्तानी · receipt रसिद · refund फिर्ता · scholarship छात्रवृत्ति
 *   branch शाखा · academic year शैक्षिक वर्ष · term सत्र · class कक्षा · section सेक्सन
 *   subject विषय · program अध्ययन कार्यक्रम · level तह · event कार्यक्रम · period/lesson घण्टी/पाठ
 *   leave बिदा · payroll/salary तलब · payslip तलबी विवरण · library पुस्तकालय · loan (book) उधारो
 *   fine जरिवाना · hostel छात्रावास · transport यातायात · route रुट · vehicle सवारी साधन
 *   inventory सामान · asset सम्पत्ति · notice सूचना · application निवेदन · certificate प्रमाणपत्र
 *   alumni पूर्व विद्यार्थी · vacancy रिक्त पद · candidate उम्मेदवार · interview अन्तर्वार्ता
 *   approve स्वीकृत · reject अस्वीकार · submit पेस · save सुरक्षित · draft मस्यौदा · pending बाँकी
 * Buttons are polite imperatives (…गर्नुहोस्).
 */
const files = import.meta.glob<Record<string, string>>('./ne-text/*.ts', { eager: true, import: 'default' })

export const neText: Record<string, string> = Object.assign({}, ...Object.values(files))
