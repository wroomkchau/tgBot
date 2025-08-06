const TelegramBot = require("node-telegram-bot-api");
const { RestClientV5 } = require("bybit-api");


const config = {
    telegramToken: "8459311193:AAHnL3Cb7Z9CxPQM1ksrZIWH3dwIZ52wnK4",
    bybitApiKey: "bee2QW4oy6YF7PkveR",
    bybitApiSecret: "u9UC4exvQAqvmvFbVpYhQuk4PpCvW8VYJej0",
    proxyUrl: "http://193.38.229.194:8000",
};

const bybitClient = new RestClientV5({
    key: config.bybitApiKey,
    secret: config.bybitApiSecret,
});

// const proxyAgent = new HttpsProxyAgent(config.proxyUrl);
const bot = new TelegramBot(config.telegramToken, { polling: true });

// ВЫБОР МОНЕТЫ
async function getRandomBybitCoin() {
    try {
        // 1. Получаем список всех спотовых пар
        const response = await bybitClient.getTickers({
            category: "spot",
        });

        if (response.retCode !== 0 || !response.result?.list) {
            throw new Error(`Bybit API error: ${response.retMsg}`);
        }

        // 2. Фильтруем USDT-пары
        const usdtPairs = response.result.list.filter((pair) =>
            pair.symbol.endsWith("USDT"),
        );

        if (usdtPairs.length === 0) {
            throw new Error("No USDT pairs found");
        }

        // 3. Выбираем случайную монету
        const randomPair =
            usdtPairs[Math.floor(Math.random() * usdtPairs.length)];
        const position = randomPair.price24hPcnt >= 0 ? "long" : "short";

        return {
            coin: randomPair.symbol.replace("USDT", ""),
            symbol: randomPair.symbol,
            priceUSDT: parseFloat(randomPair.lastPrice),
            position: position,
        };
    } catch (error) {
        console.error("Bybit SDK error:", error);
        throw error;
    }
}

// ПОЛУЧАЕМ КУРС

async function getExchangeCourse() {
    // 4. Получаем курс USDT к MXN (с альтернативным API на случай проблем с CoinGecko)
    let usdtToMXN;
    try {
        const mxnResponse = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=mxn",
        );
        const mxnData = await mxnResponse.json();
        usdtToMXN = mxnData.tether?.mxn;
    } catch (e) {
        console.warn("CoinGecko failed, trying alternative...");
        // Альтернативный источник курса
        const alternativeResponse = await fetch(
            "https://api.exchangerate-api.com/v4/latest/USD",
        );
        const alternativeData = await alternativeResponse.json();
        usdtToMXN = alternativeData.rates?.MXN;
    }

    if (!usdtToMXN) {
        // Используем фиксированный курс как запасной вариант
        console.warn("Using fallback exchange rate 1 USD = 17.00 MXN");
        usdtToMXN = 17.0;
    }

    return usdtToMXN;
}

// ГЕНЕРАЦИЯ СУММЫ
function generateRandomPrice() {
    // Генерируем целую часть (300-589)
    const min = 300;
    const max = 589;
    const wholePart = Math.floor(Math.random() * (max - min + 1)) + min;

    // Генерируем дробную часть (0-99)
    const decimalPart = Math.floor(Math.random() * 100);

    // Собираем число в формате XXX.XX
    const randomPrice = `${wholePart}.${decimalPart.toString().padStart(2, "0")}`;

    // Преобразуем в число для проверки диапазона
    const numericValue = parseFloat(randomPrice);

    // Если получилось 590.00 или больше, генерируем заново
    if (numericValue >= 590) {
        return generateRandomPrice();
    }

    return randomPrice;
}

// ГЕНЕРАЦИЯ БАЛАНСА
function generateRandomBalance(min, max) {
    // 1. Генерация числа от 2000.00 до 5500.00
    const randomNumber = (Math.random() * (max - min) + min).toFixed(2);
    const regularFormat = Math.trunc(randomNumber);
    // 2. Форматирование с запятыми (4,165.45)
    const formattedWithDecimal = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(parseFloat(randomNumber));

    // 3. Форматирование без десятичной части (4,165)
    const formattedWithoutDecimal = new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0,
    }).format(parseFloat(randomNumber));

    // 3. Форматирование без десятичной части (4,165)
    const initFloor = new Intl.NumberFormat("de-DE", {
        maximumFractionDigits: 0,
    }).format(parseFloat(Math.floor(randomNumber)));


    return {
        initValue: randomNumber,
        regularFormat: regularFormat,
        fullNumber: formattedWithDecimal, // "4,165.65"
        integerPart: formattedWithoutDecimal, // "4,166"
        integerPartFloor: initFloor // "4.165"
    };
}

