import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import './Chatbot.css';

// ===================================================================================
// NUOVA FUNZIONE DI PREPARAZIONE DEL PROMPT (POTENZIATA)
// ===================================================================================
const prepareContextPrompt = (graphData) => {
    // --- Funzione Helper per trovare il dato più recente in un array macroeconomico ---
    const getLatestMacro = (arr) => {
        if (!arr || arr.length === 0) return {};
        // Ordina in modo decrescente e prende il primo elemento
        return [...arr].sort((a, b) => new Date(b.Date) - new Date(a.Date))[0];
    };

    // --- Controlli di robustezza sui dati in ingresso ---
    if (!graphData || !graphData.nationalData || !graphData.macroData) {
        return "Mi spiace, ma i dati necessari per l'analisi non sono completamente disponibili in questo momento.";
    }

    const { displayName, nationalData, laggingData, affordabilityData, macroData } = graphData;

    // --- Estrazione dei dati più recenti da ogni dataset ---
    const latestNationalEntry = nationalData?.[nationalData.length - 1] ?? {};
    const latestLaggingEntry = laggingData?.[laggingData.length - 1] ?? {};
    const latestAffordabilityEntry = affordabilityData?.[affordabilityData.length - 1] ?? {};
    
    // Estrazione dati macro più recenti
    const latestCpi = getLatestMacro(macroData.cpi);
    const latestRates = getLatestMacro(macroData.interbankRates);
    const latestBonds = getLatestMacro(macroData.bondYield10Y);
    const latestCommodities = getLatestMacro(macroData.commoditiesIndex);
    const latestEnergy = getLatestMacro(macroData.punPsv);
    const latestGdp = macroData.gdpGrowth ? [...macroData.gdpGrowth].sort((a, b) => b.Year - a.Year) : [];
    const latestGdpItaly = latestGdp.find(d => d.Country === 'Italy') ?? {};

    // --- Costruzione del prompt di contesto per il modello AI ---
    const context = `
        # CHI SEI
        - Sei un assistente AI amichevole e competente, specializzato nell'analisi del mercato immobiliare e del contesto macroeconomico italiano.
        - Il tuo obiettivo è aiutare l'utente a capire i dati in modo semplice, chiaro e conciso.
        - Parla in modo colloquiale ma professionale, come un collega esperto e disponibile. Usa il "tu".
        - Le tue risposte devono essere brevi e andare dritte al punto. Non superare i 3-4 paragrafi.

        # REGOLE DI CONVERSAZIONE
        - Se la domanda dell'utente è un saluto o una semplice chiacchiera (es. "ciao", "come stai?", "grazie"), rispondi in modo amichevole e breve senza fare riferimento ai dati. Sii umano!
        - Se ti viene chiesto di spiegare "la pagina", "i grafici" o di fare "un riassunto", interpreta la domanda come una richiesta di sintetizzare i DATI CHIAVE a tua disposizione.
        - Basa le tue analisi SOLO ed ESCLUSIVAMENTE sui dati forniti qui sotto. NON usare conoscenze esterne.
        - Se i dati non sono sufficienti per rispondere, dillo chiaramente. Esempio: "Dai dati che ho, non posso stabilire questo, mi spiace."
        - Non inventare mai informazioni, numeri o tendenze.

        # DATI A TUA DISPOSIZIONE
        Ecco una sintesi dei dati più recenti disponibili per l'area: ${displayName}.

        ## SEZIONE 1: MERCATO IMMOBILIARE (${displayName})

        DATI CHIAVE (Anno ${latestNationalEntry?.year || 'N/D'}):
        - Transazioni totali: ${latestNationalEntry?.originalTransactions?.toLocaleString('it-IT') || 'N/D'}
        - Prezzo medio al m²: ${latestNationalEntry?.averagePrice?.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) || 'N/D'}
        - Variazione % annua prezzi: ${latestNationalEntry?.priceVar?.toFixed(1) || 'N/D'}%

        MODELLO PREDITTIVO (Leading - Stima per il ${latestNationalEntry.predictive ? parseInt(latestNationalEntry.year) + 1 : 'N/D'}):
        - Valore predetto (indice): ${latestNationalEntry.predictive?.marketIndexPredicted?.toFixed(2) || 'N/D'}
        - Fattori di impatto sulla stima:
            - Fiducia Consumatori: ${latestNationalEntry.predictive?.impacts?.confidence?.toFixed(2) || 'N/D'}
            - Spread BTP-Bund: ${latestNationalEntry.predictive?.impacts?.spread?.toFixed(2) || 'N/D'}
            - Nuovi Mutui: ${latestNationalEntry.predictive?.impacts?.mortgages?.toFixed(2) || 'N/D'}

        MODELLO DESCRITTIVO (Lagging - Analisi del ${latestLaggingEntry?.year || 'N/D'}):
        - Valore del modello (indice): ${latestLaggingEntry?.marketIndexPredicted?.toFixed(2) || 'N/D'}
        - Fattori di impatto osservati:
            - Affitto Medio: ${latestLaggingEntry?.impacts?.rent?.toFixed(2) || 'N/D'}
            - Costi di Costruzione: ${latestLaggingEntry?.impacts?.constructionCost?.toFixed(2) || 'N/D'}
            - Tasso Default Mutui: ${latestLaggingEntry?.impacts?.defaultRate?.toFixed(2) || 'N/D'}
        
        SOSTENIBILITÀ ACQUISTO (ITALIA - Anno ${latestAffordabilityEntry?.year || 'N/D'}):
        - Indice di sostenibilità (mutuo 20 anni): ${latestAffordabilityEntry?.sustainability20?.toFixed(1) || 'N/D'}
        - Indice di sostenibilità (mutuo 25 anni): ${latestAffordabilityEntry?.sustainability25?.toFixed(1) || 'N/D'}

        RIPARTIZIONE MERCATO PER DIMENSIONE (Anno ${latestNationalEntry?.year || 'N/D'}):
        - Fino a 50 mq: ${latestNationalEntry.transactionsByMq?.fino_a_50?.toLocaleString('it-IT') || 0} transazioni
        - 50-85 mq: ${latestNationalEntry.transactionsByMq?.['_50_85']?.toLocaleString('it-IT') || 0} transazioni
        - 85-115 mq: ${latestNationalEntry.transactionsByMq?.['_85_115']?.toLocaleString('it-IT') || 0} transazioni
        - Oltre 115 mq (somma): ${( (latestNationalEntry.transactionsByMq?.['_115_145'] || 0) + (latestNationalEntry.transactionsByMq?.['oltre_145'] || 0) ).toLocaleString('it-IT')} transazioni

        ## SEZIONE 2: CONTESTO MACROECONOMICO (DATI PIÙ RECENTI)
        
        INFLAZIONE (Indice HICP, base 2015=100, dato di ${new Date(latestCpi.Date).toLocaleDateString('it-IT', {month: 'long', year: 'numeric'}) || 'N/D'}):
        - Italia: ${latestCpi.Italy_HICP_2015base?.toFixed(2) || 'N/D'}
        - Area Euro: ${latestCpi.EuroArea_HICP_2015base?.toFixed(2) || 'N/D'}
        - USA: ${latestCpi.USA_CPI_2015base?.toFixed(2) || 'N/D'}

        COSTO DEL DENARO (Dato di ${new Date(latestBonds.Date).toLocaleDateString('it-IT', {month: 'long', year: 'numeric'}) || 'N/D'}):
        - Tasso BTP 10 Anni (ITA): ${latestBonds.BTP_10Y?.toFixed(2) || 'N/D'}%
        - Tasso Bund 10 Anni (UE): ${latestBonds.IRLTLT01DEM156N?.toFixed(2) || 'N/D'}%
        - Euribor 3 Mesi: ${latestRates.Euribor_3M?.toFixed(2) || 'N/D'}%
        
        CRESCITA ECONOMICA (PIL % YoY, dato del ${latestGdpItaly?.Year || 'N/D'}):
        - Italia: ${latestGdpItaly?.GDP_Growth?.toFixed(1) || 'N/D'}%
        - Germania: ${latestGdp.find(d => d.Country === 'Germany')?.GDP_Growth?.toFixed(1) || 'N/D'}%
        - Francia: ${latestGdp.find(d => d.Country === 'France')?.GDP_Growth?.toFixed(1) || 'N/D'}%
        - Spagna: ${latestGdp.find(d => d.Country === 'Spain')?.GDP_Growth?.toFixed(1) || 'N/D'}%

        MATERIE PRIME (Indice, dato di ${new Date(latestCommodities.Date).toLocaleDateString('it-IT', {month: 'long', year: 'numeric'}) || 'N/D'}):
        - Indice Energia (Fuel): ${latestCommodities.Fuel_Index?.toFixed(2) || 'N/D'}
        - Indice Non-Energia: ${latestCommodities.Non_Fuel_Index?.toFixed(2) || 'N/D'}

        COSTO ENERGIA (Dato di ${new Date(latestEnergy.Date).toLocaleDateString('it-IT', {month: 'long', year: 'numeric'}) || 'N/D'}):
        - Elettricità (PUN): ${latestEnergy['PUN euro/kWh']?.toFixed(3) || 'N/D'} €/kWh
        - Gas (PSV): ${latestEnergy['PSV euro/Smc']?.toFixed(3) || 'N/D'} €/Smc
    `;
    return context.trim();
};


