

module.exports = async function messageHandler(m, sock) {
    const text = m.content?.toLowerCase();
    const senderName = m.pushName || 'Tanpa Nama';

    if (!text) return;

    switch (true) {
        case ['menu', '.menu', '!menu'].includes(text): {
            const buttons = [
                { buttonId: '.ping', buttonText: { displayText: 'Ping Bot' }, type: 1 },
                { buttonId: '.owner', buttonText: { displayText: 'Owner' }, type: 1 },
                { buttonId: '.say Halo!', buttonText: { displayText: 'Say Halo' }, type: 1 },
            ];

            const buttonMessage = {
                text: `Halo *${senderName}*! Ini menu utama 👇`,
                footer: 'XenoviaBot',
                buttons,
                headerType: 1
            };

            await sock.sendMessage(m.remoteJid, buttonMessage, { quoted: m.message });
            break;
        }

        case ['ping', '.ping', '!ping'].includes(text):
            await sock.sendMessage(m.remoteJid, { text: 'Pong 🏓' }, { quoted: m.message });
            break;

        case ['owner', '.owner', '!owner'].includes(text):
            await sock.sendMessage(m.remoteJid, {
                text: `Owner: Xenovia\nChat: wa.me/${config.phone_number_bot.replace(/\D/g, '')}`
            }, { quoted: m.message });
            break;

        case text.startsWith('!say ') || text.startsWith('.say '): {
            const sayText = text.replace(/^(!|\.)(say)\s+/, '');
            await sock.sendMessage(m.remoteJid, { text: sayText }, { quoted: m.message });
            break;
        }
    }
};