<script setup>
import { computed } from 'vue';
import { lang, t } from '../app';

const TEXT = {
  "en": [
    [
      "What Lanrogs stores",
      "When you create an account we store your email address, your name, and your password (the password is handled by our login provider and is never visible to us). While you use the site we also store what you create: your profile (picture, colors, short bio, languages), your flashcards, quizzes and scores, and the time you were last active on the site. If you use the contact form, we store your name, email and message."
    ],
    [
      "Why",
      "Only to run the service: to log you in, to show your cards and quizzes on every device, to show your profile, and to answer your messages. We do not sell your data, we do not show ads, and we do not use advertising or analytics trackers."
    ],
    [
      "Where it is kept",
      "Your data is stored with our database and login provider, Supabase. Contact messages are also forwarded to the site owner by e-mail through FormSubmit. A copy of your cards and profile is also kept in your own browser so the site works fast and offline. Your language choice is saved in your browser too."
    ],
    [
      "Who can see it",
      "Only you can see your profile details, flashcards, quizzes and scores. The site administrator can see the list of accounts (name, email, languages, join date, last activity) and contact messages, but cannot read your flashcards or quizzes."
    ],
    [
      "Your choices",
      "You can change your profile at any time. You can download a backup of your cards, quizzes and scores on the Profile page. You can delete your account on the Profile page, which permanently removes your account and everything saved in it. You can also use the Contact page to ask a question about your data."
    ],
    [
      "Children",
      "Lanrogs is not intended for children under 13. Please do not create an account if you are younger."
    ],
    [
      "Changes",
      "If this page changes, the date at the top changes too."
    ]
  ],
  "ru": [
    [
      "Что хранит Lanrogs",
      "При создании аккаунта мы храним ваш адрес электронной почты, имя и пароль (пароль обрабатывается провайдером входа и нам не виден). Во время использования сайта мы храним то, что вы создаёте: профиль (фото, цвета, краткое описание, языки), карточки, викторины и результаты, а также время вашей последней активности. Если вы пользуетесь формой связи, мы храним имя, email и текст сообщения."
    ],
    [
      "Зачем",
      "Только для работы сервиса: чтобы вы могли войти, видеть карточки и викторины на любом устройстве, видеть свой профиль, и чтобы мы могли ответить на ваши сообщения. Мы не продаём ваши данные, не показываем рекламу и не используем рекламные или аналитические трекеры."
    ],
    [
      "Где хранится",
      "Данные хранятся у нашего провайдера базы данных и входа — Supabase. Сообщения из формы связи также пересылаются владельцу сайта по электронной почте через FormSubmit. Копия ваших карточек и профиля хранится и в вашем браузере, чтобы сайт работал быстро и без сети. Выбранный язык интерфейса тоже сохраняется в браузере."
    ],
    [
      "Кто это видит",
      "Данные профиля, карточки, викторины и результаты видите только вы. Администратор сайта видит список аккаунтов (имя, email, языки, дата регистрации, последняя активность) и сообщения из формы связи, но не может читать ваши карточки и викторины."
    ],
    [
      "Ваши возможности",
      "Вы можете в любой момент изменить профиль. На странице «Профиль» можно скачать резервную копию карточек, викторин и результатов. Там же можно удалить аккаунт — это навсегда удалит аккаунт и всё, что в нём сохранено. С вопросами о ваших данных пишите через страницу «Контакты»."
    ],
    [
      "Дети",
      "Lanrogs не предназначен для детей младше 13 лет. Пожалуйста, не создавайте аккаунт, если вы младше."
    ],
    [
      "Изменения",
      "Если эта страница изменится, изменится и дата вверху."
    ]
  ],
  "uz": [
    [
      "Lanrogs nimalarni saqlaydi",
      "Akkaunt yaratganingizda email manzilingiz, ismingiz va parolingiz saqlanadi (parolni kirish xizmati provayderi qayta ishlaydi va biz uni koʻra olmaymiz). Saytdan foydalanganda siz yaratgan narsalar ham saqlanadi: profilingiz (rasm, ranglar, qisqa maʼlumot, tillar), kartochkalar, viktorinalar va natijalar hamda saytdagi oxirgi faolligingiz vaqti. Aloqa shaklidan foydalansangiz, ismingiz, emailingiz va xabaringiz saqlanadi."
    ],
    [
      "Nima uchun",
      "Faqat xizmat ishlashi uchun: tizimga kirishingiz, kartochka va viktorinalaringizni har qanday qurilmada koʻrishingiz, profilingizni koʻrsatish va xabarlaringizga javob berish uchun. Maʼlumotlaringizni sotmaymiz, reklama koʻrsatmaymiz va reklama yoki tahlil kuzatuvchilaridan foydalanmaymiz."
    ],
    [
      "Qayerda saqlanadi",
      "Maʼlumotlar maʼlumotlar bazasi va kirish provayderimiz — Supabase da saqlanadi. Aloqa shaklidagi xabarlar FormSubmit orqali sayt egasiga elektron pochta bilan ham yuboriladi. Kartochka va profilingizning nusxasi sayt tez va internetsiz ishlashi uchun brauzeringizda ham saqlanadi. Tanlangan til ham brauzerda saqlanadi."
    ],
    [
      "Kim koʻra oladi",
      "Profil maʼlumotlari, kartochkalar, viktorinalar va natijalarni faqat siz koʻrasiz. Sayt administratori akkauntlar roʻyxatini (ism, email, tillar, roʻyxatdan oʻtgan sana, oxirgi faollik) va aloqa xabarlarini koʻradi, lekin kartochka va viktorinalaringizni oʻqiy olmaydi."
    ],
    [
      "Sizning imkoniyatlaringiz",
      "Profilingizni istalgan payt oʻzgartirishingiz mumkin. «Profil» sahifasida kartochka, viktorina va natijalarning zaxira nusxasini yuklab olish mumkin. Shu yerda akkauntni oʻchirish ham mumkin — bu akkaunt va undagi hamma narsani butunlay oʻchiradi. Maʼlumotlaringiz haqida savol boʻlsa, «Aloqa» sahifasi orqali yozing."
    ],
    [
      "Bolalar",
      "Lanrogs 13 yoshdan kichik bolalar uchun moʻljallanmagan. Agar yoshingiz kichik boʻlsa, akkaunt yaratmang."
    ],
    [
      "Oʻzgarishlar",
      "Bu sahifa oʻzgarsa, yuqoridagi sana ham oʻzgaradi."
    ]
  ]
};

const UPDATED = {
  en: 'Last updated: 16 November 2026',
  ru: 'Обновлено: 16 ноября 2026',
  uz: 'Yangilangan: 2026-yil 16-noyabr',
};

const blocks = computed(function () { return TEXT[lang.value] || TEXT.en; });
</script>

<template>
  <main class="container narrow-text">
    <div class="page-head">
      <h1>{{ t('Privacy') }}</h1>
      <p class="muted">{{ UPDATED[lang] || UPDATED.en }}</p>
    </div>
    <div class="card prose">
      <div v-for="b in blocks" :key="b[0]">
        <h2>{{ b[0] }}</h2>
        <p>{{ b[1] }}</p>
      </div>
    </div>
  </main>
</template>
