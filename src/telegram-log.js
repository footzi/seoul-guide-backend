const axios = require('axios');

const { TELEGRAM_API_KEY, TELEGRAM_REAL_GUIDE_CHAT_ID } = process.env;

class TelegramLog {
  static send(message) {
    const url = `https://api.telegram.org/${TELEGRAM_API_KEY}/sendMessage`;

    axios.post(url, {
      chat_id: TELEGRAM_REAL_GUIDE_CHAT_ID,
      text: message,
      parse_mode: 'html',
    });
  }

  static error(text, stackTrace) {
    const message = `<b>❗Произошла ошибка!</b>\n\n<i>${text}</i>️\n\n<code>${stackTrace}</code>`;

    TelegramLog.send(message);
  }

  static createPay(id, name, email) {
    const message = `<b>🔆 Создан новый платеж</b>\n\n<i>id: ${id}</i>\n<i>Имя: ${name}</i>\n<i>Email: ${email}</i>️️️️`;

    TelegramLog.send(message);
  }

  static downloadFile(id, name, email) {
    const message = `<b>📥 Был скачен файл</b>\n\n<i>id: ${id}</i>`;

    TelegramLog.send(message);
  }
}

module.exports = {
  TelegramLog,
};