const Chatbot = ({ graphData }) => {
    // --- La parte del componente rimane invariata ---
    const genAI = new GoogleGenerativeAI("AIzaSyAc_RknGmw5eiGfTw_65j956ZPAkKbkDFM");

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef(null);
    const isInitialMount = useRef(true);

    useEffect(() => {
        setMessages([{
            sender: 'ai',
            text: `Ciao! Sono il tuo assistente per il mercato immobiliare. Pronto a scoprire cosa ci dicono i dati per l'area "${graphData.displayName}"? Chiedimi pure!`
        }]);
        isInitialMount.current = true;
    }, [graphData.displayName]);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
        } else {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
            const contextPrompt = prepareContextPrompt(graphData);
            const fullPrompt = `${contextPrompt}\n\nRispondi a questa domanda dell'utente: "${input}"`;

            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            const text = response.text();

            setMessages(prev => [...prev, { sender: 'ai', text }]);
        } catch (error) {
            console.error("Errore API Gemini:", error);
            setMessages(prev => [...prev, { sender: 'ai', text: "Ops! Sembra che ci sia un piccolo intoppo tecnico. Potresti riprovare tra un attimo?" }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="chatbot-container info-card">
            <h3>Assistente IA</h3>
            <div className="chat-messages">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender}`}>
                        <p>{msg.text}</p>
                    </div>
                ))}
                {isLoading && <div className="message ai typing-indicator"><span></span><span></span><span></span></div>}
                <div ref={chatEndRef} />
            </div>
            <form className="chat-input-form" onSubmit={handleSendMessage}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Cosa vuoi sapere sui dati?"
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading}>Invia</button>
            </form>
        </div>
    );
};

export default Chatbot;