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

const { PORT, USE_CORS } = process.env;

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
        value,
        currency: 'RUB',
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: `${returnUrl}?id=${id}`,
      },
      description: {
        name,
        email,
      },
    };

    const response = await axios('https://jsonplaceholder.typicode.com/todos/1');

    if (response.data) {
      await addDoc(collection(db, 'payments'), {
        id,
        name,
        email,
        paymentId: '1815',
        date: getCurrentDate(),
      });

      res.send({ test: 'hello' });
    } else {
      throw new Error('Ошибка создания платежа');
    }
  } catch (error) {
    res.status(500);
    res.send({
      error: {
        message: error?.message ?? 'Произошла ошибка',
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

    const response = await axios('https://jsonplaceholder.typicode.com/todos/1');

    // succeeded

    if (response.data) {
      res.send({ success: true });
    } else {
      throw new Error('Ошибка проверки платежа');
    }
  } catch (error) {
    res.status(500);
    res.send({
      error: {
        message: error?.message ?? 'Произошла ошибка',
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
  } catch (error) {
    res.status(500);
    res.send({
      error: {
        message: error?.message ?? 'Произошла ошибка',
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