// ГЕНЕРАЦИЯ ДАТЫ
function formatCurrentDateTime(location = 'mexico') {
    // Определяем временную зону в зависимости от локации
    let timeZone;
    switch (location.toLowerCase()) {
        case 'mexico':
            timeZone = 'America/Mexico_City';
            break;
        case 'peru':
            timeZone = 'America/Lima';
            break;
        default:
            timeZone = 'America/Mexico_City';
    }

    // Получаем текущее время с учетом временной зоны
    const now = new Date();
    const options24h = {
        timeZone: timeZone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
    };

    const options12h = {
        timeZone: timeZone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    };

    // Форматируем дату с учетом временной зоны (24-часовой формат)
    const dateTimeFormat24h = new Intl.DateTimeFormat('en-US', options24h);
    const parts = dateTimeFormat24h.formatToParts(now);

    // Извлекаем компоненты даты
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value.padStart(2, '0');
    const day = parts.find(p => p.type === 'day').value.padStart(2, '0');
    const hour = parts.find(p => p.type === 'hour').value.padStart(2, '0');
    const minute = parts.find(p => p.type === 'minute').value.padStart(2, '0');
    const second = parts.find(p => p.type === 'second').value.padStart(2, '0');

    // 1. Формат 2025-08-05 18:26:17
    const format1 = `${year}-${month}-${day} ${hour}:${minute}:${second}`;

    // Создаем копию даты и добавляем случайное количество минут (10-17)
    const laterDate = new Date(now);
    const randomMinutes = Math.floor(Math.random() * 8) + 10;
    laterDate.setMinutes(laterDate.getMinutes() + randomMinutes);

    // Форматируем новую дату (24-часовой формат)
    const laterParts = dateTimeFormat24h.formatToParts(laterDate);
    const laterDay = laterParts.find(p => p.type === 'day').value;
    const laterMonth = laterParts.find(p => p.type === 'month').value;
    const laterYear = laterParts.find(p => p.type === 'year').value;
    const laterHour = laterParts.find(p => p.type === 'hour').value.padStart(2, '0');
    const laterMinute = laterParts.find(p => p.type === 'minute').value.padStart(2, '0');
    const laterSecond = laterParts.find(p => p.type === 'second').value.padStart(2, '0');

    // Форматируем время в 12-часовой формат (03:17 PM)
    const time12hFormat = new Intl.DateTimeFormat('en-US', options12h).format(laterDate);
    const time12h = time12hFormat.replace(/([\d]+:[\d]+)\s([AP]M)/, (match, time, period) => {
        return `${time} ${period}`;
    }).toUpperCase();

    // 2. Формат 5 agosto 2025, 18:26:17 (испанский)
    const monthsES = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const monthsESShort = [
        "Ene", "Feb", "Mar", "Abr", "May", "Jun",
        "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
    ];
    const monthIndex = parseInt(laterMonth, 10) - 1;

    const format2 = `${laterDay} ${monthsES[monthIndex]} ${laterYear}, ${laterHour}:${laterMinute}:${laterSecond}`;
    const format3 = `${laterDay} ${monthsESShort[monthIndex]} ${laterYear} ${time12h}`;

    return {
        base: format1, // 2025-08-05 18:26:17
        spanish: format2, // 5 Agosto 2025, 18:36:17
        peru: format3, // 5 Ago 2025, 03:17 PM
        randomMinutes: randomMinutes,
        timeZone: timeZone
    };
}

// ГЕНЕРАЦИЯ ИМЕНИ
const { mexicoNamesArr } = require('./names/mexico/names.js');
const { mexicoSurnamesArr } = require('./names/mexico/surnames.js');
const { peruNamesArr } = require('./names/peru/names.js');
const { peruSurnamesArr } = require('./names/peru/surnames.js');

function getMexicanName(location) {

    let names, surnames = [];

    if (location === 'mexico') {
        names = mexicoNamesArr;
        surnames = mexicoSurnamesArr;
    } else {
        names = peruNamesArr;
        surnames = peruSurnamesArr;
    };

    // Генерация случайного имени и двух фамилий (по мексиканской традиции)
    const name = names[Math.floor(Math.random() * names.length)];
    const surname = surnames[Math.floor(Math.random() * surnames.length)];

    return {
        full: `${name} ${surname}`,
        name: name,
        surname: surname,
    };
}

