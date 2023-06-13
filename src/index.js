require('dotenv').config();

const express = require('express');
const app = express();
const cors = require('cors');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { getDocs, collection, addDoc, query, where } = require('firebase/firestore');
const { EMAIL_REGEXP } = require('./constants');
const { initFirebase } = require('./firebase');
const { getCurrentDate } = require('./utils');
const { TelegramLog } = require('./telegram-log');

const { PORT, USE_CORS, SHOP_ID, SECRET_SHOP_KEY, SHOP_PAYMENT_URL } = process.env;

const db = initFirebase();

if (USE_CORS) {
  app.use(cors());
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/api/pay', async (req, res) => {
  try {
    const { name, email, value, returnUrl, agreement } = req.body;

    if (!name || !email || !value || !returnUrl || !agreement) {
      throw new Error('Не переданы обязательные поля');
    }

    if (!new RegExp(EMAIL_REGEXP).test(email)) {
      throw new Error('Неправильный формат email');
    }

    const idempotenceKey = uuidv4();
    const id = uuidv4();

    const body = {
      amount: {
        value: `${value}`,
        currency: 'RUB',
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: `${returnUrl}?id=${id}`,
      },
      description: `Гайд по Сеулу. Для ${name}, email: ${email}`,
      metadata: {
        id,
        name,
        email,
      },
    };

    const response = await axios.post(SHOP_PAYMENT_URL, body, {
      headers: {
        'Idempotence-Key': idempotenceKey,
        'Content-Type': 'application/json',
      },
      auth: { username: SHOP_ID, password: SECRET_SHOP_KEY },
    });

    if (response?.data?.id && response?.data?.confirmation?.confirmation_url) {
      await addDoc(collection(db, 'payments'), {
        id,
        name,
        email,
        paymentId: response.data.id,
        date: getCurrentDate(),
      });

      res.send({ paymentLink: response.data.confirmation.confirmation_url });
      TelegramLog.createPay(id, name, email);
    } else {
      throw new Error('Ошибка создания платежа');
    }
  } catch (error) {
    const message = error?.message ?? 'Произошла ошибка';

    TelegramLog.error(message, error?.stack);
    res.status(500);
    res.send({
      error: {
        message,
      },
    });
  }
});

app.get('/api/checkStatus', async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      throw new Error('ID обязателен');
    }

    const q = query(collection(db, 'payments'), where('id', '==', id));
    const docs = await getDocs(q);

    let paymentId = null;

    docs.forEach((doc) => {
      const id = doc.data().paymentId;
      paymentId = id ? id : null;
    });

    if (!paymentId) {
      throw new Error('paymentId не найден');
    }

    const response = await axios.get(`${SHOP_PAYMENT_URL}/${paymentId}`, {
      auth: { username: SHOP_ID, password: SECRET_SHOP_KEY },
    });

    if (response?.data) {
      if (response.data.status === 'succeeded') {
        res.send({ success: true });
      } else {
        throw new Error('Платеж не оплачен');
      }
    } else {
      throw new Error('Ошибка проверки платежа');
    }
  } catch (error) {
    const message = error?.message ?? 'Произошла ошибка';

    TelegramLog.error(message, error?.stack);
    res.status(500);
    res.send({
      error: {
        message,
      },
    });
  }
});

app.post('/api/statistic-downloads', async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      throw new Error('Не переданы обязательные поля');
    }

    await addDoc(collection(db, 'downloads'), {
      userAgent: req.get('user-agent'),
      id,
      date: getCurrentDate(),
    });

    res.send({ success: true });
    TelegramLog.downloadFile(id);
  } catch (error) {
    const message = error?.message ?? 'Произошла ошибка';
    TelegramLog.error(message, error?.stack);

    res.status(500);
    res.send({
      error: {
        message,
      },
    });
  }
});

app.post('/api/statistic-preview-downloads', async (req, res) => {
  try {
    await addDoc(collection(db, 'preview-downloads'), {
      userAgent: req.get('user-agent'),
      date: getCurrentDate(),
    });

    res.send({ success: true });
    TelegramLog.downloadPreviewFile();
  } catch (error) {
    const message = error?.message ?? 'Произошла ошибка';
    TelegramLog.error(message, error?.stack);

    res.status(500);
    res.send({
      error: {
        message,
      },
    });
  }
});

app.get('/api', (req, res) => {
  res.send('Hello World!');
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
