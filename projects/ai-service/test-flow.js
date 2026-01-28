const { chatFlow, ai } = require('./index');

async function test() {
    try {
        console.log('Testing chatFlow with local secrets simulation...');
        const result = await ai.runFlow(chatFlow, {
            prompt: "Hola Brújula, ¿qué stock hay de radiadores?",
            context_type: "MOM"
        });
        console.log('RESULT:', result);
    } catch (err) {
        console.error('FLOW ERROR DETECTED:', err);
    }
}

test();