// Модифицированная main функция для Telegram
async function generateTelegramResponse(location) {

    if (location === 'mexico') {
        try {
            const coin = await getRandomBybitCoin();
            const sum = generateRandomPrice();
            const balance = generateRandomBalance(2000, 5500);
            const date = formatCurrentDateTime();
            const exchangeRate = await getExchangeCourse();
            const exchangedBalance = Math.trunc(
                parseFloat(balance.regularFormat * exchangeRate),
            );
            const formattedExchangedBalance = new Intl.NumberFormat("en-US", {
                maximumFractionDigits: 0,
            }).format(parseFloat(balance.regularFormat * exchangeRate));
            const fullName = getMexicanName(location);
            const checkRand = Math.trunc(Math.random() * 90000 + 10000);
            const increase = Math.floor(Math.random() * (9999 - 50 + 1)) + 50;

            // Формируем красивое сообщение для Telegram
            let response = `ДАННЫЕ ТРАНЗАКЦИИ \n`;
            response += `Монета: ${coin.symbol}\n`;
            response += `Позиция: ${coin.position}\n`;
            response += `Сумма: ${sum} USDT\n\n`;

            response += `БАЛАНС \n`;
            response += `${balance.fullNumber}\n`;
            response += `${balance.integerPart}\n`;
            response += `${date.base}\n\n`;

            response += `ЧЕК \n`;
            response += `${date.spanish}\n`;
            response += `${formattedExchangedBalance}\n`;
            response += `${fullName.full}\n`;
            response += `CUENTA\n`;
            response += `38479\n`;
            response += `${checkRand}\n\n`;

            response += `БАНК \n`;
            response += `${fullName.name}\n`;
            response += `${checkRand % 1000}\n`;
            response += `${exchangedBalance + increase} (${exchangedBalance} + ${increase})\n`;

            return response;
        } catch (error) {
            console.error("Error generating response:", error);
            return "⚠️ Произошла ошибка при генерации данных. Пожалуйста, попробуйте снова.";
        }
    } else {
        try {
            const balance = await generateRandomBalance(4200, 8500);
            const fullName = getMexicanName(location);
            const date = formatCurrentDateTime();

            // Формируем красивое сообщение для Telegram
            let response = `${balance.fullNumber}\n`;
            response += `${balance.integerPartFloor}\n`;
            response += `${Math.trunc(Math.random() * (990 - 700) + 700)}\n`;
            response += `${balance.fullNumber}\n\n`;

            response += `Перевод интербанк \n`;
            response += `${balance.regularFormat}.00\n`;
            response += `731 3102768698\n`;
            let intBanks = ["N1", "ВСР", "Interbank"];
            response += `${intBanks[Math.floor(Math.random() * intBanks.length)]}\n`;
            response += `${fullName.full}\n`;
            response += `002 285 195616734024 51\n`;
            response += `${date.peru}\n\n`;

            response += `ЧЕК BCP/N1 \n`;
            const formattedFirstSum = new Intl.NumberFormat("en-US", {
                maximumFractionDigits: 2,
            }).format(parseFloat(Number(balance.initValue) + Number((Math.random() * (2000 - 100) + 100))));
            response += `${formattedFirstSum}\n`;
            response += `${Math.round((Math.random() * (995.99 - 50) + 50) * 100) / 100}\n`;

            return response;
        } catch (error) {
            console.error("Error generating response:", error);
            return "⚠️ Произошла ошибка при генерации данных. Пожалуйста, попробуйте снова.";
        }
    }

}

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
        chatId,
        `/genMex - генерация для Мексики, /genPeru - генерация для Перу`,
        {
            parse_mode: "Markdown",
        },
    );
});

// Обработчик команды /generate
bot.onText(/\/genMex/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        // Показываем статус "печатает"
        await bot.sendChatAction(chatId, "typing");

        // Генерируем ответ
        const response = await generateTelegramResponse('mexico');

        // Отправляем форматированное сообщение
        await bot.sendMessage(chatId, response, {
            parse_mode: "Markdown",
        });
    } catch (error) {
        console.error("Error handling /generate:", error);
        bot.sendMessage(
            chatId,
            "⚠️ Произошла ошибка. Пожалуйста, попробуйте позже.",
        );
    }
});

bot.onText(/\/genPeru/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        // Показываем статус "печатает"
        await bot.sendChatAction(chatId, "typing");

        // Генерируем ответ
        const response = await generateTelegramResponse('peru');

        // Отправляем форматированное сообщение
        await bot.sendMessage(chatId, response, {
            parse_mode: "Markdown",
        });
    } catch (error) {
        console.error("Error handling /generate:", error);
        bot.sendMessage(
            chatId,
            "⚠️ Произошла ошибка. Пожалуйста, попробуйте позже.",
        );
    }
});

console.log("Бот запущен и ожидает команд...");