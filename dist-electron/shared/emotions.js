"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMOTION_IDS = exports.EMOTIONS = void 0;
exports.getEmotion = getEmotion;
/** 40 эмоций, у каждой - свой предмет-символ. */
exports.EMOTIONS = [
    { id: 'happy', label: 'Радость', emoji: '☀️', object: 'солнышко', eyes: 'happy', mouth: 'smile', brow: 'none', tint: 0, blink: 1 },
    { id: 'sad', label: 'Грусть', emoji: '🌧️', object: 'дождевое облако', eyes: 'sad', mouth: 'sad', brow: 'worried', tint: -18, blink: 1.4 },
    { id: 'surprised', label: 'Удивление', emoji: '❗', object: 'восклицательный знак', eyes: 'wide', mouth: 'o', brow: 'up', tint: 8, blink: 0.5 },
    { id: 'excited', label: 'Возбуждение', emoji: '🎉', object: 'конфетти', eyes: 'sparkle', mouth: 'grin', brow: 'up', tint: 12, blink: 0.6 },
    { id: 'love', label: 'Влюблённость', emoji: '💖', object: 'сердце', eyes: 'heart', mouth: 'smile', brow: 'none', tint: 16, blink: 1.2 },
    { id: 'angry', label: 'Злость', emoji: '🔥', object: 'огонь', eyes: 'angry', mouth: 'wave', brow: 'down', tint: -10, blink: 0.8 },
    { id: 'confused', label: 'Растерянность', emoji: '❓', object: 'вопросительный знак', eyes: 'spiral', mouth: 'wave', brow: 'worried', tint: -4, blink: 1.1 },
    { id: 'thinking', label: 'Размышление', emoji: '💭', object: 'облако мыслей', eyes: 'normal', mouth: 'flat', brow: 'worried', tint: -6, blink: 1.5 },
    { id: 'sleepy', label: 'Сонливость', emoji: '😴', object: 'подушка', eyes: 'sleepy', mouth: 'o', brow: 'none', tint: -14, blink: 2.2 },
    { id: 'scared', label: 'Испуг', emoji: '👻', object: 'привидение', eyes: 'wide', mouth: 'shock', brow: 'up', tint: -22, blink: 0.4 },
    { id: 'proud', label: 'Гордость', emoji: '🏆', object: 'кубок', eyes: 'happy', mouth: 'grin', brow: 'up', tint: 10, blink: 1 },
    { id: 'curious', label: 'Любопытство', emoji: '🔍', object: 'лупа', eyes: 'wide', mouth: 'o', brow: 'up', tint: 4, blink: 0.9 },
    { id: 'bored', label: 'Скука', emoji: '🥱', object: 'зевота', eyes: 'sleepy', mouth: 'flat', brow: 'none', tint: -12, blink: 1.8 },
    { id: 'shy', label: 'Стеснительность', emoji: '🌸', object: 'цветок сакуры', eyes: 'sad', mouth: 'cat', brow: 'worried', tint: 18, blink: 1.3 },
    { id: 'grateful', label: 'Благодарность', emoji: '🙏', object: 'сложенные ладони', eyes: 'happy', mouth: 'smile', brow: 'none', tint: 6, blink: 1 },
    { id: 'sneaky', label: 'Хитрость', emoji: '🕵️', object: 'шляпа сыщика', eyes: 'wink', mouth: 'grin', brow: 'down', tint: -4, blink: 1.1 },
    { id: 'shocked', label: 'Шок', emoji: '⚡', object: 'молния', eyes: 'x', mouth: 'shock', brow: 'up', tint: 14, blink: 0.3 },
    { id: 'calm', label: 'Спокойствие', emoji: '🍃', object: 'листок', eyes: 'normal', mouth: 'smile', brow: 'none', tint: -2, blink: 1.4 },
    { id: 'nervous', label: 'Нервозность', emoji: '🧵', object: 'нить', eyes: 'wide', mouth: 'wave', brow: 'worried', tint: -8, blink: 0.7 },
    { id: 'relieved', label: 'Облегчение', emoji: '💨', object: 'ветер', eyes: 'happy', mouth: 'smile', brow: 'none', tint: 2, blink: 1.2 },
    { id: 'guilty', label: 'Вина', emoji: '😔', object: 'капля дождя', eyes: 'sad', mouth: 'sad', brow: 'worried', tint: -16, blink: 1.4 },
    { id: 'brave', label: 'Храбрость', emoji: '🛡️', object: 'щит', eyes: 'angry', mouth: 'grin', brow: 'down', tint: 4, blink: 0.9 },
    { id: 'determined', label: 'Решительность', emoji: '🎯', object: 'мишень', eyes: 'angry', mouth: 'flat', brow: 'down', tint: 0, blink: 0.9 },
    { id: 'smug', label: 'Самодовольство', emoji: '😏', object: 'чашка чая', eyes: 'wink', mouth: 'smile', brow: 'up', tint: 6, blink: 1.1 },
    { id: 'lonely', label: 'Одиночество', emoji: '🌙', object: 'луна', eyes: 'sad', mouth: 'flat', brow: 'worried', tint: -20, blink: 1.6 },
    { id: 'impressed', label: 'Впечатлённость', emoji: '🤩', object: 'падающая звезда', eyes: 'sparkle', mouth: 'open', brow: 'up', tint: 12, blink: 0.7 },
    { id: 'hungry', label: 'Голод', emoji: '🍪', object: 'печенье', eyes: 'wide', mouth: 'tongue', brow: 'none', tint: 8, blink: 1 },
    { id: 'sick', label: 'Нездоровье', emoji: '🤒', object: 'градусник', eyes: 'x', mouth: 'wave', brow: 'worried', tint: -18, blink: 1.5 },
    { id: 'dizzy', label: 'Головокружение', emoji: '🌀', object: 'спираль', eyes: 'spiral', mouth: 'wave', brow: 'worried', tint: -6, blink: 0.8 },
    { id: 'wink', label: 'Подмигивание', emoji: '😉', object: 'искра', eyes: 'wink', mouth: 'grin', brow: 'none', tint: 8, blink: 0.9 },
    { id: 'cool', label: 'Крутость', emoji: '🕶️', object: 'солнцезащитные очки', eyes: 'normal', mouth: 'grin', brow: 'none', tint: 4, blink: 1.2 },
    { id: 'starstruck', label: 'Восторг', emoji: '🌟', object: 'звезда', eyes: 'sparkle', mouth: 'open', brow: 'up', tint: 16, blink: 0.6 },
    { id: 'playful', label: 'Игривость', emoji: '🧶', object: 'клубок ниток', eyes: 'happy', mouth: 'tongue', brow: 'up', tint: 10, blink: 0.8 },
    { id: 'tender', label: 'Нежность', emoji: '🧸', object: 'плюшевый мишка', eyes: 'happy', mouth: 'cat', brow: 'none', tint: 12, blink: 1.3 },
    { id: 'suspicious', label: 'Подозрительность', emoji: '🔎', object: 'увеличительное стекло', eyes: 'angry', mouth: 'flat', brow: 'down', tint: -4, blink: 1 },
    { id: 'inspired', label: 'Вдохновение', emoji: '💡', object: 'лампочка', eyes: 'sparkle', mouth: 'grin', brow: 'up', tint: 14, blink: 0.9 },
    { id: 'awkward', label: 'Неловкость', emoji: '🫠', object: 'лужа', eyes: 'sad', mouth: 'wave', brow: 'worried', tint: -8, blink: 1.2 },
    { id: 'confident', label: 'Уверенность', emoji: '💪', object: 'бицепс', eyes: 'normal', mouth: 'grin', brow: 'down', tint: 6, blink: 1 },
    { id: 'magic', label: 'Волшебство', emoji: '✨', object: 'волшебная палочка', eyes: 'sparkle', mouth: 'smile', brow: 'up', tint: 20, blink: 1 },
    { id: 'thankful', label: 'Признательность', emoji: '🌻', object: 'подсолнух', eyes: 'happy', mouth: 'smile', brow: 'none', tint: 10, blink: 1.2 }
];
exports.EMOTION_IDS = exports.EMOTIONS.map((e) => e.id);
function getEmotion(id) {
    return exports.EMOTIONS.find((e) => e.id === id) || exports.EMOTIONS[0];
}
//# sourceMappingURL=emotions.js.map